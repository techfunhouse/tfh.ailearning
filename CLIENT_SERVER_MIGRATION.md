# Client-Server Architecture Migration

This document outlines the transition from the monolithic application to the separated client-server architecture.

## Files Removed

The following files were removed as they're no longer needed in the new architecture:

1. **Local Development Files:**
   - `dev-local.sh` - Used to run the monolithic app in local mode
   - `server/local-entry.ts` - Local entry point for combined app (removed)
   - `server/local-index.ts` - Local index for combined app (removed)
   - `server/path-compat.ts` - Path compatibility layer (removed)
   - `server/vite-compat.ts` - Vite compatibility layer (removed)

2. **Deployment Files:**
   - `prepare-static-data.sh` - For static deployment preparation
   - `export-static-data.js` - For exporting data to static JSON
   - `fix-json-for-deployment.js` - For fixing JSON for static deployment
   - `index.html` (root) - Old redirect for GitHub Pages

3. **Environment Files:**
   - `.env.local` - Old environment file
   - `.env.custom-domain` - For custom domain deployment
   - `.env.github-pages` - For GitHub Pages deployment

4. **Temporary/Backup Files:**
   - `package.json.new`
   - `package.json.updated`

## Files That Need Updates

1. **GitHub Workflow:**
   - The existing GitHub workflow in `.github/workflows/deploy.yml` needs to be updated to match the new architecture.
   - A new workflow file for client-only deployment has been created at `.github/workflows.new/deploy-client.yml`.

2. **Root Package.json:**
   - The scripts in the root `package.json` need to be updated to use the new client-server structure.
   - Suggested scripts:
     ```json
     "scripts": {
       "dev": "concurrently \"npm run server\" \"npm run client\"",
       "server": "cd server && npm run dev",
       "client": "cd client && npm run dev",
       "build": "npm run build:client && npm run build:server",
       "build:client": "cd client && npm run build",
       "build:server": "cd server && npm run build",
       "start": "cd server && npm run start"
     }
     ```

## Deployment Changes

The deployment strategy has changed from a static site deployment to a proper client-server deployment:

1. **Client:**
   - Deployed as a static site to GitHub Pages
   - No longer needs static JSON data files
   - Communicates with the server via API

2. **Server:**
   - Deployed to a Node.js hosting service (like Replit)
   - Provides API endpoints for the client
   - Manages data persistence with lowdb 

## Workflow Configuration

The workflow configuration in `new.replit` has been updated to support the client-server architecture:

1. **Project Workflow:**
   - Runs both client and server concurrently

2. **Start application Workflow:**
   - The main entry point workflow that runs the server

3. **Start server Workflow:**
   - Runs only the server component

4. **Start client Workflow:**
   - Runs only the client component

## Port Configuration

The port configuration remains the same:

- Server: Port 5000 (mapped to external port 80)
- Client: Port 3000 (mapped to external port 3000)