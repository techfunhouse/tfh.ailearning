/**
 * API Service for RefHub
 * 
 * This service handles all API communication between the client and server.
 * It automatically detects the environment and adjusts API calls accordingly.
 */

import { apiRequest } from './queryClient';
import type { 
  Reference, 
  InsertReference, 
  Category, 
  InsertCategory, 
  Tag, 
  InsertTag 
} from '@shared/schema';

// API Base URL - automatically detects environment
const getApiBaseUrl = (): string => {
  // For development with separate client/server
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default for combined dev setup
  return '';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API base URL on initialization
console.log(`API Service initialized with base URL: ${API_BASE_URL || '(same origin)'}`);

// ----- References API -----

export const getReferences = async (): Promise<Reference[]> => {
  const response = await fetch(`${API_BASE_URL}/api/references`);
  return response.json();
};

export const getReference = async (id: string): Promise<Reference> => {
  const response = await fetch(`${API_BASE_URL}/api/references/${id}`);
  return response.json();
};

export const createReference = async (reference: InsertReference): Promise<Reference> => {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/references`, reference);
  return response.json();
};

export const updateReference = async (id: string, reference: Partial<InsertReference>): Promise<Reference> => {
  const response = await apiRequest('PATCH', `${API_BASE_URL}/api/references/${id}`, reference);
  return response.json();
};

export const deleteReference = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiRequest('DELETE', `${API_BASE_URL}/api/references/${id}`);
  return response.json();
};

export const toggleLoveReference = async (id: string): Promise<Reference> => {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/references/${id}/love`);
  return response.json();
};

// ----- Categories API -----

export const getCategories = async (): Promise<Category[]> => {
  const response = await fetch(`${API_BASE_URL}/api/categories`);
  return response.json();
};

export const createCategory = async (category: InsertCategory): Promise<Category> => {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/categories`, category);
  return response.json();
};

export const updateCategory = async (id: string, name: string): Promise<Category> => {
  const response = await apiRequest('PATCH', `${API_BASE_URL}/api/categories/${id}`, { name });
  return response.json();
};

export const deleteCategory = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiRequest('DELETE', `${API_BASE_URL}/api/categories/${id}`);
  return response.json();
};

// ----- Tags API -----

export const getTags = async (): Promise<Tag[]> => {
  const response = await fetch(`${API_BASE_URL}/api/tags`);
  return response.json();
};

export const createTag = async (tag: InsertTag): Promise<Tag> => {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/tags`, tag);
  return response.json();
};

export const updateTag = async (id: string, name: string): Promise<Tag> => {
  const response = await apiRequest('PATCH', `${API_BASE_URL}/api/tags/${id}`, { name });
  return response.json();
};

export const deleteTag = async (id: string): Promise<{ success: boolean }> => {
  const response = await apiRequest('DELETE', `${API_BASE_URL}/api/tags/${id}`);
  return response.json();
};

// ----- Auth API -----

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

export const login = async (credentials: LoginCredentials): Promise<User> => {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/auth/login`, credentials);
  return response.json();
};

export const logout = async (): Promise<void> => {
  await apiRequest('POST', `${API_BASE_URL}/api/auth/logout`);
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, { 
      credentials: 'include' 
    });
    
    if (response.status === 200) {
      return response.json();
    }
    return null;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// ----- GitHub API -----

export interface SyncResult {
  message: string;
  prUrl?: string;
  prNumber?: number;
  changedFiles?: string[];
  dryRun?: boolean;
}

export const syncWithGitHub = async (dryRun: boolean = false): Promise<SyncResult> => {
  const response = await apiRequest('POST', `${API_BASE_URL}/api/github/sync`, { dryRun });
  return response.json();
};