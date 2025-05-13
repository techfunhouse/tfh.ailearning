#!/usr/bin/env node

/**
 * Run Client and Server Separately
 * 
 * This script runs the client and server as separate processes.
 * It uses concurrently to run both processes in parallel.
 */

const { spawn } = require('child_process');
const concurrently = require('concurrently');
const path = require('path');

console.log('Starting RefHub in separate client/server mode...');

// Run the client and server concurrently
concurrently([
  { 
    command: 'cd client && npx vite',
    name: 'CLIENT',
    prefixColor: 'blue',
  },
  { 
    command: 'NODE_ENV=development npx tsx server-standalone.ts',
    name: 'SERVER',
    prefixColor: 'green',
  }
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
  cwd: path.resolve(__dirname),
}).then(
  () => console.log('All processes exited successfully.'),
  (error) => console.error('Error occurred:', error)
);