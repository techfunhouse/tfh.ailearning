# Reference Management System

A dynamic reference management system that leverages modern web technologies to provide a flexible, powerful, and user-friendly data organization platform.

## Key Components
- TypeScript full-stack application with JSON-based storage
- Modular architecture with robust authentication
- Responsive design with adaptive interfaces
- Advanced filtering and admin capabilities

## Running the Project

### In Replit
The project is already configured to run in Replit. Simply press the "Run" button and the application will start.

If you want to enable GitHub integration, follow these steps:

1. Click on the "Secrets" tool in the left sidebar of your Replit project
2. Add the following secrets:
   - `GITHUB_TOKEN`: Your personal access token with repo permissions
   - `GITHUB_REPO_OWNER`: Your GitHub username or organization name
   - `GITHUB_REPO_NAME`: The name of your repository
   - `GITHUB_BASE_BRANCH`: The branch to create PRs against (usually 'main')
3. Restart the application
4. Log in as an admin and you'll see a "GitHub Sync" option in the sidebar

### Local Development
To run the project locally, follow these steps:

1. Clone this repository to your local machine
2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory for your environment variables:
   ```
   # Basic configuration
   PORT=3000
   SESSION_SECRET=your_session_secret_here
   
   # GitHub integration (optional)
   GITHUB_TOKEN=your_personal_access_token
   GITHUB_REPO_OWNER=your_github_username_or_org
   GITHUB_REPO_NAME=your_repo_name
   GITHUB_BASE_BRANCH=main
   ```

4. Run the local development server:
   ```
   npx tsx server/local-entry.ts
   ```

   This will start a local development server using tsx, which properly handles TypeScript files and module resolution without relying on Replit-specific features.

5. For your package.json, add the following script to run locally:
   ```json
   "scripts": {
     "dev:local": "NODE_ENV=development tsx server/local-entry.ts"
   }
   ```
   
   Then you can run the server with:
   ```
   npm run dev:local
   ```

## Authentication

The system has two user roles:

1. **Admin**: Can add, edit, and delete references, categories, and tags
   - Username: admin
   - Password: admin123

2. **Curator**: Can add references, categories, and tags (but cannot edit or delete)
   - Username: curator
   - Password: curator123

## Project Structure

- `/client` - Frontend React application
- `/server` - Express backend API
- `/shared` - Shared types and schemas
- `/data` - JSON database files
  
## Features

- Reference management with rich metadata
- Category and tag filtering
- Search functionality
- Admin and curator user roles
- Responsive design for mobile and desktop
- Thumbnail generation for references
- GitHub integration for data synchronization via PRs

## GitHub Integration

The system supports synchronizing your data (references, categories, and tags) with a GitHub repository through pull requests. Admin users can access this feature from the sidebar.

### Setting Up GitHub Integration

To enable GitHub integration, you'll need to set the following environment variables:

#### In Replit

1. Go to the "Secrets" tab in your Replit project
2. Add the following secrets:

   ```
   GITHUB_TOKEN=your_personal_access_token
   GITHUB_REPO_OWNER=your_github_username_or_org
   GITHUB_REPO_NAME=your_repo_name
   GITHUB_BASE_BRANCH=main  # or your default branch
   ```

   Optional configuration:
   ```
   GITHUB_CATEGORIES_PATH=data/categories.json  # Optional, defaults to this value
   GITHUB_REFERENCES_PATH=data/references.json  # Optional, defaults to this value
   GITHUB_TAGS_PATH=data/tags.json  # Optional, defaults to this value
   ```

#### For Local Development

Add the same variables to your `.env.local` file:

```
# Required configuration
GITHUB_TOKEN=your_personal_access_token
GITHUB_REPO_OWNER=your_github_username_or_org
GITHUB_REPO_NAME=your_repo_name
GITHUB_BASE_BRANCH=main  # or your default branch

# Optional configuration
GITHUB_CATEGORIES_PATH=data/categories.json
GITHUB_REFERENCES_PATH=data/references.json
GITHUB_TAGS_PATH=data/tags.json
```

### Creating a GitHub Personal Access Token

1. Go to your GitHub account settings
2. Navigate to "Developer settings" > "Personal access tokens" > "Tokens (classic)"
3. Click "Generate new token"
4. Give it a descriptive name and select the following permissions:
   - `repo` (Full control of private repositories)
5. Click "Generate token" and copy the token
6. Add this token to your environment variables as `GITHUB_TOKEN`

### How GitHub Sync Works

1. The system compares your local data with the data in the GitHub repository
2. If differences are detected, you can create a pull request to sync the changes
3. The PR will include all modified data files
4. Once created, you can review and merge the PR on GitHub

### Using the GitHub Sync Feature

1. Log in as an admin user
2. Look for the "GitHub Sync" section in the sidebar
3. Click on "Sync Data to GitHub" to open the sync dialog
4. Click "Check Configuration" to verify your GitHub settings
5. If configuration is valid, click "Check for Changes" to compare your local data with the repository
6. If changes are detected, click "Create Pull Request" to create a PR with your changes
7. The system will generate a PR and provide a link to view it on GitHub
8. Review and merge the PR on GitHub to update your repository

This feature allows you to keep a backup of your reference data in a GitHub repository and track changes over time.