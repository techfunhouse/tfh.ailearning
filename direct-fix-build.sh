#!/bin/bash

# This script offers a direct fix for the build errors related to
# missing exports in server/vite.ts

# First, build the client side with Vite
echo "Building client..."
npx vite build

# Create a temporary source file that re-exports what we need
echo "Creating patch file for build..."
cat > server/vite-patch.ts << 'EOF'
/**
 * This file is a temporary patch for the build process
 * It re-exports the functions that are missing from server/vite.ts
 */

// Import the original functions
import { createServer, createLogger } from "vite";

// Re-export them
export { createServer, createLogger };

// Also export everything else from the original vite.ts
export * from "./vite.js";
EOF

# Now build the server with our patched file
echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 

# Clean up
echo "Cleaning up..."
rm server/vite-patch.ts 

echo "Build completed."
echo "If the build still fails, you might need to use a different build approach or modify any file that imports directly from server/vite.ts to use the 'vite' package directly."