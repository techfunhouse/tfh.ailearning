# Build "RefHub": A Modern Reference Collection Management System

## Application Goal
Create a responsive reference management system where users can collect, organize, search, and share valuable online resources like articles, tools, and websites. The system should support categorization, tagging, filtering, and role-based access.

## Core Functionality
1. **Reference Management**: 
   - Card-based interface for adding, viewing, editing, and deleting references
   - Each reference includes: title, description, link, category, tags, thumbnail, and love count
   - Automatic thumbnail generation via URL when possible, with fallbacks for missing images
   - Detail view showing complete reference information in a modal dialog

2. **Categorization & Tagging**: 
   - Organize references by categories with visual color-coding
   - Support for multiple tags per reference with distinct colors
   - Category and tag management (add/edit/delete) for admin users
   - Visual badges for tags with hover effects

3. **Search & Filtering**: 
   - Full-text search across all reference fields
   - Multi-criteria filtering by categories and tags
   - Combined filtering (category + multiple tags)
   - Clear filters option to reset all selections
   - Fuzzy search with highlighting using Fuse.js

4. **User Authentication**: 
   - Role-based access control with three levels:
     - Admin: Full control of all features and data
     - Curator: Can add references, categories, and tags but cannot delete
     - Viewer: Read-only access to browse references
   - Protected routes and API endpoints
   - Session-based authentication with secure cookie storage
   - Login page with validation and error handling

5. **GitHub Integration**: 
   - Sync data changes with a GitHub repository via PR creation
   - Configuration check to verify GitHub credentials
   - Visual display of sync status and changed files
   - Pull request creation with automatic commit messages

## Technical Requirements
- **Storage**: 
  - LowDB with JSON file storage
  - Separate files for users, references, categories, tags
  - Storage interface with CRUD operations for all entity types
  - Type safety throughout with Zod validation schemas

- **Frontend**: 
  - React + TypeScript for component-based UI
  - Shadcn UI components for consistent design language
  - Tailwind CSS for utility-first styling
  - TanStack Query for data fetching and state management
  - Wouter for lightweight routing
  - Toast notifications for user feedback
  - Custom hooks for authentication, responsiveness, and other cross-cutting concerns

- **Backend**: 
  - Node.js + Express for the API server
  - TypeScript for type safety
  - Drizzle ORM with Zod validation for data handling
  - Express Session with MemoryStore for session management
  - Middleware for authentication and authorization checks
  - GitHub API integration via Octokit

- **Architecture**: 
  - Shared schema definitions between frontend and backend
  - Clear separation of concerns with modular components
  - Client-side and server-side validation
  - Consistent error handling and status codes
  - Well-defined API endpoints with appropriate HTTP methods

## Design & UX Priorities
- **Responsive Design**: 
  - Mobile-first approach working on all screen sizes
  - Adaptive layouts for different viewport sizes
  - Custom hook to detect mobile devices
  - Media queries for responsive adjustments

- **Modern UI**: 
  - Clean, card-based layout with visual distinction between categories
  - Consistent color scheme with semantic meaning
  - Shadow effects for depth and hierarchy
  - Interactive elements with hover/focus states
  - Gradient accents for visual interest

- **User Experience**: 
  - Horizontal scrolling category section with auto-hiding navigation arrows
  - Infinite scroll pagination for reference listing
  - Custom confirmation dialogs instead of browser alerts
  - Loading states for all asynchronous operations
  - Detailed view modals for references with all information
  - Keyboard navigation support
  - Tooltips for additional context

## Security & Data Constraints
- **Authentication**: 
  - Store passwords securely with bcrypt hashing
  - CSRF protection
  - HTTP-only cookies for session storage
  - Rate limiting on authentication attempts

- **Authorization**: 
  - Middleware for protecting routes based on user roles
  - Role-based UI rendering to hide unavailable actions
  - Server-side validation of permissions before actions
  - Granular permission checks:
    - Admins: Full access to all features and management options
    - Curators: Can add references, categories, and tags but cannot delete
    - Viewers: Read-only access to browse references

## Development Approach
1. **Data Model First**: 
   - Define the schema in shared/schema.ts
   - Create Zod validation schemas for all entities
   - Define TypeScript interfaces for type safety

2. **API Layer**: 
   - Build backend routes with Express
   - Implement storage interfaces with LowDB
   - Create RESTful endpoints for all CRUD operations
   - Add validation middleware for request data

3. **Auth System**: 
   - Implement user authentication endpoints (login/logout)
   - Add authorization middleware for protected routes
   - Create authentication context for frontend

4. **Core UI**: 
   - Develop the main layout and navigation
   - Build reference card components
   - Create filtering and search components
   - Implement category and tag display

5. **Enhancement Phase**: 
   - Add GitHub sync functionality
   - Implement infinite scrolling
   - Create dialogs for reference, category, and tag management
   - Add horizontal category scrolling with navigation arrows

6. **Refinement**: 
   - Replace browser dialogs with custom styled dialogs
   - Optimize performance for large datasets
   - Enhance mobile responsiveness
   - Add polish to UI elements and interactions

## Non-Functional Requirements
- **Performance**: 
  - Efficient handling of large reference collections
  - Pagination or infinite scroll for large datasets
  - Optimized search with indexes
  - Memoization for expensive computations

- **Maintainability**: 
  - Document code thoroughly with comments
  - Follow TypeScript best practices
  - Consistent naming conventions
  - Modular structure for easier updates

- **Extensibility**: 
  - Structure the app to allow for future feature additions
  - Flexible component composition
  - Abstract common functionality into hooks and utilities
  - Use context providers for global state

## Constraints
- **No Database**: Use file-based storage rather than SQL/PostgreSQL
- **No Virtual Environments**: Develop directly within Replit environment
- **Frontend Bundling**: Use Vite for development and bundling

## Additional Considerations for Better Project Guidance
- **Initial Data**: Provide sample data for references, categories, and tags to start with
- **Visual Mockups**: Include wireframes or design references for key screens
- **Environment Variables**: Specify all required environment variables up front
- **Testing Strategy**: Define approach for testing components and API endpoints
- **Success Criteria**: Clear definition of when features are considered complete
- **Prioritization**: Rank features by importance for phased delivery
- **Common Pitfalls**: Highlight potential issues to watch for during development
- **Performance Benchmarks**: Define expectations for load times and responsiveness
- **Error Handling Strategy**: Guidelines for consistent error messages and recovery
- **Accessibility Requirements**: Specify WCAG compliance level and key considerations
- **Internationalization**: Note if multi-language support is needed initially or in future
- **Documentation Expectations**: Define what project documentation should include
- **GitHub Integration Details**: Specific branch naming and PR workflow guidelines

Implement this application incrementally, focusing on core functionality first, then enhancing the user experience, and finally adding more advanced features like GitHub integration. Provide regular feedback on the development progress to allow for course corrections.