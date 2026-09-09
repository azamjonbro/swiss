/**
 * Compose the West End Sowar hero image for the storefront.
 *
 * Strategy:
 *  1. Use the existing hero's left strip (watch-free dark stone texture) as the
 *     background, mirrored and blurred to fill 2048×1152.
 *  2. The source watch sits on a near-white background with alpha already present
 *     (channels: 4). Composite it at ~88% frame height, centred around 54% of the
 *     width so the type can sit in the left third.
 *  3. Output as progressive JPEG at quality 85 — the same format as the original hero.
 *
 *  Usage:  node scripts/compose-hero.mjs
 *  Deps:   sharp (available from the backend's node_modules)
 */
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = join(__dirname, '..');
const OUTPUT_W = 2048;
const OUTPUT_H = 1152;

async function main() {
  const existingHero = join(FRONTEND, 'public/images/sainthonore_monceau.jpg');
  const watchSource = join(FRONTEND, 'public/images/west-end-sowar-source.png');
  const outputPath = join(FRONTEND, 'public/images/west-end-sowar.jpg');
  const ogOutput = join(FRONTEND, 'public/og/west-end-sowar.jpg');

  // --- Step 1: Build the dark background from the existing hero's left strip ---
  // Crop a 300px-wide strip from the left side (no watch there), then tile/blur it.
  const stripWidth = 300;
  const strip = await sharp(existingHero)
    .extract({ left: 0, top: 0, width: stripWidth, height: OUTPUT_H })
    .toBuffer();

  // Mirror it to double the width, then resize to full width with a blur
  const mirrored = await sharp(strip)
    .flop() // horizontal mirror
    .toBuffer();

  // Tile: [strip][mirrored][strip][mirrored]... → we just resize the strip to full width
  // with a heavy blur so the tiling seams vanish
  const background = await sharp({
    create: {
      width: OUTPUT_W,
      height: OUTPUT_H,
      channels: 3,
      background: { r: 18, g: 18, b: 18 },
    },
  })
    .composite([
      { input: strip, left: 0, top: 0, blend: 'over' },
      { input: mirrored, left: stripWidth, top: 0, blend: 'over' },
      { input: strip, left: stripWidth * 2, top: 0, blend: 'over' },
      { input: mirrored, left: stripWidth * 3, top: 0, blend: 'over' },
      { input: strip, left: stripWidth * 4, top: 0, blend: 'over' },
      { input: mirrored, left: stripWidth * 5, top: 0, blend: 'over' },
      { input: strip, left: stripWidth * 6, top: 0, blend: 'over' },
    ])
    .blur(8)
    // Darken slightly so the watch pops
    .modulate({ brightness: 0.7 })
    .jpeg({ quality: 90 })
    .toBuffer();

  // --- Step 2: Prepare the watch ---
  // Target: ~88% of frame height = ~1014px
  const watchTargetH = Math.round(OUTPUT_H * 0.88);
  const watchResized = await sharp(watchSource)
    .resize({ height: watchTargetH, fit: 'inside' })
    .toBuffer();

  const watchMeta = await sharp(watchResized).metadata();
  const watchW = watchMeta.width;
  const watchH = watchMeta.height;

  // Centre the watch at ~54% of the width
  const watchLeft = Math.round(OUTPUT_W * 0.54 - watchW / 2);
  const watchTop = Math.round((OUTPUT_H - watchH) / 2);

  // --- Step 3: Composite ---
  const hero = await sharp(background)
    .composite([
      {
        input: watchResized,
        left: watchLeft,
        top: watchTop,
        blend: 'over',
      },
    ])
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  // Write the hero
  await sharp(hero).toFile(outputPath);
  console.log(`✓ Hero written: ${outputPath} (${OUTPUT_W}×${OUTPUT_H})`);

  // --- Step 4: OG image (1200×630) ---
  const ogW = 1200;
  const ogH = 630;
  const og = await sharp(hero)
    .resize(ogW, ogH, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82 })
    .toBuffer();

  await sharp(og).toFile(ogOutput);
  console.log(`✓ OG card written: ${ogOutput} (${ogW}×${ogH})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
