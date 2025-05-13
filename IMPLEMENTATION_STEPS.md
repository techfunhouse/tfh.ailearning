# Client-Server Implementation Steps

This document outlines the steps needed to complete the separation of the RefHub application into client and server components.

## 1. Update Package Configuration

Replace your current package.json with the provided `package.json.updated` file:

```bash
mv package.json.updated package.json
```

This adds concurrent scripts for running client and server separately or together.

## 2. Install Dependencies

Install concurrently and other needed dependencies:

```bash
npm install concurrently
```

## 3. Update Workflow Configuration

Use the workflow configuration in `workflow_config.txt` to update your Replit configuration.

## 4. Finalize Server Structure

Ensure server files are in the correct locations:

```bash
# Make sure the standalone server is in the right place
cp -n server/src/standalone-server.ts server/src/index.ts

# Ensure services are in the right place
mkdir -p server/src/services
cp -n server/services/github-sync.ts server/src/services/
```

## 5. Run the Application

You now have three ways to run the application:

1. Combined mode (legacy):
   ```bash
   npm run dev
   ```

2. Separated mode with both components:
   ```bash
   npm run dev:separate
   ```

3. Individual components:
   ```bash
   # Just the server
   npm run server
   
   # Just the client
   npm run client
   ```

## 6. Deployment Options

### Option 1: Deploy Both to Replit
Deploy the entire application to Replit using:
```bash
npm run build
npm run start
```

### Option 2: Separate Deployment
1. Deploy server to Replit or other Node.js hosting:
   ```bash
   cd server
   npm run build
   npm run start
   ```

2. Deploy client to GitHub Pages or other static hosting:
   ```bash
   cd client
   npm run build
   # Deploy the contents of dist/client
   ```
   
   Remember to set the `VITE_API_URL` environment variable to point to your deployed server.

## Troubleshooting

- If you encounter CORS issues, make sure the server's CORS configuration includes your client's domain.
- For authentication issues, ensure cookies are properly configured for cross-domain requests if needed.
- Check environment variables in both client and server .env files.