import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

export class PuppeteerThumbnailService {
  // Common overlay selectors to remove (based on your working utility)
  private static overlaySelectors = [
    // Cookie notices
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="consent"]',
    '[id*="consent"]',
    // Popups
    '[class*="popup"]',
    '[id*="popup"]',
    '[class*="modal"]',
    '[id*="modal"]',
    // Newsletter signups
    '[class*="newsletter"]',
    '[id*="newsletter"]',
    // Common overlay classes
    '.overlay',
    '.modal-overlay',
    '.popup-overlay',
    // Common overlay IDs
    '#overlay',
    '#modal-overlay',
    '#popup-overlay',
    // YouTube specific
    '.ytd-consent-bump-v2-lightbox',
    '[role="dialog"]'
  ];

  private static async removeOverlays(page: puppeteer.Page): Promise<void> {
    await page.evaluate((selectors) => {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.remove();
        });
      });
    }, this.overlaySelectors);
  }

  static async takeScreenshot(url: string, filename: string): Promise<boolean> {
    let browser: puppeteer.Browser | null = null;
    
    try {
      console.log(`[SCREENSHOT] Starting for: ${url}`);
      
      // Launch browser with simplified, proven configuration
      browser = await puppeteer.launch({
        headless: 'new'
      });
      
      const page = await browser.newPage();
      await page.setViewport({ 
        width: 1024, 
        height: 768 
      });
      
      // Navigate to the URL
      console.log(`[SCREENSHOT] Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Remove overlays using your proven method
      console.log('[SCREENSHOT] Removing overlays...');
      await this.removeOverlays(page);
      
      // Ensure thumbnails directory exists
      const thumbnailsDir = path.join(process.cwd(), 'client', 'public', 'thumbnails');
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }
      
      const filepath = path.join(thumbnailsDir, filename);
      
      // Take screenshot with your proven settings
      console.log('[SCREENSHOT] Capturing image...');
      await page.screenshot({
        path: filepath,
        type: 'jpeg',
        quality: 90
      });
      
      await browser.close();
      
      console.log(`[SCREENSHOT] Success: ${filename}`);
      console.log('- Viewport: 1024x768');
      console.log('- Format: JPG');
      console.log('- Quality: 90');
      console.log('- Overlays: Removed');
      
      return true;
      
    } catch (error) {
      console.error(`[SCREENSHOT] Error: ${error.message}`);
      if (browser) {
        await browser.close();
      }
      return false;
    }
  }

  static async cleanup(): Promise<void> {
    // No persistent browser instance in this simplified approach
    console.log('[SCREENSHOT] Cleanup complete');
  }
}