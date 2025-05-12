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

This project is configured for deployment to GitHub Pages using GitHub Actions.

### Manual Deployment

If you prefer to deploy manually:

1. Build the application: `npm run build`
2. Create a `.nojekyll` file in the `dist/public` directory to bypass Jekyll processing
3. Copy the `index.html` file to `404.html` for client-side routing
4. Push the contents of the `dist/public` directory to your GitHub repository's `gh-pages` branch

### Automated Deployment with GitHub Actions

This repository includes a GitHub Actions workflow that automatically deploys the application to GitHub Pages whenever changes are pushed to the main branch.

**To configure GitHub Pages:**

1. Go to your repository settings
2. Navigate to the "Pages" section
3. Set the Source to "Deploy from a branch"
4. Select the `gh-pages` branch and the `/ (root)` folder
5. Save your changes

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