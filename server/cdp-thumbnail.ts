import CDP from 'chrome-remote-interface';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export class CDPThumbnailService {
  private static chromeProcess: any = null;
  private static chromePort: number = 0;

  static async launchChrome(): Promise<void> {
    if (this.chromeProcess) {
      return;
    }

    // Find available port for Chrome debugging
    this.chromePort = await this.findAvailablePort();

    // Detect environment for Chrome executable path
    const isReplit = process.env.REPLIT_CLUSTER || process.env.REPL_SLUG;
    let chromePath = 'google-chrome';
    
    if (isReplit) {
      chromePath = '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium';
    } else {
      // Common Chrome paths for different systems
      const chromePaths = [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
        'google-chrome-stable', // Linux
        'google-chrome', // Linux alternative
        'chromium-browser', // Ubuntu/Debian
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' // Windows 32-bit
      ];
      
      for (const testPath of chromePaths) {
        try {
          await fs.access(testPath);
          chromePath = testPath;
          break;
        } catch {
          continue;
        }
      }
    }

    const args = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--remote-debugging-port=' + this.chromePort,
      '--window-size=1024,768',
      '--virtual-time-budget=5000',
      '--run-all-compositor-stages-before-draw',
      '--disable-new-content-rendering-timeout'
    ];

    console.log(`Launching Chrome with CDP on port ${this.chromePort}`);
    this.chromeProcess = spawn(chromePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    // Handle process errors
    this.chromeProcess.on('error', (error: any) => {
      console.log('Chrome process error:', error.message);
      this.chromeProcess = null;
    });

    this.chromeProcess.on('exit', (code: number) => {
      console.log(`Chrome process exited with code ${code}`);
      this.chromeProcess = null;
    });

    // Wait for Chrome to start and verify connection
    await new Promise((resolve, reject) => {
      const checkConnection = async () => {
        try {
          const response = await fetch(`http://localhost:${this.chromePort}/json/version`);
          if (response.ok) {
            console.log(`Chrome CDP connection established on port ${this.chromePort}`);
            resolve(undefined);
          } else {
            throw new Error('CDP not ready');
          }
        } catch (error) {
          // Continue checking
          setTimeout(checkConnection, 500);
        }
      };
      
      // Start checking after initial delay
      setTimeout(checkConnection, 1000);
      
      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Chrome startup timeout')), 10000);
    });
  }

  private static async findAvailablePort(): Promise<number> {
    const net = await import('net');
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      server.listen(0, () => {
        const port = (server.address() as any)?.port;
        server.close(() => {
          if (port) {
            resolve(port);
          } else {
            reject(new Error('Could not find available port'));
          }
        });
      });
    });
  }

  static async takeScreenshot(url: string, filename: string): Promise<boolean> {
    let client: any = null;
    
    try {
      await this.launchChrome();
      
      client = await CDP({ port: this.chromePort });
      const { Page, Runtime, Network } = client;
      
      // Enable necessary domains
      await Page.enable();
      await Runtime.enable();
      await Network.enable();
      
      // Set viewport
      await Page.setDeviceMetricsOverride({
        width: 1024,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false
      });
      
      // Navigate with robust error handling
      const navigationPromise = Page.loadEventFired();
      
      await Page.navigate({ url });
      await navigationPromise;
      
      // Wait for content to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Additional wait for dynamic content
      try {
        await Runtime.evaluate({
          expression: `
            new Promise(resolve => {
              if (document.readyState === 'complete') {
                setTimeout(resolve, 2000);
              } else {
                window.addEventListener('load', () => setTimeout(resolve, 2000));
              }
            })
          `,
          awaitPromise: true,
          timeout: 10000
        });
      } catch {
        // Continue if evaluation fails
      }
      
      // Take screenshot
      const screenshot = await Page.captureScreenshot({
        format: 'png',
        clip: {
          x: 0,
          y: 0,
          width: 1024,
          height: 768,
          scale: 1
        }
      });
      
      // Process with Sharp for consistency
      const sharp = await import('sharp');
      const thumbnailBuffer = await sharp.default(Buffer.from(screenshot.data, 'base64'))
        .resize(1024, 768, { 
          kernel: sharp.kernel.lanczos3,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 1 }
        })
        .toBuffer();
      
      // Save to file
      const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
      await fs.mkdir(thumbnailsDir, { recursive: true });
      const filepath = path.join(thumbnailsDir, filename);
      await fs.writeFile(filepath, thumbnailBuffer);
      
      console.log(`CDP screenshot created: ${filename}`);
      return true;
      
    } catch (error: any) {
      console.log(`CDP screenshot failed for ${url}: ${error.message}`);
      return false;
    } finally {
      if (client) {
        try {
          await client.close();
        } catch {}
      }
    }
  }

  static async cleanup(): Promise<void> {
    if (this.chromeProcess) {
      this.chromeProcess.kill('SIGTERM');
      this.chromeProcess = null;
    }
  }
}

// Cleanup on process exit
process.on('exit', () => CDPThumbnailService.cleanup());
process.on('SIGINT', () => {
  CDPThumbnailService.cleanup();
  process.exit(0);
});