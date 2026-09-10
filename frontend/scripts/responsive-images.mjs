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
import { readdirSync, statSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMAGE_DIR = join(ROOT, 'public', 'images');
const MANIFEST = join(ROOT, 'src', 'data', 'image-widths.json');
const LQIP_MANIFEST = join(ROOT, 'src', 'data', 'image-lqip.json');

/** The widths worth keeping. Below 480 the art direction stops reading. 1920
 *  is here for the hero, which is the one image drawn full-bleed: a 1440-wide
 *  file on a 1512pt laptop at DPR 2 is a 2x upscale, and the next step up used
 *  to be the full-size original. */
const WIDTHS = [480, 960, 1440, 1920];

/**
 * 80 was fine for the textured editorial photography and is not fine for the
 * hero, which is a watch standing on a wide, smooth, dark-green gradient —
 * exactly the content WebP's chroma subsampling bands. `-sharp_yuv` costs a
 * little encode time and removes the coloured fringing along the polished
 * steel; the pair adds roughly a third to the hero's bytes and takes the
 * banding out of the ground behind it.
 */
const QUALITY = 86;

/**
 * The blur placeholder baked into the bundle, as a data URI.
 *
 * Product photography gets its placeholder from the API (`?w=24`, see
 * backend/src/middleware/resizeImages.ts) because there are 2 500 of them and
 * they change whenever someone uploads. The editorial set is 36 files that
 * change when a designer replaces one, and one of them is the hero — the
 * single image on the site where a round trip for a placeholder defeats the
 * point of having a placeholder. Inlining costs the bundle ~700 bytes each and
 * paints on the first frame.
 *
 * 20px wide at quality 30: large enough to carry the composition through a
 * blur, small enough that base64 does not become the reason the page is big.
 */
const LQIP_WIDTH = 20;
const LQIP_QUALITY = 30;

function lqipDataUri(source) {
  const tmp = join(tmpdir(), `sw-lqip-${process.pid}.webp`);
  try {
    execFileSync(
      'cwebp',
      ['-q', String(LQIP_QUALITY), '-m', '6', '-resize', String(LQIP_WIDTH), '0', source, '-o', tmp],
      { stdio: 'ignore' },
    );
    return `data:image/webp;base64,${readFileSync(tmp).toString('base64')}`;
  } finally {
    rmSync(tmp, { force: true });
  }
}

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
const lqip = {};
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

  // Keyed on the .webp sibling, which is what SmartImage ends up requesting.
  // Every source gets one, including the ones too small to be worth width
  // variants — a placeholder is about latency, not about pixel count.
  lqip[`/images/${stem}.webp`] = lqipDataUri(source);

  // A variant wider than the original would be an upscale — pointless bytes.
  const widths = WIDTHS.filter((w) => w < full);
  if (!widths.length) continue;

  for (const width of widths) {
    const target = join(IMAGE_DIR, `${stem}-${width}.webp`);
    if (isFresh(target, source)) {
      skipped += 1;
      continue;
    }
    execFileSync(
      'cwebp',
      ['-q', String(QUALITY), '-m', '6', '-sharp_yuv', '-resize', String(width), '0', source, '-o', target],
      { stdio: 'ignore' },
    );
    written += 1;
  }

  // The full-size .webp sibling closes the set at the original width. It is
  // also the file SmartImage asks for by name before any srcset is consulted,
  // so it has to be produced here rather than assumed: the manifest naming a
  // width whose file does not exist is a broken image, not a fallback.
  const fullTarget = join(IMAGE_DIR, `${stem}.webp`);
  if (isFresh(fullTarget, source)) {
    skipped += 1;
  } else {
    execFileSync('cwebp', ['-q', String(QUALITY), '-m', '6', '-sharp_yuv', source, '-o', fullTarget], {
      stdio: 'ignore',
    });
    written += 1;
  }

  manifest[`/images/${stem}.webp`] = [...widths, full];
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(LQIP_MANIFEST, `${JSON.stringify(lqip, null, 2)}\n`);
console.log(
  `[responsive] ${Object.keys(manifest).length} sources — ${written} variant(s) written, ${skipped} already current`,
);
console.log(`[responsive] ${Object.keys(lqip).length} blur placeholder(s) written`);
