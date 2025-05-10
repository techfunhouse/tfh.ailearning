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
  updateCategory(id: string, name: string): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;
  
  // Tag methods
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, name: string): Promise<Tag | undefined>;
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

// Define types for each database file
type UsersDB = { users: User[] };
type ReferencesDB = { references: Reference[] };
type CategoriesDB = { categories: Category[] };
type TagsDB = { tags: Tag[] };

// LowDB implementation
export class JsonDbStorage implements IStorage {
  private usersDb: LowSync<UsersDB>;
  private referencesDb: LowSync<ReferencesDB>;
  private categoriesDb: LowSync<CategoriesDB>;
  private tagsDb: LowSync<TagsDB>;
  private initialized: boolean = false;

  constructor() {
    // Set up the JSON file adapters for each entity type
    const usersFile = path.join(dataDir, "users.json");
    const referencesFile = path.join(dataDir, "references.json");
    const categoriesFile = path.join(dataDir, "categories.json");
    const tagsFile = path.join(dataDir, "tags.json");
    
    // Create the database instances
    this.usersDb = new LowSync<UsersDB>(new JSONFileSync<UsersDB>(usersFile), { users: [] });
    this.referencesDb = new LowSync<ReferencesDB>(new JSONFileSync<ReferencesDB>(referencesFile), { references: [] });
    this.categoriesDb = new LowSync<CategoriesDB>(new JSONFileSync<CategoriesDB>(categoriesFile), { categories: [] });
    this.tagsDb = new LowSync<TagsDB>(new JSONFileSync<TagsDB>(tagsFile), { tags: [] });
    
    // Load data from the JSON files
    this.usersDb.read();
    this.referencesDb.read();
    this.categoriesDb.read();
    this.tagsDb.read();
    
    // Initialize with default data if DB is empty
    if (!this.initialized && 
        (!this.usersDb.data.users || this.usersDb.data.users.length === 0)) {
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
  
  // Helper methods to save changes to the respective JSON file
  private saveUserData(): void {
    this.usersDb.write();
  }

  private saveReferenceData(): void {
    this.referencesDb.write();
  }

  private saveCategoryData(): void {
    this.categoriesDb.write();
  }

  private saveTagData(): void {
    this.tagsDb.write();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersDb.data.users.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.usersDb.data.users.find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Find the highest ID to determine the next ID
    const maxId = this.usersDb.data.users.reduce((max, user) => (user.id > max ? user.id : max), 0);
    const newId = maxId + 1;
    
    const user: User = { ...insertUser, id: newId };
    this.usersDb.data.users.push(user);
    this.saveUserData();
    
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
    return this.referencesDb.data.references;
  }

  async getReference(id: string): Promise<Reference | undefined> {
    return this.referencesDb.data.references.find(ref => ref.id === id);
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
    
    this.referencesDb.data.references.push(newReference);
    this.saveReferenceData();
    
    return newReference;
  }

  async updateReference(id: string, reference: Partial<InsertReference>): Promise<Reference | undefined> {
    const index = this.referencesDb.data.references.findIndex(ref => ref.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    const existingReference = this.referencesDb.data.references[index];
    const updatedReference: Reference = {
      ...existingReference,
      ...reference,
      updatedAt: new Date().toISOString(),
    };
    
    this.referencesDb.data.references[index] = updatedReference;
    this.saveReferenceData();
    
    return updatedReference;
  }

  async deleteReference(id: string): Promise<boolean> {
    const initialLength = this.referencesDb.data.references.length;
    this.referencesDb.data.references = this.referencesDb.data.references.filter(ref => ref.id !== id);
    
    const deleted = initialLength > this.referencesDb.data.references.length;
    if (deleted) {
      this.saveReferenceData();
    }
    
    return deleted;
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return this.categoriesDb.data.categories;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = uuid();
    const newCategory: Category = { ...category, id };
    
    this.categoriesDb.data.categories.push(newCategory);
    this.saveCategoryData();
    
    return newCategory;
  }
  
  async updateCategory(id: string, name: string): Promise<Category | undefined> {
    const categoryIndex = this.categoriesDb.data.categories.findIndex(cat => cat.id === id);
    
    if (categoryIndex === -1) {
      return undefined;
    }
    
    const updatedCategory = {
      ...this.categoriesDb.data.categories[categoryIndex],
      name
    };
    
    this.categoriesDb.data.categories[categoryIndex] = updatedCategory;
    this.saveCategoryData();
    
    // Update all references with this category to use the new name
    const oldName = this.categoriesDb.data.categories[categoryIndex].name.toLowerCase();
    const newName = name.toLowerCase();
    
    if (oldName !== newName) {
      this.referencesDb.data.references = this.referencesDb.data.references.map(ref => {
        if (ref.category === oldName) {
          return {
            ...ref,
            category: newName
          };
        }
        return ref;
      });
      this.saveReferenceData();
    }
    
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const initialLength = this.categoriesDb.data.categories.length;
    this.categoriesDb.data.categories = this.categoriesDb.data.categories.filter(cat => cat.id !== id);
    
    const deleted = initialLength > this.categoriesDb.data.categories.length;
    if (deleted) {
      this.saveCategoryData();
    }
    
    return deleted;
  }

  // Tag methods
  async getTags(): Promise<Tag[]> {
    return this.tagsDb.data.tags;
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = uuid();
    const newTag: Tag = { ...tag, id };
    
    this.tagsDb.data.tags.push(newTag);
    this.saveTagData();
    
    return newTag;
  }
  
  async deleteTag(id: string): Promise<boolean> {
    const initialLength = this.tagsDb.data.tags.length;
    this.tagsDb.data.tags = this.tagsDb.data.tags.filter(tag => tag.id !== id);
    
    const deleted = initialLength > this.tagsDb.data.tags.length;
    if (deleted) {
      this.saveTagData();
    }
    
    return deleted;
  }

  // Query methods
  async getReferencesByCategory(category: string): Promise<Reference[]> {
    return this.referencesDb.data.references.filter(
      reference => reference.category.toLowerCase() === category.toLowerCase()
    );
  }

  async getReferencesByTag(tag: string): Promise<Reference[]> {
    return this.referencesDb.data.references.filter(reference =>
      reference.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  }

  async toggleLoveReference(id: string, userId: number): Promise<Reference | undefined> {
    const index = this.referencesDb.data.references.findIndex(ref => ref.id === id);
    
    if (index === -1) {
      return undefined;
    }
    
    const reference = this.referencesDb.data.references[index];
    
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
    
    this.referencesDb.data.references[index] = reference;
    this.saveReferenceData();
    
    return reference;
  }

  async searchReferences(query: string): Promise<Reference[]> {
    const normalizedQuery = query.toLowerCase();
    
    return this.referencesDb.data.references.filter(reference => {
      return (
        reference.title.toLowerCase().includes(normalizedQuery) ||
        reference.description.toLowerCase().includes(normalizedQuery) ||
        reference.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }
}

export const storage = new JsonDbStorage();
