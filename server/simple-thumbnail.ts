import { PuppeteerThumbnailService } from './puppeteer-thumbnail.js';

export class SimpleThumbnailService {
  static generateThumbnailAsync(filename: string, title: string, category: string, url?: string): void {
    console.log(`[THUMBNAIL] Generating thumbnail for: ${filename}`);
    
    setTimeout(async () => {
      if (url) {
        await PuppeteerThumbnailService.takeScreenshot(url, filename);
      } else {
        await PuppeteerThumbnailService.takeScreenshot('placeholder', filename);
      }
    }, 100);
  }
}