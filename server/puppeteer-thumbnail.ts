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
    console.log(`[THUMBNAIL] Generating elegant placeholder for: ${url}`);
    
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
      
      // Soft background gradient using page-specific colors
      const bgGradient = ctx.createLinearGradient(0, 0, 1024, 768);
      bgGradient.addColorStop(0, pageInfo.gradient[0]);
      bgGradient.addColorStop(1, pageInfo.gradient[1]);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 1024, 768);
      
      // Elegant main card with subtle shadow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      ctx.roundRect(80, 80, 864, 608, 24);
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Soft platform badge
      const badgeGradient = ctx.createLinearGradient(0, 120, 0, 180);
      badgeGradient.addColorStop(0, pageInfo.color);
      badgeGradient.addColorStop(1, pageInfo.secondaryColor);
      ctx.fillStyle = badgeGradient;
      ctx.roundRect(120, 120, 180, 60, 30);
      ctx.fill();
      
      // Badge text with better contrast
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.textAlign = 'center';
      ctx.fillText(pageInfo.type, 210, 155);
      
      // Large elegant icon
      ctx.font = '80px system-ui';
      ctx.fillStyle = pageInfo.color;
      ctx.fillText(pageInfo.icon, 512, 340);
      
      // Softer main text
      ctx.fillStyle = '#374151';
      ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.fillText('Beautiful Preview', 512, 420);
      
      // Subtitle
      ctx.fillStyle = '#6b7280';
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.fillText('Loading content...', 512, 460);
      
      // Elegant URL display (truncated)
      const truncatedUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial';
      ctx.fillText(truncatedUrl, 512, 520);
      
      // Soft progress dots instead of harsh circle
      const dotY = 580;
      for (let i = 0; i < 3; i++) {
        const dotX = 490 + (i * 22);
        const opacity = (Date.now() + i * 200) % 1500 < 500 ? 1 : 0.3;
        ctx.fillStyle = `rgba(${parseInt(pageInfo.color.slice(1, 3), 16)}, ${parseInt(pageInfo.color.slice(3, 5), 16)}, ${parseInt(pageInfo.color.slice(5, 7), 16)}, ${opacity})`;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Save as JPEG
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
      fs.writeFileSync(filepath, buffer);
      
      console.log(`[THUMBNAIL] Created elegant ${pageInfo.type} placeholder: ${filename}`);
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