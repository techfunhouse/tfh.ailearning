/**
 * This module provides explicit exports needed for the build process.
 * It serves as a replacement for direct imports from server/vite.ts that were causing build errors.
 */

// Export the functions needed from the vite package
export { createServer, createLogger } from "vite";

// Re-export everything else from server/vite.ts
export { log, setupVite, serveStatic } from "./vite";