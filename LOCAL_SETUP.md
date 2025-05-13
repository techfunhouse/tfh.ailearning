# Local Development Setup Guide

This document provides instructions for setting up and running the RefHub application on your local machine.

## Prerequisites

- Node.js v18+ (recommended: v20)
- npm v9+ (comes with Node.js)
- Git

## Initial Setup

1. **Clone the Repository**

   ```bash
   git clone https://github.com/yourusername/refhub.git
   cd refhub
   ```

2. **Install Dependencies**

   Install dependencies for the root, client, and server:

   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

## Environment Configuration

The project uses environment files for configuration. Default environments are provided but can be customized:

### Client (.env files in client directory)

- `.env` - Development environment
- `.env.production` - Production environment (used for GitHub Pages builds)

### Server (.env files in server directory)

- `.env` - Development environment
- `.env.production` - Production environment

### Key Environment Variables

#### Client

- `VITE_API_URL` - URL of the API server
- `VITE_GITHUB_PAGES` - Whether running on GitHub Pages
- `VITE_BASE_PATH` - Base path for the application
- `VITE_USE_CUSTOM_DOMAIN` - Whether using a custom domain

#### Server

- `PORT` - Port to run the server on
- `CLIENT_URLS` - Comma-separated list of allowed client origins
- `SESSION_SECRET` - Secret for session encryption
- `DATA_DIR` - Directory to store data files
- `GITHUB_TOKEN` - GitHub personal access token (for GitHub sync feature)
- `GITHUB_OWNER` - GitHub owner/username
- `GITHUB_REPO` - GitHub repository name

## Running the Application

### Development Mode

Run both client and server concurrently:

```bash
npm run dev
```

Or run them separately:

```bash
# Run server only
npm run server

# Run client only
npm run client
```

### Production Build

Build both client and server:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## GitHub Pages Deployment

The application can be automatically deployed to GitHub Pages using GitHub Actions.

1. Enable GitHub Pages for your repository
2. Ensure the workflow file (.github/workflows/deploy.yml) is present
3. Push to main branch to trigger deployment

### Custom Domain Setup

To use a custom domain with GitHub Pages:

1. Add a repository secret named `CUSTOM_DOMAIN` with your domain name
2. Configure your DNS settings to point to GitHub Pages
3. Push to main branch to trigger deployment with custom domain

## Project Structure

- `client/` - Frontend React application
- `server/` - Backend Express server
- `shared/` - Shared code (schemas, types)
- `data/` - Data files (JSON)
- `.github/workflows/` - GitHub Actions workflows