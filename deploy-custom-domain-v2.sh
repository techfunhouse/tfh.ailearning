#!/bin/bash
# Improved script for custom domain deployment

# Set up error handling
set -e

echo "🚀 Starting Custom Domain Deployment (v2)..."

# Step 1: Create analysis of current deployed HTML (if accessible)
echo "📊 Analyzing currently deployed HTML..."
node analyze-deployed-html.js || echo "Could not analyze deployed HTML (site may not be accessible)"

# Step 2: Run the custom domain build script
echo "🏗️ Building site specifically for custom domain..."
node build-for-custom-domain.js

echo "✅ Deployment package created successfully!"
echo "🌐 Your site should now work at: https://aireferencehub.techfunhouse.com"

# Provide guidance on what to do next
echo ""
echo "📋 Next steps:"
echo "1. Commit and push the gh-pages-deploy directory to GitHub Pages"
echo "2. Wait a few minutes for changes to propagate"
echo "3. Visit your site at https://aireferencehub.techfunhouse.com"
echo ""
echo "If you still have issues, check the analyzed-html.txt file for diagnostics."