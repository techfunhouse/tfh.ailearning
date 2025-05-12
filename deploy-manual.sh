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

# Create necessary files for GitHub Pages
echo "Creating GitHub Pages configuration files..."
touch $DEPLOY_DIR/.nojekyll
cp $DEPLOY_DIR/index.html $DEPLOY_DIR/404.html

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