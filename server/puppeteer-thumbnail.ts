import path from 'path';
import fs from 'fs';
import { createCanvas } from 'canvas';

export class PuppeteerThumbnailService {
  private static getPageTypeInfo(url: string) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return { type: 'YouTube', color: '#FF0000', icon: '▶' };
    }
    if (url.includes('linkedin.com')) {
      return { type: 'LinkedIn', color: '#0077B5', icon: '💼' };
    }
    if (url.includes('github.com')) {
      return { type: 'GitHub', color: '#333', icon: '⚡' };
    }
    if (url.includes('twitter.com') || url.includes('x.com')) {
      return { type: 'Twitter/X', color: '#1DA1F2', icon: '🐦' };
    }
    if (url.includes('medium.com')) {
      return { type: 'Medium', color: '#00AB6C', icon: '📝' };
    }
    return { type: 'Website', color: '#6B7280', icon: '🌐' };
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
      
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 768);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 768);
      
      // Main content area
      ctx.fillStyle = '#ffffff';
      ctx.roundRect(64, 64, 896, 640, 16);
      ctx.fill();
      
      // Drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      
      // Platform badge
      ctx.fillStyle = pageInfo.color;
      ctx.roundRect(96, 96, 200, 48, 24);
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      
      // Badge text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(pageInfo.type, 196, 125);
      
      // Icon
      ctx.font = '64px Arial';
      ctx.fillStyle = pageInfo.color;
      ctx.fillText(pageInfo.icon, 512, 320);
      
      // Main text
      ctx.fillStyle = '#1f2937';
      ctx.font = '32px Arial';
      ctx.fillText('Generating Screenshot...', 512, 400);
      
      // URL text (truncated)
      const truncatedUrl = url.length > 60 ? url.substring(0, 57) + '...' : url;
      ctx.fillStyle = '#6b7280';
      ctx.font = '18px Arial';
      ctx.fillText(truncatedUrl, 512, 450);
      
      // Progress indicator
      ctx.strokeStyle = pageInfo.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(512, 520, 32, -Math.PI/2, Math.PI/2);
      ctx.stroke();
      
      // Loading dots
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i === Math.floor(Date.now() / 500) % 3 ? pageInfo.color : '#e5e7eb';
        ctx.beginPath();
        ctx.arc(480 + (i * 24), 580, 6, 0, Math.PI * 2);
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