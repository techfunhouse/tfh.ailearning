import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { CDPThumbnailService } from './cdp-thumbnail.js';

export class SimpleThumbnailService {
  private static processingQueue: Array<() => Promise<void>> = [];
  private static isProcessing = false;

  static async createLoadingThumbnail(filename: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating loading thumbnail: ${filename}`);
    try {
      // Create a blue background with text overlay
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      
      // Truncate and escape text for XML safety
      const maxTitleLength = 25;
      const displayTitle = (title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const maxCategoryLength = 20;
      const displayCategory = (category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Create SVG with text at 1024x768 resolution
      const loadingSvg = `
        <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#667EEA"/>
          
          <!-- Loading indicator -->
          <circle cx="512" cy="250" r="40" fill="rgba(255,255,255,0.3)"/>
          <text x="512" y="270" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle">⏳</text>
          
          <!-- Title -->
          <text x="512" y="350" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- Category -->
          <text x="512" y="400" font-family="Arial, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Status -->
          <text x="512" y="480" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            Generating screenshot...
          </text>
        </svg>
      `;
      
      const placeholderBuffer = await sharp(Buffer.from(loadingSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, placeholderBuffer);
      
      console.log(`[THUMBNAIL DEBUG] Created loading thumbnail JPG: ${filename}`);
    } catch (error) {
      console.error('[THUMBNAIL DEBUG] Error creating loading thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }

  static async createSuccessThumbnail(filename: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating success thumbnail: ${filename}`);
    try {
      // Create a simple green solid color JPG as success placeholder
      const sharpModule = await import('sharp'); 
      const sharp = sharpModule.default || sharpModule;
      
      const successBuffer = await sharp({
        create: {
          width: 1024,
          height: 768,
          channels: 3,
          background: { r: 86, g: 171, b: 47 } // Green color
        }
      })
      .jpeg({ quality: 90 })
      .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, successBuffer);
      
      console.log(`[THUMBNAIL DEBUG] Created success thumbnail JPG: ${filename}`);
    } catch (error) {
      console.error('[THUMBNAIL DEBUG] Error creating success thumbnail:', error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }

  static async createSimplePlaceholder(filename: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating simple placeholder: ${filename}`);
    try {
      // Create a gray background with basic information
      const sharpModule = await import('sharp'); 
      const sharp = sharpModule.default || sharpModule;
      
      // Truncate and escape text for XML safety
      const maxTitleLength = 20;
      const displayTitle = (title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const maxCategoryLength = 16;
      const displayCategory = (category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Create SVG with basic information at 1024x768
      const placeholderSvg = `
        <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#808080"/>
          
          <!-- Placeholder indicator -->
          <circle cx="512" cy="250" r="32" fill="rgba(255,255,255,0.3)"/>
          <text x="512" y="270" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">📄</text>
          
          <!-- Title -->
          <text x="512" y="350" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- Category -->
          <text x="512" y="400" font-family="Arial, sans-serif" font-size="22" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Status -->
          <text x="512" y="480" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            No preview available
          </text>
        </svg>
      `;
      
      const placeholderBuffer = await sharp(Buffer.from(placeholderSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, placeholderBuffer);
      
      console.log(`[THUMBNAIL DEBUG] Created simple placeholder JPG: ${filename}`);
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] Error creating simple placeholder:`, error);
    }
  }

  static generateThumbnailAsync(filename: string, title: string, category: string, url?: string): void {
    console.log(`[THUMBNAIL DEBUG] Queuing thumbnail generation for: ${filename}, URL: ${url}`);
    
    this.processingQueue.push(async () => {
      try {
        if (url) {
          console.log(`[THUMBNAIL DEBUG] Starting real screenshot for: ${filename}`);
          await this.createRealScreenshot(filename, url, title, category);
        } else {
          console.log(`[THUMBNAIL DEBUG] No URL provided, creating placeholder for: ${filename}`);
          await this.createSimplePlaceholder(filename, title, category);
        }
      } catch (error) {
        console.error(`[THUMBNAIL DEBUG] Failed to generate thumbnail for ${filename}:`, error);
        await this.createErrorThumbnail(filename, title, category, url || '');
      }
    });

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[THUMBNAIL DEBUG] Processing queue with ${this.processingQueue.length} items`);

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('[THUMBNAIL DEBUG] Task failed:', error);
        }
      }
    }

    this.isProcessing = false;
    console.log('[THUMBNAIL DEBUG] Queue processing completed');
  }

  static async createRealScreenshot(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating real screenshot for: ${filename} from ${url}`);
    
    try {
      // Try CDP method first
      console.log(`[THUMBNAIL DEBUG] Attempting CDP screenshot for: ${url}`);
      const success = await CDPThumbnailService.takeScreenshot(url, filename);
      
      if (success) {
        console.log(`[THUMBNAIL DEBUG] CDP screenshot successful: ${filename}`);
        return;
      }
      
      console.log(`[THUMBNAIL DEBUG] CDP failed, trying fallback methods for: ${url}`);
      
      // Try specific fallbacks based on URL type
      if (url.includes('linkedin.com')) {
        await this.createLinkedInScreenshotFallback(filename, url, title, category);
      } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
        await this.createYouTubeScreenshotFallback(filename, url, title, category);
      } else {
        await this.createSimpleScreenshotFallback(filename, url, title, category);
      }
      
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] All screenshot methods failed for ${url}:`, error);
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static async createLinkedInScreenshotFallback(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating LinkedIn fallback for: ${filename}`);
    
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      
      const linkedInSvg = `
        <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0A66C2"/>
          
          <!-- LinkedIn logo area -->
          <circle cx="512" cy="250" r="50" fill="rgba(255,255,255,0.2)"/>
          <text x="512" y="270" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle">💼</text>
          
          <!-- Title -->
          <text x="512" y="350" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">
            LinkedIn Content
          </text>
          
          <!-- URL -->
          <text x="512" y="400" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${url.length > 60 ? url.substring(0, 60) + '...' : url}
          </text>
          
          <!-- Category -->
          <text x="512" y="480" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)" text-anchor="middle">
            ${category}
          </text>
        </svg>
      `;
      
      const buffer = await sharp(Buffer.from(linkedInSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, buffer);
      
      console.log(`[THUMBNAIL DEBUG] Created LinkedIn fallback JPG: ${filename}`);
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] LinkedIn fallback failed:`, error);
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static async createYouTubeScreenshotFallback(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating YouTube fallback for: ${filename}`);
    
    try {
      // Extract video ID for potential thumbnail URL
      const videoId = this.extractYouTubeVideoId(url);
      console.log(`[THUMBNAIL DEBUG] Extracted YouTube video ID: ${videoId}`);
      
      if (videoId) {
        await this.createYouTubeEnhancedPlaceholder(filename, url, title, category);
      } else {
        await this.createSimpleScreenshotFallback(filename, url, title, category);
      }
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] YouTube fallback failed:`, error);
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static async createYouTubeEnhancedPlaceholder(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating YouTube enhanced placeholder for: ${filename}`);
    
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      
      const youtubeSvg = `
        <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FF0000"/>
          
          <!-- YouTube logo area -->
          <circle cx="512" cy="250" r="50" fill="rgba(255,255,255,0.2)"/>
          <text x="512" y="270" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle">▶️</text>
          
          <!-- Title -->
          <text x="512" y="350" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle" font-weight="bold">
            ${this.truncateText(title, 40)}
          </text>
          
          <!-- URL -->
          <text x="512" y="400" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            YouTube Video
          </text>
          
          <!-- Category -->
          <text x="512" y="480" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)" text-anchor="middle">
            ${category}
          </text>
        </svg>
      `;
      
      const buffer = await sharp(Buffer.from(youtubeSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, buffer);
      
      console.log(`[THUMBNAIL DEBUG] Created YouTube enhanced placeholder JPG: ${filename}`);
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] YouTube enhanced placeholder failed:`, error);
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static extractYouTubeVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  static truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  static async createSimpleScreenshotFallback(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating simple screenshot fallback for: ${filename}`);
    
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      
      const simpleSvg = `
        <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#4F46E5"/>
          
          <!-- Web icon -->
          <circle cx="512" cy="250" r="40" fill="rgba(255,255,255,0.2)"/>
          <text x="512" y="270" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">🌐</text>
          
          <!-- Title -->
          <text x="512" y="350" font-family="Arial, sans-serif" font-size="26" fill="white" text-anchor="middle" font-weight="bold">
            ${this.truncateText(title, 35)}
          </text>
          
          <!-- URL -->
          <text x="512" y="400" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${this.truncateText(url, 70)}
          </text>
          
          <!-- Category -->
          <text x="512" y="480" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)" text-anchor="middle">
            ${category}
          </text>
        </svg>
      `;
      
      const buffer = await sharp(Buffer.from(simpleSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, buffer);
      
      console.log(`[THUMBNAIL DEBUG] Created simple fallback JPG: ${filename}`);
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] Simple fallback failed:`, error);
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static async createErrorThumbnail(filename: string, title: string, category: string, url: string): Promise<void> {
    console.log(`[THUMBNAIL DEBUG] Creating error thumbnail for: ${filename}`);
    
    try {
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      
      const maxTitleLength = 30;
      const displayTitle = (title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      const maxUrlLength = 50;
      const displayUrl = (url.length > maxUrlLength ? url.substring(0, maxUrlLength) + '...' : url)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      const maxCategoryLength = 20;
      const displayCategory = (category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      const errorSvg = `
        <svg width="1024" height="768" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#DC2626"/>
          
          <!-- Error indicator -->
          <circle cx="512" cy="200" r="40" fill="rgba(255,255,255,0.2)"/>
          <text x="512" y="220" font-family="Arial, sans-serif" font-size="32" fill="white" text-anchor="middle">⚠️</text>
          
          <!-- Title -->
          <text x="512" y="300" font-family="Arial, sans-serif" font-size="26" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- URL -->
          <text x="512" y="350" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayUrl}
          </text>
          
          <!-- Category -->
          <text x="512" y="400" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.9)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Error message -->
          <text x="512" y="480" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            Screenshot generation failed
          </text>
        </svg>
      `;
      
      const errorBuffer = await sharp(Buffer.from(errorSvg))
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, errorBuffer);
      
      console.log(`[THUMBNAIL DEBUG] Created error thumbnail JPG: ${filename}`);
    } catch (error) {
      console.error(`[THUMBNAIL DEBUG] Error creating error thumbnail:`, error);
      await this.createSimplePlaceholder(filename, title, category);
    }
  }
}