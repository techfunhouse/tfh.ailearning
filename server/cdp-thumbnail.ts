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
      '--remote-debugging-port=' + this.chromePort,
      '--window-size=1024,768',
      '--disable-extensions',
      '--disable-plugins',
      '--autoplay-policy=no-user-gesture-required',
      '--mute-audio',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding'
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

    // Capture stderr for debugging
    if (this.chromeProcess.stderr) {
      this.chromeProcess.stderr.on('data', (data: Buffer) => {
        console.log('Chrome stderr:', data.toString());
      });
    }

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
    let pageClient: any = null;
    
    try {
      await this.launchChrome();
      
      // Wait for Chrome to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // List available targets first
      const targets = await CDP.List({ port: this.chromePort });
      console.log(`Available targets: ${targets.length}`);
      
      if (targets.length === 0) {
        // Try to create a new page if no targets exist
        console.log('No targets found, creating new page...');
        try {
          await CDP.New({ port: this.chromePort });
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (createError) {
          console.log('Failed to create new page:', createError);
        }
      }
      
      // Connect to browser first
      client = await CDP({ port: this.chromePort });
      const { Target } = client;
      
      let targetId: string;
      
      // Try to use existing target or create new one
      const updatedTargets = await CDP.List({ port: this.chromePort });
      if (updatedTargets.length > 0) {
        // Use existing target
        targetId = updatedTargets[0].id;
        console.log(`Using existing target: ${targetId}`);
      } else {
        // Create new target as last resort
        console.log('Creating new target...');
        const result = await Target.createTarget({ url: 'about:blank' });
        targetId = result.targetId;
      }
      
      // Connect to the target page
      pageClient = await CDP({ port: this.chromePort, target: targetId });
      const { Page: TargetPage, Runtime: TargetRuntime, Network: TargetNetwork } = pageClient;
      
      // Enable necessary domains on the target page
      await TargetPage.enable();
      await TargetRuntime.enable();
      await TargetNetwork.enable();
      
      // Set viewport
      await TargetPage.setDeviceMetricsOverride({
        width: 1024,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false
      });
      
      // Navigate with robust error handling
      const navigationPromise = TargetPage.loadEventFired();
      
      await TargetPage.navigate({ url });
      await navigationPromise;
      
      // Wait for content to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Additional wait for dynamic content
      try {
        await TargetRuntime.evaluate({
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
      
      // For YouTube videos, get video player dimensions
      let clipArea = { x: 0, y: 0, width: 1024, height: 768, scale: 1 };
      
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        try {
          const playerInfo = await TargetRuntime.evaluate({
            expression: `
              // Wait for YouTube player to load
              const waitForPlayer = () => {
                const selectors = [
                  '#movie_player',
                  '.html5-video-player',
                  '#player-container',
                  '.video-stream'
                ];
                
                for (const selector of selectors) {
                  const element = document.querySelector(selector);
                  if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                      return {
                        x: Math.max(0, rect.left),
                        y: Math.max(0, rect.top),
                        width: Math.min(rect.width, window.innerWidth - rect.left),
                        height: Math.min(rect.height, window.innerHeight - rect.top)
                      };
                    }
                  }
                }
                return null;
              };
              
              // Try multiple times to find the player
              let attempts = 0;
              const tryFind = () => {
                const info = waitForPlayer();
                if (info || attempts > 10) {
                  return info;
                }
                attempts++;
                return new Promise(resolve => setTimeout(() => resolve(tryFind()), 500));
              };
              
              tryFind();
            `,
            awaitPromise: true,
            timeout: 15000
          });
          
          if (playerInfo.result && playerInfo.result.value) {
            const player = playerInfo.result.value;
            clipArea = {
              x: Math.round(player.x),
              y: Math.round(player.y),
              width: Math.round(player.width),
              height: Math.round(player.height),
              scale: 1
            };
            console.log(`YouTube player found at: ${clipArea.x},${clipArea.y} ${clipArea.width}x${clipArea.height}`);
          }
        } catch (error) {
          console.log('Could not locate YouTube player, using full page capture');
        }
      }
      
      // Take screenshot with calculated clip area
      const screenshot = await TargetPage.captureScreenshot({
        format: 'png',
        clip: clipArea
      });
      
      // Process with Sharp for consistency
      const sharpModule = await import('sharp');
      const sharp = sharpModule.default || sharpModule;
      const thumbnailBuffer = await sharp(Buffer.from(screenshot.data, 'base64'))
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
      if (pageClient) {
        try {
          await pageClient.close();
        } catch {}
      }
      if (client) {
        try {
          await client.close();
        } catch {}
      }
      
      // Always cleanup Chrome process after each screenshot to prevent resource leaks
      try {
        await this.cleanup();
      } catch {}
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