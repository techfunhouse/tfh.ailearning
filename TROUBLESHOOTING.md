# Troubleshooting Guide

This document provides solutions for common issues you might encounter when running the RefHub application.

## Common Issues and Solutions

### Module Not Found Errors

**Issue**: `Cannot find module '/path/to/server/local-entry.ts'`

**Solution**:
1. Ensure the file exists. If not, create it with:
   ```typescript
   // server/local-entry.ts
   import './src/standalone-server.js';
   ```

2. Make sure you're running the command from the root directory of the project.

### TypeError [ERR_INVALID_ARG_TYPE] Errors

**Issue**: `TypeError [ERR_INVALID_ARG_TYPE]: The "paths[0]" argument must be of type string. Received undefined`

**Solution**:
1. This usually happens when a file path is undefined. Check your `server/index.ts` file exists.

2. Create or fix the `server/index.ts` file:
   ```typescript
   // server/index.ts
   import './src/standalone-server.js';
   ```

### Package.json Script Updates

If the npm scripts aren't working, you can manually update them:

1. For the root `package.json`:
   ```json
   "scripts": {
     "install:all": "npm install && cd client && npm install && cd ../server && npm install",
     "dev": "concurrently \"npm run server\" \"npm run client\"",
     "server": "cd server && npm run dev",
     "client": "cd client && npm run dev",
     "build": "npm run build:client && npm run build:server",
     "build:client": "cd client && npm run build",
     "build:server": "cd server && npm run build",
     "start": "cd server && npm run start"
   }
   ```

2. For the `server/package.json`:
   ```json
   "scripts": {
     "dev": "NODE_ENV=development tsx index.ts",
     "dev:standalone": "NODE_ENV=development tsx src/standalone-server.ts",
     "dev:local": "NODE_ENV=development tsx local-entry.ts",
     "build": "esbuild src/standalone-server.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
     "start": "NODE_ENV=production node dist/standalone-server.js"
   }
   ```

### Cross-Platform Issues

For Windows users, you might encounter issues with the environment variable syntax:

**Issue**: `NODE_ENV=development is not recognized as an internal or external command`

**Solution**:
1. Install `cross-env`:
   ```bash
   npm install --save-dev cross-env
   ```

2. Update your scripts in `server/package.json`:
   ```json
   "dev": "cross-env NODE_ENV=development tsx index.ts",
   "dev:standalone": "cross-env NODE_ENV=development tsx src/standalone-server.ts",
   "dev:local": "cross-env NODE_ENV=development tsx local-entry.ts"
   ```

### Running with Setup Scripts

The project includes setup scripts for both Unix/Linux/Mac and Windows:

For Unix/Linux/Mac:
```bash
# Make the script executable
chmod +x setup.sh

# Run the setup script
./setup.sh
```

For Windows:
```
setup.bat
```

These scripts will install all dependencies and guide you through the setup process.

### Alternative: Using Make

For a simpler approach on Unix/Linux/Mac, use the provided Makefile:

```bash
# Install dependencies
make install

# Run both client and server
make dev

# Run only client
make client

# Run only server
make server
```

### Manual Startup

If scripts aren't working, you can manually start the application:

1. Start the server:
   ```bash
   # Unix/Linux/Mac
   cd server && NODE_ENV=development npx tsx index.ts
   
   # Windows
   cd server && set NODE_ENV=development && npx tsx index.ts
   ```

2. Start the client (in a separate terminal):
   ```bash
   cd client && npm run dev
   ```

## Specific Environment Issues

### Running in production mode

If you encounter issues running in production mode:

1. Make sure you've built the application:
   ```bash
   npm run build
   ```

2. Check the environment files:
   - `client/.env.production`
   - `server/.env.production`

3. Start the application:
   ```bash
   npm run start
   ```

### GitHub Pages Deployment

If GitHub Pages deployment isn't working:

1. Check the workflow file `.github/workflows/deploy.yml`
2. Ensure GitHub Pages is enabled in your repository settings
3. Check if the deployment is running in the Actions tab
4. Verify the environment variables are set correctly

## Contact Support

If you're still experiencing issues after trying the solutions above, please:

1. Create an issue on the GitHub repository
2. Include detailed error messages and the steps to reproduce
3. Mention your operating system and Node.js version