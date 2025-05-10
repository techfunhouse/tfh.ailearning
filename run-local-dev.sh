#!/bin/bash

# Set development environment
export NODE_ENV=development

# Run the local development server using tsx
echo "Starting local development server..."
npx tsx server/local-entry.ts