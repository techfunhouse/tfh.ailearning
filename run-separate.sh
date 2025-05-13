#!/bin/bash

# Run Client and Server Separately
# This script runs the client and server as separate processes

echo "Starting RefHub in separate client/server mode..."

# Use concurrently to run both client and server
npx concurrently \
  --prefix "[{name}]" \
  --names "CLIENT,SERVER" \
  --prefix-colors "blue.bold,green.bold" \
  --kill-others \
  "cd client && npx vite" \
  "NODE_ENV=development npx tsx server-standalone.ts"