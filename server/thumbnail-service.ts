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

      try {
        this.browser = await puppeteer.launch(browserConfig);
        
        // Set up browser-level error handling
        this.browser.on('disconnected', () => {
          console.log('Browser disconnected, will recreate on next request');
          this.browser = null;
        });
        
      } catch (launchError) {
        console.error('Failed to launch browser:', launchError);
        this.browser = null;
        throw launchError;
      }
    }
    return this.browser;
  }

  private static async generateScreenshot(url: string, retryCount = 0): Promise<Buffer | null> {
    const isLocal = !process.env.REPL_ID && !process.env.REPLIT_ENV;
    
    // Try CDP first for better frame management
    // try {
    //   console.log('Attempting CDP screenshot for', url);
    //   const filename = `temp_${Date.now()}.png`;
    //   const success = await CDPThumbnailService.takeScreenshot(url, filename);
    //   
    //   if (success) {
    //     // Read the file and return buffer
    //     const fs = await import('fs/promises');
    //     const path = await import('path');
    //     const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
    //     const filepath = path.join(thumbnailsDir, filename);
    //     const buffer = await fs.readFile(filepath);
    //     // Clean up temp file
    //     await fs.unlink(filepath).catch(() => {});
    //     console.log('CDP screenshot successful');
    //     return buffer;
    //   }
    // } catch (error: any) {
    //   console.log('CDP screenshot failed:', error.message);
    // }
    
    // Fallback to other strategies
    const strategies = [
      {
        name: 'Puppeteer',
        enabled: isLocal,
        method: () => this.generatePuppeteerScreenshot(url, retryCount)
      },
      {
        name: 'Playwright', 
        enabled: !isLocal,
        method: () => this.generatePlaywrightScreenshot(url)
      },
      {
        name: 'Simple Puppeteer',
        enabled: true,
        method: () => this.generateSimpleScreenshot(url)
      }
    ];
    
    for (const strategy of strategies) {
      if (!strategy.enabled) continue;
      
      try {
        console.log(`Attempting ${strategy.name} screenshot for ${url}`);
        const result = await strategy.method();
        if (result) {
          console.log(`Successfully captured screenshot using ${strategy.name}`);
          return result;
        }
      } catch (error: any) {
        console.log(`${strategy.name} failed for ${url}: ${error.message}`);
        continue;
      }
    }
    
    console.log(`All screenshot strategies failed for ${url}`);
    return null;
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
        
        // Process with Sharp for high-quality 1024x768 output
        const resizedBuffer = await sharp(screenshot)
          .resize(1024, 768, {
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
    let browser;
    
    try {
      browser = await this.getBrowser();
      page = await browser.newPage();
      
      // Set up page event listeners to handle potential issues
      page.on('error', (error) => {
        console.log(`Page error for ${url}:`, error.message);
      });
      
      page.on('pageerror', (error) => {
        console.log(`Page script error for ${url}:`, error.message);
      });
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // High-resolution viewport
      await page.setViewport({ 
        width: 1920, 
        height: 1080,
        deviceScaleFactor: 2
      });
      
      // Set extra headers to avoid detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Navigate with progressive timeout strategy
      const timeoutDuration = Math.min(15000 + (retryCount * 5000), 30000);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: timeoutDuration
      });
      
      // Wait for content with adaptive timing
      const waitTime = Math.min(2000 + (retryCount * 1000), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Additional wait for any dynamic content
      try {
        await page.waitForSelector('body', { timeout: 3000 });
      } catch (selectorError) {
        console.log(`Selector wait failed for ${url}, proceeding with screenshot`);
      }
      
      // Verify page is still valid before screenshot
      if (page.isClosed()) {
        throw new Error('Page was closed before screenshot');
      }
      
      // Take screenshot with error handling
      const screenshot = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1920, height: 1080 },
        optimizeForSpeed: false
      });
      
      // Safely close the page
      if (!page.isClosed()) {
        await page.close();
      }
      
      // Process with Sharp for high quality
      const sharp = await import('sharp');
      const resizedBuffer = await sharp.default(screenshot)
        .resize(1024, 768, {
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
      
      // Handle session closure and other errors with retries
      if (retryCount < maxRetries) {
        const retryableErrors = [
          'frame was detached',
          'Navigation timeout', 
          'Target closed',
          'Session closed',
          'Protocol error',
          'Page has been closed',
          'Connection closed'
        ];
        
        const shouldRetry = retryableErrors.some(errorType => 
          error?.message?.includes(errorType)
        );
        
        if (shouldRetry) {
          console.log(`Retry ${retryCount + 1}/${maxRetries} for ${url} due to: ${error.message}`);
          
          // Progressive backoff delay
          const delay = 1000 * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Force browser refresh on session errors
          if (error?.message?.includes('Session closed') || error?.message?.includes('Protocol error')) {
            try {
              if (this.browser) {
                await this.browser.close();
                this.browser = null;
              }
            } catch (browserCloseError) {
              console.log('Browser cleanup error:', browserCloseError);
            }
          }
          
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
      
      // Set up minimal error handling
      page.on('error', () => {
        // Silent error handling for simple mode
      });
      
      // Basic user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Moderate resolution viewport
      await page.setViewport({ 
        width: 1280, 
        height: 720,
        deviceScaleFactor: 1.5
      });
      
      // Very simple navigation with shorter timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
      
      // Minimal wait time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Verify page is still valid
      if (page.isClosed()) {
        throw new Error('Page closed during simple screenshot');
      }
      
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
      
      // Safely close the page
      if (!page.isClosed()) {
        await page.close();
      }
      
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
    // Enhanced category colors with better visual appeal
    const categoryColors: Record<string, { primary: string; secondary: string; accent: string }> = {
      'Video Learning': { primary: '#3B82F6', secondary: '#1D4ED8', accent: '#60A5FA' },
      'Tutorials': { primary: '#10B981', secondary: '#059669', accent: '#34D399' },
      'Online Learning': { primary: '#8B5CF6', secondary: '#7C3AED', accent: '#A78BFA' },
      'Communities': { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' },
      'Research Portals': { primary: '#EF4444', secondary: '#DC2626', accent: '#F87171' },
      'Academic Papers': { primary: '#06B6D4', secondary: '#0891B2', accent: '#22D3EE' },
      'Workshops': { primary: '#EC4899', secondary: '#DB2777', accent: '#F472B6' },
      'Podcasts': { primary: '#6366F1', secondary: '#4F46E5', accent: '#818CF8' },
      'General': { primary: '#6B7280', secondary: '#4B5563', accent: '#9CA3AF' }
    };

    const colors = categoryColors[category] || categoryColors['General'];
    let domain = '';
    try {
      domain = new URL(url).hostname.replace('www.', '');
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
    
    // Smart title truncation with word boundaries
    const truncateTitle = (text: string, maxLength: number) => {
      if (text.length <= maxLength) return text;
      const truncated = text.substring(0, maxLength);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > maxLength * 0.7 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    };
    
    const safeTitle = escapeXml(truncateTitle(title || 'Untitled', 60));
    const safeCategory = escapeXml(category);
    const safeDomain = escapeXml(domain);

    return `<svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Main gradient background -->
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.9" />
          </linearGradient>
          
          <!-- Subtle pattern overlay -->
          <pattern id="dots" patternUnits="userSpaceOnUse" width="40" height="40">
            <circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/>
          </pattern>
          
          <!-- Category badge gradient -->
          <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:rgba(255,255,255,0.2);stop-opacity:1" />
            <stop offset="100%" style="stop-color:rgba(255,255,255,0.1);stop-opacity:1" />
          </linearGradient>
          
          <!-- Text shadow filter -->
          <filter id="textShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.5)"/>
          </filter>
        </defs>
        
        <!-- Background -->
        <rect width="640" height="360" fill="url(#bgGradient)"/>
        <rect width="640" height="360" fill="url(#dots)"/>
        
        <!-- Category badge -->
        <rect x="24" y="24" width="${Math.min(safeCategory.length * 14 + 40, 200)}" height="32" rx="16" fill="url(#badgeGradient)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        <text x="44" y="44" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="white" filter="url(#textShadow)">${safeCategory}</text>
        
        <!-- Main title -->
        <text x="320" y="180" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle" filter="url(#textShadow)">
          <tspan x="320" dy="0">${safeTitle}</tspan>
        </text>
        
        <!-- Domain info -->
        <text x="320" y="220" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.9)" text-anchor="middle" filter="url(#textShadow)">${safeDomain}</text>
        
        <!-- Decorative elements -->
        <circle cx="80" cy="280" r="3" fill="rgba(255,255,255,0.3)"/>
        <circle cx="560" cy="280" r="3" fill="rgba(255,255,255,0.3)"/>
        <rect x="120" y="278" width="400" height="2" fill="rgba(255,255,255,0.2)" rx="1"/>
        
        <!-- Status indicator -->
        <text x="320" y="320" font-family="Arial, sans-serif" font-size="14" fill="rgba(255,255,255,0.7)" text-anchor="middle">Generated Preview</text>
      </svg>`;
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
    
    // Use the same enhanced SVG generation but for failure state
    const failureSvg = this.generateSVGThumbnail(url, title, category);
    
    try {
      // Convert SVG to JPG using Sharp
      const jpegBuffer = await sharp(Buffer.from(failureSvg))
        .jpeg({ quality: 95, progressive: true, mozjpeg: true })
        .toBuffer();
      
      const fs = await import('fs');
      const path = await import('path');
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.promises.writeFile(filepath, jpegBuffer);
      
      console.log(`Created enhanced JPG failure thumbnail: ${filename}`);
    } catch (error) {
      console.error(`Failed to create JPG failure thumbnail:`, error);
      // Fallback to SVG if JPG conversion fails
      const svgBuffer = Buffer.from(failureSvg);
      const fs = await import('fs');
      const path = await import('path');
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename.replace('.jpg', '.svg'));
      await fs.promises.writeFile(filepath, svgBuffer);
      
      console.log(`Created SVG fallback thumbnail: ${filename}`);
    }
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