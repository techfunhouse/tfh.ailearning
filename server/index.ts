/**
 * Main Server Entry Point
 * 
 * This file serves as the main entry point for the server
 * and is used by the npm scripts.
 */

// Import standalone server implementation
import './src/standalone-server.js';

// Output startup message
console.log(`
=============================================
  RefHub Server started successfully
  
  API is available at: http://localhost:5000
=============================================
`);