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
  loveCount: number;
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

// Extend ImportMeta interface to include Vite environment variables
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface ImportMetaEnv {
    readonly VITE_GITHUB_PAGES?: string;
    readonly VITE_STATIC_USERNAME?: string;
    readonly VITE_STATIC_PASSWORD?: string;
    readonly VITE_ADMIN_USERNAME?: string;
    readonly VITE_ADMIN_PASSWORD?: string;
    readonly VITE_USE_CUSTOM_DOMAIN?: string;
    readonly VITE_BASE_PATH?: string;
    readonly DEV?: boolean;
    readonly MODE?: string;
    readonly BASE_URL?: string;
    readonly PROD?: boolean;
    readonly SSR?: boolean;
  }
}
