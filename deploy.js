/**
 * GitHub Pages Simplified Deployment Script
 *
 * This script handles the complete deployment process for a React SPA to GitHub Pages.
 * It works with both repository and custom domain deployments with automatic configuration.
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

// Configuration
const BUILD_DIR = path.join(__dirname, 'dist/public');
const DEPLOY_DIR = path.join(__dirname, 'deploy');
const IS_CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || fs.existsSync(path.join(__dirname, 'CNAME'));
const CUSTOM_DOMAIN = IS_CUSTOM_DOMAIN ? 
  (process.env.CUSTOM_DOMAIN || fs.readFileSync(path.join(__dirname, 'CNAME'), 'utf8').trim()) : 
  null;

// Utility functions
const log = (message) => console.log(`\x1b[36m[Deploy]\x1b[0m ${message}`);
const error = (message) => console.error(`\x1b[31m[Deploy ERROR]\x1b[0m ${message}`);
const success = (message) => console.log(`\x1b[32m[Deploy SUCCESS]\x1b[0m ${message}`);

async function setupEnvironment() {
  log('Setting up deployment environment...');
  
  try {
    // Determine correct base path
    let basePath = '/';
    
    if (!IS_CUSTOM_DOMAIN) {
      // For GitHub project repositories, use repo name as base path
      const { stdout } = await execPromise('git remote -v');
      const repoUrlMatch = stdout.match(/github\.com[:\/]([^\/]+)\/([^\.]+)\.git/);
      
      if (repoUrlMatch && repoUrlMatch[2] && repoUrlMatch[2] !== `${repoUrlMatch[1]}.github.io`) {
        basePath = `/${repoUrlMatch[2]}/`;
        log(`Detected repository name: ${repoUrlMatch[2]}`);
      }
    }
    
    // Create environment config file
    fs.writeFileSync(
      path.join(__dirname, '.env.github-pages'),
      `# Generated configuration for GitHub Pages deployment
VITE_BASE_PATH=${basePath}
${IS_CUSTOM_DOMAIN ? `CUSTOM_DOMAIN=${CUSTOM_DOMAIN}\nVITE_USE_CUSTOM_DOMAIN=true` : ''}
`
    );
    
    success(`Environment configured with base path: ${basePath}${IS_CUSTOM_DOMAIN ? ` and custom domain: ${CUSTOM_DOMAIN}` : ''}`);
    return { basePath };
  } catch (err) {
    error(`Failed to set up environment: ${err.message}`);
    throw err;
  }
}

async function buildApp(basePath) {
  log('Building application...');
  
  try {
    // Export static data first
    await execPromise('node export-static-data.js');
    log('Static data exported successfully');
    
    // Set environment variables for the build
    const env = {
      ...process.env,
      VITE_BASE_PATH: basePath,
      VITE_USE_CUSTOM_DOMAIN: IS_CUSTOM_DOMAIN ? 'true' : 'false'
    };
    
    // Run the build
    await execPromise('npm run build', { env });
    success('Application built successfully');
  } catch (err) {
    error(`Build failed: ${err.message}`);
    throw err;
  }
}

async function prepareDeploymentFiles() {
  log('Preparing deployment files...');
  
  try {
    // Create deployment directory
    if (fs.existsSync(DEPLOY_DIR)) {
      fs.rmSync(DEPLOY_DIR, { recursive: true });
    }
    fs.mkdirSync(DEPLOY_DIR, { recursive: true });
    
    // Copy build files
    fs.cpSync(BUILD_DIR, DEPLOY_DIR, { recursive: true });
    
    // Create .nojekyll file
    fs.writeFileSync(path.join(DEPLOY_DIR, '.nojekyll'), '');
    
    // Create CNAME file if needed
    if (IS_CUSTOM_DOMAIN && CUSTOM_DOMAIN) {
      fs.writeFileSync(path.join(DEPLOY_DIR, 'CNAME'), CUSTOM_DOMAIN);
      log(`Created CNAME file for ${CUSTOM_DOMAIN}`);
    }
    
    // Create 404.html for SPA routing
    fs.writeFileSync(
      path.join(DEPLOY_DIR, '404.html'),
      `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      // Single Page App redirection
      sessionStorage.setItem('redirect', window.location.pathname);
      window.location.href = '/';
    </script>
  </head>
  <body>
    <h1>Redirecting...</h1>
    <p>If you are not redirected automatically, <a href="/">click here</a>.</p>
  </body>
</html>`
    );
    
    success('Deployment files prepared successfully');
  } catch (err) {
    error(`Failed to prepare deployment files: ${err.message}`);
    throw err;
  }
}

async function fixHtmlForCustomDomain() {
  if (!IS_CUSTOM_DOMAIN) return;
  
  log('Fixing HTML files for custom domain...');
  
  try {
    const indexHtmlPath = path.join(DEPLOY_DIR, 'index.html');
    let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
    
    // Fix base href
    indexHtml = indexHtml.replace(/<base href="[^"]*"/, '<base href="/"');
    
    // Get repository name for path fixing
    const { stdout } = await execPromise('git remote -v');
    const repoUrlMatch = stdout.match(/github\.com[:\/][^\/]+\/([^\.]+)\.git/);
    const repoName = repoUrlMatch ? repoUrlMatch[1] : null;
    
    if (repoName) {
      // Fix repository path references
      const repoPathRegex = new RegExp(`\\/${repoName}\\/`, 'g');
      indexHtml = indexHtml.replace(repoPathRegex, '/');
      
      // Fix CSS url() references
      const cssUrlRegex = new RegExp(`url\\(\\/${repoName}\\/`, 'g');
      indexHtml = indexHtml.replace(cssUrlRegex, 'url(/');
    }
    
    // Fix asset paths
    indexHtml = indexHtml.replace(/href="assets\//g, 'href="/assets/');
    indexHtml = indexHtml.replace(/src="assets\//g, 'src="/assets/');
    
    // Add custom domain meta tag
    indexHtml = indexHtml.replace('</head>', '<meta name="custom-domain" content="true">\n  </head>');
    
    fs.writeFileSync(indexHtmlPath, indexHtml);
    success('HTML files fixed for custom domain deployment');
  } catch (err) {
    error(`Failed to fix HTML for custom domain: ${err.message}`);
    throw err;
  }
}

async function main() {
  try {
    log('Starting deployment process...');
    
    const { basePath } = await setupEnvironment();
    await buildApp(basePath);
    await prepareDeploymentFiles();
    
    if (IS_CUSTOM_DOMAIN) {
      await fixHtmlForCustomDomain();
    }
    
    success('All deployment preparation complete!');
    log('Deploy files are ready in the "deploy" directory');
    log('Run the following manual commands to complete the deployment:');
    log('  git add -f deploy');
    log('  git commit -m "Deploy to GitHub Pages"');
    log('  git subtree push --prefix deploy origin gh-pages');
    
  } catch (err) {
    error(`Deployment process failed: ${err.message}`);
    process.exit(1);
  }
}

main();