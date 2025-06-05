# GitHub Pages Setup Guide

The GitHub Actions workflow failed because GitHub Pages isn't properly configured for your repository. Follow these steps to enable automatic deployment:

## Step 1: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
5. Click **Save**

## Step 2: Verify Workflow Permissions

1. In your repository settings, go to **Actions** → **General**
2. Under **Workflow permissions**, ensure:
   - "Read and write permissions" is selected
   - "Allow GitHub Actions to create and approve pull requests" is checked
3. Click **Save**

## Step 3: Trigger Deployment

After configuring Pages settings:

1. Push any change to the `main` branch, or
2. Go to **Actions** tab and manually run the "Deploy to GitHub Pages" workflow

## Step 4: Access Your Site

Once deployment succeeds, your site will be available at:
`https://[your-username].github.io/[repository-name]/`

## Troubleshooting

If the deployment still fails:

1. **Check repository visibility**: Ensure your repository is public, or you have GitHub Pro/Teams for private repo Pages
2. **Verify branch name**: The workflow expects the main branch to be named `main` (not `master`)
3. **Check workflow file**: Ensure `.github/workflows/deploy.yml` exists in your repository

## What the Workflow Does

The GitHub Actions workflow:
1. Builds the React application for static deployment
2. Configures routing for GitHub Pages subdirectory hosting
3. Uploads the built files to GitHub Pages
4. Makes your site available at the GitHub Pages URL

The application is configured to work as a static site with:
- Client-side routing via GitHub Pages 404.html redirect
- Static JSON data files for content
- Environment detection for GitHub Pages hosting