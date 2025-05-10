import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";
import { registerRoutes } from "./routes";

// Get proper dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logger function
function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Log requests
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: any = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Main function to set up and start the server
async function main() {
  // Print out directory information for debugging
  console.log('Root directory:', rootDir);
  console.log('Current directory:', process.cwd());
  
  // Create HTTP server
  const server = createServer(app);
  
  // Register API routes
  await registerRoutes(app);
  
  // Set up Vite in development
  const viteConfig = {
    configFile: false as const,
    root: path.join(rootDir, 'client'),
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    resolve: {
      alias: {
        '@': path.join(rootDir, 'client/src'),
        '@shared': path.join(rootDir, 'shared'),
        '@assets': path.join(rootDir, 'attached_assets'),
      },
    },
    appType: 'custom' as const,
  };
  
  const vite = await createViteServer(viteConfig);
  
  // Use Vite's middleware for handling client requests
  app.use(vite.middlewares);
  
  // Fallback route for SPA
  app.use('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const templatePath = path.join(rootDir, 'client/index.html');
      
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = template.replace(
        'src="/src/main.tsx"',
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      const rendered = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(rendered);
    } catch (e) {
      if (vite.ssrFixStacktrace) {
        vite.ssrFixStacktrace(e as Error);
      }
      next(e);
    }
  });
  
  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
  });
  
  // Start the server
  const port = 5000;
  server.listen(port, '0.0.0.0', () => {
    log(`Local development server running at http://localhost:${port}`);
  });
}

// Run the server
main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});