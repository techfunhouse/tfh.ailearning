import path from 'path';
import fs from 'fs';
import { createCanvas } from 'canvas';

export class PuppeteerThumbnailService {
  private static getPageTypeInfo(url: string) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return { 
        type: 'YouTube', 
        color: '#ff6b6b', 
        secondaryColor: '#fee2e2',
        icon: '▶',
        gradient: ['#fef2f2', '#fee2e2']
      };
    }
    if (url.includes('linkedin.com')) {
      return { 
        type: 'LinkedIn', 
        color: '#60a5fa', 
        secondaryColor: '#dbeafe',
        icon: '💼',
        gradient: ['#eff6ff', '#dbeafe']
      };
    }
    if (url.includes('github.com')) {
      return { 
        type: 'GitHub', 
        color: '#6b7280', 
        secondaryColor: '#f3f4f6',
        icon: '⚡',
        gradient: ['#f9fafb', '#f3f4f6']
      };
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return { 
        type: 'Twitter/X', 
        color: '#60a5fa', 
        secondaryColor: '#dbeafe',
        icon: '🐦',
        gradient: ['#eff6ff', '#dbeafe']
      };
    }
    if (url.includes('medium.com')) {
      return { 
        type: 'Medium', 
        color: '#34d399', 
        secondaryColor: '#d1fae5',
        icon: '📝',
        gradient: ['#ecfdf5', '#d1fae5']
      };
    }
    return { 
      type: 'Website', 
      color: '#a78bfa', 
      secondaryColor: '#e9d5ff',
      icon: '🌐',
      gradient: ['#faf5ff', '#e9d5ff']
    };
  }

  static async takeScreenshot(url: string, filename: string): Promise<boolean> {
    console.log(`[THUMBNAIL] Generating simple placeholder for: ${url}`);
    
    // Create thumbnails directory
    const thumbnailsDir = path.join(process.cwd(), 'client', 'public', 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
    
    const filepath = path.join(thumbnailsDir, filename);
    const pageInfo = this.getPageTypeInfo(url);
    
    try {
      // Create canvas for elegant thumbnail
      const canvas = createCanvas(1024, 768);
      const ctx = canvas.getContext('2d');
      
      // Simple soft background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 1024, 768);
      bgGradient.addColorStop(0, '#f8fafc');
      bgGradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 1024, 768);
      
      // Simple centered text
      ctx.fillStyle = '#6b7280';
      ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Generating...', 512, 384)
      
      // Save as JPEG
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      fs.writeFileSync(filepath, buffer);
      
      console.log(`[THUMBNAIL] Created simple placeholder: ${filename}`);
      return true;
      
    } catch (error) {
      console.error(`[THUMBNAIL] Error creating thumbnail: ${error}`);
      return false;
    }
  }

  static async cleanup(): Promise<void> {
    console.log('[THUMBNAIL] Cleanup complete');
  }
}