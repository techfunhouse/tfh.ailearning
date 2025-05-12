# RefHub: Reference Collection Management System

Your personal reference management system for organizing, searching, and sharing your favorite resources.

## Features

- Card-based interface for references with thumbnails
- Categorization and tagging
- Full-text search and filtering
- Role-based access control
- GitHub integration for data synchronization

## Getting Started

### Development

1. Clone this repository
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev`
4. Access the application at `http://localhost:5000`

### Default Credentials

- Admin: `admin` / `admin123`
- Curator: `curator` / `curator123`

## Deployment to GitHub Pages

This project provides a specialized script for GitHub Pages deployment that handles all necessary adjustments for proper asset paths and routing.

### Using the Deployment Script (Recommended)

The easiest way to deploy is using our deployment script:

1. Set your GitHub username in an environment variable (optional):
   ```bash
   export GITHUB_USERNAME=yourusername
   ```

2. Run the deployment script:
   ```bash
   node deploy-to-gh-pages.js
   ```

3. The script will:
   - Export the data files for static hosting
   - Build the application
   - Prepare a deployment directory with all necessary files
   - Configure paths correctly for GitHub Pages
   - Create special 404.html for SPA routing

4. Deploy the contents of the `gh-pages-deploy` directory to your GitHub Pages branch:
   ```bash
   cd gh-pages-deploy
   git init
   git checkout -b gh-pages
   git add .
   git commit -m "Deploy to GitHub Pages"
   git remote add origin https://github.com/yourusername/ReferenceViewer.git
   git push -f origin gh-pages
   ```

5. Access your deployed app at: `https://yourusername.github.io/ReferenceViewer/`

### Troubleshooting GitHub Pages Deployment

If you encounter issues with paths or resources not loading:

1. **404 Errors for Data Files**: Make sure the data files are correctly exported to the `data` directory and the paths don't have leading slashes.

2. **Asset Paths**: Verify that asset paths in the HTML use relative paths without leading slashes.

3. **SPA Routing**: The 404.html file should be properly configured to redirect to the main application with the correct path segments.

4. **Base Path**: The `<base>` tag in the HTML head should point to the correct repository name without a trailing slash.

## GitHub Sync Feature

To use the GitHub data synchronization feature:

1. Log in as an admin user
2. Configure the following environment variables:
   - `GITHUB_TOKEN`: Your GitHub personal access token
   - `GITHUB_USERNAME`: Your GitHub username
   - `GITHUB_EMAIL`: Your email for commits
   - `GITHUB_REPO`: The repository for data syncing
3. Access the GitHub Sync feature from the sidebar

## Learn More

For more detailed information about this project, see:

- [ABOUT.md](ABOUT.md) - Complete project overview
- [PROMPT.md](PROMPT.md) - Original development prompt and requirements