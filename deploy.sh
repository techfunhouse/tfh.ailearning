#!/bin/bash
# Simple wrapper script for GitHub Pages deployment

# Make sure the script is executable
chmod +x deploy-to-gh-pages.js

# Run the deployment script with proper Node.js flags for ES modules
node --experimental-json-modules deploy-to-gh-pages.js