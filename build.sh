#!/bin/bash

# Build the client
echo "Building client..."
npx vite build

# Build the server without bundling to avoid import issues
echo "Building server..."
tsc -p server/tsconfig.json --outDir dist/server

# Copy the package.json to the dist folder
echo "Copying package.json to dist..."
cp package.json dist/

echo "Build completed successfully. To start the app, run: NODE_ENV=production node dist/server/index.js"