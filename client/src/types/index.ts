export interface User {
  id: number;
  username: string;
  isAdmin: boolean;
}

export interface Reference {
  id: string;
  title: string;
  link: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface InsertCategory {
  name: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface InsertTag {
  name: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface NotificationType {
  message: string;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
}

export type ReferenceFormData = Omit<Reference, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>;
