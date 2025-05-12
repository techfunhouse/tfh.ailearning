#!/usr/bin/env node
/**
 * This script performs aggressive fixing of HTML files for custom domain deployment.
 * It ensures all asset paths are properly set to root-relative paths.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '.');
const deployDir = path.join(rootDir, 'gh-pages-deploy');
const indexPath = path.join(deployDir, 'index.html');

console.log('🔧 Custom Domain HTML Fix Tool 🔧');
console.log(`Looking for index.html at: ${indexPath}`);

if (!fs.existsSync(indexPath)) {
  console.error('❌ Error: index.html not found at:', indexPath);
  console.log('Make sure to run deploy-to-gh-pages.js first');
  process.exit(1);
}

console.log('📄 Found index.html - Loading content...');
let htmlContent = fs.readFileSync(indexPath, 'utf8');

// Store original content for comparison
const originalContent = htmlContent;

console.log('🔎 Analyzing HTML structure...');

// 1. Fix the base href tag
console.log('1️⃣ Fixing base href tag...');
htmlContent = htmlContent.replace(/<base href="[^"]*"/, '<base href="/"');

// 2. Fix paths in <link> and <script> tags
console.log('2️⃣ Fixing asset paths in link and script tags...');
htmlContent = htmlContent.replace(/href="\/ReferenceViewer\//g, 'href="/');
htmlContent = htmlContent.replace(/src="\/ReferenceViewer\//g, 'src="/');

// 3. Fix relative paths that might not have the leading slash
console.log('3️⃣ Fixing relative paths without leading slash...');
htmlContent = htmlContent.replace(/href="assets\//g, 'href="/assets/');
htmlContent = htmlContent.replace(/src="assets\//g, 'src="/assets/');
htmlContent = htmlContent.replace(/href="images\//g, 'href="/images/');
htmlContent = htmlContent.replace(/src="images\//g, 'src="/images/');
htmlContent = htmlContent.replace(/href="data\//g, 'href="/data/');
htmlContent = htmlContent.replace(/src="data\//g, 'src="/data/');

// 4. Fix CSS URL references 
console.log('4️⃣ Fixing CSS URL references...');
htmlContent = htmlContent.replace(/url\(\/ReferenceViewer\//g, 'url(/');
htmlContent = htmlContent.replace(/url\("\/ReferenceViewer\//g, 'url("/');
htmlContent = htmlContent.replace(/url\('\/ReferenceViewer\//g, "url('/");

// 5. Fix inline JSON data paths if any
console.log('5️⃣ Fixing inline JSON data paths...');
htmlContent = htmlContent.replace(/\/ReferenceViewer\/assets\//g, '/assets/');
htmlContent = htmlContent.replace(/\/ReferenceViewer\/data\//g, '/data/');
htmlContent = htmlContent.replace(/\/ReferenceViewer\/images\//g, '/images/');

// 6. Add meta tag for custom domain if not present
console.log('6️⃣ Adding custom domain meta tags...');
if (!htmlContent.includes('<meta name="custom-domain"')) {
  const metaTag = '<meta name="custom-domain" content="true">';
  htmlContent = htmlContent.replace('</head>', `  ${metaTag}\n  </head>`);
}

// Save the updated HTML
if (htmlContent !== originalContent) {
  console.log('💾 Changes detected - Saving updated HTML...');
  fs.writeFileSync(indexPath, htmlContent);
  console.log('✅ HTML file successfully updated for custom domain');
} else {
  console.log('⚠️ No changes required - HTML already correctly formatted');
}

// Also check 404.html if it exists (SPA routing fallback)
const notFoundPath = path.join(deployDir, '404.html');
if (fs.existsSync(notFoundPath)) {
  console.log('\n📄 Found 404.html - Updating...');
  let notFoundContent = fs.readFileSync(notFoundPath, 'utf8');
  const originalNotFoundContent = notFoundContent;
  
  // Fix paths in 404.html
  notFoundContent = notFoundContent.replace(/\/ReferenceViewer\//g, '/');
  
  if (notFoundContent !== originalNotFoundContent) {
    fs.writeFileSync(notFoundPath, notFoundContent);
    console.log('✅ 404.html file successfully updated');
  } else {
    console.log('⚠️ No changes required for 404.html');
  }
}

console.log('\n🎉 Custom domain fixes completed successfully!');
console.log('Your site should work properly at: https://aireferencehub.techfunhouse.com');