#!/bin/bash
# RefHub Setup Script for Unix/Linux/Mac
set -e

echo "=== RefHub Initial Setup Script ==="
echo "This script will install all dependencies for client and server."

# Install root dependencies
echo -e "\n📦 Installing root dependencies..."
npm install

# Install client dependencies
echo -e "\n📦 Installing client dependencies..."
cd client && npm install
cd ..

# Install server dependencies
echo -e "\n📦 Installing server dependencies..."
cd server && npm install
cd ..

# Create data directory if it doesn't exist
echo -e "\n📂 Setting up data directory..."
mkdir -p data
mkdir -p server/data

# Copy env files
echo -e "\n📝 Setting up environment files..."
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || echo "No .env.example found, skipping..."
fi

# Optional: install global dependencies
echo -e "\n❓ Would you like to install global dependencies (concurrently)? [y/N]"
read -r install_globals
if [[ $install_globals =~ ^[Yy]$ ]]; then
  echo "Installing global dependencies..."
  npm install -g concurrently
fi

# Success message
echo -e "\n✅ Setup complete!"
echo "To start the application:"
echo "  • Start both client and server: make dev"
echo "  • Start only client: make client"
echo "  • Start only server: make server"
echo ""
echo "Or use npm scripts:"
echo "  • Server: cd server && npm run dev"
echo "  • Client: cd client && npm run dev"
echo ""
echo "See README.md and TROUBLESHOOTING.md for more details."