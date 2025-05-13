/**
 * This file provides helpers for the build process.
 * These functions are meant to replace the ones imported from vite.ts
 * that are causing build errors.
 */

import { createServer as createViteServer, createLogger } from "vite";

// Re-export these to fix build errors
export const createServer = createViteServer;
export { createLogger };