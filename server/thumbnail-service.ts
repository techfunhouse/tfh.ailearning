import puppeteer from 'puppeteer';
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
        clip: { x: 0, y: 0, width: 1200, height: 630 }
      });
      
      await page.close();
      return screenshot as Buffer;
    } catch (error) {
      console.error('Screenshot generation failed:', error);
      return null;
    }
  }

  private static generateSVGThumbnail(url: string, title: string, category: string): string {
    // Category colors
    const categoryColors: Record<string, string> = {
      'AI & Machine Learning': '#8B5CF6',
      'Web Development': '#3B82F6',
      'Design': '#EC4899',
      'Productivity': '#10B981',
      'Marketing': '#F59E0B',
      'Business': '#EF4444',
      'Education': '#06B6D4',
      'Technology': '#6366F1',
      'default': '#6B7280'
    };

    const color = categoryColors[category] || categoryColors.default;
    let domain = '';
    try {
      domain = new URL(url).hostname;
    } catch {
      domain = 'Unknown';
    }
    
    // Truncate title if too long
    const truncatedTitle = title.length > 50 ? title.substring(0, 47) + '...' : title;

    return `
      <svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
          </linearGradient>
          <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.1)"/>
          </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="320" height="180" fill="url(#bg)"/>
        <rect width="320" height="180" fill="url(#dots)"/>
        
        <!-- Category badge -->
        <rect x="10" y="10" width="${Math.min(category.length * 8 + 20, 150)}" height="25" rx="4" fill="rgba(0,0,0,0.3)"/>
        <text x="20" y="27" font-family="Arial, sans-serif" font-size="12" fill="white">${category}</text>
        
        <!-- Title -->
        <text x="160" y="90" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">
          <tspan x="160" dy="0">${truncatedTitle}</tspan>
        </text>
        
        <!-- Domain -->
        <text x="160" y="160" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">${domain}</text>
      </svg>
    `;
  }

  static async generateThumbnail(url: string, title: string, category: string): Promise<ThumbnailResult> {
    const filename = `${uuidv4()}.png`;
    const filePath = path.join(thumbnailsDir, filename);
    const thumbnailPath = `/thumbnails/${filename}`;

    try {
      // Try screenshot first
      const screenshot = await this.generateScreenshot(url);
      
      if (screenshot) {
        // Resize screenshot to thumbnail size
        const resizedScreenshot = await sharp(screenshot)
          .resize(320, 180, { fit: 'cover', position: 'top' })
          .png()
          .toBuffer();
        
        fs.writeFileSync(filePath, resizedScreenshot);
        
        return {
          success: true,
          thumbnailPath,
          method: 'screenshot'
        };
      }
    } catch (error) {
      console.error('Screenshot method failed:', error);
    }

    try {
      // Fallback to SVG generation
      const svg = this.generateSVGThumbnail(url, title, category);
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
      
      fs.writeFileSync(filePath, pngBuffer);
      
      return {
        success: true,
        thumbnailPath,
        method: 'generated'
      };
    } catch (error) {
      console.error('SVG generation failed:', error);
      
      return {
        success: false,
        thumbnailPath: '/api/placeholder/320/180',
        method: 'fallback',
        error: `Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static deleteThumbnail(thumbnailPath: string): void {
    try {
      if (thumbnailPath.startsWith('/thumbnails/')) {
        const filename = thumbnailPath.replace('/thumbnails/', '');
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

  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Cleanup on process exit
process.on('exit', () => {
  ThumbnailService.cleanup();
});