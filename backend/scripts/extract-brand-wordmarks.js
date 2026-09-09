const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function processImage(inputPath, outputPath) {
  try {
    const buffer = await sharp(inputPath)
      .grayscale()
      .threshold(100) // Drops the faint border (luma ~21) to 0, text to 255
      .toBuffer();

    // Convert the B/W mask into a transparent PNG with white text
    // The B/W image acts as the alpha channel for a solid white image
    const { width, height } = await sharp(buffer).metadata();
    
    await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .joinChannel(buffer) // use the thresholded image as the alpha channel
    .png()
    .toFile(outputPath);

    return true;
  } catch (err) {
    console.error(`Error processing ${inputPath}:`, err);
    return false;
  }
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Define Brand schema loosely to just read/update
  const brandSchema = new mongoose.Schema({}, { strict: false, collection: 'brands' });
  const Brand = mongoose.model('Brand', brandSchema);

  const brands = await Brand.find({});
  console.log(`Found ${brands.length} brands`);

  const uploadsDir = path.join(__dirname, '../uploads/images');

  for (const brand of brands) {
    const doc = brand.toObject();
    
    // Process Logo
    if (doc.logo && doc.logo.endsWith('.jpg')) {
      const oldFilename = path.basename(doc.logo);
      const newFilename = oldFilename.replace('.jpg', '.png');
      const inputPath = path.join(uploadsDir, oldFilename);
      const outputPath = path.join(uploadsDir, newFilename);
      
      if (fs.existsSync(inputPath)) {
        console.log(`Processing logo for ${doc.name}...`);
        await processImage(inputPath, outputPath);
        brand.set('logo', `/uploads/images/${newFilename}`);
      }
    }

    // Process Image (Banner)
    if (doc.image && doc.image.endsWith('.jpg')) {
      const oldFilename = path.basename(doc.image);
      const newFilename = oldFilename.replace('.jpg', '.png');
      const inputPath = path.join(uploadsDir, oldFilename);
      const outputPath = path.join(uploadsDir, newFilename);
      
      if (fs.existsSync(inputPath)) {
        console.log(`Processing banner for ${doc.name}...`);
        await processImage(inputPath, outputPath);
        brand.set('image', `/uploads/images/${newFilename}`);
      }
    }

    await brand.save();
  }

  console.log('Done!');
  mongoose.disconnect();
}

run().catch(console.error);
