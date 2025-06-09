#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';

// Configuration
const DEFAULT_BASE_URL = 'http://localhost:5000';
const DEFAULT_IDS_FILE = 'reference-ids.txt';

async function authenticate(baseUrl, username = 'admin', password = 'admin123') {
  try {
    // Use a global cookie jar for session persistence
    global.cookieJar = global.cookieJar || new Map();
    
    const response = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${response.status} ${errorText}`);
    }

    // Extract and store cookies from Set-Cookie header
    const cookieHeader = response.headers.get('set-cookie');
    if (cookieHeader) {
      const sessionCookie = cookieHeader.split(';')[0];
      global.cookieJar.set('session', sessionCookie);
      return sessionCookie;
    }
    
    throw new Error('No session cookie received from server');
    
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to server. Make sure the server is running.');
    }
    throw error;
  }
}

async function getReference(baseUrl, cookies, referenceId) {
  const response = await fetch(`${baseUrl}/api/references/${referenceId}`, {
    headers: {
      'Cookie': cookies,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to get reference ${referenceId}: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function regenerateThumbnail(baseUrl, cookies, referenceId) {
  const response = await fetch(`${baseUrl}/api/references/${referenceId}/regenerate-thumbnail`, {
    method: 'POST',
    headers: {
      'Cookie': cookies,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to regenerate thumbnail for ${referenceId}: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function readReferenceIds(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const idsFile = args[0] || DEFAULT_IDS_FILE;
  const baseUrl = args[1] || DEFAULT_BASE_URL;

  console.log('🔄 Thumbnail Regeneration Script');
  console.log('================================');
  console.log(`📁 Reading IDs from: ${idsFile}`);
  console.log(`🌐 Server URL: ${baseUrl}`);
  console.log('');

  try {
    // Read reference IDs from file
    console.log('📖 Reading reference IDs...');
    const referenceIds = await readReferenceIds(idsFile);
    
    if (referenceIds.length === 0) {
      console.log('❌ No reference IDs found in file');
      process.exit(1);
    }

    console.log(`✅ Found ${referenceIds.length} reference ID(s)`);
    console.log('');

    // Authenticate
    console.log('🔐 Authenticating...');
    const cookies = await authenticate(baseUrl);
    console.log('✅ Authentication successful');
    console.log('');

    // Process each reference ID
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < referenceIds.length; i++) {
      const referenceId = referenceIds[i];
      console.log(`[${i + 1}/${referenceIds.length}] Processing reference: ${referenceId}`);

      try {
        // Check if reference exists
        const reference = await getReference(baseUrl, cookies, referenceId);
        if (!reference) {
          console.log(`   ⚠️  Reference not found: ${referenceId}`);
          errorCount++;
          errors.push(`Reference not found: ${referenceId}`);
          continue;
        }

        console.log(`   📝 Title: ${reference.title}`);
        console.log(`   🔗 URL: ${reference.link}`);

        // Regenerate thumbnail
        console.log(`   🔄 Regenerating thumbnail...`);
        await regenerateThumbnail(baseUrl, cookies, referenceId);
        console.log(`   ✅ Thumbnail regeneration initiated`);
        
        successCount++;
        
        // Small delay to avoid overwhelming the server
        if (i < referenceIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
        errors.push(`${referenceId}: ${error.message}`);
      }
      
      console.log('');
    }

    // Summary
    console.log('📊 Summary');
    console.log('=========');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📊 Total: ${referenceIds.length}`);

    if (errors.length > 0) {
      console.log('');
      console.log('❌ Error Details:');
      errors.forEach(error => console.log(`   • ${error}`));
    }

    if (successCount > 0) {
      console.log('');
      console.log('ℹ️  Note: Thumbnail generation runs in the background.');
      console.log('   Check the server logs for generation progress.');
    }

  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Show usage if --help is provided
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Thumbnail Regeneration Script
============================

Usage: node scripts/regenerate-thumbnails.js [ids-file] [server-url]

Arguments:
  ids-file    Path to text file containing reference IDs (default: reference-ids.txt)
  server-url  Base URL of the server (default: http://localhost:5000)

Example:
  node scripts/regenerate-thumbnails.js reference-ids.txt http://localhost:5000

File format:
  The IDs file should contain one reference ID per line:
  
  abc123
  def456
  ghi789

Requirements:
  - Server must be running
  - Default admin credentials (admin/admin123) or modify script for custom auth
  - Reference IDs must exist in the database
`);
  process.exit(0);
}

main().catch(console.error);