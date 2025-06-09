import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export class PuppeteerThumbnailService {
  private static browser: puppeteer.Browser | null = null;

  static async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      console.log('[PUPPETEER] Launching browser optimized for macOS...');
      
      // macOS-optimized configuration
      const launchOptions: any = {
        headless: true,
        defaultViewport: { width: 1024, height: 768 },
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-ipc-flooding-protection',
          '--window-size=1024,768',
          '--force-device-scale-factor=1'
        ],
        timeout: 60000
      };
      
      // Try to use system Chrome on macOS for better compatibility
      const possibleChromePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser'
      ];
      
      for (const chromePath of possibleChromePaths) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(chromePath)) {
            launchOptions.executablePath = chromePath;
            console.log(`[PUPPETEER] Using Chrome at: ${chromePath}`);
            break;
          }
        } catch (e) {
          // Continue to next path
        }
      }
      
      this.browser = await puppeteer.launch(launchOptions);
    }
    return this.browser;
  }

  static async takeScreenshot(url: string, filename: string): Promise<boolean> {
    try {
      console.log(`[PUPPETEER] Starting screenshot for: ${url}`);
      
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1024, height: 768 });
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log(`[PUPPETEER] Navigating to ${url}...`);
      
      // Navigate with long timeout
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 60000 
      });
      
      // Wait for content to load
      console.log('[PUPPETEER] Waiting for content to stabilize...');
      await page.waitForTimeout(8000);
      
      // Remove cookie banners and overlays
      await page.evaluate(() => {
        // Common overlay selectors
        const overlaySelectors = [
          '[role="dialog"]',
          '.cookie-banner',
          '.gdpr-banner',
          '#cookie-notice',
          '.consent-banner',
          '.privacy-notice',
          '[data-testid="cookie-banner"]',
          '.ytd-consent-bump-v2-lightbox'
        ];
        
        overlaySelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el.remove());
        });
        
        // Remove fixed position elements that might be overlays
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 1000) {
            (el as HTMLElement).style.display = 'none';
          }
        });
      });
      
      // Wait a bit more for removals to take effect
      await page.waitForTimeout(2000);
      
      console.log('[PUPPETEER] Taking screenshot...');
      
      // Take screenshot
      const screenshotBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 85,
        fullPage: false,
        clip: { x: 0, y: 0, width: 1024, height: 768 }
      });
      
      // Save to file
      const thumbnailsDir = path.join(process.cwd(), 'client', 'public', 'thumbnails');
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }
      
      const filePath = path.join(thumbnailsDir, filename);
      fs.writeFileSync(filePath, screenshotBuffer);
      
      await page.close();
      
      console.log(`[PUPPETEER] Screenshot saved: ${filename}`);
      return true;
      
    } catch (error) {
      console.error(`[PUPPETEER] Screenshot failed: ${error.message}`);
      return false;
    }
  }

  static async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[PUPPETEER] Browser closed');
    }
  }
}