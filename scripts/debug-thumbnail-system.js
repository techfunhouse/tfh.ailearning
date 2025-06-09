#!/usr/bin/env node

/**
 * Comprehensive thumbnail system diagnostic tool
 * This script tests all components of the thumbnail generation system
 * and provides detailed debugging information for troubleshooting
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

async function checkSystemInfo() {
  console.log('\n=== SYSTEM INFORMATION ===');
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`OS: ${os.type()} ${os.release()}`);
  console.log(`Free memory: ${Math.round(os.freemem() / 1024 / 1024)} MB`);
  console.log(`Total memory: ${Math.round(os.totalmem() / 1024 / 1024)} MB`);
}

async function checkChromePaths() {
  console.log('\n=== CHROME INSTALLATION CHECK ===');
  
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];

  const foundPaths = [];
  
  for (const chromePath of possiblePaths) {
    try {
      await fs.access(chromePath);
      foundPaths.push(chromePath);
      console.log(`✓ Found Chrome at: ${chromePath}`);
    } catch {
      console.log(`✗ Not found: ${chromePath}`);
    }
  }

  if (foundPaths.length === 0) {
    console.log('❌ No Chrome installations found!');
    console.log('Please install Google Chrome or Chromium');
  } else {
    console.log(`✅ Found ${foundPaths.length} Chrome installation(s)`);
  }

  return foundPaths;
}

async function testChromeExecution(chromePath) {
  console.log(`\n=== TESTING CHROME EXECUTION: ${chromePath} ===`);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('❌ Chrome execution timed out (30 seconds)');
      chromeProcess?.kill('SIGKILL');
      resolve(false);
    }, 30000);

    const args = [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--version'
    ];

    console.log(`Command: ${chromePath} ${args.join(' ')}`);
    
    const chromeProcess = spawn(chromePath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    chromeProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    chromeProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    chromeProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Chrome process error:', error.message);
      console.log('Error details:', {
        code: error.code,
        errno: error.errno,
        syscall: error.syscall
      });
      resolve(false);
    });

    chromeProcess.on('exit', (code, signal) => {
      clearTimeout(timeout);
      console.log(`Chrome exited with code: ${code}, signal: ${signal}`);
      
      if (stdout.trim()) {
        console.log('✅ Chrome stdout:', stdout.trim());
      }
      
      if (stderr.trim()) {
        console.log('Chrome stderr:', stderr.trim());
      }

      resolve(code === 0);
    });
  });
}

async function testCDPConnection(chromePath) {
  console.log(`\n=== TESTING CDP CONNECTION ===`);
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      console.log('❌ CDP test timed out (45 seconds)');
      chromeProcess?.kill('SIGKILL');
      resolve(false);
    }, 45000);

    // Find available port
    const net = require('net');
    const server = net.createServer();
    
    server.listen(0, () => {
      const port = server.address()?.port;
      server.close(() => {
        console.log(`Using port: ${port}`);
        testCDPWithPort(chromePath, port, timeout, resolve);
      });
    });
  });
}

function testCDPWithPort(chromePath, port, timeout, resolve) {
  const args = [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    `--remote-debugging-port=${port}`,
    '--window-size=1024,768'
  ];

  console.log(`CDP Command: ${chromePath} ${args.join(' ')}`);
  
  const chromeProcess = spawn(chromePath, args, {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  chromeProcess.on('error', (error) => {
    clearTimeout(timeout);
    console.log('❌ CDP Chrome process error:', error.message);
    resolve(false);
  });

  chromeProcess.stderr?.on('data', (data) => {
    const output = data.toString();
    console.log('Chrome CDP stderr:', output);
    
    // Look for DevTools listening message
    if (output.includes('DevTools listening on')) {
      console.log('✅ CDP connection established successfully');
      clearTimeout(timeout);
      chromeProcess.kill('SIGTERM');
      resolve(true);
    }
  });

  // Give Chrome time to start
  setTimeout(() => {
    if (!chromeProcess.killed) {
      console.log('❌ CDP connection not established within 10 seconds');
      clearTimeout(timeout);
      chromeProcess.kill('SIGKILL');
      resolve(false);
    }
  }, 10000);
}

async function checkNodeModules() {
  console.log('\n=== NODE MODULES CHECK ===');
  
  const requiredModules = [
    'chrome-remote-interface',
    'sharp',
    'puppeteer'
  ];

  for (const module of requiredModules) {
    try {
      require.resolve(module);
      console.log(`✅ ${module}: Available`);
    } catch {
      console.log(`❌ ${module}: Missing`);
    }
  }
}

async function testSharp() {
  console.log('\n=== SHARP IMAGE PROCESSING TEST ===');
  
  try {
    const sharp = require('sharp');
    
    // Test SVG to JPEG conversion
    const testSvg = `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#FF0000"/>
        <text x="50" y="50" font-family="Arial" font-size="20" fill="white" text-anchor="middle">TEST</text>
      </svg>
    `;
    
    const buffer = await sharp(Buffer.from(testSvg))
      .jpeg({ quality: 90 })
      .toBuffer();
    
    console.log(`✅ Sharp SVG to JPEG conversion successful (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.log('❌ Sharp test failed:', error.message);
    return false;
  }
}

async function checkFilePermissions() {
  console.log('\n=== FILE PERMISSIONS CHECK ===');
  
  const thumbnailsDir = path.join(process.cwd(), 'client/public/thumbnails');
  
  try {
    // Check if directory exists
    await fs.access(thumbnailsDir);
    console.log(`✅ Thumbnails directory exists: ${thumbnailsDir}`);
  } catch {
    console.log(`⚠️  Thumbnails directory does not exist: ${thumbnailsDir}`);
    try {
      await fs.mkdir(thumbnailsDir, { recursive: true });
      console.log(`✅ Created thumbnails directory: ${thumbnailsDir}`);
    } catch (error) {
      console.log(`❌ Cannot create thumbnails directory: ${error.message}`);
      return false;
    }
  }

  // Test write permissions
  const testFile = path.join(thumbnailsDir, 'test-write.txt');
  try {
    await fs.writeFile(testFile, 'test');
    await fs.unlink(testFile);
    console.log('✅ Write permissions: OK');
    return true;
  } catch (error) {
    console.log(`❌ Write permissions: Failed - ${error.message}`);
    return false;
  }
}

async function runDiagnostics() {
  console.log('🔍 THUMBNAIL SYSTEM DIAGNOSTICS');
  console.log('================================');
  
  await checkSystemInfo();
  
  const chromePaths = await checkChromePaths();
  if (chromePaths.length === 0) {
    console.log('\n❌ CRITICAL: No Chrome installations found. Please install Chrome first.');
    return;
  }

  let chromeWorking = false;
  for (const chromePath of chromePaths.slice(0, 2)) { // Test max 2 paths
    const success = await testChromeExecution(chromePath);
    if (success) {
      chromeWorking = true;
      await testCDPConnection(chromePath);
      break;
    }
  }

  if (!chromeWorking) {
    console.log('\n❌ CRITICAL: Chrome execution failed on all tested paths');
  }

  await checkNodeModules();
  await testSharp();
  await checkFilePermissions();

  console.log('\n=== DIAGNOSIS COMPLETE ===');
  console.log('Review the results above to identify any issues.');
  console.log('All items marked with ✅ are working correctly.');
  console.log('Items marked with ❌ need attention.');
  console.log('Items marked with ⚠️ are warnings but may not prevent operation.');
}

// Run diagnostics
runDiagnostics().catch(console.error);