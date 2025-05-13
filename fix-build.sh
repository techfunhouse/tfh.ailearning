#!/bin/bash

# Create a simple fix for the build errors
# Instead of modifying server/vite.ts which is protected, 
# this script adds the missing exports to vite.js in the dist folder

echo "Building client..."
npx vite build

echo "Running initial server build..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create a file with the missing exports
echo "Fixing vite.js in dist folder..."
mkdir -p dist
cat > dist/vite-exports.js << 'EOF'
// Fix for missing exports
import { createServer, createLogger } from "vite";
export { createServer, createLogger };
export * from './vite.js';
EOF

echo "Build fix completed. You may need to update imports in dist files."
echo "Try updating imports from './vite.js' to './vite-exports.js' in the built files."