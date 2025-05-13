# RefHub: Running in Separate Client-Server Mode

This document explains how to run RefHub with separated client and server components.

## Overview

RefHub can now be run in two different modes:

1. **Combined Mode** (original): Client and server run together on the same port
2. **Separate Mode** (new): Client and server run on different ports

Separate mode offers several advantages:
- Cleaner architecture
- Easier deployment to different platforms
- Better security for GitHub operations
- Consistent functionality across environments

## Running in Separate Mode

### Option 1: Using the Combined Script

The easiest way to run both components together is to use the provided script:

```bash
node run-separate.js
```

This will start:
- Client on http://localhost:3000
- Server on http://localhost:5000

### Option 2: Running Components Individually

You can also run the client and server separately:

#### Server:

```bash
cd server
npm run dev
# Server starts on http://localhost:5000
```

#### Client:

```bash
cd client
npm run dev
# Client starts on http://localhost:3000
```

## Environment Configuration

### Client Configuration

The client's configuration is in `client/.env`:

```
VITE_API_URL=http://localhost:5000
```

You need to update this if deploying the client and server to different domains.

### Server Configuration

The server's configuration is in `server/.env`:

```
PORT=5000
CLIENT_URL=http://localhost:3000
SESSION_SECRET=change-me-in-production
```

Update `CLIENT_URL` to match your client's URL for proper CORS configuration.

## Deployment

### Server Deployment (Replit)

1. Make sure the `.env` file is properly configured
2. In the Replit, run `server/standalone-server.ts`
3. Note the server URL (e.g., https://refhub-server.yourusername.repl.co)

### Client Deployment (GitHub Pages)

1. Update the client `.env` file to point to your server:
   ```
   VITE_API_URL=https://refhub-server.yourusername.repl.co
   ```
2. Build the client: `cd client && npm run build`
3. Deploy the generated `dist/client` folder to GitHub Pages

## GitHub Data Sync

With this separation, GitHub sync operations happen securely on the server:

1. Set GitHub credentials in the server's environment variables:
   ```
   GITHUB_TOKEN=your-personal-access-token
   GITHUB_OWNER=your-github-username
   GITHUB_REPO=your-repo-name
   ```
2. The client makes API calls to the server to initiate sync
3. The server performs all GitHub operations with proper credentials

This ensures your GitHub token is never exposed to the client.