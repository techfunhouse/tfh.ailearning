# RefHub: Reference Management System

RefHub is a dynamic reference management system built with modern web technologies. It enables researchers and knowledge workers to organize, filter, and manage references efficiently.

## 🌟 Features

- **Dynamic Reference Management**: Browse, filter, and search reference materials
- **Category & Tag System**: Organize references with customizable categories and tags
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Authentication System**: Secure user authentication with role-based permissions
- **GitHub Integration**: Sync data changes with GitHub repositories
- **Static Deployment**: Support for GitHub Pages with automatic data handling

## 🛠️ Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, Node.js
- **Data Storage**: JSON-based storage using lowdb
- **Authentication**: Session-based with bcrypt password hashing
- **State Management**: React Query with optimistic updates
- **Deployment**: GitHub Pages (frontend) with optional backend hosting

## 🚀 Getting Started

### Local Development

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/refhub.git
   cd refhub
   ```

2. **Install dependencies**

   ```bash
   # Install all dependencies (root, client, server)
   npm run install:all
   ```

3. **Run the application**

   ```bash
   # Start both client and server
   npm run dev
   
   # OR start them separately
   npm run client  # Starts client on port 3000
   npm run server  # Starts server on port 5000
   ```

4. **Access the application**

   - Frontend: [http://localhost:3000](http://localhost:3000)
   - Backend API: [http://localhost:5000](http://localhost:5000)

### GitHub Pages Deployment

RefHub supports automatic deployment to GitHub Pages via GitHub Actions:

1. **Enable GitHub Pages** for your repository (Settings > Pages)

2. **Configure secrets** (if needed):
   - `CUSTOM_DOMAIN`: Your custom domain (optional)
   - `GITHUB_TOKEN`: For GitHub API access (optional, for GitHub sync feature)

3. **Push to main branch** to trigger deployment

4. **Access your deployed application** at:
   - Custom domain: https://yourdomain.com
   - GitHub Pages: https://yourusername.github.io/refhub/

## 🔧 Configuration

### Environment Variables

The project uses environment configuration files for different environments:

- **Client**: `.env`, `.env.production`
- **Server**: `.env`, `.env.production`

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for detailed configuration options.

## 📂 Project Structure

```
refhub/
├── client/            # Frontend React application
│   ├── public/        # Static assets
│   └── src/           # Source code
│       ├── components/# UI components
│       ├── hooks/     # Custom hooks
│       ├── lib/       # Utility functions
│       ├── pages/     # Page components
│       └── types/     # TypeScript type definitions
├── server/            # Backend Express server
│   ├── data/          # Data storage directory
│   ├── services/      # Server services
│   └── src/           # Source code
├── shared/            # Shared code between client and server
│   └── schema.ts      # Data schemas and types
└── .github/           # GitHub configuration
    └── workflows/     # GitHub Actions workflows
```

## 🧪 Development Guidelines

- All data schemas are defined in `shared/schema.ts`
- Follow the client-server architecture for clean separation of concerns
- Use React Query for data fetching and state management
- Implement proper error handling and loading states
- Keep components modular and reusable

## 🔐 Authentication

The application supports the following user roles:

- **Anonymous**: View-only access to references
- **Authenticated**: Can add references, categories, and tags
- **Admin**: Full management capabilities (edit/delete)

Default admin credentials:
- Username: `admin`
- Password: `password`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- Built with [React](https://reactjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Authentication with [Passport.js](http://www.passportjs.org/)