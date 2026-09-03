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

/**
 * Bound what libvips keeps in memory between encodes.
 *
 * sharp's default cache grows to hundreds of megabytes of decoded pixel data
 * and holds it: the catalogue's photography runs up to 4493px wide, and one
 * listing page asks for dozens of derivatives at once. On the production box
 * that pushed the process past the 300 MB pm2 ceiling, so pm2 killed and
 * restarted it — 38 restarts, several seconds of uptime at a time, every
 * in-flight request dropped with it.
 *
 * 64 MB is ample for a cache whose only job is to avoid re-decoding the same
 * source within a burst; the derivatives themselves are already cached on
 * disk, which is what actually saves the work.
 */
sharp.cache({ memory: 64, files: 20, items: 100 });

/**
 * One resize at a time.
 *
 * The default is one thread per core, and each concurrent encode holds its own
 * copy of the decoded image. A single fork process serving a page of thumbnails
 * does not need to decode them in parallel — it needs to not fall over.
 */
sharp.concurrency(1);

/** The only widths that get served. An open parameter is an invitation to
 *  fill the disk with 10,000 one-pixel-apart renders. */
const ALLOWED_WIDTHS = new Set([240, 480, 720, 960, 1440]);

const RESIZABLE = /\.(jpe?g|png|webp)$/i;

/**
 * Output format, chosen from what the caller says it can read.
 *
 * AVIF lands at roughly half the bytes of the equivalent WebP on this
 * catalogue (17.9 KB → 9.8 KB at 480px; 55.5 KB → 26.3 KB at 960px) and every
 * browser that understands it advertises `image/avif` in Accept. It costs
 * 3-4x the encode time, which is paid once per file per width and then never
 * again — the result is written to the same on-disk cache as the WebP.
 *
 * Anything that does not ask for AVIF still gets WebP, exactly as before.
 */
function pickFormat(accept: string | undefined): 'avif' | 'webp' {
  return accept?.includes('image/avif') ? 'avif' : 'webp';
}

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

    const format = pickFormat(req.headers.accept);
    // The format is part of the cache key, not just the extension: two callers
    // asking for the same width get different bytes, and the AVIF copy must
    // never be handed to a client that cannot decode it.
    const key = createHash('sha1').update(`${source}:${width}:${format}`).digest('hex');
    const cached = path.join(cacheDir, `${key}.${format}`);

    try {
      let body: Buffer;
      if (existsSync(cached)) {
        body = await readFile(cached);
      } else {
        const pipeline = sharp(source)
          // `withoutEnlargement` keeps a small original small: asking for 960
          // of a 577px shot must not upscale it into a bigger file than the
          // one it replaces.
          .resize({ width, withoutEnlargement: true });
        body = await (format === 'avif'
          ? // AVIF's quality scale is not WebP's: 50 here is the visual match
            // for the 80 below, at half the bytes.
            pipeline.avif({ quality: 50, effort: 4 })
          : pipeline.webp({ quality: 80 })
        ).toBuffer();
        await writeFile(cached, body);
      }

      res.type(`image/${format}`);
      // The response body depends on Accept, so any shared cache in front of
      // this has to key on it too.
      res.setHeader('Vary', 'Accept');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.send(body);
    } catch {
      // A corrupt or unsupported file is not worth a 500 — hand it to static
      // and let the original be served.
      return next();
    }
  };
}
