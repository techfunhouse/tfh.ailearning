/**
 * Standalone Server for RefHub
 * 
 * This server can be run independently from the client.
 * It provides all API endpoints needed by the client application.
 */

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import session from "express-session";
import createMemoryStore from "memorystore";
import { storage } from "./server/storage";
import { 
  insertReferenceSchema, 
  insertCategorySchema, 
  insertTagSchema 
} from "./shared/schema";
import { z } from "zod";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Setup Express app
const app = express();
const server = createServer(app);

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging function
const log = (message: string, source = "standalone-server") => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [${source}] ${message}`);
};

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

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
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
    }

    if (logLine.length > 80) {
      logLine = logLine.slice(0, 79) + "…";
    }

    log(logLine);
  });

  next();
});

// Create memory store for sessions
const MemoryStore = createMemoryStore(session);

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

// Extend the Express Request type to include session
declare module "express-session" {
  interface SessionData {
    user: {
      id: number;
      username: string;
      isAdmin: boolean;
    };
  }
}

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

// --- API Routes ---

// References routes
app.get("/api/references", async (req, res) => {
  const references = await storage.getReferences();
  res.json(references);
});

app.get("/api/references/:id", async (req, res) => {
  const reference = await storage.getReference(req.params.id);
  if (!reference) {
    return res.status(404).json({ message: "Reference not found" });
  }
  res.json(reference);
});

app.post("/api/references", isAuthenticated, async (req, res) => {
  try {
    const validation = insertReferenceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.errors });
    }
    
    const createdBy = req.session?.user?.username || 'anonymous';
    const reference = await storage.createReference(validation.data, createdBy);
    res.status(201).json(reference);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create reference" });
  }
});

app.patch("/api/references/:id", isAuthenticated, async (req, res) => {
  try {
    const reference = await storage.updateReference(req.params.id, req.body);
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }
    res.json(reference);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update reference" });
  }
});

app.delete("/api/references/:id", isAdmin, async (req, res) => {
  try {
    const success = await storage.deleteReference(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Reference not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete reference" });
  }
});

app.post("/api/references/:id/love", async (req, res) => {
  try {
    const userId = req.session?.user?.id || 0;
    const reference = await storage.toggleLoveReference(req.params.id, userId);
    if (!reference) {
      return res.status(404).json({ message: "Reference not found" });
    }
    res.json(reference);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to toggle love" });
  }
});

// Categories routes
app.get("/api/categories", async (req, res) => {
  const categories = await storage.getCategories();
  res.json(categories);
});

app.post("/api/categories", isAuthenticated, async (req, res) => {
  try {
    const validation = insertCategorySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.errors });
    }
    
    const category = await storage.createCategory(validation.data);
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create category" });
  }
});

app.patch("/api/categories/:id", isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    
    const category = await storage.updateCategory(req.params.id, name);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", isAdmin, async (req, res) => {
  try {
    const success = await storage.deleteCategory(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

// Tags routes
app.get("/api/tags", async (req, res) => {
  const tags = await storage.getTags();
  res.json(tags);
});

app.post("/api/tags", isAuthenticated, async (req, res) => {
  try {
    const validation = insertTagSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ errors: validation.error.errors });
    }
    
    const tag = await storage.createTag(validation.data);
    res.status(201).json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create tag" });
  }
});

app.patch("/api/tags/:id", isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    
    const tag = await storage.updateTag(req.params.id, name);
    if (!tag) {
      return res.status(404).json({ message: "Tag not found" });
    }
    res.json(tag);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update tag" });
  }
});

app.delete("/api/tags/:id", isAdmin, async (req, res) => {
  try {
    const success = await storage.deleteTag(req.params.id);
    if (!success) {
      return res.status(404).json({ message: "Tag not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete tag" });
  }
});

// Auth routes
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
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
    console.error(error);
    res.status(500).json({ message: "Failed to login" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.json({ success: true });
  });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  res.json({
    id: req.session.user.id,
    username: req.session.user.username,
    isAdmin: req.session.user.isAdmin,
  });
});

// GitHub sync route
app.post("/api/github/sync", isAdmin, async (req, res) => {
  try {
    const { dryRun = false } = req.body;
    
    // Import GitHub sync service dynamically
    const { syncWithGitHub, validateGitHubConfig } = await import('./server/services/github-sync');
    
    // Validate GitHub configuration
    const config = validateGitHubConfig();
    if (!config) {
      return res.status(400).json({ 
        message: "GitHub configuration is incomplete. Please set the required environment variables." 
      });
    }
    
    // Perform sync
    const result = await syncWithGitHub(dryRun);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to sync with GitHub" });
  }
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({ message });
  console.error(err);
});

// Start server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  log(`Standalone server running on port ${port}`);
  log(`CORS enabled for: ${corsOptions.origin}`);
});