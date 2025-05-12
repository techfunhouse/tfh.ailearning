const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const repoName = 'refhub'; // Change this to your GitHub repository name
const buildDir = path.join(__dirname, 'dist/public');
const deployDir = path.join(__dirname, 'gh-pages');

console.log('Starting GitHub Pages deployment preparation...');

// Step 1: Build the project
console.log('Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Step 2: Create deployment directory
console.log('Preparing deployment directory...');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// Step 3: Copy build files to deployment directory
console.log('Copying build files...');
fs.cpSync(buildDir, deployDir, { recursive: true });

// Step 4: Create a 404.html file that redirects to index.html
// This helps with client-side routing
const redirectHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Single Page Apps for GitHub Pages
    // MIT License
    // https://github.com/rafgraph/spa-github-pages
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
  </script>
  <script>
    // Redirect to the root index.html to handle client-side routing
    window.location.href = '/';
  </script>
</head>
<body>
  Redirecting...
</body>
</html>
`;

fs.writeFileSync(path.join(deployDir, '404.html'), redirectHtml);

// Step 5: Create a .nojekyll file to bypass Jekyll processing
fs.writeFileSync(path.join(deployDir, '.nojekyll'), '');

// Step 6: Create a custom index.html if the base path needs to be adjusted
const indexPath = path.join(deployDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Update base href if deploying to a subdirectory
  if (repoName) {
    indexContent = indexContent.replace(
      /<head>/i,
      `<head>\n    <base href="/${repoName}/">`
    );
    fs.writeFileSync(indexPath, indexContent);
  }
}

// Create CNAME file if you have a custom domain
// fs.writeFileSync(path.join(deployDir, 'CNAME'), 'your-custom-domain.com');

console.log('Deployment files prepared successfully in the gh-pages directory.');
console.log(`
Next steps:
1. Push the contents of the gh-pages directory to your GitHub repository's gh-pages branch
2. Configure GitHub Pages in your repository settings to use the gh-pages branch
3. Access your deployed app at https://yourusername.github.io/${repoName}/
`);