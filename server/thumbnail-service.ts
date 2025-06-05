import puppeteer from 'puppeteer';
import { createCanvas, loadImage } from 'canvas';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ensure thumbnails directory exists
const thumbnailsDir = path.join(process.cwd(), 'client', 'public', 'thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

export interface ThumbnailResult {
  success: boolean;
  thumbnailPath: string;
  method: 'screenshot' | 'generated' | 'fallback';
  error?: string;
}

export class ThumbnailService {
  private static browser: puppeteer.Browser | null = null;

  // Initialize browser instance
  private static async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
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
    }
    return this.browser;
  }

  // Generate thumbnail using Puppeteer screenshot
  private static async generateScreenshot(url: string): Promise<Buffer | null> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      await page.setViewport({ width: 1200, height: 630 });
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: 10000 
      });
      
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false
      });
      
      await page.close();
      return screenshot as Buffer;
    } catch (error) {
      console.error('Screenshot generation failed:', error);
      return null;
    }
  }

  // Generate thumbnail using Canvas with site info
  private static async generateCanvasThumbnail(url: string, title: string, category: string): Promise<Buffer> {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    // Category colors
    const categoryColors: Record<string, string> = {
      'Programming': '#3b82f6',
      'Design': '#f59e0b',
      'Research': '#10b981',
      'Tools': '#8b5cf6',
      'default': '#6b7280'
    };

    const bgColor = categoryColors[category] || categoryColors.default;
    
    // Create gradient background
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, '#1f2937');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // Add overlay pattern
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 1200; i += 60) {
      for (let j = 0; j < 630; j += 60) {
        if ((i + j) % 120 === 0) {
          ctx.fillRect(i, j, 30, 30);
        }
      }
    }
    ctx.globalAlpha = 1;
    
    // Add title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Wrap text if too long
    const maxWidth = 1000;
    const words = title.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    
    // Draw title lines
    const lineHeight = 60;
    const startY = 315 - ((lines.length - 1) * lineHeight) / 2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 600, startY + index * lineHeight);
    });
    
    // Add category badge
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(category, 600, 520);
    
    // Add domain
    try {
      const domain = new URL(url).hostname;
      ctx.font = '20px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText(domain, 600, 560);
    } catch (error) {
      // Invalid URL, skip domain
    }
    
    return canvas.toBuffer('image/png');
  }

  // Main thumbnail generation function
  static async generateThumbnail(url: string, title: string, category: string): Promise<ThumbnailResult> {
    const thumbnailId = uuidv4();
    const filename = `${thumbnailId}.png`;
    const filePath = path.join(thumbnailsDir, filename);
    const relativePath = `/thumbnails/${filename}`;

    try {
      // First, try screenshot generation
      const screenshot = await this.generateScreenshot(url);
      
      if (screenshot) {
        // Resize and optimize screenshot
        const optimizedImage = await sharp(screenshot)
          .resize(1200, 630, { fit: 'cover' })
          .png({ quality: 80 })
          .toBuffer();
        
        fs.writeFileSync(filePath, optimizedImage);
        
        return {
          success: true,
          thumbnailPath: relativePath,
          method: 'screenshot'
        };
      } else {
        // Fallback to canvas generation
        const canvasImage = await this.generateCanvasThumbnail(url, title, category);
        
        const optimizedImage = await sharp(canvasImage)
          .png({ quality: 80 })
          .toBuffer();
        
        fs.writeFileSync(filePath, optimizedImage);
        
        return {
          success: true,
          thumbnailPath: relativePath,
          method: 'generated'
        };
      }
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      
      // Final fallback - create simple branded thumbnail
      try {
        const fallbackImage = await this.generateCanvasThumbnail(url, title, category);
        fs.writeFileSync(filePath, fallbackImage);
        
        return {
          success: true,
          thumbnailPath: relativePath,
          method: 'fallback'
        };
      } catch (fallbackError) {
        return {
          success: false,
          thumbnailPath: '',
          method: 'fallback',
          error: `Failed to generate thumbnail: ${fallbackError}`
        };
      }
    }
  }

  // Delete thumbnail file
  static deleteThumbnail(thumbnailPath: string): void {
    try {
      if (thumbnailPath.startsWith('/thumbnails/')) {
        const filename = path.basename(thumbnailPath);
        const filePath = path.join(thumbnailsDir, filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted thumbnail: ${filename}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete thumbnail:', error);
    }
  }

  // Cleanup browser on shutdown
  static async cleanup(): void {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await ThumbnailService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await ThumbnailService.cleanup();
  process.exit(0);
});