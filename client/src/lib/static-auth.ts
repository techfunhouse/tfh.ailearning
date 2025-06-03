// Static authentication for GitHub Pages deployment
import { User } from '@shared/schema';

interface StaticAuthConfig {
  username: string;
  password: string;
  isAdmin: boolean;
}

// Get static auth configuration from environment variables
function getStaticAuthConfig(): StaticAuthConfig | null {
  const username = import.meta.env?.VITE_STATIC_USERNAME;
  const password = import.meta.env?.VITE_STATIC_PASSWORD;
  
  if (!username || !password) {
    return null;
  }
  
  return {
    username,
    password,
    isAdmin: true
  };
}

// Validate credentials for static deployment
export function validateStaticCredentials(username: string, password: string): User | null {
  const config = getStaticAuthConfig();
  
  if (!config) {
    console.log('No static auth configuration found');
    return null;
  }
  
  if (username === config.username && password === config.password) {
    return {
      id: 1,
      username: config.username,
      password: '', // Don't store password in memory
      isAdmin: config.isAdmin
    };
  }
  
  return null;
}

// Check if static auth is configured
export function hasStaticAuthConfig(): boolean {
  return getStaticAuthConfig() !== null;
}

// Create a mock session for static deployment
export function createStaticSession(user: User): void {
  sessionStorage.setItem('static-auth-user', JSON.stringify(user));
}

// Get current static session
export function getStaticSession(): User | null {
  const stored = sessionStorage.getItem('static-auth-user');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// Clear static session
export function clearStaticSession(): void {
  sessionStorage.removeItem('static-auth-user');
}