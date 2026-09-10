/**
 * The phone's hero, composed as a portrait plate rather than cropped from the
 * desktop one.
 *
 * Why it exists: the landscape hero is 2560x1440 and the phone draws it into a
 * ~399x836 CSS box with `object-fit: cover`. Covering that box uses a ~390px
 * wide slice of the source and paints it across ~1200 device pixels — a 3x
 * upscale, which is exactly the mush the eye reads as "no quality". A portrait
 * plate at 1440x2560 is a ~1.0x draw on the same phone.
 *
 * The watch is placed in the upper two thirds because the hero's copy sits at
 * the bottom of the screen (`.sw-hero__content` is `align-items: flex-end`),
 * and it is sized so that the 1200px-tall original is upscaled as little as
 * the composition allows — 1331px, about 1.1x. Bigger reads better on the
 * shelf and worse on the screen; this is the trade the phone can carry.
 *
 * The ground is the desktop hero's own watch-free left edge, blurred and
 * darkened, so the two heroes are the same room photographed twice rather than
 * two different backgrounds.
 *
 *   node backend/scripts/compose-hero-mobile.js [path/to/source.png]
 *
 * The source is the keyed (transparent) West End Sowar shot, 660x1200. It was
 * removed from the repo in 2bfad0e once the desktop hero was baked; recover it
 * with:
 *
 *   git show 2bfad0e^:frontend/public/images/west-end-sowar-source.png > /tmp/sowar.png
 */
const sharp = require('sharp');
const { join } = require('path');
const { existsSync } = require('fs');

const FRONTEND = join(__dirname, '../../frontend');
const OUTPUT_W = 1440;
const OUTPUT_H = 2560;

/** Fraction of the frame height the watch occupies, and where its centre sits. */
const WATCH_HEIGHT = 0.52;
const WATCH_CENTRE_Y = 0.34;

/**
 * Cuts the white studio backdrop out of the source shot.
 *
 * A threshold over the whole frame would also eat the polished steel, which is
 * within a few points of white where the light hits it — so this is a flood
 * fill seeded from the border instead: only white that is *connected to the
 * edge* is removed, and a highlight enclosed by the bracelet is kept because
 * nothing outside can reach it. The tolerance is measured from the file: the
 * backdrop sits above 232 on every channel and the brightest metal that must
 * survive sits below it.
 */
async function keyWhiteBackdrop(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const isBackdrop = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return r >= 232 && g >= 232 && b >= 232 && Math.max(r, g, b) - Math.min(r, g, b) <= 14;
  };

  const seen = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x += 1) {
    stack.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    stack.push(y * width, y * width + width - 1);
  }

  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    const i = p * channels;
    if (!isBackdrop(i)) continue;
    seen[p] = 1;
    data[i + 3] = 0;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - width);
    if (y < height - 1) stack.push(p + width);
  }

  // One pass of blur on the alpha alone, so the cut edge is not a staircase
  // against the dark ground, written straight back into the buffer. (sharp's
  // joinChannel on a raw single-channel buffer silently returns a 3-channel
  // image here, which loses the cut entirely — hence the manual copy.)
  const alpha = await sharp(Buffer.from(data), { raw: { width, height, channels } })
    .extractChannel(3)
    .blur(0.8)
    .toBuffer();

  for (let i = 0; i < alpha.length; i += 1) {
    data[i * channels + 3] = alpha[i];
  }

  return sharp(Buffer.from(data), { raw: { width, height, channels } }).png().toBuffer();
}

async function main() {
  const watchSource = process.argv[2] || join(FRONTEND, 'public/images/west-end-sowar-source.png');
  if (!existsSync(watchSource)) {
    throw new Error(`source not found: ${watchSource} — see the header of this file for how to recover it`);
  }

  const desktopHero = join(FRONTEND, 'public/images/west-end-sowar.jpg');
  const outputPath = join(FRONTEND, 'public/images/west-end-sowar-mobile.jpg');

  // The left edge of the desktop hero, which the watch never reaches. Blown up
  // to a portrait frame and blurred: it is out of focus in the original too, so
  // the upscale costs nothing that shows.
  const background = await sharp(desktopHero)
    .extract({ left: 0, top: 0, width: 600, height: 1440 })
    .resize(OUTPUT_W, OUTPUT_H, { fit: 'cover', position: 'centre' })
    .blur(12)
    .modulate({ brightness: 0.82 })
    .toBuffer();

  // The recovered source still carries its white studio backdrop; the desktop
  // hero was composed from a keyed copy that is not in the repo.
  const keyed = await keyWhiteBackdrop(watchSource);

  const watchTargetH = Math.round(OUTPUT_H * WATCH_HEIGHT);
  const watch = await sharp(keyed)
    .trim({ threshold: 1 })
    .resize({ height: watchTargetH, fit: 'inside', kernel: 'lanczos3' })
    .toBuffer();
  const { width: watchW, height: watchH } = await sharp(watch).metadata();

  const left = Math.round(OUTPUT_W / 2 - watchW / 2);
  const top = Math.round(OUTPUT_H * WATCH_CENTRE_Y - watchH / 2);

  await sharp(background)
    .composite([{ input: watch, left, top, blend: 'over' }])
    .jpeg({ quality: 88, progressive: true, chromaSubsampling: '4:4:4' })
    .toFile(outputPath);

  console.log(`[hero-mobile] ${OUTPUT_W}x${OUTPUT_H} written to ${outputPath}`);
  console.log(`[hero-mobile] watch ${watchW}x${watchH} at ${left},${top}`);
  console.log('[hero-mobile] now run: node frontend/scripts/responsive-images.mjs');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
