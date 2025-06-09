import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
// Import from our new module that provides all the needed exports
import { setupVite, serveStatic, log } from "./vite-exports.js";
import * as dotenv from 'dotenv';

// Load environment variables from .env file if it exists
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers to allow requests from any origin (including ngrok)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Add Content-Security-Policy header for external resources
  res.header(
    'Content-Security-Policy',
    "default-src 'self' ngrok-free.app *.ngrok-free.app; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' replit.com *.replit.com; " +
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com; " +
    "font-src 'self' fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' *.ngrok-free.app ngrok-free.app localhost:*;"
  );
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
