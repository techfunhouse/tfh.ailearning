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

    console.log(`[CDP DEBUG] Launching Chrome with CDP on port ${this.chromePort}`);
    console.log(`[CDP DEBUG] Chrome path: ${chromePath}`);
    console.log(`[CDP DEBUG] Chrome args: ${args.join(' ')}`);
    
    this.chromeProcess = spawn(chromePath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

    if (!this.chromeProcess) {
      console.error('[CDP DEBUG] Failed to spawn Chrome process - spawn returned null');
      throw new Error('Failed to spawn Chrome process');
    }

    console.log(`[CDP DEBUG] Chrome process spawned with PID: ${this.chromeProcess.pid}`);

    // Handle process errors
    this.chromeProcess.on('error', (error: any) => {
      console.error('[CDP DEBUG] Chrome process error:', error);
      console.error('[CDP DEBUG] Error details:', {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall,
        path: error.path,
        message: error.message
      });
      this.chromeProcess = null;
    });

    this.chromeProcess.on('exit', (code: number, signal: string) => {
      console.log(`[CDP DEBUG] Chrome process exited with code ${code}, signal: ${signal}`);
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
      
      // Much longer timeout for local systems - 90 seconds
      setTimeout(() => reject(new Error('Chrome startup timeout')), 90000);
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
    console.log(`[CDP DEBUG] ========== Starting CDP screenshot ==========`);
    console.log(`[CDP DEBUG] URL: ${url}`);
    console.log(`[CDP DEBUG] Filename: ${filename}`);
    console.log(`[CDP DEBUG] Process platform: ${process.platform}`);
    console.log(`[CDP DEBUG] Node version: ${process.version}`);
    
    let client: any = null;
    let pageClient: any = null;
    
    try {
      console.log(`[CDP DEBUG] Step 1: Launching Chrome...`);
      await this.launchChrome();
      console.log(`[CDP DEBUG] Step 1: Chrome launch completed`);
      
      // Wait for Chrome to stabilize - much longer delays for local systems
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const stabilizeDelay = isYouTube ? 15000 : 8000; // Increased significantly
      console.log(`[CDP DEBUG] Step 2: Waiting ${stabilizeDelay}ms for Chrome to stabilize (YouTube: ${isYouTube})`);
      await new Promise(resolve => setTimeout(resolve, stabilizeDelay));
      console.log(`[CDP DEBUG] Step 2: Chrome stabilization completed`);
      
      // List available targets first
      console.log(`[CDP DEBUG] Step 3: Listing available targets...`);
      const targets = await CDP.List({ port: this.chromePort });
      console.log(`[CDP DEBUG] Step 3: Available targets: ${targets.length}`);
      
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
      console.log(`[CDP DEBUG] Step 4: Connecting to browser on port ${this.chromePort}...`);
      client = await CDP({ port: this.chromePort });
      console.log(`[CDP DEBUG] Step 4: Browser connection successful`);
      
      const { Target } = client;
      
      let targetId: string;
      
      // Try to use existing target or create new one
      console.log(`[CDP DEBUG] Step 5: Getting updated target list...`);
      const updatedTargets = await CDP.List({ port: this.chromePort });
      console.log(`[CDP DEBUG] Step 5: Found ${updatedTargets.length} targets`);
      
      if (updatedTargets.length > 0) {
        // Use existing target
        targetId = updatedTargets[0].id;
        console.log(`[CDP DEBUG] Step 5: Using existing target: ${targetId}`);
      } else {
        // Create new target as last resort
        console.log(`[CDP DEBUG] Step 5: Creating new target...`);
        const result = await Target.createTarget({ url: 'about:blank' });
        targetId = result.targetId;
        console.log(`[CDP DEBUG] Step 5: Created new target: ${targetId}`);
      }
      
      // Connect to the target page with timeout
      console.log(`[CDP DEBUG] Step 6: Connecting to target page ${targetId}...`);
      
      // Add timeout to page connection
      const pageConnectionPromise = CDP({ port: this.chromePort, target: targetId });
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Page connection timeout')), 30000); // 30 second timeout
      });
      
      pageClient = await Promise.race([pageConnectionPromise, timeoutPromise]) as any;
      console.log(`[CDP DEBUG] Step 6: Target page connection successful`);
      
      const { Page: TargetPage, Runtime: TargetRuntime, Network: TargetNetwork } = pageClient;
      
      // Enable necessary domains on the target page with timeouts
      console.log(`[CDP DEBUG] Step 7: Enabling Page domain...`);
      await Promise.race([
        TargetPage.enable(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Page.enable timeout')), 15000))
      ]);
      
      console.log(`[CDP DEBUG] Step 7: Enabling Runtime domain...`);
      await Promise.race([
        TargetRuntime.enable(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Runtime.enable timeout')), 15000))
      ]);
      
      console.log(`[CDP DEBUG] Step 7: Enabling Network domain...`);
      await Promise.race([
        TargetNetwork.enable(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network.enable timeout')), 15000))
      ]);
      
      console.log(`[CDP DEBUG] Step 7: All domains enabled successfully`);
      
      // Set viewport
      console.log(`[CDP DEBUG] Step 8: Setting viewport to 1024x768...`);
      await TargetPage.setDeviceMetricsOverride({
        width: 1024,
        height: 768,
        deviceScaleFactor: 1,
        mobile: false
      });
      console.log(`[CDP DEBUG] Step 8: Viewport set successfully`);
      
      // Navigate with multiple fallback strategies
      console.log(`[CDP DEBUG] Step 9: Starting navigation to ${url}...`);
      
      await TargetPage.navigate({ url });
      console.log(`[CDP DEBUG] Step 9: Navigation command sent, using time-based completion...`);
      
      // Use time-based approach instead of waiting for load event (more reliable for YouTube)
      const navigationDelay = isYouTube ? 45000 : 30000; // Very liberal delays for local systems
      console.log(`[CDP DEBUG] Step 9: Waiting ${navigationDelay}ms for page to complete loading...`);
      await new Promise(resolve => setTimeout(resolve, navigationDelay));
      console.log(`[CDP DEBUG] Step 9: Navigation wait completed`);
      
      // Wait for content to stabilize - much longer delays for local systems
      const loadDelay = isYouTube ? 20000 : 12000; // Significantly increased
      console.log(`[CDP DEBUG] Step 10: Waiting ${loadDelay}ms for content to stabilize...`);
      await new Promise(resolve => setTimeout(resolve, loadDelay));
      console.log(`[CDP DEBUG] Step 10: Content stabilization completed`);
      
      // Remove LinkedIn overlays and sign-in modals
      if (url.includes('linkedin.com')) {
        try {
          await TargetRuntime.evaluate({
            expression: `
              // Remove LinkedIn sign-in overlays and modals
              const overlaySelectors = [
                '[data-test-id="guest-homepage-basic-join-form"]',
                '.authwall',
                '.auth-wall',
                '.guest-homepage-cta',
                '.sign-in-modal',
                '.join-form',
                '.modal',
                '.modal-backdrop',
                '.overlay',
                '[role="dialog"]',
                '.artdeco-modal',
                '.artdeco-modal-overlay',
                '.contextual-sign-in-modal',
                '.contextual-sign-in-modal__modal-container'
              ];
              
              overlaySelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                  if (el) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.remove();
                  }
                });
              });
              
              // Remove scroll lock from body
              document.body.style.overflow = 'auto';
              document.documentElement.style.overflow = 'auto';
              
              // Remove modal classes
              document.body.classList.remove('modal-open', 'overflow-hidden');
              
              // Wait a moment for DOM changes
              new Promise(resolve => setTimeout(resolve, 1000));
            `,
            awaitPromise: true,
            timeout: 5000
          });
          console.log('LinkedIn overlays removed');
        } catch (error) {
          console.log('Failed to remove LinkedIn overlays:', error);
        }
      }
      
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
      console.log(`[CDP DEBUG] Step 11: Taking screenshot with clip area: ${JSON.stringify(clipArea)}...`);
      const screenshot = await TargetPage.captureScreenshot({
        format: 'png',
        clip: clipArea
      });
      console.log(`[CDP DEBUG] Step 11: Screenshot captured successfully`);
      
      // Process with Sharp for consistency
      console.log(`[CDP DEBUG] Step 12: Processing screenshot with Sharp...`);
      
      try {
        const sharpModule = await Promise.race([
          import('sharp'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Sharp import timeout')), 10000))
        ]);
        const sharp = sharpModule.default || sharpModule;
        
        console.log(`[CDP DEBUG] Step 12: Sharp imported, converting base64 screenshot data (${screenshot.data.length} chars)...`);
        
        const sharpProcessing = sharp(Buffer.from(screenshot.data, 'base64'))
          .jpeg({ quality: 90 }) // Convert to JPG format
          .resize(1024, 768, { 
            kernel: sharp.kernel.lanczos3,
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
          })
          .toBuffer();
          
        const sharpTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sharp processing timeout')), 30000)
        );
        
        const thumbnailBuffer = await Promise.race([sharpProcessing, sharpTimeout]);
        console.log(`[CDP DEBUG] Step 12: Sharp processing completed, buffer size: ${thumbnailBuffer.length}`);
        
        // Save to file
        console.log(`[CDP DEBUG] Step 13: Saving thumbnail file...`);
        const path = await import('path');
        const fs = await import('fs/promises');
        
        const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
        await fs.mkdir(thumbnailsDir, { recursive: true });
        const filepath = path.join(thumbnailsDir, filename);
        
        const fileWriteTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('File write timeout')), 10000)
        );
        
        await Promise.race([
          fs.writeFile(filepath, thumbnailBuffer),
          fileWriteTimeout
        ]);
        
        console.log(`[CDP DEBUG] Step 13: File saved successfully: ${filepath}`);
        console.log(`[CDP DEBUG] ========== CDP screenshot completed successfully ==========`);
        return true;
        
      } catch (sharpError) {
        console.log(`[CDP DEBUG] Sharp processing failed: ${sharpError.message}`);
        
        // Fallback: save raw PNG data directly
        console.log(`[CDP DEBUG] Step 12 Fallback: Saving raw PNG data...`);
        const path = await import('path');
        const fs = await import('fs/promises');
        
        const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
        await fs.mkdir(thumbnailsDir, { recursive: true });
        const filepath = path.join(thumbnailsDir, filename.replace('.jpg', '.png'));
        await fs.writeFile(filepath, Buffer.from(screenshot.data, 'base64'));
        
        console.log(`[CDP DEBUG] Step 13 Fallback: Raw PNG saved: ${filepath}`);
        return true;
      }
      
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