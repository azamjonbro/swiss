/**
 * Puts the right photograph first in every product's image list.
 *
 * The card in the grid shows `variants[0].images[0]`, and the catalogues do not
 * agree on what that first image is. Most of the time it is the front-facing
 * studio shot; often enough it is a side profile, a bare case back, a model
 * wearing the watch against a coloured wall, or the presentation box. Four PRX
 * 40mm cards sat next to each other in the grid showing a dial, a dial, a
 * close-up of a bracelet on purple, and a wrist in a suit — the same model,
 * four different kinds of picture.
 *
 * The studio shot is recognisable without knowing anything about watches: it is
 * the one photographed on a seamless white sweep, and among those it is the one
 * whose subject fills the most of the frame (a front view of the whole watch
 * beats a profile, which is a sliver, and a case back, which is a small disc).
 * So:
 *
 *   1. Keep only the images whose border is genuinely white — that alone
 *      removes every lifestyle shot, every dark "lume" shot and the box.
 *   2. Of those, take the one with the largest content bounding box.
 *   3. Move it to the front. Everything else keeps its order, so the gallery
 *      still reads the way the manufacturer sequenced it.
 *
 * A product whose photography is *all* lifestyle has no studio shot to promote,
 * and is left exactly as it is rather than reordered on a guess.
 *
 * Reads the image files, so it has to run where the uploads are — the server,
 * not a laptop.
 *
 *     npm run order:covers
 *     npm run order:covers -- --apply
 */
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { connectDatabase } from '../config/db';
import { env } from '../config/env';
import { Watch } from '../models/Watch';

const UPLOAD_ROOT = path.join(process.cwd(), env.uploadDir);

/** Analysis size. The signals below are all large-scale; 256px is plenty and
 *  keeps a 2 500-image run to minutes rather than an afternoon. */
const SAMPLE = 256;
/** Mean border luminance, 0-1, above which the backdrop counts as a white sweep. */
const WHITE_MIN = 0.96;
/** Border luminance spread, 0-255, above which the "white" has something in it. */
const WHITE_SPREAD_MAX = 8;
/** Luminance below which a pixel is subject rather than backdrop. */
const CONTENT_MAX = 235;

interface Shot {
  white: boolean;
  area: number;
}

async function analyse(file: string): Promise<Shot | null> {
  try {
    const { data, info } = await sharp(file)
      .resize(SAMPLE, SAMPLE, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width: w, height: h, channels } = info;
    const luma = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += channels, p += 1) {
      luma[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }

    // A band rather than a single-pixel line: JPEG ringing along the very edge
    // of a white sweep is enough to fail a one-pixel test on a photograph that
    // is plainly white.
    const band = Math.max(2, Math.min(w, h) >> 5);
    let sum = 0;
    let sumSq = 0;
    let n = 0;
    const sample = (x: number, y: number) => {
      const v = luma[y * w + x];
      sum += v;
      sumSq += v * v;
      n += 1;
    };
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < band; x += 1) {
        sample(x, y);
        sample(w - 1 - x, y);
      }
    }
    for (let x = 0; x < w; x += 1) {
      for (let y = 0; y < band; y += 1) {
        sample(x, y);
        sample(x, h - 1 - y);
      }
    }
    const mean = sum / n;
    const spread = Math.sqrt(Math.max(0, sumSq / n - mean * mean));

    let top = h;
    let bottom = -1;
    let left = w;
    let right = -1;
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        if (luma[y * w + x] >= CONTENT_MAX) continue;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    const area = bottom < 0 ? 0 : ((bottom - top + 1) / h) * ((right - left + 1) / w);

    return { white: mean / 255 >= WHITE_MIN && spread <= WHITE_SPREAD_MAX, area };
  } catch {
    // A missing or unreadable file must not decide the order of the ones that
    // are fine — it simply does not compete.
    return null;
  }
}

/** `/uploads/images/x.jpg` as it is stored -> the file on disk. */
function resolveUpload(src: string): string | null {
  const rel = src.replace(/^\/uploads\//, '');
  if (rel === src) return null;
  const file = path.resolve(UPLOAD_ROOT, rel);
  if (!file.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) return null;
  return fs.existsSync(file) ? file : null;
}

async function pickCover(images: string[]): Promise<number> {
  let best = -1;
  let bestArea = -1;
  for (let i = 0; i < images.length; i += 1) {
    const file = resolveUpload(images[i]);
    if (!file) continue;
    const shot = await analyse(file);
    if (!shot?.white) continue;
    if (shot.area > bestArea) {
      bestArea = shot.area;
      best = i;
    }
  }
  return best;
}

async function run(): Promise<void> {
  const apply = process.argv.includes('--apply');
  await connectDatabase();

  const watches = await Watch.find({}).select('slug variants');
  let moved = 0;
  let alreadyRight = 0;
  let noStudioShot = 0;

  for (const watch of watches) {
    let changed = false;
    for (const variant of watch.variants) {
      if (!variant.images || variant.images.length < 2) continue;
      const index = await pickCover(variant.images);
      if (index < 0) {
        noStudioShot += 1;
        continue;
      }
      if (index === 0) {
        alreadyRight += 1;
        continue;
      }
      const [cover] = variant.images.splice(index, 1);
      variant.images.unshift(cover);
      changed = true;
      moved += 1;
      console.log(`  ${watch.slug} [${variant.colorSlug}]: image ${index + 1} -> cover`);
    }
    if (changed && apply) await watch.save();
  }

  console.log(
    `\n${watches.length} products — ${moved} cover(s) ${apply ? 'moved' : 'would move'}, ` +
      `${alreadyRight} already correct, ${noStudioShot} colourway(s) have no studio shot to promote`,
  );
  if (!apply) console.log('Dry run. Re-run with --apply to write.');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
