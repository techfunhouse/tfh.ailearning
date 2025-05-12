/**
 * This script is a custom solution for deploying a React app to GitHub Pages
 * with proper SPA routing - without redirect loops.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const buildDir = path.join(__dirname, 'dist/public');
const indexPath = path.join(buildDir, 'index.html');
const repoName = 'ReferenceViewer'; // Replace with your repo name or make dynamic

// Read the built index.html
console.log('Reading built index.html...');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Add base tag for GitHub Pages
console.log('Adding base tag for GitHub Pages...');
indexContent = indexContent.replace(
  '<head>',
  `<head>
  <base href="/${repoName}/">
  <script>
    // Single-page application routing fix for GitHub Pages
    (function() {
      // Handle SPA navigation for GitHub Pages
      var redirect = sessionStorage.redirect;
      delete sessionStorage.redirect;
      if (redirect && redirect !== location.href) {
        history.replaceState(null, null, redirect);
      }
    })();
  </script>`
);

// Write modified index.html
fs.writeFileSync(indexPath, indexContent);
console.log('Modified index.html with GitHub Pages SPA fixes');

// Create 404.html that redirects to index.html with path preservation
const notFoundContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Store the URL we're trying to access
    sessionStorage.redirect = location.href;
    // Redirect to the root
    location.href = '/${repoName}/';
  </script>
</head>
<body>
  <h1>Redirecting...</h1>
</body>
</html>
`;

fs.writeFileSync(path.join(buildDir, '404.html'), notFoundContent);
console.log('Created 404.html for path preservation');

// Create .nojekyll file to disable Jekyll processing
fs.writeFileSync(path.join(buildDir, '.nojekyll'), '');
console.log('Created .nojekyll file');

console.log('GitHub Pages SPA fix completed!');