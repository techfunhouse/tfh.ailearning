import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const overlaySelectors = [
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
  '#popup-overlay'
];
export class PuppeteerThumbnailService {
  static async takeScreenshot(url: string, filename: string): Promise<boolean> {
    console.log(`[THUMBNAIL] Generating simple placeholder for: ${url}`);
    
    // Create thumbnails directory
    const thumbnailsDir = path.join(process.cwd(), 'client', 'public', 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    
    const filepath = path.join(thumbnailsDir, filename);
    
    try {      
      const browser = await puppeteer.launch({
        headless: true
      });
      
      const page = await browser.newPage();
      await page.setViewport({ 
          width: 1024, 
          height: 768 
      });
      
      // Navigate to the URL
      await page.goto(url, { waitUntil: 'networkidle0' });
      
      // Remove overlays
      await this.removeOverlays(page);
      
      // Ensure filepath ends with .jpeg
      let screenshotPath = filepath;
      if (!screenshotPath.endsWith('.jpeg') && !screenshotPath.endsWith('.jpg') && !screenshotPath.endsWith('.png') && !screenshotPath.endsWith('.webp')) {
        screenshotPath += '.jpg';
      }
      await page.screenshot({
          path: screenshotPath as `${string}.jpeg`,
          type: 'jpeg',
          quality: 90
      });
      
      await browser.close();

      return true;      
    } catch (error) {
      console.error(`[THUMBNAIL] Error creating thumbnail: ${error}`);
      return false;
    }
  }

  static async removeOverlays(page: { evaluate: (arg0: (selectors: any) => void, arg1: string[]) => any; }) {
    await page.evaluate((selectors) => {
        selectors.forEach((selector: any) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.remove();
            });
        });
    }, overlaySelectors);
  }

}