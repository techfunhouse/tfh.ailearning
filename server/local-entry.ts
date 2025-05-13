/**
 * Local Development Entry Point for Server
 * 
 * This file serves as the entry point for local development
 * and allows the server to run directly without client integration.
 */

import './src/standalone-server.js';

console.log(`
=============================================
  RefHub Server running in LOCAL mode
  
  API is available at: http://localhost:5000
  
  Use a separate terminal to run the client:
  > cd client && npm run dev
=============================================
`);