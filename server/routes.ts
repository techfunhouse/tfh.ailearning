import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertReferenceSchema, insertCategorySchema, insertTagSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import createMemoryStore from "memorystore";
import { ThumbnailService } from "./thumbnail-service";



// Create memory store for sessions
const MemoryStore = createMemoryStore(session);

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure sessions
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      resave: false,
      secret: process.env.SESSION_SECRET || "referencehub-secret",
      saveUninitialized: false,
    })
  );

  // Login route
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      const user = await storage.validateUserCredentials(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Store user in session
      req.session!.user = {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
      };
      
      return res.status(200).json({ 
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res) => {
    req.session!.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/me", (req, res) => {
    if (!req.session?.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    return res.status(200).json({ user: req.session.user });
  });

  // References routes
  app.get("/api/references", async (req, res) => {
    try {
      const { category, tag, search } = req.query;
      
      let references = await storage.getReferences();
      
      // Apply filters
      if (category && typeof category === "string") {
        references = await storage.getReferencesByCategory(category);
      }
      
      if (tag && typeof tag === "string") {
        references = await storage.getReferencesByTag(tag);
      }
      
      if (search && typeof search === "string") {
        references = await storage.searchReferences(search);
      }
      
      return res.status(200).json(references);
    } catch (error) {
      console.error("Error fetching references:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/references/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const reference = await storage.getReference(id);
      
      if (!reference) {
        return res.status(404).json({ message: "Reference not found" });
      }
      
      return res.status(200).json(reference);
    } catch (error) {
      console.error("Error fetching reference:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/references", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const validationResult = insertReferenceSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid reference data",
          errors: validationResult.error.errors
        });
      }
      
      const referenceData = validationResult.data;
      
      // Auto-create any new tags that don't exist
      const existingTags = await storage.getTags();
      const existingTagNames = existingTags.map(tag => tag.name);
      
      for (const tagName of referenceData.tags) {
        if (!existingTagNames.includes(tagName)) {
          try {
            await storage.createTag({ name: tagName });
            console.log(`Auto-created new tag: ${tagName}`);
          } catch (error) {
            console.error(`Failed to create tag ${tagName}:`, error);
          }
        }
      }
      
      // For create, we'll pass the user's username separately since it's omitted from the schema
      const createdBy = req.session!.user!.username;
      
      const reference = await storage.createReference(referenceData, createdBy);
      return res.status(201).json(reference);
    } catch (error) {
      console.error("Error creating reference:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/references/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`PATCH request for reference ${id}:`, req.body);
      
      // Partial validation for update
      const updateSchema = insertReferenceSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        console.error("Validation failed:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid reference data",
          errors: validationResult.error.errors
        });
      }
      
      const referenceData = validationResult.data;
      console.log("Validated reference data:", referenceData);
      
      const updatedReference = await storage.updateReference(id, referenceData);
      
      if (!updatedReference) {
        console.log(`Reference ${id} not found`);
        return res.status(404).json({ message: "Reference not found" });
      }
      
      console.log("Returning updated reference:", updatedReference);
      return res.status(200).json(updatedReference);
    } catch (error) {
      console.error("Error updating reference:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/references/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteReference(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Reference not found" });
      }
      
      return res.status(200).json({ success: true, message: "Reference deleted successfully" });
    } catch (error) {
      console.error("Error deleting reference:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/references/:id/regenerate-thumbnail", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if reference exists
      const reference = await storage.getReference(id);
      if (!reference) {
        return res.status(404).json({ message: "Reference not found" });
      }
      
      // Regenerate thumbnail using the thumbnail service
      const { ThumbnailService } = await import('./thumbnail-service.js');
      const filename = `ref_${id}.jpg`;
      
      // Start thumbnail regeneration in background
      ThumbnailService.generateThumbnailToFile(reference.link, reference.title, reference.category, filename);
      
      return res.status(200).json({ 
        success: true, 
        message: "Thumbnail regeneration started",
        referenceId: id,
        filename: filename
      });
    } catch (error) {
      console.error("Error regenerating thumbnail:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Categories routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      return res.status(200).json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const validationResult = insertCategorySchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid category data",
          errors: validationResult.error.errors
        });
      }
      
      const categoryData = validationResult.data;
      const category = await storage.createCategory(categoryData);
      
      return res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: "Invalid category name" });
      }
      
      const updatedCategory = await storage.updateCategory(id, name);
      
      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.status(200).json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/categories/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteCategory(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tags routes
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      return res.status(200).json(tags);
    } catch (error) {
      console.error("Error fetching tags:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const { tag } = req.body;
      
      if (!tag || typeof tag !== 'string' || tag.trim() === '') {
        return res.status(400).json({ message: "Invalid tag name" });
      }
      
      const createdTag = await storage.createTag(tag.trim());
      
      return res.status(201).json(createdTag);
    } catch (error) {
      console.error("Error creating tag:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/tags/:tag", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { tag } = req.params;
      const deleted = await storage.deleteTag(decodeURIComponent(tag));
      
      if (!deleted) {
        return res.status(404).json({ message: "Tag not found" });
      }
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting tag:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Love/favorite reference route
  app.post("/api/references/:id/love", async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session?.user?.id || 0; // Use 0 as default user ID if not logged in
      
      const reference = await storage.toggleLoveReference(id, userId);
      
      if (!reference) {
        return res.status(404).json({ message: "Reference not found" });
      }
      
      return res.status(200).json(reference);
    } catch (error) {
      console.error("Error toggling love for reference:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  




  // Placeholder thumbnail endpoint
  app.get("/api/placeholder/generating-thumbnail", (req, res) => {
    const svg = `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#1D4ED8;stop-opacity:1" />
        </linearGradient>
        <pattern id="dots" patternUnits="userSpaceOnUse" width="20" height="20">
          <circle cx="10" cy="10" r="1.5" fill="rgba(255,255,255,0.3)"/>
        </pattern>
      </defs>
      <rect width="320" height="180" fill="url(#grad)"/>
      <rect width="320" height="180" fill="url(#dots)"/>
      <circle cx="160" cy="70" r="15" fill="none" stroke="white" stroke-width="2">
        <animateTransform attributeName="transform" type="rotate" values="0 160 70;360 160 70" dur="2s" repeatCount="indefinite"/>
      </circle>
      <text x="160" y="110" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">
        Generating thumbnail...
      </text>
      <text x="160" y="130" font-family="Arial, sans-serif" font-size="10" fill="rgba(255,255,255,0.8)" text-anchor="middle">
        This may take a moment
      </text>
    </svg>`;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(svg);
  });

  // Thumbnail generation endpoint
  app.post("/api/thumbnails/generate", async (req, res) => {
    try {
      const { url, title, category } = req.body;
      
      if (!url || !title || !category) {
        return res.status(400).json({ 
          message: "Missing required fields: url, title, category" 
        });
      }
      
      const result = await ThumbnailService.generateThumbnail(url, title, category);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      return res.status(500).json({ 
        message: "Failed to generate thumbnail",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Thumbnail job status endpoint
  app.get("/api/thumbnails/status/:jobId", (req, res) => {
    const { jobId } = req.params;
    const job = ThumbnailService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    
    return res.json(job);
  });

  // Server-Sent Events endpoint for real-time thumbnail updates
  app.get("/api/thumbnails/stream/:referenceId", async (req, res) => {
    const { referenceId } = req.params;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const reference = await storage.getReference(referenceId);
    if (!reference || !reference.thumbnailId) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        message: 'Reference or thumbnail job not found'
      })}\n\n`);
      res.end();
      return;
    }

    // Set up job update listener
    const jobUpdateHandler = (job: any) => {
      if (job.status === 'completed' || job.status === 'failed') {
        res.write(`data: ${JSON.stringify({
          type: 'thumbnail-update',
          referenceId,
          status: job.status,
          thumbnailPath: job.result?.thumbnailPath || reference.thumbnail
        })}\n\n`);
        
        // Clean up listener and close connection
        ThumbnailService.removeJobListener(reference.thumbnailId!);
        res.end();
      }
    };

    ThumbnailService.onJobUpdate(reference.thumbnailId, jobUpdateHandler);

    // Clean up on client disconnect
    req.on('close', () => {
      ThumbnailService.removeJobListener(reference.thumbnailId!);
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
