#!/usr/bin/env node
/**
 * GitHub Pages Deployment Script
 * 
 * This script handles the complete deployment process for a React SPA to GitHub Pages.
 * It builds the app and prepares all necessary files for proper SPA routing on GitHub Pages.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration - edit these values as needed
const REPO_NAME = 'ReferenceViewer';
const BUILD_DIR = path.join(__dirname, 'dist/public');
const DEPLOY_DIR = path.join(__dirname, 'gh-pages-deploy');

console.log('=== GitHub Pages Deployment Script ===');

// Step 1: Export static data for GitHub Pages
console.log('\n📊 Exporting static data for GitHub Pages...');
try {
  execSync('node export-static-data.js', { stdio: 'inherit' });
  console.log('✅ Static data export successful');
} catch (error) {
  console.error('❌ Static data export failed:', error.message);
  // Continue anyway, as we might want to deploy even if data export fails
}

// Step 2: Build the application
console.log('\n📦 Building the application...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build successful');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 3: Prepare deployment directory
console.log('\n🔧 Preparing deployment directory...');
if (fs.existsSync(DEPLOY_DIR)) {
  console.log('Cleaning existing deployment directory...');
  fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DEPLOY_DIR, { recursive: true });
console.log('✅ Deployment directory created');

// Step 4: Copy build files to deployment directory
console.log('\n📋 Copying build files...');
fs.cpSync(BUILD_DIR, DEPLOY_DIR, { recursive: true });
console.log('✅ Build files copied to deployment directory');

// Step 4: Create .nojekyll file to bypass Jekyll processing
console.log('\n🔧 Creating .nojekyll file...');
fs.writeFileSync(path.join(DEPLOY_DIR, '.nojekyll'), '');
console.log('✅ .nojekyll file created');

// Step 5: Create CNAME file if using a custom domain
// Uncomment and modify if needed
// console.log('\n🌐 Creating CNAME file for custom domain...');
// fs.writeFileSync(path.join(DEPLOY_DIR, 'CNAME'), 'your-custom-domain.com');
// console.log('✅ CNAME file created');

// Step 6: Modify the index.html file
console.log('\n🔄 Modifying index.html for GitHub Pages...');
const indexPath = path.join(DEPLOY_DIR, 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Add base tag and path handling script
indexContent = indexContent.replace(
  '<head>',
  `<head>
    <!-- GitHub Pages base path -->
    <base href="/${REPO_NAME}/">
    <!-- Single Page App fix for GitHub Pages -->
    <script type="text/javascript">
      // When the GitHub Pages site loads, it may be loading a path other than the root.
      // This script helps preserve the requested path when redirected to index.html.
      (function(l) {
        if (l.search[1] === '/' ) {
          var decoded = l.search.slice(1).split('&').map(function(s) { 
            return s.replace(/~and~/g, '&')
          }).join('?');
          window.history.replaceState(null, null,
              l.pathname.slice(0, -1) + decoded + l.hash
          );
        }
      }(window.location))
    </script>`
);

fs.writeFileSync(indexPath, indexContent);
console.log('✅ index.html modified for GitHub Pages');

// Step 7: Create a 404.html file that redirects back to index.html
console.log('\n🔄 Creating 404.html for SPA routing...');
const notFoundContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>RefHub - Redirecting</title>
    <script type="text/javascript">
      // Single Page Apps for GitHub Pages
      // MIT License
      // https://github.com/rafgraph/spa-github-pages
      // This script takes the current url and converts the path and query
      // string into just a query string, and then redirects the browser
      // to the new url with only a query string and hash fragment
      
      // If you're creating a Project Pages site and NOT using a custom domain,
      // then set pathSegmentsToKeep to 1 (enterprise users may need to set it to > 1).
      var pathSegmentsToKeep = 1;

      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
    <h1>Redirecting...</h1>
  </body>
</html>`;

fs.writeFileSync(path.join(DEPLOY_DIR, '404.html'), notFoundContent);
console.log('✅ 404.html created for SPA routing');

// Step 8: Create a specialized github-pages-app.html file that ensures proper routing
console.log('\n🔄 Creating specialized entry points...');

// Create specialized index for the gh-pages root
const specialIndexContent = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>RefHub - Reference Management</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 40px 20px;
        line-height: 1.6;
        color: #333;
        text-align: center;
      }
      .container {
        max-width: 650px;
        margin: 0 auto;
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      h1 {
        font-size: 2.5rem;
        margin-bottom: 24px;
        color: #4338ca;
      }
      p {
        font-size: 1.1rem;
        margin-bottom: 20px;
      }
      .button {
        display: inline-block;
        background: #4338ca;
        color: white;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 4px;
        font-weight: 500;
        margin-top: 20px;
        transition: background 0.2s;
      }
      .button:hover {
        background: #3730a3;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>RefHub</h1>
      <p>A modern reference collection management system for organizing, discovering, and sharing valuable resources.</p>
      <p>Built with React, TypeScript, and modern web technologies.</p>
      <a href="${REPO_NAME}/" class="button">Go to Application</a>
    </div>
  </body>
</html>`;

fs.writeFileSync(path.join(DEPLOY_DIR, 'github-pages.html'), specialIndexContent);
console.log('✅ Created specialized entry points');

console.log('\n✨ Deployment files prepared successfully! ✨');
console.log(`\nYour files are ready in: ${DEPLOY_DIR}`);
console.log('\nNext steps:');
console.log('1. Commit and push the contents of the deployment directory to the gh-pages branch of your repository');
console.log('2. Configure GitHub Pages in your repository settings to use the gh-pages branch');
console.log('3. Access your deployed app at: https://[username].github.io/ReferenceViewer/');
console.log('\nTo deploy manually:');
console.log(`cd ${DEPLOY_DIR}`);
console.log('git init');
console.log('git checkout -b gh-pages');
console.log('git add .');
console.log('git commit -m "Deploy to GitHub Pages"');
console.log('git remote add origin https://github.com/[username]/ReferenceViewer.git');
console.log('git push -f origin gh-pages');