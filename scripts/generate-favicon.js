import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateFavicons() {
  const svgPath = path.join(__dirname, '../client/public/favicon.svg');
  const outputDir = path.join(__dirname, '../client/public');
  
  // Read the SVG file
  const svgBuffer = fs.readFileSync(svgPath);
  
  // Generate different sizes
  const sizes = [
    { name: 'favicon.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'android-chrome-192x192.png', size: 192 },
    { name: 'android-chrome-512x512.png', size: 512 }
  ];
  
  console.log('Generating favicon files...');
  
  for (const { name, size } of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(outputDir, name));
      
      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }
  
  console.log('\nFavicon generation complete!');
}

generateFavicons().catch(console.error); 