import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import createMemoryStore from "memorystore";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertReferenceSchema, insertCategorySchema, insertTagSchema } from "../../shared/schema.js";
import { z } from "zod";

// Get current file and directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Logger function
export function log(message: string, source = "express") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
}

// Create memory store for sessions
const MemoryStore = createMemoryStore(session);

// Auth middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  const user = req.session?.user;
  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Admin middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  const user = req.session?.user;
  if (!user || !user.isAdmin) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

// Import GitHub sync if available
let syncWithGitHub: (dryRun?: boolean) => Promise<any>;
let validateGitHubConfig: () => any;

try {
  const githubSync = await import("./services/github-sync.js");
  syncWithGitHub = githubSync.syncWithGitHub;
  validateGitHubConfig = githubSync.validateGitHubConfig;
} catch (error) {
  log("GitHub sync module not available", "server");
  // Provide dummy implementations if the module is not available
  syncWithGitHub = async (dryRun = false) => ({ 
    message: "GitHub sync not available in this environment",
    dryRun
  });
  validateGitHubConfig = () => null;
}

const app = express();

// CORS configuration for cross-domain requests
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000", 
  credentials: true,
  optionsSuccessStatus: 200
};

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

// Configure sessions
app.use(
  session({
    cookie: { maxAge: 86400000 }, // 24 hours
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "your-secret-key",
  })
);

// Define user session type
declare module "express-session" {
  interface SessionData {
    user: {
      id: number;
      username: string;
      isAdmin: boolean;
    };
  }
}

// Request logging middleware
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

// Define API routes
function registerApiRoutes(app: express.Express): Server {
  const server = createServer(app);

  // Authentication routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.validateUserCredentials(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.session.user = {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      };
      
      res.json({
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error during login process" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    res.json(req.session.user);
  });

  // Reference routes
  app.get("/api/references", async (req, res) => {
    try {
      const references = await storage.getReferences();
      res.json(references);
    } catch (error) {
      console.error("Error fetching references:", error);
      res.status(500).json({ message: "Error fetching references" });
    }
  });

  app.get("/api/references/:id", async (req, res) => {
    try {
      const reference = await storage.getReference(req.params.id);
      if (!reference) {
        return res.status(404).json({ message: "Reference not found" });
      }
      res.json(reference);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reference" });
    }
  });

  app.post("/api/references", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertReferenceSchema.parse(req.body);
      const reference = await storage.createReference(validatedData, req.session.user.username);
      res.status(201).json(reference);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating reference" });
    }
  });

  app.patch("/api/references/:id", isAuthenticated, async (req, res) => {
    try {
      const updatedReference = await storage.updateReference(req.params.id, req.body);
      if (!updatedReference) {
        return res.status(404).json({ message: "Reference not found" });
      }
      res.json(updatedReference);
    } catch (error) {
      res.status(500).json({ message: "Error updating reference" });
    }
  });

  app.delete("/api/references/:id", isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteReference(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Reference not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting reference" });
    }
  });

  app.post("/api/references/:id/love", async (req, res) => {
    try {
      const userId = req.session?.user?.id || 0;
      const updatedReference = await storage.toggleLoveReference(req.params.id, userId);
      if (!updatedReference) {
        return res.status(404).json({ message: "Reference not found" });
      }
      res.json(updatedReference);
    } catch (error) {
      res.status(500).json({ message: "Error updating love count" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating category" });
    }
  });

  app.patch("/api/categories/:id", isAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }
      
      const category = await storage.updateCategory(req.params.id, name);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      res.json(category);
    } catch (error) {
      res.status(500).json({ message: "Error updating category" });
    }
  });

  app.delete("/api/categories/:id", isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Tag routes
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tags" });
    }
  });

  app.post("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Error creating tag" });
    }
  });

  app.patch("/api/tags/:id", isAdmin, async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name is required" });
      }
      
      const tag = await storage.updateTag(req.params.id, name);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Error updating tag" });
    }
  });

  app.delete("/api/tags/:id", isAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteTag(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Error deleting tag" });
    }
  });

  // GitHub sync routes
  app.post("/api/github/sync", isAdmin, async (req, res) => {
    try {
      const { dryRun = false } = req.body;
      const result = await syncWithGitHub(dryRun);
      res.json(result);
    } catch (error) {
      console.error("GitHub sync error:", error);
      res.status(500).json({ 
        message: "Error syncing with GitHub",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GitHub config check route
  app.get("/api/github/config", isAdmin, (req, res) => {
    const config = validateGitHubConfig();
    res.json({ 
      valid: !!config,
      configured: config ? true : false
    });
  });

  return server;
}

// Start server
const server = registerApiRoutes(app);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  console.error(err);
});

// Start server
const port = parseInt(process.env.PORT || "5000", 10);
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`Server running on port ${port}`);
  log(`CORS enabled for: ${corsOptions.origin}`);
});