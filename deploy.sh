#!/bin/bash
# Simple deployment script for GitHub Pages

# Set custom domain if provided as argument
if [ ! -z "$1" ]; then
  export CUSTOM_DOMAIN="$1"
  echo "Using custom domain: $CUSTOM_DOMAIN"
fi

# Run deployment preparation
node deploy.js

# Check if preparation was successful
if [ $? -ne 0 ]; then
  echo "❌ Deployment preparation failed. See errors above."
  exit 1
fi

# If we got here, deployment preparation was successful
echo "✅ Deployment preparation successful!"

# Deployment instructions
echo ""
echo "To complete the deployment, run these commands:"
echo "  git add -f deploy"
echo "  git commit -m \"Deploy to GitHub Pages\""
echo "  git subtree push --prefix deploy origin gh-pages"
echo ""
echo "Or for force deployment:"
echo "  git push origin \`git subtree split --prefix deploy main\`:gh-pages --force"