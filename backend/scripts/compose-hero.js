const sharp = require('sharp');
const { join } = require('path');

const FRONTEND = join(__dirname, '../../frontend');
const OUTPUT_W = 2048;
const OUTPUT_H = 1152;

async function main() {
  const existingHero = join(FRONTEND, 'public/images/sainthonore_monceau.jpg');
  const watchSource = join(FRONTEND, 'public/images/west-end-sowar-source.png');
  const outputPath = join(FRONTEND, 'public/images/west-end-sowar.jpg');
  const ogOutput = join(FRONTEND, 'public/og/west-end-sowar.jpg');

  const stripWidth = 300;
  const strip = await sharp(existingHero)
    .extract({ left: 0, top: 0, width: stripWidth, height: OUTPUT_H })
    .toBuffer();

  const mirrored = await sharp(strip).flop().toBuffer();

  const background = await sharp({
    create: { width: OUTPUT_W, height: OUTPUT_H, channels: 3, background: { r: 18, g: 18, b: 18 } }
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
    .modulate({ brightness: 0.7 })
    .jpeg({ quality: 90 })
    .toBuffer();

  const watchTargetH = Math.round(OUTPUT_H * 0.88);
  const watchResized = await sharp(watchSource)
    .resize({ height: watchTargetH, fit: 'inside' })
    .toBuffer();

  const watchMeta = await sharp(watchResized).metadata();
  const watchW = watchMeta.width;
  const watchH = watchMeta.height;

  const watchLeft = Math.round(OUTPUT_W * 0.54 - watchW / 2);
  const watchTop = Math.round((OUTPUT_H - watchH) / 2);

  const hero = await sharp(background)
    .composite([{ input: watchResized, left: watchLeft, top: watchTop, blend: 'over' }])
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();

  await sharp(hero).toFile(outputPath);
  console.log(`Hero written to ${outputPath}`);

  const og = await sharp(hero).resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 82 }).toBuffer();
  await sharp(og).toFile(ogOutput);
  console.log(`OG written to ${ogOutput}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
