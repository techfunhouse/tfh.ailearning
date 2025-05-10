import { 
  User, 
  InsertUser, 
  Reference, 
  InsertReference, 
  Category, 
  InsertCategory, 
  Tag, 
  InsertTag 
} from "@shared/schema";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

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
  
  // Category methods
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Tag methods
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Query methods
  getReferencesByCategory(category: string): Promise<Reference[]>;
  getReferencesByTag(tag: string): Promise<Reference[]>;
  searchReferences(query: string): Promise<Reference[]>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private references: Map<string, Reference>;
  private categories: Map<string, Category>;
  private tags: Map<string, Tag>;
  private nextUserId: number;

  constructor() {
    this.users = new Map();
    this.references = new Map();
    this.categories = new Map();
    this.tags = new Map();
    this.nextUserId = 1;
    
    // Initialize with default data
    this.initializeDefaultData();
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
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "UI/UX Design Principles",
      link: "https://example.com/uiux-design",
      description: "Essential principles for creating intuitive and aesthetically pleasing user interfaces.",
      category: "design",
      tags: ["ui/ux", "design", "frontend"],
      thumbnail: "https://images.unsplash.com/photo-1516031190212-da133013de50?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Data Visualization Techniques",
      link: "https://example.com/data-viz",
      description: "Methods for effectively visualizing complex data sets to derive meaningful insights.",
      category: "research",
      tags: ["algorithm", "data", "visualization"],
      thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Essential Developer Tools",
      link: "https://example.com/dev-tools",
      description: "A collection of must-have tools and utilities for modern software development workflows.",
      category: "tools",
      tags: ["productivity", "tools", "development"],
      thumbnail: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Database Optimization Patterns",
      link: "https://example.com/db-optimization",
      description: "Strategies and techniques for optimizing database performance in high-scale applications.",
      category: "programming",
      tags: ["database", "backend", "performance"],
      thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      createdBy: "admin",
    });
    
    await this.createReference({
      title: "Mobile UX Design Patterns",
      link: "https://example.com/mobile-ux",
      description: "Best practices for creating intuitive and engaging user experiences for mobile applications.",
      category: "design",
      tags: ["mobile", "ui/ux", "frontend"],
      thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80",
      createdBy: "admin",
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.nextUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async validateUserCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user) {
      return null;
    }
    
    // In a real app, we'd use bcrypt.compare
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    return isValidPassword ? user : null;
  }

  // Reference methods
  async getReferences(): Promise<Reference[]> {
    return Array.from(this.references.values());
  }

  async getReference(id: string): Promise<Reference | undefined> {
    return this.references.get(id);
  }

  async createReference(reference: InsertReference): Promise<Reference> {
    const id = uuid();
    const now = new Date().toISOString();
    
    const newReference: Reference = {
      ...reference,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.references.set(id, newReference);
    return newReference;
  }

  async updateReference(id: string, reference: Partial<InsertReference>): Promise<Reference | undefined> {
    const existingReference = this.references.get(id);
    
    if (!existingReference) {
      return undefined;
    }
    
    const updatedReference: Reference = {
      ...existingReference,
      ...reference,
      updatedAt: new Date().toISOString(),
    };
    
    this.references.set(id, updatedReference);
    return updatedReference;
  }

  async deleteReference(id: string): Promise<boolean> {
    return this.references.delete(id);
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = uuid();
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  // Tag methods
  async getTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = uuid();
    const newTag: Tag = { ...tag, id };
    this.tags.set(id, newTag);
    return newTag;
  }

  // Query methods
  async getReferencesByCategory(category: string): Promise<Reference[]> {
    return Array.from(this.references.values()).filter(
      (reference) => reference.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getReferencesByTag(tag: string): Promise<Reference[]> {
    return Array.from(this.references.values()).filter((reference) =>
      reference.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
  }

  async searchReferences(query: string): Promise<Reference[]> {
    const normalizedQuery = query.toLowerCase();
    
    return Array.from(this.references.values()).filter((reference) => {
      return (
        reference.title.toLowerCase().includes(normalizedQuery) ||
        reference.description.toLowerCase().includes(normalizedQuery) ||
        reference.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }
}

export const storage = new MemStorage();
