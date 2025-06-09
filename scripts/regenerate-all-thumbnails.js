import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script to regenerate thumbnails for all references in the system
 * This will trigger thumbnail regeneration for every reference using the current CDP system
 */

async function authenticate(baseUrl, username = 'admin', password = 'admin123') {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
  }

  const cookies = response.headers.get('set-cookie');
  console.log('✓ Authentication successful');
  return cookies;
}

async function getAllReferences(baseUrl, cookies) {
  const response = await fetch(`${baseUrl}/api/references`, {
    headers: {
      'Cookie': cookies,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get references: ${response.status} ${response.statusText}`);
  }

  const references = await response.json();
  console.log(`✓ Found ${references.length} references`);
  return references;
}

async function regenerateThumbnail(baseUrl, cookies, referenceId) {
  try {
    const response = await fetch(`${baseUrl}/api/references/${referenceId}/regenerate-thumbnail`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:5000';
  const username = process.argv[3] || 'admin';
  const password = process.argv[4] || 'admin123';
  const delayMs = parseInt(process.argv[5]) || 2000; // 2 second delay between requests

  console.log('🔄 Starting thumbnail regeneration for all references');
  console.log(`📡 Server: ${baseUrl}`);
  console.log(`👤 Username: ${username}`);
  console.log(`⏱️  Delay between requests: ${delayMs}ms`);
  console.log('');

  try {
    // Authenticate
    const cookies = await authenticate(baseUrl, username, password);

    // Get all references
    const references = await getAllReferences(baseUrl, cookies);

    if (references.length === 0) {
      console.log('ℹ️  No references found to regenerate');
      return;
    }

    console.log(`🚀 Starting thumbnail regeneration for ${references.length} references\n`);

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (let i = 0; i < references.length; i++) {
      const reference = references[i];
      const progress = `[${i + 1}/${references.length}]`;
      
      console.log(`${progress} Regenerating: ${reference.title}`);
      console.log(`         ID: ${reference.id}`);
      console.log(`         URL: ${reference.link}`);

      const result = await regenerateThumbnail(baseUrl, cookies, reference.id);
      
      if (result.success) {
        successCount++;
        console.log(`         ✅ Success`);
        results.push({
          id: reference.id,
          title: reference.title,
          status: 'success',
          result: result.result
        });
      } else {
        failCount++;
        console.log(`         ❌ Failed: ${result.error}`);
        results.push({
          id: reference.id,
          title: reference.title,
          status: 'failed',
          error: result.error
        });
      }

      // Add delay between requests to avoid overwhelming the server
      if (i < references.length - 1) {
        console.log(`         ⏳ Waiting ${delayMs}ms before next request...\n`);
        await delay(delayMs);
      } else {
        console.log('');
      }
    }

    // Summary
    console.log('📊 REGENERATION SUMMARY');
    console.log('========================');
    console.log(`Total references: ${references.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('');

    if (failCount > 0) {
      console.log('❌ FAILED REFERENCES:');
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`   - ${r.title} (${r.id}): ${r.error}`);
      });
      console.log('');
    }

    // Save detailed results to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(__dirname, `thumbnail-regeneration-${timestamp}.json`);
    
    const detailedResults = {
      timestamp: new Date().toISOString(),
      summary: {
        total: references.length,
        successful: successCount,
        failed: failCount
      },
      results: results
    };

    fs.writeFileSync(resultsFile, JSON.stringify(detailedResults, null, 2));
    console.log(`📄 Detailed results saved to: ${resultsFile}`);

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Handle command line usage
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log('');
    console.log('Regenerate All Thumbnails Script');
    console.log('=================================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/regenerate-all-thumbnails.js [baseUrl] [username] [password] [delayMs]');
    console.log('');
    console.log('Parameters:');
    console.log('  baseUrl   - Server URL (default: http://localhost:5000)');
    console.log('  username  - Admin username (default: admin)');
    console.log('  password  - Admin password (default: admin123)');
    console.log('  delayMs   - Delay between requests in milliseconds (default: 2000)');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/regenerate-all-thumbnails.js');
    console.log('  node scripts/regenerate-all-thumbnails.js http://localhost:5000 admin admin123 1000');
    console.log('');
    process.exit(0);
  }

  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}