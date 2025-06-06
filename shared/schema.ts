import { z } from "zod";

// Schema definitions for lowdb

// User Schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  isAdmin: z.boolean().default(false),
});

export const insertUserSchema = userSchema.omit({ id: true });

// Reference Schema
export const referenceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  thumbnail: z.string(),
  thumbnailStatus: z.enum(['pending', 'generating', 'completed', 'failed']).default('pending'),
  thumbnailId: z.string().optional(),
  loveCount: z.number().default(0),
  createdBy: z.string(),
  createdAt: z.string(), // ISO timestamp
  updatedAt: z.string(), // ISO timestamp
});

export const insertReferenceSchema = referenceSchema.omit({ 
  id: true,
  createdBy: true,
  loveCount: true,
  thumbnailStatus: true,
  thumbnailId: true,
  createdAt: true,
  updatedAt: true
});

// Category Schema
export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const insertCategorySchema = categorySchema.omit({ id: true });

// Tag Schema
export const tagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const insertTagSchema = tagSchema.omit({ id: true });

// Database schema for lowdb
export const dbSchema = z.object({
  users: z.array(userSchema),
  references: z.array(referenceSchema),
  categories: z.array(categorySchema),
  tags: z.array(tagSchema),
});

// Types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Reference = z.infer<typeof referenceSchema>;
export type InsertReference = z.infer<typeof insertReferenceSchema>;

export type Category = z.infer<typeof categorySchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Tag = z.infer<typeof tagSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type Database = z.infer<typeof dbSchema>;
