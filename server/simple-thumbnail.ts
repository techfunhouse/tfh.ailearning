import fs from 'fs/promises';
import path from 'path';

export class SimpleThumbnailService {
  static async createLoadingThumbnail(filename: string, title: string, category: string): Promise<void> {
    try {
      // Create a simple placeholder JPG using canvas-like approach with sharp
      const sharp = await import('sharp');
      
      // Create a gradient background image
      const width = 320;
      const height = 180;
      
      // Create SVG for conversion to JPG
      const loadingSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#gradient)" />
        <circle cx="160" cy="70" r="20" fill="rgba(255,255,255,0.3)" />
        <text x="160" y="76" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">⏳</text>
        <text x="160" y="110" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="bold">
          ${title.length > 30 ? title.substring(0, 30) + '...' : title}
        </text>
        <text x="160" y="130" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
          ${category}
        </text>
      </svg>`;
      
      // Convert SVG to JPG
      const jpgBuffer = await sharp.default(Buffer.from(loadingSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, jpgBuffer);
      
      console.log(`Created loading thumbnail: ${filename}`);
    } catch (error) {
      console.error('Error creating loading thumbnail:', error);
      // Fallback: create a simple placeholder
      await this.createSimplePlaceholder(filename, title, category);
    }
  }

  static async createSuccessThumbnail(filename: string, title: string, category: string): Promise<void> {
    try {
      const sharp = await import('sharp');
      
      const successSvg = `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#56ab2f;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#a8e6cf;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#successGradient)" />
        <circle cx="160" cy="70" r="20" fill="rgba(255,255,255,0.3)" />
        <text x="160" y="76" font-family="Arial, sans-serif" font-size="16" fill="white" text-anchor="middle">✓</text>
        <text x="160" y="110" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="bold">
          ${title.length > 30 ? title.substring(0, 30) + '...' : title}
        </text>
        <text x="160" y="130" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
          ${category}
        </text>
        <text x="160" y="150" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
          Screenshot ready
        </text>
      </svg>`;
      
      // Convert SVG to JPG
      const jpgBuffer = await sharp.default(Buffer.from(successSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, jpgBuffer);
      
      console.log(`Created success thumbnail: ${filename}`);
    } catch (error) {
      console.error('Error creating success thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }

  static async createSimplePlaceholder(filename: string, title: string, category: string): Promise<void> {
    try {
      // Create a basic solid color JPG as fallback
      const sharp = await import('sharp');
      
      const placeholderBuffer = await sharp.default({
        create: {
          width: 320,
          height: 180,
          channels: 3,
          background: { r: 102, g: 126, b: 234 }
        }
      })
      .jpeg({ quality: 90 })
      .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, placeholderBuffer);
      
      console.log(`Created simple placeholder: ${filename}`);
    } catch (error) {
      console.error('Error creating simple placeholder:', error);
    }
  }

  static generateThumbnailAsync(filename: string, title: string, category: string): void {
    // Simulate background processing - replace with success after 3 seconds
    setTimeout(async () => {
      await this.createSuccessThumbnail(filename, title, category);
    }, 3000);
  }
}