#!/bin/bash

# Build the server using TypeScript directly (not esbuild)
echo "Building server..."
npx tsc -p server/tsconfig.json --outDir dist/server

echo "Server build completed. To start the app, run: NODE_ENV=production node dist/server/index.js"