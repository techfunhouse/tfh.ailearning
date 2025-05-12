/**
 * GitHub Pages Deployment Test Script
 * 
 * This simplified version just tests the deployment configuration
 * without performing the actual build (which can be time-consuming).
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);

// Get the directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEPLOY_DIR = path.join(__dirname, 'deploy-test');
const IS_CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || fs.existsSync(path.join(__dirname, 'CNAME'));
const CUSTOM_DOMAIN = IS_CUSTOM_DOMAIN ? 
  (process.env.CUSTOM_DOMAIN || fs.readFileSync(path.join(__dirname, 'CNAME'), 'utf8').trim()) : 
  null;

// Utility functions
const log = (message) => console.log(`\x1b[36m[Deploy Test]\x1b[0m ${message}`);
const error = (message) => console.error(`\x1b[31m[Deploy Test ERROR]\x1b[0m ${message}`);
const success = (message) => console.log(`\x1b[32m[Deploy Test SUCCESS]\x1b[0m ${message}`);

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

async function prepareTestDeploymentFiles() {
  log('Creating test deployment directory...');
  
  try {
    // Create deployment directory
    if (fs.existsSync(DEPLOY_DIR)) {
      fs.rmSync(DEPLOY_DIR, { recursive: true });
    }
    fs.mkdirSync(DEPLOY_DIR, { recursive: true });
    
    // Create .nojekyll file
    fs.writeFileSync(path.join(DEPLOY_DIR, '.nojekyll'), '');
    
    // Create test HTML file
    fs.writeFileSync(
      path.join(DEPLOY_DIR, 'index.html'),
      `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Deployment Test</title>
    <base href="/">
    <link rel="stylesheet" href="assets/style.css">
  </head>
  <body>
    <h1>Deployment Test Page</h1>
    <p>This is a test page for GitHub Pages deployment.</p>
    <script src="assets/main.js"></script>
  </body>
</html>`
    );
    
    // Create assets directory with test files
    const assetsDir = path.join(DEPLOY_DIR, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    
    fs.writeFileSync(
      path.join(assetsDir, 'style.css'),
      `body { font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }`
    );
    
    fs.writeFileSync(
      path.join(assetsDir, 'main.js'),
      `console.log("Deployment test successful!");`
    );
    
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
    
    success('Test deployment files prepared successfully');
  } catch (err) {
    error(`Failed to prepare test deployment files: ${err.message}`);
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
    log('Starting deployment test...');
    
    const { basePath } = await setupEnvironment();
    await prepareTestDeploymentFiles();
    
    if (IS_CUSTOM_DOMAIN) {
      await fixHtmlForCustomDomain();
    }
    
    success('All deployment test steps completed successfully!');
    log(`Test files are ready in the "${DEPLOY_DIR}" directory`);
    
    return 0;
  } catch (err) {
    error(`Deployment test failed: ${err.message}`);
    return 1;
  }
}

// Run the main function and handle the exit code
main().then(exitCode => {
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
});