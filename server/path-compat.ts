// Path compatibility layer to handle different environments
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Function to get the root directory path that works in both environments
export function getRootDir(): string {
  // Replit environment
  if (process.env.REPL_ID) {
    return process.cwd();
  }
  
  // Local environment
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '..');
}

// Function to resolve paths relative to the root
export function resolvePath(...parts: string[]): string {
  return path.resolve(getRootDir(), ...parts);
}

// Check if a file exists
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

// Function to get the client directory path
export function getClientDir(): string {
  return resolvePath('client');
}

// Function to get the client src directory path
export function getClientSrcDir(): string {
  return resolvePath('client', 'src');
}

// Function to get the shared directory path
export function getSharedDir(): string {
  return resolvePath('shared');
}

// Function to get the assets directory path
export function getAssetsDir(): string {
  return resolvePath('attached_assets');
}

// Function to get the dist directory path
export function getDistDir(): string {
  return resolvePath('dist');
}

// Log the paths to help debugging
export function logPaths(): void {
  console.log('Root directory:', getRootDir());
  console.log('Client directory:', getClientDir());
  console.log('Client src directory:', getClientSrcDir());
  console.log('Shared directory:', getSharedDir());
  console.log('Assets directory:', getAssetsDir());
}