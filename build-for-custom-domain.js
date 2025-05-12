#!/usr/bin/env node
/**
 * This script builds a deployable version specifically for custom domains.
 * It directly manipulates source files before building to ensure correct paths.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '.');

// Custom domain settings
const CUSTOM_DOMAIN = 'aireferencehub.techfunhouse.com';
const PUBLIC_URL = '/';  // Root path for custom domain

// Directories
const BUILD_DIR = path.join(__dirname, 'dist/public');
const DEPLOY_DIR = path.join(__dirname, 'gh-pages-deploy');

console.log('🚀 Custom Domain Deployment Builder');
console.log(`Building for: ${CUSTOM_DOMAIN}`);

// Step 1: Create a temporary .env file for custom domain build
console.log('\n📝 Creating custom domain environment...');
const envContent = `
# Custom domain build configuration
VITE_BASE_PATH=/
VITE_PUBLIC_URL=/
VITE_USE_CUSTOM_DOMAIN=true
CUSTOM_DOMAIN=${CUSTOM_DOMAIN}
`;

fs.writeFileSync('.env.custom-domain', envContent);
console.log('✅ Created .env.custom-domain file');

// Step 2: Modify Vite's base path temporarily
console.log('\n🔧 Configuring build for custom domain...');

// Step 3: Export static data
console.log('\n📊 Exporting static data...');
try {
  execSync('node export-static-data.js', { stdio: 'inherit' });
  console.log('✅ Static data exported successfully');
} catch (error) {
  console.error('❌ Failed to export static data:', error.message);
  process.exit(1);
}

// Step 4: Clean up existing build and deploy directories
console.log('\n🧹 Cleaning up old build files...');
if (fs.existsSync(BUILD_DIR)) {
  try {
    execSync(`rm -rf ${BUILD_DIR}`, { stdio: 'inherit' });
    console.log('✅ Cleaned build directory');
  } catch (error) {
    console.error('❌ Failed to clean build directory:', error.message);
  }
}

if (fs.existsSync(DEPLOY_DIR)) {
  try {
    execSync(`rm -rf ${DEPLOY_DIR}`, { stdio: 'inherit' });
    console.log('✅ Cleaned deploy directory');
  } catch (error) {
    console.error('❌ Failed to clean deploy directory:', error.message);
  }
}

// Step 5: Build the project with custom domain settings
console.log('\n🏗️ Building project for custom domain...');
try {
  execSync('NODE_ENV=production VITE_USE_CUSTOM_DOMAIN=true npm run build', {
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_BASE_PATH: '/',
      VITE_PUBLIC_URL: '/',
      VITE_USE_CUSTOM_DOMAIN: 'true',
      CUSTOM_DOMAIN: CUSTOM_DOMAIN
    }
  });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 6: Create deployment directory
console.log('\n📁 Setting up deployment directory...');
fs.mkdirSync(DEPLOY_DIR, { recursive: true });

// Step 7: Copy build files to deployment directory
console.log('📋 Copying build files to deployment directory...');
try {
  execSync(`cp -R ${BUILD_DIR}/* ${DEPLOY_DIR}/`, { stdio: 'inherit' });
  console.log('✅ Files copied successfully');
} catch (error) {
  console.error('❌ Failed to copy files:', error.message);
  process.exit(1);
}

// Step 8: Create CNAME file
console.log('\n🌐 Creating CNAME file...');
fs.writeFileSync(path.join(DEPLOY_DIR, 'CNAME'), CUSTOM_DOMAIN);
console.log('✅ CNAME file created');

// Step 9: Create .nojekyll file
console.log('📄 Creating .nojekyll file...');
fs.writeFileSync(path.join(DEPLOY_DIR, '.nojekyll'), '');
console.log('✅ .nojekyll file created');

// Step 10: Create 404.html for SPA routing
console.log('📄 Creating 404.html for SPA routing...');
const notFoundContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      // Single Page App redirection for GitHub Pages
      sessionStorage.setItem('redirect', window.location.pathname);
      window.location.href = '/';
    </script>
  </head>
  <body>
    <h1>Redirecting...</h1>
    <p>If you are not redirected automatically, <a href="/">click here</a>.</p>
  </body>
</html>`;
fs.writeFileSync(path.join(DEPLOY_DIR, '404.html'), notFoundContent);
console.log('✅ 404.html created');

// Step 11: Modify index.html to ensure paths are correct
console.log('\n🔍 Checking generated index.html...');
const indexPath = path.join(DEPLOY_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Force update the base href to be absolutely root-relative
  indexContent = indexContent.replace(/<base href="[^"]*"/, '<base href="/"');
  
  // Make sure asset paths are correct
  indexContent = indexContent.replace(/href="\/ReferenceViewer\/assets\//g, 'href="/assets/');
  indexContent = indexContent.replace(/src="\/ReferenceViewer\/assets\//g, 'src="/assets/');
  
  // Fix any other paths
  indexContent = indexContent.replace(/\/ReferenceViewer\//g, '/');
  
  // Add custom domain meta tag
  const metaTag = '<meta name="custom-domain" content="true">';
  indexContent = indexContent.replace('</head>', `  ${metaTag}\n  </head>`);
  
  // Save the updated content
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ index.html updated');
} else {
  console.error('❌ index.html not found!');
}

// Step 12: Generate an info file for debugging
console.log('\n📋 Generating deployment info...');
const infoContent = `
Custom Domain Deployment
=======================
Domain: ${CUSTOM_DOMAIN}
Generated: ${new Date().toISOString()}
Public URL: ${PUBLIC_URL}
`;
fs.writeFileSync(path.join(DEPLOY_DIR, 'deployment-info.txt'), infoContent);
console.log('✅ Deployment info generated');

console.log('\n🎉 Custom domain build completed successfully!');
console.log('The files are ready in the gh-pages-deploy directory.');
console.log('You can now commit and push this directory to GitHub Pages.');