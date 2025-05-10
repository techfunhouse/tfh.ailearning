#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Log with timestamp
function log(message) {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${message}`);
}

// Run the server
log('Starting local development server...');

// Use tsx which handles TypeScript and ESM imports correctly
const tsxProcess = spawn('npx', ['tsx', 'server/local-entry.ts'], {
  stdio: 'inherit',
  env: { 
    ...process.env,
    NODE_ENV: 'development'
  }
});

tsxProcess.on('error', (error) => {
  log(`Error starting server: ${error.message}`);
  process.exit(1);
});

tsxProcess.on('close', (code) => {
  if (code !== 0) {
    log(`Server process exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('Stopping server...');
  tsxProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Stopping server...');
  tsxProcess.kill('SIGTERM');
  process.exit(0);
});