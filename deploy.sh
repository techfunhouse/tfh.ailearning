#!/bin/bash
# Enhanced deployment script for GitHub Pages (2025 version)

# Default settings
AUTO_DEPLOY="false"
CUSTOM_DOMAIN=""
TEST_MODE="false"

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
    --test|-t)
      TEST_MODE="true"
      shift
      ;;
    --help|-h)
      echo "Usage: ./deploy.sh [options]"
      echo ""
      echo "Options:"
      echo "  --domain, --custom-domain, -d DOMAIN  Set custom domain for deployment"
      echo "  --auto, --deploy, -a                  Automatically deploy to GitHub Pages"
      echo "  --test, -t                            Test deployment without building"
      echo "  --help, -h                            Show this help message"
      echo ""
      echo "Examples:"
      echo "  ./deploy.sh -d example.com            Prepare for custom domain deployment"
      echo "  ./deploy.sh -a                        Auto-deploy to GitHub Pages"
      echo "  ./deploy.sh -d example.com -a         Auto-deploy with custom domain"
      echo "  ./deploy.sh -t                        Test deployment configuration"
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

# Run appropriate script based on mode
if [ "$TEST_MODE" = "true" ]; then
  echo "Running deployment test (configuration only)..."
  node deploy-test.js
else
  echo "Starting deployment process..."
  node deploy.js
fi

# Check if preparation was successful
if [ $? -ne 0 ]; then
  echo "❌ Deployment preparation failed. See errors above."
  exit 1
fi

if [ "$AUTO_DEPLOY" != "true" ] && [ "$TEST_MODE" != "true" ]; then
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
  echo "  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
  echo "  git push -f origin HEAD:gh-pages"
elif [ "$TEST_MODE" = "true" ]; then
  echo "✅ Deployment test completed successfully!"
  echo ""
  echo "The configuration has been tested and looks correct."
  echo "Generated environment file: .env.github-pages"
  cat .env.github-pages
fi

# If auto-deploy was successful, we don't need to show any instructions