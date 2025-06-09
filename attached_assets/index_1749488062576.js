#!/usr/bin/env node

const { program } = require('commander');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

// Create screenshots directory if it doesn't exist
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
}

program
    .name('screenshot')
    .description('CLI tool to generate screenshots of web pages')
    .version('1.0.0')
    .argument('<url>', 'URL to capture')
    .parse(process.argv);

const url = program.args[0];

// Common overlay selectors to remove
const overlaySelectors = [
    // Cookie notices
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="consent"]',
    '[id*="consent"]',
    // Popups
    '[class*="popup"]',
    '[id*="popup"]',
    '[class*="modal"]',
    '[id*="modal"]',
    // Newsletter signups
    '[class*="newsletter"]',
    '[id*="newsletter"]',
    // Common overlay classes
    '.overlay',
    '.modal-overlay',
    '.popup-overlay',
    // Common overlay IDs
    '#overlay',
    '#modal-overlay',
    '#popup-overlay'
];

async function removeOverlays(page) {
    await page.evaluate((selectors) => {
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.remove();
            });
        });
    }, overlaySelectors);
}

async function takeScreenshot() {
    try {
        const browser = await puppeteer.launch({
            headless: 'new'
        });
        
        const page = await browser.newPage();
        await page.setViewport({ 
            width: 1024, 
            height: 768 
        });
        
        // Navigate to the URL
        await page.goto(url, { waitUntil: 'networkidle0' });
        
        // Remove overlays
        await removeOverlays(page);
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `screenshot-${timestamp}.jpg`;
        const filepath = path.join(screenshotsDir, filename);
        
        // Take screenshot
        await page.screenshot({
            path: filepath,
            type: 'jpeg',
            quality: 90
        });
        
        await browser.close();
        
        console.log('Screenshot generated successfully!');
        console.log(`Saved to: ${filepath}`);
        console.log('Settings:');
        console.log('- Viewport: 1024x768');
        console.log('- Format: JPG');
        console.log('- Quality: 90');
        console.log('- Overlays: Removed');
        
    } catch (error) {
        console.error('Error generating screenshot:', error.message);
        process.exit(1);
    }
}

takeScreenshot(); 