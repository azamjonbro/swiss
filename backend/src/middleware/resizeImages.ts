import { createHash } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextFunction, Request, Response } from 'express';
import sharp from 'sharp';

/**
 * Serves a narrower copy of an uploaded image when the caller asks for one:
 *
 *     /uploads/images/tsarbomba_tb8806q_1_trim.webp?w=480
 *
 * Product photography is stored at whatever size it arrived in — the catalogue
 * holds shots up to 4493px wide, drawn into 186px cards — and pre-generating
 * derivatives with a script would fix today's 1159 files while every image
 * uploaded tomorrow came back full size. Resizing on request covers both, and
 * costs one encode per size per image because the result is cached on disk.
 *
 * Anything without a `w` falls through to express.static untouched, so the
 * originals and every existing URL keep working exactly as before.
 */

/** The only widths that get served. An open parameter is an invitation to
 *  fill the disk with 10,000 one-pixel-apart renders. */
const ALLOWED_WIDTHS = new Set([240, 480, 720, 960, 1440]);

const RESIZABLE = /\.(jpe?g|png|webp)$/i;

export function resizeImages(uploadRoot: string, cacheDir: string) {
  if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });

  return async function resizeImagesMiddleware(req: Request, res: Response, next: NextFunction) {
    const width = Number(req.query.w);
    if (!ALLOWED_WIDTHS.has(width) || !RESIZABLE.test(req.path)) return next();

    // req.path is URL-decoded and rooted at the mount, but a crafted "..%2f"
    // still has to be shut out: resolve, then confirm the result is inside the
    // upload root before anything touches the filesystem.
    const source = path.resolve(uploadRoot, `.${decodeURIComponent(req.path)}`);
    if (!source.startsWith(path.resolve(uploadRoot) + path.sep)) return res.sendStatus(403);
    if (!existsSync(source)) return next();

    const key = createHash('sha1').update(`${source}:${width}`).digest('hex');
    const cached = path.join(cacheDir, `${key}.webp`);

    try {
      let body: Buffer;
      if (existsSync(cached)) {
        body = await readFile(cached);
      } else {
        body = await sharp(source)
          // `withoutEnlargement` keeps a small original small: asking for 960
          // of a 577px shot must not upscale it into a bigger file than the
          // one it replaces.
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await writeFile(cached, body);
      }

      res.type('image/webp');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(body);
    } catch {
      // A corrupt or unsupported file is not worth a 500 — hand it to static
      // and let the original be served.
      return next();
    }
  };
}
