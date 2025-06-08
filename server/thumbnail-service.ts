import puppeteer from 'puppeteer';
import { chromium } from 'playwright';
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

export interface ThumbnailJob {
  id: string;
  referenceId: string;
  url: string;
  title: string;
  category: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: ThumbnailResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class ThumbnailService {
  private static browser: puppeteer.Browser | null = null;
  private static jobQueue: Map<string, ThumbnailJob> = new Map();
  private static processingQueue: boolean = false;
  private static eventCallbacks: Map<string, (job: ThumbnailJob) => void> = new Map();

  private static async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      // Detect if running locally or on Replit
      const isReplit = process.env.REPL_ID || process.env.REPLIT_ENV;
      
      const browserConfig: any = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-ipc-flooding-protection'
        ]
      };

      if (isReplit) {
        // Replit-specific configuration
        browserConfig.executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser';
        browserConfig.args.push('--no-zygote', '--single-process');
      } else {
        // Local development configuration - more permissive
        browserConfig.args.push(
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--disable-blink-features=AutomationControlled'
        );
      }

      this.browser = await puppeteer.launch(browserConfig);
    }
    return this.browser;
  }

  private static async generateScreenshot(url: string, retryCount = 0): Promise<Buffer | null> {
    const isLocal = !process.env.REPL_ID && !process.env.REPLIT_ENV;
    
    // Use Playwright for local development to avoid frame detachment issues
    if (isLocal) {
      return await this.generatePlaywrightScreenshot(url);
    }
    
    // Use Puppeteer for Replit environment
    return await this.generatePuppeteerScreenshot(url, retryCount);
  }

  private static async generatePlaywrightScreenshot(url: string): Promise<Buffer | null> {
    const strategies = [
      { name: 'HighRes', viewport: { width: 1920, height: 1080 }, timeout: 30000, waitTime: 4000 },
      { name: 'MediumRes', viewport: { width: 1280, height: 720 }, timeout: 20000, waitTime: 3000 },
      { name: 'BasicRes', viewport: { width: 1024, height: 576 }, timeout: 15000, waitTime: 2000 }
    ];

    for (const strategy of strategies) {
      let browser;
      let context;
      let page;
      
      try {
        console.log(`Attempting Playwright ${strategy.name} strategy for ${url}`);
        
        // Launch browser with progressive fallback configurations
        browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess',
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-blink-features=AutomationControlled',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-default-apps',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio'
          ]
        });
        
        // Create context with specific settings
        context = await browser.newContext({
          viewport: strategy.viewport,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          ignoreHTTPSErrors: true
        });
        
        page = await context.newPage();
        
        // Block unnecessary resources for faster loading
        await page.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (['font', 'media', 'websocket'].includes(resourceType)) {
            route.abort();
          } else {
            route.continue();
          }
        });
        
        // Navigate with progressive wait strategies
        if (url.includes('youtube.com') || url.includes('google')) {
          // Special handling for Google properties
          await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: strategy.timeout
          });
          await page.waitForTimeout(strategy.waitTime);
          
          // Try to dismiss cookie/privacy notices
          try {
            await page.click('[aria-label="Accept all"]', { timeout: 2000 });
          } catch {}
          try {
            await page.click('button:has-text("Accept")', { timeout: 2000 });
          } catch {}
        } else {
          // Standard navigation for other sites
          await page.goto(url, { 
            waitUntil: 'networkidle',
            timeout: strategy.timeout
          });
          await page.waitForTimeout(strategy.waitTime);
        }
        
        // Take screenshot with full viewport
        const screenshot = await page.screenshot({
          type: 'png',
          fullPage: false
        });
        
        await browser.close();
        
        // Process with Sharp for high-quality 640x360 output
        const resizedBuffer = await sharp(screenshot)
          .resize(640, 360, {
            kernel: sharp.kernel.lanczos3,
            fit: 'cover',
            position: 'top'
          })
          .jpeg({ 
            quality: 95, 
            progressive: true,
            mozjpeg: true
          })
          .toBuffer();
        
        console.log(`Successfully captured screenshot with ${strategy.name} strategy`);
        return resizedBuffer;
        
      } catch (error: any) {
        console.log(`${strategy.name} strategy failed for ${url}: ${error.message}`);
        
        if (browser) {
          try {
            await browser.close();
          } catch (closeError) {
            console.error('Error closing browser:', closeError);
          }
        }
        
        // Continue to next strategy
        continue;
      }
    }
    
    console.error(`All Playwright strategies failed for ${url}`);
    return null;
  }

  private static async generatePuppeteerScreenshot(url: string, retryCount = 0): Promise<Buffer | null> {
    const maxRetries = 3;
    let page;
    
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // High-resolution viewport for Replit
      await page.setViewport({ 
        width: 1920, 
        height: 1080,
        deviceScaleFactor: 3
      });
      
      // Set extra headers to avoid detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Navigate with timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080 },
        optimizeForSpeed: false
      });
      
      await page.close();
      
      // Process with Sharp for high quality
      const sharp = await import('sharp');
      const resizedBuffer = await sharp.default(screenshot)
        .resize(640, 360, {
          kernel: sharp.default.kernel.lanczos3,
          fit: 'cover',
          position: 'top'
        })
        .jpeg({ 
          quality: 90, 
          progressive: true,
          mozjpeg: true
        })
        .toBuffer();
      
      return resizedBuffer;
    } catch (error: any) {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('Error closing page:', closeError);
        }
      }
      
      // Handle frame detachment and other errors with retries
      if (retryCount < maxRetries) {
        if (error?.message?.includes('frame was detached') || 
            error?.message?.includes('Navigation timeout') ||
            error?.message?.includes('Target closed')) {
          console.log(`Retry ${retryCount + 1}/${maxRetries} for ${url} due to: ${error.message}`);
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          
          return await this.generatePuppeteerScreenshot(url, retryCount + 1);
        }
      }
      
      console.error(`Failed to capture screenshot for ${url}:`, error);
      return null;
    }
  }

  private static async generateSimpleScreenshot(url: string): Promise<Buffer | null> {
    let page;
    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();
      
      // High-resolution viewport even for simple approach
      await page.setViewport({ 
        width: 1280, 
        height: 720,
        deviceScaleFactor: 2
      });
      
      // Simpler navigation without waiting for network idle
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      // Shorter wait time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false
      });
      
      await page.close();
      
      // Resize with Sharp for consistent quality
      const sharp = await import('sharp');
      const resizedBuffer = await sharp.default(screenshot)
        .resize(640, 360, {
          kernel: sharp.default.kernel.lanczos3,
          fit: 'cover',
          position: 'top'
        })
        .jpeg({ 
          quality: 85, 
          progressive: true
        })
        .toBuffer();
      
      return resizedBuffer;
    } catch (error) {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('Error closing page in simple screenshot:', closeError);
        }
      }
      console.error('Simple screenshot generation also failed:', error);
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
    
    // Escape XML entities properly
    const escapeXml = (text: string) => {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };
    
    // Truncate title if too long and escape XML entities
    const safeTruncatedTitle = escapeXml(title.length > 50 ? title.substring(0, 47) + '...' : title);
    const safeCategory = escapeXml(category);
    const safeDomain = escapeXml(domain);

    return `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
          </linearGradient>
          <pattern id="dots" patternUnits="userSpaceOnUse" width="40" height="40">
            <circle cx="20" cy="20" r="4" fill="rgba(255,255,255,0.1)"/>
          </pattern>
        </defs>
        <rect width="640" height="360" fill="url(#bg)"/>
        <rect width="640" height="360" fill="url(#dots)"/>
        <rect x="20" y="20" width="${Math.min(safeCategory.length * 16 + 40, 300)}" height="50" rx="8" fill="rgba(0,0,0,0.3)"/>
        <text x="40" y="54" font-family="Arial, sans-serif" font-size="24" fill="white">${safeCategory}</text>
        <text x="320" y="180" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">
          <tspan x="320" dy="0">${safeTruncatedTitle}</tspan>
        </text>
        <text x="320" y="320" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">Screenshot Unavailable</text>
      </svg>`;
  }

  // Create loading thumbnail file that shows generation in progress
  static async createLoadingThumbnail(filename: string, title: string, category: string): Promise<void> {
    const loadingSvg = `
    <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#grad)"/>
      <circle cx="320" cy="140" r="30" fill="none" stroke="white" stroke-width="4">
        <animateTransform attributeName="transform" type="rotate" values="0 320 140;360 320 140" dur="2s" repeatCount="indefinite"/>
      </circle>
      <text x="320" y="220" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
        ${title.length > 50 ? title.substring(0, 50) + '...' : title}
      </text>
      <text x="320" y="260" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Generating thumbnail...
      </text>
      <text x="320" y="300" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.6)" text-anchor="middle">
        ${category}
      </text>
    </svg>`;
    
    // Save SVG directly as loading thumbnail
    const svgBuffer = Buffer.from(loadingSvg);
    
    const fs = await import('fs');
    const path = await import('path');
    
    const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
    await fs.promises.mkdir(thumbnailsDir, { recursive: true });
    
    const filepath = path.join(thumbnailsDir, filename.replace('.jpg', '.svg'));
    await fs.promises.writeFile(filepath, svgBuffer);
    
    console.log(`Created loading thumbnail: ${filename}`);
  }

  // Generate thumbnail and overwrite the existing file
  static async generateThumbnailToFile(url: string, title: string, category: string, filename: string): Promise<void> {
    console.log(`Starting thumbnail generation for ${filename}`);
    
    // Generate in background with timeout
    setTimeout(async () => {
      try {
        const result = await Promise.race([
          this.generateThumbnailSync(url, title, category),
          new Promise<ThumbnailResult>((_, reject) => 
            setTimeout(() => reject(new Error('Thumbnail generation timeout')), 300000) // 5 minutes
          )
        ]);
        
        const fs = await import('fs');
        const path = await import('path');
        const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
        const filepath = path.join(thumbnailsDir, filename);
        
        if (result.success && result.thumbnailPath.startsWith('/thumbnails/')) {
          // Copy the generated file to our target filename
          const sourcePath = path.join(process.cwd(), 'client/public' + result.thumbnailPath);
          try {
            await fs.promises.copyFile(sourcePath, filepath);
            // Clean up the temporary file
            await fs.promises.unlink(sourcePath);
            console.log(`Successfully generated thumbnail: ${filename}`);
            
            // Trigger cache invalidation to refresh UI
            await this.triggerThumbnailRefresh(filename);
          } catch (copyError) {
            console.error(`Failed to copy thumbnail file:`, copyError);
            await this.createFailureThumbnail(filename, title, category, url);
            await this.triggerThumbnailRefresh(filename);
          }
        } else {
          // Generation failed, create failure thumbnail to replace loading thumbnail
          await this.createFailureThumbnail(filename, title, category, url);
          await this.triggerThumbnailRefresh(filename);
        }
      } catch (error) {
        console.error(`Thumbnail generation failed for ${filename}:`, error);
        // Create failure thumbnail to replace loading thumbnail
        await this.createFailureThumbnail(filename, title, category, url);
        await this.triggerThumbnailRefresh(filename);
      }
    }, 100); // Small delay to ensure reference is saved first
  }

  // Create failure thumbnail with title, URL, and category
  static async createFailureThumbnail(filename: string, title: string, category: string, url: string): Promise<void> {
    const safeTruncatedTitle = (title || 'Untitled').replace(/[<>&"']/g, ' ').substring(0, 50);
    const safeDomain = url.replace(/^https?:\/\//, '').split('/')[0].substring(0, 40);
    
    const failureSvg = `
    <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="failGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#ee5a52;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#failGrad)"/>
      <text x="320" y="120" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="white" text-anchor="middle">
        ${safeTruncatedTitle}
      </text>
      <text x="320" y="180" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.9)" text-anchor="middle">
        ${safeDomain}
      </text>
      <text x="320" y="240" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.7)" text-anchor="middle">
        ${category}
      </text>
      <text x="320" y="300" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        Preview unavailable
      </text>
    </svg>`;
    
    const svgBuffer = Buffer.from(failureSvg);
    
    const fs = await import('fs');
    const path = await import('path');
    
    const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
    const filepath = path.join(thumbnailsDir, filename.replace('.jpg', '.svg'));
    await fs.promises.writeFile(filepath, svgBuffer);
    
    console.log(`Created failure thumbnail: ${filename}`);
  }

  // Trigger UI refresh by updating file timestamp and broadcasting change
  static async triggerThumbnailRefresh(filename: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filepath = path.join(process.cwd(), 'client/public/thumbnails', filename);
      
      // Update file timestamp to trigger browser cache invalidation
      const now = new Date();
      await fs.promises.utimes(filepath, now, now);
      
      console.log(`Triggered thumbnail refresh for: ${filename}`);
      
      // Broadcast thumbnail update event (can be used by SSE or WebSocket)
      this.broadcastThumbnailUpdate(filename);
    } catch (error) {
      console.error(`Failed to trigger thumbnail refresh:`, error);
    }
  }

  // Broadcast thumbnail update to connected clients
  static broadcastThumbnailUpdate(filename: string): void {
    // This can be extended to use WebSocket or SSE for real-time updates
    console.log(`Broadcasting thumbnail update: ${filename}`);
    
    // For now, we rely on the browser's natural cache-busting mechanisms
    // and the fact that React Query will refetch on focus/visibility changes
  }

  static getJobStatus(jobId: string): ThumbnailJob | undefined {
    return this.jobQueue.get(jobId);
  }

  static onJobUpdate(jobId: string, callback: (job: ThumbnailJob) => void): void {
    this.eventCallbacks.set(jobId, callback);
  }

  static removeJobListener(jobId: string): void {
    this.eventCallbacks.delete(jobId);
  }

  private static notifyJobUpdate(job: ThumbnailJob): void {
    console.log(`[ThumbnailService] Notifying job update for ${job.id}: ${job.status}`);
    const callback = this.eventCallbacks.get(job.id);
    if (callback) {
      console.log(`[ThumbnailService] Executing callback for job ${job.id}, status: ${job.status}, success: ${job.result?.success}`);
      console.log(`[ThumbnailService] Job details:`, { 
        id: job.id, 
        status: job.status, 
        result: job.result ? { success: job.result.success, thumbnailPath: job.result.thumbnailPath } : null 
      });
      try {
        callback(job);
        console.log(`[ThumbnailService] Callback executed successfully for ${job.id}`);
      } catch (error) {
        console.error(`[ThumbnailService] Callback execution failed for ${job.id}:`, error);
      }
    } else {
      console.log(`[ThumbnailService] No callback found for job ${job.id}`);
    }
  }

  private static async processQueue(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    
    while (this.jobQueue.size > 0) {
      const pendingJobs = Array.from(this.jobQueue.values()).filter(job => job.status === 'pending');
      
      if (pendingJobs.length === 0) {
        break;
      }
      
      const job = pendingJobs[0];
      await this.processJob(job);
    }
    
    this.processingQueue = false;
  }

  private static async processJob(job: ThumbnailJob): Promise<void> {
    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      this.notifyJobUpdate(job);
      
      // Generate thumbnail with extended timeout
      const result = await Promise.race([
        this.generateThumbnailSync(job.url, job.title, job.category),
        new Promise<ThumbnailResult>((_, reject) => 
          setTimeout(() => reject(new Error('Thumbnail generation timeout')), 300000) // 5 minutes timeout
        )
      ]);
      
      // Update job with result
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      this.notifyJobUpdate(job);
      
    } catch (error) {
      console.error(`Thumbnail generation failed for job ${job.id}:`, error);
      
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.notifyJobUpdate(job);
    }
  }

  static async generateThumbnailSync(url: string, title: string, category: string, existingThumbnail?: string): Promise<ThumbnailResult> {
    // Clean up existing thumbnail if provided
    if (existingThumbnail && existingThumbnail.startsWith('/thumbnails/')) {
      this.deleteThumbnail(existingThumbnail);
    }
    
    const filename = `${uuidv4()}.jpg`;
    const filePath = path.join(thumbnailsDir, filename);
    const thumbnailPath = `/thumbnails/${filename}`;

    try {
      // Try screenshot first
      const screenshot = await this.generateScreenshot(url);
      
      if (screenshot) {
        // Resize screenshot to larger thumbnail size with high quality JPEG
        const resizedScreenshot = await sharp(screenshot)
          .resize(640, 360, { fit: 'cover', position: 'top' })
          .jpeg({ quality: 95, progressive: true })
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
      const jpegBuffer = await sharp(Buffer.from(svg))
        .jpeg({ quality: 90, progressive: true })
        .toBuffer();
      
      fs.writeFileSync(filePath, jpegBuffer);
      
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

  // Legacy method for backward compatibility
  static async generateThumbnail(url: string, title: string, category: string, existingThumbnail?: string): Promise<ThumbnailResult> {
    return this.generateThumbnailSync(url, title, category, existingThumbnail);
  }

  // Generate placeholder thumbnail
  static generatePlaceholderThumbnail(): string {
    return '/api/placeholder/generating-thumbnail';
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