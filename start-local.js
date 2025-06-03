#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting RefHub Application locally...\n');

// Start the server
console.log('📡 Starting server on port 5000...');
const server = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

// Wait a moment for server to start, then start client
setTimeout(() => {
  console.log('🌐 Starting client on port 3000...');
  const client = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    server.kill();
    client.kill();
    process.exit();
  });

  client.on('close', (code) => {
    server.kill();
    process.exit(code);
  });

}, 2000);

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});