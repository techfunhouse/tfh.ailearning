/**
 * This file provides exports that are needed for the build process.
 * It re-exports functions from the vite package to work around build issues.
 */

// Re-export these from vite since other modules need them during build
export { createServer, createLogger } from "vite";