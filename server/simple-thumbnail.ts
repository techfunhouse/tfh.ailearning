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

  static generateThumbnailAsync(filename: string, title: string, category: string, url?: string): void {
    // Generate real screenshot in background
    setTimeout(async () => {
      if (url) {
        await this.createRealScreenshot(filename, url, title, category);
      } else {
        await this.createSuccessThumbnail(filename, title, category);
      }
    }, 3000);
  }

  static async createRealScreenshot(filename: string, url: string, title: string, category: string): Promise<void> {
    try {
      console.log(`Starting real screenshot generation for: ${url}`);
      
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.default.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });

      const page = await browser.newPage();
      
      // Set higher resolution viewport for better quality (matching working version)
      await page.setViewport({ 
        width: 1920, 
        height: 1008,
        deviceScaleFactor: 2 // Higher DPI for crisp images
      });
      
      try {
        // Navigate to the URL with extended timeout (matching working version)
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 120000  // 2 minutes timeout
        });
        
        // Wait for content to load fully (matching working version)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Take screenshot with original working settings
        const screenshotBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 85, // Good balance between quality and file size
          clip: { x: 0, y: 0, width: 1920, height: 1008 }
        });

        await page.close();
        await browser.close();

        // Resize screenshot to thumbnail size using Sharp
        const sharp = await import('sharp');
        const thumbnailBuffer = await sharp.default(screenshotBuffer)
          .resize(320, 180, { fit: 'cover' })
          .jpeg({ quality: 90 })
          .toBuffer();

        // Save the real screenshot
        const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
        const filepath = path.join(thumbnailsDir, filename);
        await fs.writeFile(filepath, thumbnailBuffer);
        
        console.log(`Created real screenshot thumbnail: ${filename}`);
        
      } catch (pageError) {
        console.error(`Failed to capture screenshot for ${url}:`, pageError);
        await browser.close();
        
        // Fallback to error thumbnail
        await this.createErrorThumbnail(filename, title, category, url);
      }
      
    } catch (error) {
      console.error('Error creating real screenshot:', error);
      // Fallback to error thumbnail
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static async createErrorThumbnail(filename: string, title: string, category: string, url: string): Promise<void> {
    try {
      const sharp = await import('sharp');
      
      const errorSvg = `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="errorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ee5a52;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#errorGradient)" />
        <circle cx="160" cy="60" r="15" fill="rgba(255,255,255,0.3)" />
        <text x="160" y="66" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">⚠</text>
        <text x="160" y="90" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle" font-weight="bold">
          ${title.length > 35 ? title.substring(0, 35) + '...' : title}
        </text>
        <text x="160" y="110" font-family="Arial, sans-serif" font-size="8" fill="rgba(255,255,255,0.9)" text-anchor="middle">
          ${url.length > 40 ? url.substring(0, 40) + '...' : url}
        </text>
        <text x="160" y="130" font-family="Arial, sans-serif" font-size="8" fill="rgba(255,255,255,0.7)" text-anchor="middle">
          ${category}
        </text>
        <text x="160" y="150" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
          Preview unavailable
        </text>
      </svg>`;
      
      // Convert SVG to JPG
      const jpgBuffer = await sharp.default(Buffer.from(errorSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, jpgBuffer);
      
      console.log(`Created error thumbnail: ${filename}`);
    } catch (error) {
      console.error('Error creating error thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }
}