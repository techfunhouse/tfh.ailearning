import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

export class SimpleThumbnailService {
  private static processingQueue: Array<() => Promise<void>> = [];
  private static isProcessing = false;
  static async createLoadingThumbnail(filename: string, title: string, category: string): Promise<void> {
    try {
      // Create a blue background with text overlay
      const sharp = await import('sharp');
      
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
      
      // Create SVG with text at 640x360 resolution
      const loadingSvg = `
        <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#667EEA"/>
          
          <!-- Loading indicator -->
          <circle cx="320" cy="120" r="30" fill="rgba(255,255,255,0.3)"/>
          <text x="320" y="132" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">⏳</text>
          
          <!-- Title -->
          <text x="320" y="190" font-family="Arial, sans-serif" font-size="26" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- Category -->
          <text x="320" y="230" font-family="Arial, sans-serif" font-size="20" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Status -->
          <text x="320" y="280" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">
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
          width: 640,
          height: 360,
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
      
      // Create SVG with basic information at 640x360
      const placeholderSvg = `
        <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#808080"/>
          
          <!-- Placeholder indicator -->
          <circle cx="320" cy="120" r="24" fill="rgba(255,255,255,0.3)"/>
          <text x="320" y="130" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">📄</text>
          
          <!-- Title -->
          <text x="320" y="180" font-family="Arial, sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- Category -->
          <text x="320" y="220" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Status -->
          <text x="320" y="260" font-family="Arial, sans-serif" font-size="16" fill="rgba(255,255,255,0.7)" text-anchor="middle">
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
    // Add to queue instead of processing immediately
    const task = async () => {
      if (url) {
        await this.createRealScreenshot(filename, url, title, category);
      } else {
        await this.createSuccessThumbnail(filename, title, category);
      }
    };
    
    this.processingQueue.push(task);
    this.processQueue();
  }

  private static async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.processingQueue.length > 0) {
      const task = this.processingQueue.shift();
      if (task) {
        await task();
        // Wait between tasks to prevent resource conflicts
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    this.isProcessing = false;
  }

  static async createRealScreenshot(filename: string, url: string, title: string, category: string): Promise<void> {
    try {
      console.log(`Starting real screenshot generation for: ${url}`);
      
      // Use the already imported puppeteer module
      
      // Detect environment and configure browser accordingly
      const isReplit = process.env.REPLIT_CLUSTER || process.env.REPL_SLUG;
      const isLocal = !isReplit;
      
      let browserOptions: any = {
        headless: true,
        timeout: 60000,
        protocolTimeout: 60000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-hang-monitor',
          '--disable-prompt-on-repost',
          '--disable-sync',
          '--force-device-scale-factor=1',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--disable-extensions-file-access-check',
          '--disable-default-apps',
          '--disable-popup-blocking'
        ]
      };

      // Only set executablePath for Replit environment
      if (isReplit) {
        browserOptions.executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
      }
      
      const browser = await puppeteer.launch(browserOptions);

      const page = await browser.newPage();
      
      // Add error handlers to prevent session closure issues
      page.on('error', (error) => {
        console.log(`Page error for ${url}: ${error.message}`);
      });
      
      page.on('pageerror', (error) => {
        console.log(`Page script error for ${url}: ${error.message}`);
      });
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set headers to appear more like a real browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Set higher resolution viewport for better quality
      await page.setViewport({ 
        width: 2048, 
        height: 1536,
        deviceScaleFactor: 1.5 // Optimal for 1024x768 output
      });
      
      try {
        // Immediate YouTube detection and specialized handling
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          console.log(`Detected YouTube URL ${url}, using isolated browser strategy`);
          // Close this page and browser, use completely isolated approach
          if (!page.isClosed()) await page.close();
          if (browser.isConnected()) await browser.close();
          
          // Call specialized YouTube method and return immediately
          await SimpleThumbnailService.createYouTubeScreenshotFallback(filename, url, title, category);
          return;
        }
        
        // Standard navigation for non-YouTube websites
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // Wait for content with additional checks
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Wait for body element to ensure page is ready
        try {
          await page.waitForSelector('body', { timeout: 5000 });
        } catch (selectorError) {
          console.log(`Body selector wait failed for ${url}, proceeding with screenshot`);
        }
        
        // Verify page is still valid before screenshot
        if (page.isClosed()) {
          throw new Error('Page was closed before screenshot attempt');
        }
        
        // Take screenshot with better error handling
        const screenshotBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 90,
          clip: { x: 0, y: 0, width: 2048, height: 1536 }
        });

        // Safely close resources
        if (!page.isClosed()) {
          await page.close();
        }
        if (browser.isConnected()) {
          await browser.close();
        }

        // Resize screenshot to thumbnail size using Sharp
        const sharp = await import('sharp');
        const thumbnailBuffer = await sharp.default(screenshotBuffer)
          .resize(1024, 768, { 
            fit: 'cover',
            kernel: sharp.default.kernel.lanczos3
          })
          .jpeg({ quality: 90 })
          .toBuffer();

        // Save the real screenshot
        const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
        const filepath = path.join(thumbnailsDir, filename);
        await fs.writeFile(filepath, thumbnailBuffer);
        
        console.log(`Created real screenshot thumbnail: ${filename}`);
        
      } catch (pageError: any) {
        console.error(`Failed to capture screenshot for ${url}:`, pageError);
        
        // Clean up browser safely
        try {
          if (!page.isClosed()) {
            await page.close();
          }
          if (browser.isConnected()) {
            await browser.close();
          }
        } catch (cleanupError) {
          console.log('Browser cleanup error:', cleanupError);
        }
        
        // Check if this is a retryable error
        const retryableErrors = [
          'Session closed',
          'Protocol error',
          'Target closed',
          'Page was closed',
          'Connection closed',
          'Navigation timeout',
          'Navigating frame was detached',
          'frame was detached',
          'Frame was detached'
        ];
        
        const isRetryable = retryableErrors.some(errorType => 
          pageError?.message?.includes(errorType)
        );
        
        if (isRetryable) {
          console.log(`Retryable error detected for ${url}, will use fallback strategy`);
          
          // Special handling for YouTube URLs with frame detachment issues
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            try {
              await SimpleThumbnailService.createYouTubeScreenshotFallback(filename, url, title, category);
              return;
            } catch (youtubeError) {
              console.log(`YouTube fallback strategy failed for ${url}:`, youtubeError);
            }
          }
          
          // Special handling for LinkedIn URLs with login overlays and session issues
          if (url.includes('linkedin.com')) {
            try {
              await SimpleThumbnailService.createLinkedInScreenshotFallback(filename, url, title, category);
              return;
            } catch (linkedinError) {
              console.log(`LinkedIn fallback strategy failed for ${url}:`, linkedinError);
            }
          }
          
          // Try a simpler approach with reduced settings
          try {
            await SimpleThumbnailService.createSimpleScreenshotFallback(filename, url, title, category);
            return;
          } catch (fallbackError) {
            console.log(`Fallback strategy also failed for ${url}:`, fallbackError);
          }
        }
        
        // Final fallback to error thumbnail
        await this.createErrorThumbnail(filename, title, category, url);
      }
      
    } catch (error) {
      console.error('Error creating real screenshot:', error);
      // Fallback to error thumbnail
      await this.createErrorThumbnail(filename, title, category, url);
    }
  }

  static async createLinkedInScreenshotFallback(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`Attempting specialized LinkedIn fallback for ${url}`);
    
    const browserOptions: any = {
      headless: true,
      timeout: 120000,
      protocolTimeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-notifications'
      ]
    };
    
    let browser;
    let page;
    
    try {
      browser = await puppeteer.launch(browserOptions);
      page = await browser.newPage();
      
      // Set LinkedIn-optimized configuration
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set headers to appear as legitimate browser
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-User': '?1',
        'Sec-Fetch-Dest': 'document'
      });
      
      // Block unnecessary resources to reduce session pressure
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['font', 'stylesheet', 'media', 'other'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Multiple navigation attempts with different strategies
      let navigationSuccess = false;
      
      // Strategy 1: Direct navigation with extended timeout
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        navigationSuccess = true;
      } catch (error1: any) {
        console.log(`LinkedIn Strategy 1 failed: ${error1.message}`);
        
        // Strategy 2: Minimal wait conditions
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 30000 });
          navigationSuccess = true;
        } catch (error2: any) {
          console.log(`LinkedIn Strategy 2 failed: ${error2.message}`);
          
          // Strategy 3: No wait conditions, just navigate
          try {
            await page.goto(url, { timeout: 20000 });
            navigationSuccess = true;
          } catch (error3: any) {
            console.log(`LinkedIn Strategy 3 failed: ${error3.message}`);
            throw new Error('All LinkedIn navigation strategies failed');
          }
        }
      }
      
      if (!navigationSuccess) {
        throw new Error('Failed to navigate to LinkedIn page');
      }
      
      // Wait for initial content load
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Hide LinkedIn login overlays and modals
      await page.evaluate(() => {
        // Remove common LinkedIn login overlays
        const overlaySelectors = [
          '.guest-homepage-overlay',
          '.sign-in-modal',
          '.authwall-join-form',
          '.join-form',
          '.visitor-nav',
          '.top-card-layout__cta-container',
          '[data-test-id="sign-in-modal"]',
          '[data-test-id="guest-homepage-overlay"]',
          '.artdeco-modal',
          '.authentication-outlet',
          '.nav-item--sign-in-cta'
        ];
        
        overlaySelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            if (el && el.parentNode) {
              el.parentNode.removeChild(el);
            }
          });
        });
        
        // Hide any elements with z-index above 1000 (likely modals)
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const zIndex = window.getComputedStyle(el).zIndex;
          if (zIndex && parseInt(zIndex) > 1000) {
            (el as HTMLElement).style.display = 'none';
          }
        });
        
        // Remove authentication walls
        const authWalls = document.querySelectorAll('[class*="auth"]');
        authWalls.forEach(el => {
          if (el.textContent && (
            el.textContent.includes('Sign in') || 
            el.textContent.includes('Join now') ||
            el.textContent.includes('Log in')
          )) {
            (el as HTMLElement).style.display = 'none';
          }
        });
      });
      
      // Additional wait for content stabilization
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check if page is still valid
      if (page.isClosed()) {
        throw new Error('Page closed during LinkedIn processing');
      }
      
      // Take screenshot with high quality settings
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 95,
        clip: { x: 0, y: 0, width: 1920, height: 1080 }
      });
      
      // Clean up immediately
      if (!page.isClosed()) await page.close();
      if (browser.isConnected()) await browser.close();
      
      // Process and save with high quality
      const sharp = await import('sharp');
      const thumbnailBuffer = await sharp.default(screenshotBuffer)
        .resize(1024, 768, { 
          fit: 'cover',
          kernel: sharp.default.kernel.lanczos3
        })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, thumbnailBuffer);
      
      console.log(`Created LinkedIn fallback screenshot: ${filename}`);
      
    } catch (error: any) {
      console.log(`LinkedIn fallback failed for ${url}: ${error.message}`);
      
      // Clean up on error
      if (page && !page.isClosed()) {
        try { await page.close(); } catch {}
      }
      if (browser && browser.isConnected()) {
        try { await browser.close(); } catch {}
      }
      
      throw error;
    }
  }

  static async createYouTubeScreenshotFallback(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`Attempting bulletproof YouTube capture for ${url}`);
    
    // Detect environment for optimized configuration
    const isReplit = process.env.REPLIT_CLUSTER || process.env.REPL_SLUG;
    
    const browserOptions: any = {
      headless: true,
      timeout: 120000,
      protocolTimeout: 120000,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-sync',
        '--disable-translate',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-blink-features=AutomationControlled',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-browser-check',
        '--disable-dev-shm-usage',
        '--disable-extensions-file-access-check',
        '--disable-extensions-https-enforcement',
        '--disable-plugins',
        '--disable-plugins-discovery',
        '--disable-preconnect',
        '--disable-print-preview',
        '--disable-sync-preferences',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-client-side-phishing-detection',
        '--disable-features=site-per-process',
        '--single-process'
      ]
    };
    
    // Set executablePath for Replit
    if (isReplit) {
      browserOptions.executablePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
    }
    
    let browser;
    let page;
    
    try {
      browser = await puppeteer.launch(browserOptions);
      page = await browser.newPage();
      
      // Set aggressive YouTube-specific configuration
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Set additional headers for YouTube
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      // Bulletproof navigation with frame detachment prevention
      let navigationSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!navigationSuccess && attempts < maxAttempts) {
        attempts++;
        console.log(`YouTube navigation attempt ${attempts}/${maxAttempts}`);
        
        try {
          // Validate browser and page state before each attempt
          if (page.isClosed() || !browser.isConnected()) {
            console.log('Browser/page invalid, recreating...');
            if (!page.isClosed()) await page.close();
            if (browser.isConnected()) await browser.close();
            
            browser = await puppeteer.launch(browserOptions);
            page = await browser.newPage();
            await page.setViewport({ width: 1600, height: 900 });
            await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          }
          
          // Try minimal navigation first to avoid frame issues
          console.log(`Attempting navigation to ${url}`);
          await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 15000
          });
          
          // Immediate validation after navigation
          if (page.isClosed()) {
            throw new Error('Page closed immediately after navigation');
          }
          
          navigationSuccess = true;
          console.log('YouTube navigation successful');
          break;
          
        } catch (navError: any) {
          console.log(`Navigation attempt ${attempts} failed: ${navError.message}`);
          
          // If frame detachment detected, force recreate everything
          if (navError.message.includes('detached') || navError.message.includes('Frame')) {
            console.log('Frame detachment detected, forcing browser recreation');
            try {
              if (!page.isClosed()) await page.close();
              if (browser.isConnected()) await browser.close();
            } catch (cleanupError) {
              console.log('Cleanup error during recreation:', cleanupError);
            }
            
            // Wait before recreating to let resources clear
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          // For other errors, wait and retry with same browser
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          throw navError;
        }
      }
      
      if (!navigationSuccess) {
        throw new Error(`Failed to navigate to YouTube after ${maxAttempts} attempts`);
      }
      
      // Extended wait for YouTube to fully load
      await new Promise(resolve => setTimeout(resolve, 12000));
      
      // Wait for key YouTube elements with multiple selectors
      const youtubeSelectors = [
        '#movie_player',
        '.html5-video-container',
        '.ytp-cued-thumbnail-overlay',
        'video',
        '.ytd-player'
      ];
      
      for (const selector of youtubeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`Found YouTube element: ${selector}`);
          break;
        } catch {
          continue;
        }
      }
      
      // Additional wait for player to stabilize
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Final validation before screenshot
      if (page.isClosed()) {
        throw new Error('Page closed during YouTube processing');
      }
      
      // Take screenshot with frame detachment protection
      let screenshotBuffer;
      try {
        screenshotBuffer = await page.screenshot({
          type: 'jpeg',
          quality: 90,
          clip: { x: 0, y: 0, width: 1600, height: 900 }
        });
      } catch (screenshotError: any) {
        console.log(`YouTube screenshot failed: ${screenshotError.message}`);
        
        // Fallback for frame detachment during screenshot
        if (screenshotError.message.includes('detached') || screenshotError.message.includes('Frame')) {
          console.log('Attempting fullpage screenshot fallback');
          screenshotBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 85,
            fullPage: false
          });
        } else {
          throw screenshotError;
        }
      }
      
      // Clean up immediately
      if (!page.isClosed()) await page.close();
      if (browser.isConnected()) await browser.close();
      
      // Process and save with high quality
      const sharp = await import('sharp');
      const thumbnailBuffer = await sharp.default(screenshotBuffer)
        .resize(1024, 768, { 
          fit: 'cover',
          kernel: sharp.default.kernel.lanczos3
        })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, thumbnailBuffer);
      
      console.log(`Created YouTube fallback screenshot: ${filename}`);
      
    } catch (error: any) {
      console.log(`YouTube fallback failed for ${url}: ${error.message}`);
      
      // Clean up on error
      if (page && !page.isClosed()) {
        try { await page.close(); } catch {}
      }
      if (browser && browser.isConnected()) {
        try { await browser.close(); } catch {}
      }
      
      throw error;
    }
  }

  static async createSimpleScreenshotFallback(filename: string, url: string, title: string, category: string): Promise<void> {
    console.log(`Attempting simple fallback screenshot for ${url}`);
    
    const browserOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    };
    
    let browser;
    let page;
    
    try {
      browser = await puppeteer.launch(browserOptions);
      page = await browser.newPage();
      
      // Minimal configuration
      await page.setViewport({ width: 1600, height: 1200 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      
      // Simple navigation with short timeout
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      // Minimal wait
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if page is still valid
      if (page.isClosed()) {
        throw new Error('Page closed during fallback attempt');
      }
      
      // Simple screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        clip: { x: 0, y: 0, width: 1600, height: 1200 }
      });
      
      // Clean up immediately
      if (!page.isClosed()) await page.close();
      if (browser.isConnected()) await browser.close();
      
      // Process and save
      const sharp = await import('sharp');
      const thumbnailBuffer = await sharp.default(screenshotBuffer)
        .resize(1024, 768, { 
          fit: 'cover',
          kernel: sharp.default.kernel.lanczos3
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, thumbnailBuffer);
      
      console.log(`Created fallback screenshot thumbnail: ${filename}`);
      
    } catch (error: any) {
      console.log(`Fallback screenshot failed for ${url}: ${error.message}`);
      
      // Clean up on error
      if (page && !page.isClosed()) {
        try { await page.close(); } catch {}
      }
      if (browser && browser.isConnected()) {
        try { await browser.close(); } catch {}
      }
      
      throw error;
    }
  }

  static async createErrorThumbnail(filename: string, title: string, category: string, url: string): Promise<void> {
    try {
      // Create a red background with error information
      const sharp = await import('sharp');
      
      // Truncate and escape text for XML safety
      const maxTitleLength = 22;
      const displayTitle = (title.length > maxTitleLength ? title.substring(0, maxTitleLength) + '...' : title)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const maxUrlLength = 35;
      const displayUrl = (url.length > maxUrlLength ? url.substring(0, maxUrlLength) + '...' : url)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const maxCategoryLength = 18;
      const displayCategory = (category.length > maxCategoryLength ? category.substring(0, maxCategoryLength) + '...' : category)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Create SVG with error information at 640x360
      const errorSvg = `
        <svg width="640" height="360" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#FF6B6B"/>
          
          <!-- Error indicator -->
          <circle cx="320" cy="90" r="24" fill="rgba(255,255,255,0.3)"/>
          <text x="320" y="100" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle">⚠</text>
          
          <!-- Title -->
          <text x="320" y="150" font-family="Arial, sans-serif" font-size="24" fill="white" text-anchor="middle" font-weight="bold">
            ${displayTitle}
          </text>
          
          <!-- URL -->
          <text x="320" y="190" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.9)" text-anchor="middle">
            ${displayUrl}
          </text>
          
          <!-- Category -->
          <text x="320" y="230" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.8)" text-anchor="middle">
            ${displayCategory}
          </text>
          
          <!-- Error message -->
          <text x="320" y="280" font-family="Arial, sans-serif" font-size="18" fill="rgba(255,255,255,0.7)" text-anchor="middle">
            Screenshot Unavailable
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