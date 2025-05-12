# RefHub: Reference Collection Management System

## Problem Statement & Target Audience
RefHub solves the challenge of organizing, accessing, and sharing valuable references across different topics for teams and individuals. It serves as a central repository for collecting and categorizing resources such as articles, tools, websites, and documentation. The primary users are:

- Knowledge workers who need to organize and retrieve information
- Teams who want to share curated resources
- Researchers, educators, and content creators who collect topic-specific references
- Anyone who wants to maintain a searchable library of valuable online resources

## Main Features

### Core Functionality
- **Reference Management**: Add, edit, view, and delete reference cards with titles, descriptions, links, and thumbnails
- **JSON-based Database**: File-based storage using lowdb with separate JSON files for users, references, categories, and tags
- **Categorization System**: Organize references by categories with visual differentiation
- **Tagging System**: Apply multiple tags to references for flexible organization
- **Multi-user Support**: Different permission levels (admin, curator, viewer)
- **Authentication**: Secure login with role-based access control
- **Search & Filtering**: Full-text search and multi-criteria filtering by categories and tags

### User Experience
- **Responsive Design**: Mobile and desktop-friendly interface
- **Card-based UI**: Visual display of references with thumbnails
- **Horizontal Category Scrolling**: With auto-hiding navigation arrows
- **Custom Confirmation Dialogs**: Styled dialogs replace browser dialogs
- **Reference Detail View**: Modal dialog showing complete reference information
- **Infinite Scroll**: Better performance with large datasets 

### Admin Features
- **Category Management**: Add, edit, delete categories
- **Tag Management**: Add, edit, delete tags
- **GitHub Integration**: Sync data changes with GitHub repository via PR
- **User Management**: Control who has what level of access

## Architecture & Tech Stack

### Frontend
- **React**: Component-based UI development
- **TypeScript**: Type safety throughout the application
- **TanStack Query**: Data fetching and state management
- **Wouter**: Lightweight routing
- **Tailwind CSS**: Utility-first styling
- **Shadcn UI**: Component library for consistent design
- **Zod**: Schema validation for forms and data
- **Vite**: Fast development server and bundling

### Backend
- **Node.js & Express**: API server
- **TypeScript**: Type-safe backend code
- **LowDB**: JSON-based file storage
- **Drizzle ORM**: Data access with schema validation
- **Express Session**: Authentication and session management
- **GitHub API Integration**: Data synchronization with repositories

### Infrastructure
- **Replit**: Hosting and development environment
- **Environment Variables**: Configuration and secrets management
- **Workflow Automation**: Frontend and backend service orchestration

## Development Progress

### Phase 1: Foundation & Core Features
- Set up project structure and tech stack
- Implemented data models and storage interfaces
- Built authentication system with role-based access
- Created reference management CRUD operations

### Phase 2: UI Development
- Designed and implemented responsive card-based interface
- Added filtering and search functionality
- Built category and tag management systems
- Implemented infinite scroll for better performance

### Phase 3: Enhanced Features
- Added GitHub integration for data syncing
- Created custom confirmation dialogs for better UX
- Implemented horizontal category scrolling with navigation arrows
- Added detailed view modals for references

### Phase 4: Refinement & Polishing
- Improved mobile responsiveness
- Enhanced error handling and feedback
- Optimized performance for large datasets
- Added UI enhancements like auto-hiding scroll arrows

## Current Status & Next Steps

### Completed Deliverables
- Complete reference management system
- Multi-user authentication with role-based permissions
- Category and tag management system
- Responsive UI with modern design elements
- Search and filtering capabilities
- GitHub integration for data synchronization

### Planned Enhancements
- Batch operations for references
- Advanced analytics for reference usage
- Export/import functionality
- Enhanced thumbnail generation
- Additional authentication methods
- Collaborative features like commenting and sharing

## Implementation Details

### Authentication
- Currently supports three user roles:
  - **Admin**: Full control over all features and data
  - **Curator**: Can add references, categories, and tags but not delete them
  - **Viewer**: Read-only access to references

### Data Storage
- File-based JSON storage using lowdb
- Separate files for users, references, categories, and tags
- Data structure defined in shared schema for type safety

### GitHub Integration
- Requires environment variables:
  - `GITHUB_TOKEN`: Personal access token
  - `GITHUB_USERNAME`: GitHub username
  - `GITHUB_EMAIL`: Email for commits
  - `GITHUB_REPO`: Repository for data syncing

## Assumptions & Limitations

### Assumptions
- User base is relatively small (< 1000 users)
- Reference dataset is moderate in size (< 10,000 items)
- Single-server deployment is sufficient
- Periodic GitHub sync is acceptable for data backup

### Limitations
- File-based storage not suitable for high-concurrency environments
- No real-time collaboration features
- Limited scaling capabilities with current architecture
- No offline support
- Thumbnail generation requires external service integration

### Dependencies
- Requires environment variables for GitHub integration
- Admin/curator credentials required for content management
- Default thumbnails used when image URLs not provided

## Getting Started
- Default admin login: username `admin`, password `admin123`
- Default curator login: username `curator`, password `curator123`
- GitHub sync requires proper environment variable configuration
- Browse references without login; authentication required for management functions

This application provides a flexible foundation that can be extended to support more advanced features as requirements evolve. The modular architecture allows for easy component reuse and feature additions.