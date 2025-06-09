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
    console.log(`[THUMBNAIL] Generating torn paper placeholder for: ${url}`);
    
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
      
      // Light gray background
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, 1024, 768);
      
      // Create torn paper effect - white paper on the left
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(400, 0);
      ctx.lineTo(420, 30);
      ctx.lineTo(380, 60);
      ctx.lineTo(450, 90);
      ctx.lineTo(430, 120);
      ctx.lineTo(470, 150);
      ctx.lineTo(440, 180);
      ctx.lineTo(480, 210);
      ctx.lineTo(460, 240);
      ctx.lineTo(500, 270);
      ctx.lineTo(470, 300);
      ctx.lineTo(510, 330);
      ctx.lineTo(480, 360);
      ctx.lineTo(520, 390);
      ctx.lineTo(490, 420);
      ctx.lineTo(530, 450);
      ctx.lineTo(500, 480);
      ctx.lineTo(540, 510);
      ctx.lineTo(510, 540);
      ctx.lineTo(550, 570);
      ctx.lineTo(520, 600);
      ctx.lineTo(560, 630);
      ctx.lineTo(530, 660);
      ctx.lineTo(570, 690);
      ctx.lineTo(540, 720);
      ctx.lineTo(580, 768);
      ctx.lineTo(0, 768);
      ctx.closePath();
      ctx.fill();
      
      // Add subtle shadow to the torn paper
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Dark torn area on the right
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(1024, 0);
      ctx.lineTo(1024, 768);
      ctx.lineTo(580, 768);
      ctx.lineTo(540, 720);
      ctx.lineTo(570, 690);
      ctx.lineTo(530, 660);
      ctx.lineTo(560, 630);
      ctx.lineTo(520, 600);
      ctx.lineTo(550, 570);
      ctx.lineTo(510, 540);
      ctx.lineTo(540, 510);
      ctx.lineTo(500, 480);
      ctx.lineTo(530, 450);
      ctx.lineTo(490, 420);
      ctx.lineTo(520, 390);
      ctx.lineTo(480, 360);
      ctx.lineTo(510, 330);
      ctx.lineTo(470, 300);
      ctx.lineTo(500, 270);
      ctx.lineTo(460, 240);
      ctx.lineTo(480, 210);
      ctx.lineTo(440, 180);
      ctx.lineTo(470, 150);
      ctx.lineTo(430, 120);
      ctx.lineTo(450, 90);
      ctx.lineTo(380, 60);
      ctx.lineTo(420, 30);
      ctx.closePath();
      ctx.fill();
      
      // Add "GENERATING" text on the dark side
      ctx.fillStyle = '#888888';
      ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GENERATING', 750, 340);
      
      // Add "..." on the next line
      ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.fillText('...', 750, 410)
      
      // Save as JPEG
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      fs.writeFileSync(filepath, buffer);
      
      console.log(`[THUMBNAIL] Created torn paper placeholder: ${filename}`);
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