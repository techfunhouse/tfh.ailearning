// This file helps manage path resolution for both Replit and local environments
import path from 'path';
import { fileURLToPath } from 'url';

// Determine if we're in Replit or local environment
const isReplit = typeof process.env.REPL_ID !== 'undefined';

// Get the root directory name in a way that works in both environments
const getRootDir = () => {
  if (isReplit) {
    return process.cwd();
  }
  // For local environments using ESM
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
};

export const rootDir = getRootDir();