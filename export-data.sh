#!/bin/bash
# Export data for GitHub Pages deployment

# Create data directories if they don't exist
mkdir -p public/data
mkdir -p dist/public/data

# Run the export data script with proper Node.js flags
node --experimental-json-modules export-static-data.js

echo "Data export completed!"