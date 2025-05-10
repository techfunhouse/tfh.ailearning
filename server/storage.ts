import {
  User,
  InsertUser,
  Reference,
  InsertReference,
  Category,
  InsertCategory,
  Tag,
  InsertTag,
  Database
} from "@shared/schema";
import { LowSync } from "lowdb";
import { JSONFileSync } from "lowdb/node";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import path from "path";
import fs from "fs";

// Storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUserCredentials(username: string, password: string): Promise<User | null>;
  
  // Reference methods
  getReferences(): Promise<Reference[]>;
  getReference(id: string): Promise<Reference | undefined>;
  createReference(reference: InsertReference): Promise<Reference>;
  updateReference(id: string, reference: Partial<InsertReference>): Promise<Reference | undefined>;
  deleteReference(id: string): Promise<boolean>;
  toggleLoveReference(id: string, userId: number): Promise<Reference | undefined>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Tag methods
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  deleteTag(id: string): Promise<boolean>;
  
  // Query methods
  getReferencesByCategory(category: string): Promise<Reference[]>;
  getReferencesByTag(tag: string): Promise<Reference[]>;
  searchReferences(query: string): Promise<Reference[]>;
}

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// LowDB implementation
export class JsonDbStorage implements IStorage {
  private db: LowSync<Database>;
  private initialized: boolean = false;

  constructor() {
    // Set up the JSON file adapter
    const file = path.join(dataDir, "db.json");
    
    // Create the database instance
    this.db = new LowSync<Database>(new JSONFileSync<Database>(file), {
      users: [],
      references: [],
      categories: [],
      tags: []
    });
    
    // Load data from the JSON file
    this.db.read();
    
    // Initialize with default data if DB is empty
    if (!this.initialized && 
        (!this.db.data.users || this.db.data.users.length === 0)) {
      this.initializeDefaultData();
      this.initialized = true;
    }
  }

  private async initializeDefaultData() {
    // Create default admin user
    await this.createUser({
      username: "admin",
      password: await bcrypt.hash("admin123", 10),
      isAdmin: true,
    });
    
    // Create default user
    await this.createUser({
      username: "user",
      password: await bcrypt.hash("user123", 10),
      isAdmin: false,
    });
    
    // Create default categories
    const categoryIds = [
      await this.createCategory({ name: "Programming" }),
      await this.createCategory({ name: "Design" }),
      await this.createCategory({ name: "Research" }),
      await this.createCategory({ name: "Tools" })
    ];
    
    // Create default tags
    const tagIds = [
      await this.createTag({ name: "javascript" }),
      await this.createTag({ name: "ui/ux" }),
      await this.createTag({ name: "algorithm" }),
      await this.createTag({ name: "database" }),
      await this.createTag({ name: "frontend" }),
      await this.createTag({ name: "backend" }),
      await this.createTag({ name: "mobile" }),
      await this.createTag({ name: "productivity" }),
      await this.createTag({ name: "tools" }),
      await this.createTag({ name: "data" }),
      await this.createTag({ name: "visualization" }),
      await this.createTag({ name: "design" }),
      await this.createTag({ name: "development" }),
      await this.createTag({ name: "performance" })
    ];
    
    // Create sample references
    await this.createReference({
      title: "Modern JavaScript Techniques",
      link: "https://example.com/javascript-techniques",
      description: "A comprehensive guide to advanced JavaScript patterns and performance optimization techniques.",
      category: "programming",
      tags: ["javascript", "frontend", "performance"],
      thumbnail: "https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      loveCount: 0,
      lovedBy: [],
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "UI/UX Design Principles",
      link: "https://example.com/uiux-design",
      description: "Essential principles for creating intuitive and aesthetically pleasing user interfaces.",
      category: "design",
      tags: ["ui/ux", "design", "frontend"],
      thumbnail: "https://images.unsplash.com/photo-1516031190212-da133013de50?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      loveCount: 0,
      lovedBy: [],
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Data Visualization Techniques",
      link: "https://example.com/data-viz",
      description: "Methods for effectively visualizing complex data sets to derive meaningful insights.",
      category: "research",
      tags: ["algorithm", "data", "visualization"],
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      loveCount: 0,
      lovedBy: [],
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Essential Developer Tools",
      link: "https://example.com/dev-tools",
      description: "A collection of must-have tools and utilities for modern software development workflows.",
      category: "tools",
      tags: ["productivity", "tools", "development"],
      thumbnail: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      loveCount: 0,
      lovedBy: [],
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Database Optimization Patterns",
      link: "https://example.com/db-optimization",
      description: "Strategies and techniques for optimizing database performance in high-scale applications.",
      category: "programming",
      tags: ["database", "backend", "performance"],
      thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      loveCount: 0,
      lovedBy: [],
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Mobile UX Design Patterns",
      link: "https://example.com/mobile-ux",
      description: "Best practices for creating intuitive and engaging user experiences for mobile applications.",
      category: "design",
      tags: ["mobile", "ui/ux", "frontend"],
      thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      loveCount: 0,
      lovedBy: [],
      createdBy: "admin",
    });
  }
  
  // Helper method to save changes to the JSON file
  private saveData(): void {
    this.db.write();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.db.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.db.data.users.find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Find the highest ID to determine the next ID
    const maxId = this.db.data.users.reduce((max, user) => (user.id > max ? user.id : max), 0);
    const newId = maxId + 1;
    
    const user: User = { ...insertUser, id: newId };
    this.db.data.users.push(user);
    this.saveData();
    
    return user;
  }

  async validateUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    return isValidPassword ? user : null;
  }

  // Reference methods
  async getReferences(): Promise<Reference[]> {
    return this.db.data.references;
  }

  async getReference(id: string): Promise<Reference | undefined> {
    return this.db.data.references.find(ref => ref.id === id);
  }

  async createReference(reference: InsertReference): Promise<Reference> {
    const id = uuid();
    const now = new Date().toISOString();
    
    const newReference: Reference = {
      ...reference,
      id,
      loveCount: 0,
      lovedBy: [],
      createdAt: now,
      updatedAt: now,
    };
    
    this.db.data.references.push(newReference);
    this.saveData();
    
    return newReference;
  }

  async updateReference(id: string, reference: Partial<InsertReference>): Promise<Reference | undefined> {
    const index = this.db.data.references.findIndex(ref => ref.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    const existingReference = this.db.data.references[index];
    const updatedReference: Reference = {
      ...existingReference,
      ...reference,
      updatedAt: new Date().toISOString(),
    };
    
    this.db.data.references[index] = updatedReference;
    this.saveData();
    
    return updatedReference;
  }

  async deleteReference(id: string): Promise<boolean> {
    const initialLength = this.db.data.references.length;
    this.db.data.references = this.db.data.references.filter(ref => ref.id !== id);
    
    const deleted = initialLength > this.db.data.references.length;
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return this.db.data.categories;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = uuid();
    const newCategory: Category = { ...category, id };
    
    this.db.data.categories.push(newCategory);
    this.saveData();
    
    return newCategory;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const initialLength = this.db.data.categories.length;
    this.db.data.categories = this.db.data.categories.filter(cat => cat.id !== id);
    
    const deleted = initialLength > this.db.data.categories.length;
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  // Tag methods
  async getTags(): Promise<Tag[]> {
    return this.db.data.tags;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = uuid();
    const newTag: Tag = { ...tag, id };
    
    this.db.data.tags.push(newTag);
    this.saveData();
    
    return newTag;
  }
  
  async deleteTag(id: string): Promise<boolean> {
    const initialLength = this.db.data.tags.length;
    this.db.data.tags = this.db.data.tags.filter(tag => tag.id !== id);
    
    const deleted = initialLength > this.db.data.tags.length;
    if (deleted) {
      this.saveData();
    }
    
    return deleted;
  }

  // Query methods
  async getReferencesByCategory(category: string): Promise<Reference[]> {
    return this.db.data.references.filter(
      reference => reference.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getReferencesByTag(tag: string): Promise<Reference[]> {
    return this.db.data.references.filter(reference =>
      reference.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }

  async toggleLoveReference(id: string, userId: number): Promise<Reference | undefined> {
    const index = this.db.data.references.findIndex(ref => ref.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    const reference = this.db.data.references[index];
    
    // Check if user already loved this reference
    const alreadyLoved = reference.lovedBy.includes(userId);
    
    if (alreadyLoved) {
      // Remove user from lovedBy array
      reference.lovedBy = reference.lovedBy.filter(id => id !== userId);
      reference.loveCount = Math.max(0, reference.loveCount - 1);
    } else {
      // Add user to lovedBy array
      reference.lovedBy.push(userId);
      reference.loveCount = reference.loveCount + 1;
    }
    
    this.db.data.references[index] = reference;
    this.saveData();
    
    return reference;
  }

  async searchReferences(query: string): Promise<Reference[]> {
    const normalizedQuery = query.toLowerCase();
    
    return this.db.data.references.filter(reference => {
      return (
        reference.title.toLowerCase().includes(normalizedQuery) ||
        reference.description.toLowerCase().includes(normalizedQuery) ||
        reference.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }
}

export const storage = new JsonDbStorage();
