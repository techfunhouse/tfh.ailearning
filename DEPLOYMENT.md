# GitHub Pages Deployment Setup

This document explains how to set up automatic deployment to GitHub Pages for the RefHub application.

## GitHub Workflow

The GitHub workflow (`.github/workflows/deploy.yml`) automatically:

1. **Builds the application** on every push to `main` or `master` branch
2. **Deploys to GitHub Pages** using the built static files
3. **Supports manual deployment** via the Actions tab

## Setup Instructions

### 1. Enable GitHub Pages

1. Go to your repository settings
2. Navigate to "Pages" in the left sidebar
3. Under "Source", select "GitHub Actions"
4. Save the settings

### 2. Repository Permissions

The workflow requires these permissions (already configured):
- `contents: read` - To checkout the code
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For secure deployment

### 3. Automatic Deployment

Once setup, the workflow will automatically:
- **Trigger on push** to main/master branches
- **Build the React app** using Vite
- **Deploy static files** to GitHub Pages
- **Provide a live URL** in the deployment environment

### 4. Manual Deployment

You can also trigger deployment manually:
1. Go to the "Actions" tab in your repository
2. Select "Build and Deploy to GitHub Pages"
3. Click "Run workflow"
4. Choose the branch and click "Run workflow"

## Build Process

The workflow:
1. **Installs Node.js 20** and dependencies
2. **Runs `npm run build`** to create production build
3. **Outputs to `dist/public/`** directory
4. **Uploads artifacts** to GitHub Pages
5. **Deploys automatically** if on main/master branch

## Environment Variables

The build process sets:
- `NODE_ENV=production` for optimized builds
- `VITE_API_BASE_URL=''` for relative API paths

## Verification

After deployment:
1. Check the Actions tab for build status
2. Visit the GitHub Pages URL (provided in deployment logs)
3. Verify the application loads correctly

## Troubleshooting

### Build Failures
- Check the Actions tab for detailed error logs
- Ensure all dependencies are properly listed in package.json
- Verify the build script works locally

### Deployment Issues
- Confirm GitHub Pages is enabled in repository settings
- Check that the workflow has proper permissions
- Verify the build output directory exists

### Access Issues
- GitHub Pages URLs may take a few minutes to become active
- Check repository visibility settings
- Ensure the deployment completed successfully