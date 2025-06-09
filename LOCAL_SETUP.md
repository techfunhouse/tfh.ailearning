# Local Development Setup

## Prerequisites

### Required Software
- **Node.js 20+** and **npm 9+** (confirmed working versions)
- **Google Chrome/Chromium** (for thumbnail generation)
- **Git** (for repository cloning)

### Optional
- **PostgreSQL** (if you want persistent database instead of JSON files)

## Installation Steps

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   npm install
   ```

2. **Environment Configuration**
   Create a `.env.local` file in the root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   
   # Optional: Database (leave empty to use JSON files)
   # DATABASE_URL=postgresql://username:password@localhost:5432/refhub
   
   # Optional: Custom domain settings
   # REPLIT_DOMAINS=your-domain.com
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

   This starts both frontend (Vite) and backend (Express) servers.

## Local-Specific Considerations

### Thumbnail Generation
The CDP thumbnail system should work seamlessly on local machines with these benefits:
- **Better Performance**: Local Chrome instances typically start faster
- **No Port Conflicts**: Automatic port detection prevents conflicts
- **Direct File Access**: Faster thumbnail file operations

### Chrome/Chromium Requirements
The system automatically detects and uses:
- Google Chrome (preferred)
- Chromium
- Chrome Canary
- Microsoft Edge (Chromium-based)

If Chrome isn't found, install it:
- **Ubuntu/Debian**: `sudo apt-get install google-chrome-stable`
- **macOS**: Download from google.com/chrome
- **Windows**: Download from google.com/chrome

### File Storage
By default, the app uses JSON files for data storage:
- `user/data/users.json` - User accounts
- `user/data/references.json` - Reference data
- `user/data/categories.json` - Categories
- `user/data/tags.json` - Tags
- `client/public/thumbnails/` - Generated thumbnails

### Network Access
Ensure your firewall allows:
- **Port 5000** (backend server)
- **Port 5173** (Vite dev server, auto-assigned)
- **Outbound HTTPS** (for screenshot generation)

## Differences from Replit

### Advantages on Local Machine
1. **Faster Startup**: No container/workflow overhead
2. **Better Performance**: Direct hardware access
3. **Easier Debugging**: Full access to browser dev tools
4. **File System Access**: Direct thumbnail file management
5. **No Resource Limits**: Full system resources available

### Potential Issues
1. **Chrome Path Detection**: System will auto-detect, but you can manually specify:
   ```javascript
   // In server/cdp-thumbnail.ts, you can hardcode path if needed
   const chromePath = '/usr/bin/google-chrome'; // Linux
   const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; // macOS
   ```

2. **Port Conflicts**: If port 5000 is busy, modify `package.json`:
   ```json
   {
     "scripts": {
       "dev": "PORT=3000 NODE_ENV=development tsx server/index.ts"
     }
   }
   ```

### Production Considerations
For production deployment:
1. **Use PostgreSQL**: Set DATABASE_URL for better performance
2. **Enable HTTPS**: Configure SSL certificates
3. **Process Management**: Use PM2 or similar
4. **Reverse Proxy**: Use Nginx for static file serving

## Troubleshooting

### Chrome Issues
If thumbnail generation fails:
```bash
# Check Chrome installation
which google-chrome
google-chrome --version

# Test CDP connection manually
google-chrome --headless --remote-debugging-port=9222
```

### Permission Issues
On Linux, ensure Chrome can create sandbox:
```bash
# If needed, run Chrome with --no-sandbox (not recommended for production)
export CHROME_FLAGS="--no-sandbox --disable-setuid-sandbox"
```

### Performance Optimization
For better thumbnail performance:
- Use SSD storage for faster file I/O
- Ensure adequate RAM (4GB+ recommended)
- Close unnecessary browser instances

The system is designed to be platform-agnostic and should work identically on your local machine with potentially better performance than the Replit environment.