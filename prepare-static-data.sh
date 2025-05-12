#!/bin/bash

# Script to prepare static JSON data files for GitHub Pages deployment
# This script handles both repository and custom domain deployments

echo "Preparing static data files for deployment..."

# Create necessary directories
echo "Creating directories..."
mkdir -p public/data
mkdir -p deploy/data

# Export data from lowdb to correctly formatted JSON files
echo "Running export-static-data.js..."
node export-static-data.js

# Process JSON files to ensure they're in the right format for static deployment
echo "Running fix-json-for-deployment.js..."
node fix-json-for-deployment.js

# Copy the data files to both public and deploy directories
echo "Copying data files..."
cp -f data/*.json public/data/ 2>/dev/null || :
cp -f data/*.json deploy/data/ 2>/dev/null || :

# Verify the files exist in the public directory
if [ -f "public/data/references.json" ] && [ -f "public/data/categories.json" ] && [ -f "public/data/tags.json" ]; then
  echo "✅ Data files successfully prepared in public/data/"
else
  echo "⚠️ Warning: Some data files are missing in public/data/"
fi

# Verify the files exist in the deploy directory
if [ -f "deploy/data/references.json" ] && [ -f "deploy/data/categories.json" ] && [ -f "deploy/data/tags.json" ]; then
  echo "✅ Data files successfully prepared in deploy/data/"
else
  echo "⚠️ Warning: Some data files are missing in deploy/data/"
fi

echo "Static data preparation complete!"