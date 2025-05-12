#!/bin/bash
# This script deploys the React app to GitHub Pages with custom domain support

# Ensure the script exits immediately if any command fails
set -e

echo "🚀 Starting deployment with custom domain support..."

# Create a temporary .env file for GitHub Pages with custom domain
echo "# Custom domain configuration for GitHub Pages" > .env.github-pages-temp
echo "VITE_BASE_PATH=/" >> .env.github-pages-temp
echo "CUSTOM_DOMAIN=aireferencehub.techfunhouse.com" >> .env.github-pages-temp
echo "VITE_USE_CUSTOM_DOMAIN=true" >> .env.github-pages-temp

# Backup the original .env.github-pages file
if [ -f ".env.github-pages" ]; then
  echo "📄 Backing up original .env.github-pages file..."
  cp .env.github-pages .env.github-pages.backup
fi

# Replace the .env.github-pages file with our custom domain version
echo "📄 Creating custom domain version of .env.github-pages..."
mv .env.github-pages-temp .env.github-pages

# Clean up the dist/public directory if it exists
if [ -d "dist/public" ]; then
  echo "🧹 Cleaning up previous build..."
  rm -rf dist/public
fi

# Export the static data for GitHub Pages
echo "📊 Exporting static data..."
node export-static-data.js

# Run the deployment script
echo "🔄 Running deployment script..."
node deploy-to-gh-pages.js

# Run the advanced HTML fixer for custom domains
echo "🔧 Running advanced HTML fixing for custom domain..."
node fix-html-for-custom-domain.js

# Restore the original .env.github-pages file if it existed
if [ -f ".env.github-pages.backup" ]; then
  echo "📄 Restoring original .env.github-pages file..."
  mv .env.github-pages.backup .env.github-pages
fi

echo "✅ Deployment with custom domain support completed!"
echo "🌐 Your site should now be available at: https://aireferencehub.techfunhouse.com"
echo "Note: It may take a few minutes for DNS changes to propagate."