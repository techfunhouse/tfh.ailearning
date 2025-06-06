import fs from 'fs/promises';
import path from 'path';

export class SimpleThumbnailService {
  static async createLoadingThumbnail(filename: string, title: string, category: string): Promise<void> {
    try {
      // Create a blue background with text overlay
      const sharp = await import('sharp');
      
      // Truncate text to fit in thumbnail
      const maxTitleLength = 25;
      const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title;
      const maxCategoryLength = 20;
      const displayCategory = category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category;
      
      // Create SVG with text
      const loadingSvg = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#667EEA"/>
          
          <!-- Loading indicator -->
          <circle cx="160" cy="60" r="15" fill="rgba(255,255,255,0.3)"/>
          <text x="160" y="66" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">⏳</text>
          
          <!-- Title -->
          <text x="160" y="95" font-family="Arial, sans-serif" font-size="13" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- Category -->
          <text x="160" y="115" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Status -->
          <text x="160" y="140" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            Generating screenshot...
          </text>
        </svg>
      `;
      
      const placeholderBuffer = await sharp.default(Buffer.from(loadingSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, placeholderBuffer);
      
      console.log(`Created loading thumbnail: ${filename}`);
    } catch (error) {
      console.error('Error creating loading thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }

  static async createSuccessThumbnail(filename: string, title: string, category: string): Promise<void> {
    try {
      // Create a simple green solid color JPG as success placeholder
      const sharp = await import('sharp');
      
      const successBuffer = await sharp.default({
        create: {
          width: 320,
          height: 180,
          channels: 3,
          background: { r: 86, g: 171, b: 47 } // Green color
        }
      })
      .jpeg({ quality: 90 })
      .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, successBuffer);
      
      console.log(`Created success thumbnail: ${filename}`);
    } catch (error) {
      console.error('Error creating success thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }

  static async createSimplePlaceholder(filename: string, title: string, category: string): Promise<void> {
    try {
      // Create a gray background with basic information
      const sharp = await import('sharp');
      
      // Truncate text to fit in thumbnail
      const maxTitleLength = 20;
      const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title;
      const maxCategoryLength = 16;
      const displayCategory = category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category;
      
      // Create SVG with basic information
      const placeholderSvg = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#808080"/>
          
          <!-- Placeholder indicator -->
          <circle cx="160" cy="60" r="12" fill="rgba(255,255,255,0.3)"/>
          <text x="160" y="65" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">📄</text>
          
          <!-- Title -->
          <text x="160" y="90" font-family="Arial, sans-serif" font-size="11" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- Category -->
          <text x="160" y="110" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Status -->
          <text x="160" y="130" font-family="Arial, sans-serif" font-size="8" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            No preview available
          </text>
        </svg>
      `;
      
      const placeholderBuffer = await sharp.default(Buffer.from(placeholderSvg))
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
      // Create a red background with error information
      const sharp = await import('sharp');
      
      // Truncate text to fit in thumbnail
      const maxTitleLength = 22;
      const displayTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title;
      const maxUrlLength = 35;
      const displayUrl = url.length > maxUrlLength ? url.substring(0, maxUrlLength) + '...' : url;
      const maxCategoryLength = 18;
      const displayCategory = category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category;
      
      // Create SVG with error information
      const errorSvg = `
        <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FF6B6B"/>
          
          <!-- Error indicator -->
          <circle cx="160" cy="45" r="12" fill="rgba(255,255,255,0.3)"/>
          <text x="160" y="50" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle">⚠</text>
          
          <!-- Title -->
          <text x="160" y="75" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- URL -->
          <text x="160" y="95" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.9)" text-anchor="middle">
            ${displayUrl}
          </text>
          
          <!-- Category -->
          <text x="160" y="115" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Error message -->
          <text x="160" y="140" font-family="Arial, sans-serif" font-size="9" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            Screenshot unavailable
          </text>
        </svg>
      `;
      
      const errorBuffer = await sharp.default(Buffer.from(errorSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, errorBuffer);
      
      console.log(`Created error thumbnail: ${filename}`);
    } catch (error) {
      console.error('Error creating error thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }
}