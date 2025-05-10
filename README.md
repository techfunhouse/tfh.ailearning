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

### Local Development
To run the project locally, follow these steps:

1. Clone this repository to your local machine
2. Install dependencies:
   ```
   npm install
   ```

3. Run the app using the provided scripts:

   **For Unix/Linux/Mac**:
   ```
   sh run-local-dev.sh
   ```

   **For Windows**:
   ```
   run-local-dev.bat
   ```

   **Or manually run**:
   ```
   npx tsx server/local-entry.ts
   ```

   This will start a local development server using tsx, which properly handles TypeScript files and module resolution without relying on Replit-specific features.

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