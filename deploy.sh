#!/bin/bash
# Enhanced deployment script for GitHub Pages

# Default settings
AUTO_DEPLOY="false"
CUSTOM_DOMAIN=""

# Process command line arguments
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --domain|--custom-domain|-d)
      CUSTOM_DOMAIN="$2"
      shift 2
      ;;
    --auto|--deploy|-a)
      AUTO_DEPLOY="true"
      shift
      ;;
    --help|-h)
      echo "Usage: ./deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --domain, --custom-domain, -d DOMAIN  Set custom domain for deployment"
      echo "  --auto, --deploy, -a                  Automatically deploy to GitHub Pages"
      echo "  --help, -h                            Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./deploy.sh -d example.com            Prepare for custom domain deployment"
      echo "  ./deploy.sh -a                        Auto-deploy to GitHub Pages"
      echo "  ./deploy.sh -d example.com -a         Auto-deploy with custom domain"
      exit 0
      ;;
    *)
      # Handle positional argument as custom domain (for backward compatibility)
      if [ -z "$CUSTOM_DOMAIN" ]; then
        CUSTOM_DOMAIN="$1"
      fi
      shift
      ;;
  esac
done

# Set environment variables
if [ ! -z "$CUSTOM_DOMAIN" ]; then
  export CUSTOM_DOMAIN="$CUSTOM_DOMAIN"
  echo "✓ Using custom domain: $CUSTOM_DOMAIN"
fi

if [ "$AUTO_DEPLOY" = "true" ]; then
  export PERFORM_DEPLOYMENT="true"
  echo "✓ Auto-deployment enabled"
fi

# Run deployment preparation
echo "Starting deployment process..."
node deploy.js

# Check if preparation was successful
if [ $? -ne 0 ]; then
  echo "❌ Deployment preparation failed. See errors above."
  exit 1
fi

if [ "$AUTO_DEPLOY" != "true" ]; then
  # If we got here and auto-deploy is not enabled, deployment preparation was successful
  echo "✅ Deployment preparation successful! Files ready in the 'deploy' directory."
  
  # Show manual deployment instructions
  echo ""
  echo "To complete the deployment manually:"
  echo ""
  echo "Option 1: Run with auto-deploy flag"
  echo "  ./deploy.sh --auto"
  echo ""
  echo "Option 2: Run these commands"
  echo "  cd deploy"
  echo "  git init"
  echo "  git add -A"
  echo "  git commit -m \"Deploy to GitHub Pages\""
  echo "  git push -f https://github.com/YOUR_USERNAME/YOUR_REPO.git HEAD:gh-pages"
fi

# If auto-deploy was successful, we don't need to show any instructions