/**
 * Generates width variants of the editorial photography in public/images and
 * writes the manifest SmartImage reads.
 *
 * Every one of these files ships at its full size no matter how small it is
 * drawn: the craft section paints a 1024x1024 photograph into a 432x270 box,
 * which is nine times the pixels the screen can use. Variants let the browser
 * pick, and the manifest is what makes that safe — a `srcset` naming a file
 * that does not exist gives a broken image rather than falling back, so
 * SmartImage only emits one for sources listed here.
 *
 * Idempotent: a variant already on disk and newer than its source is left
 * alone, so re-running after adding one photograph costs one encode.
 *
 *   node scripts/responsive-images.mjs
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIR = join(ROOT, 'public', 'images');
const MANIFEST = join(ROOT, 'src', 'data', 'image-widths.json');

/** The widths worth keeping. Below 480 the art direction stops reading; above
 *  1440 nothing in the layout is wider, and the originals cover retina. */
const WIDTHS = [480, 960, 1440];
const QUALITY = 80;

function sourceWidth(file) {
  // `sips` ships with macOS and cwebp is already a dependency of this repo's
  // image workflow, so neither adds an install step.
  const out = execFileSync('sips', ['-g', 'pixelWidth', file], { encoding: 'utf8' });
  const match = /pixelWidth:\s*(\d+)/.exec(out);
  return match ? Number(match[1]) : 0;
}

function isFresh(target, source) {
  return existsSync(target) && statSync(target).mtimeMs >= statSync(source).mtimeMs;
}

const manifest = {};
let written = 0;
let skipped = 0;

for (const name of readdirSync(IMAGE_DIR).sort()) {
  if (!/\.(jpe?g|png)$/i.test(name)) continue;

  const source = join(IMAGE_DIR, name);
  const stem = basename(name, extname(name));
  const full = sourceWidth(source);
  if (!full) {
    console.warn(`[responsive] could not read width: ${name}`);
    continue;
  }

  // A variant wider than the original would be an upscale — pointless bytes.
  const widths = WIDTHS.filter((w) => w < full);
  if (!widths.length) continue;

  for (const width of widths) {
    const target = join(IMAGE_DIR, `${stem}-${width}.webp`);
    if (isFresh(target, source)) {
      skipped += 1;
      continue;
    }
    execFileSync('cwebp', ['-q', String(QUALITY), '-m', '6', '-resize', String(width), '0', source, '-o', target], {
      stdio: 'ignore',
    });
    written += 1;
  }

  // The full-size .webp sibling closes the set at the original width.
  manifest[`/images/${stem}.webp`] = [...widths, full];
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `[responsive] ${Object.keys(manifest).length} sources — ${written} variant(s) written, ${skipped} already current`,
);
