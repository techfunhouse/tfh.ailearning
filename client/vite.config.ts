import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Define shared path for consistent imports
const sharedPath = path.resolve(__dirname, "..", "shared");
const assetsPath = path.resolve(__dirname, "..", "attached_assets");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": sharedPath,
      "@assets": assetsPath,
    },
  },
  server: {
    port: 3000 // Different port than the server
  },
  base: './', // Use relative paths for GitHub Pages
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2015',
    minify: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  esbuild: {
    target: 'es2015',
    keepNames: true,
  },
});