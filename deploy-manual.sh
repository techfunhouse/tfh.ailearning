#!/usr/bin/env bash
# Manual deployment script for GitHub Pages

# Build the app
echo "Building the application..."
npm run build

# Prepare the deployment directory
DEPLOY_DIR="gh-pages-deploy"
echo "Preparing deployment directory..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy build files
echo "Copying build files..."
cp -r dist/public/* $DEPLOY_DIR/

# Backup original index.html
echo "Backing up original index.html..."
cp $DEPLOY_DIR/index.html $DEPLOY_DIR/original-index.html

# Create necessary files for GitHub Pages
echo "Creating GitHub Pages configuration files..."
touch $DEPLOY_DIR/.nojekyll

# Create 404.html for SPA routing
echo "Creating 404.html for SPA routing..."
cat > $DEPLOY_DIR/404.html << 'EOL'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
  <script>
    // Store the path we're trying to access
    sessionStorage.redirect = location.href;
    // Redirect to the index page
    location.replace("/ReferenceViewer/");
  </script>
</head>
<body>
  <h1>Redirecting...</h1>
</body>
</html>
EOL

# Modify the original index.html to handle redirects
echo "Adding SPA routing fix to index.html..."
sed -i '/<head>/a\
  <base href="/ReferenceViewer/">\
  <script>\
    // Handle redirects from 404.html\
    (function() {\
      var redirect = sessionStorage.redirect;\
      delete sessionStorage.redirect;\
      if (redirect && redirect !== location.href) {\
        history.replaceState(null, null, redirect.replace(location.origin, ""));\
      }\
    })();\
  </script>' $DEPLOY_DIR/index.html

# Add a note for manual deployment
echo "
# RefHub Deployment

This branch contains the built application for GitHub Pages deployment.
Generated on $(date)
" > $DEPLOY_DIR/README.md

echo "Deployment files prepared in $DEPLOY_DIR directory."
echo ""
echo "To deploy to GitHub Pages:"
echo "1. cd $DEPLOY_DIR"
echo "2. git init"
echo "3. git add ."
echo "4. git commit -m \"Deploy to GitHub Pages\""
echo "5. git branch -M gh-pages"
echo "6. git remote add origin https://github.com/yourusername/yourrepository.git"
echo "7. git push -u origin gh-pages --force"
echo ""
echo "Then configure GitHub Pages in repository settings to use the gh-pages branch."