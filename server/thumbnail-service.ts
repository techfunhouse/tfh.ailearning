import puppeteer from 'puppeteer';
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
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  private static async generateScreenshot(url: string): Promise<Buffer | null> {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();
      
      // Set higher resolution viewport for better quality
      await page.setViewport({ 
        width: 1920, 
        height: 1008,
        deviceScaleFactor: 2 // Higher DPI for crisp images
      });
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 120000  // 2 minutes timeout
      });
      
      // Wait for content to load fully
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 85, // Good balance between quality and file size
        clip: { x: 0, y: 0, width: 1920, height: 1008 }
      });
      
      await page.close();
      return screenshot as Buffer;
    } catch (error) {
      console.error('Screenshot generation failed:', error);
      return null;
    }
  }

  private static generateSVGThumbnail(url: string, title: string, category: string): string {
    // Category colors
    const categoryColors: Record<string, string> = {
      'AI & Machine Learning': '#8B5CF6',
      'Web Development': '#3B82F6',
      'Design': '#EC4899',
      'Productivity': '#10B981',
      'Marketing': '#F59E0B',
      'Business': '#EF4444',
      'Education': '#06B6D4',
      'Technology': '#6366F1',
      'default': '#6B7280'
    };

    const color = categoryColors[category] || categoryColors.default;
    let domain = '';
    try {
      domain = new URL(url).hostname;
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
    
    // Truncate title if too long and escape XML entities
    const safeTruncatedTitle = escapeXml(title.length > 50 ? title.substring(0, 47) + '...' : title);
    const safeCategory = escapeXml(category);
    const safeDomain = escapeXml(domain);

    return `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
          </linearGradient>
          <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.1)"/>
          </pattern>
        </defs>
        <rect width="320" height="180" fill="url(#bg)"/>
        <rect width="320" height="180" fill="url(#dots)"/>
        <rect x="10" y="10" width="${Math.min(safeCategory.length * 8 + 20, 150)}" height="25" rx="4" fill="rgba(0,0,0,0.3)"/>
        <text x="20" y="27" font-family="Arial, sans-serif" font-size="12" fill="white">${safeCategory}</text>
        <text x="160" y="90" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">
          <tspan x="160" dy="0">${safeTruncatedTitle}</tspan>
        </text>
        <text x="160" y="160" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">${safeDomain}</text>
      </svg>`;
  }

  // Background processing methods
  static queueThumbnailGeneration(referenceId: string, url: string, title: string, category: string): string {
    const jobId = uuidv4();
    const job: ThumbnailJob = {
      id: jobId,
      referenceId,
      url,
      title,
      category,
      status: 'pending',
      createdAt: new Date()
    };
    
    this.jobQueue.set(jobId, job);
    
    // Start processing if not already running
    if (!this.processingQueue) {
      this.processQueue();
    }
    
    return jobId;
  }

  // Enhanced method that registers callback before processing
  static queueThumbnailGenerationWithCallback(
    referenceId: string, 
    url: string, 
    title: string, 
    category: string, 
    callback: (job: ThumbnailJob) => void
  ): string {
    const jobId = uuidv4();
    const job: ThumbnailJob = {
      id: jobId,
      referenceId,
      url,
      title,
      category,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Register callback BEFORE adding to queue
    this.eventCallbacks.set(jobId, callback);
    this.jobQueue.set(jobId, job);
    
    // Start processing if not already running
    if (!this.processingQueue) {
      this.processQueue();
    }
    
    return jobId;
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
      callback(job);
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