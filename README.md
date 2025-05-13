# RefHub - Reference Management System

A dynamic reference management system designed to simplify data organization through modern web technologies and intuitive user experiences.

## Project Structure

The project is organized into separate client and server components:

```
refhub/
├── client/          # Frontend React application
│   ├── public/      # Static assets
│   ├── src/         # Client source code
│   └── ...          # Client-specific configuration files
├── server/          # Backend Express application  
│   ├── src/         # Server source code
│   └── ...          # Server-specific configuration files
└── shared/          # Shared types and utilities
```

## Features

- User authentication with admin roles
- Reference management (create, read, update, delete)
- Category and tag organization
- Responsive design for all devices
- GitHub integration for syncing data

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm 9 or higher
- PostgreSQL (optional, configured via DATABASE_URL)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/refhub.git
   cd refhub
   ```

2. Install dependencies for all components:
   ```
   npm run install:all
   ```

3. Configure environment variables:
   - Create `.env` files in client and server directories based on the provided examples

### Development

You can run the client and server components separately or together:

- Run both together:
  ```
  npm run dev
  ```

- Run only the client:
  ```
  npm run client
  ```

- Run only the server:
  ```
  npm run server
  ```

The client runs on http://localhost:3000 and the server on http://localhost:5000.

### Building for Production

```
npm run build
```

This builds both client and server components for production.

## Deployment

The application can be deployed in several ways:

1. **Combined Deployment**: Deploy both client and server to a platform like Replit that supports Node.js applications.

2. **Separate Deployment**:
   - Deploy the server to a Node.js hosting platform (Replit, Render, Railway, etc.)
   - Deploy the client as a static site to GitHub Pages or any static hosting

3. **Static Only Mode**:
   - The client can operate in a static-only mode with limited functionality
   - Suitable for demo or read-only versions

## License

MIT