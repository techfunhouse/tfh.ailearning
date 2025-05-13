#!/bin/bash
# RefHub Development Startup Script for Unix/Linux/Mac
set -e

echo "=== Starting RefHub Development Environment ==="
echo "This script will start both the client and server."

# Check if concurrently is installed
if ! command -v concurrently &> /dev/null; then
  echo "Concurrently not found. Installing..."
  npm install -g concurrently
fi

# Start both client and server
echo "Starting client and server..."
concurrently "cd client && npm run dev" "cd server && npm run dev"