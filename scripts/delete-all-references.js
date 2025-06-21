#!/usr/bin/env node

/**
 * RefHub - Delete All References Script
 * 
 * This script deletes all references from the database and removes their corresponding thumbnails.
 * It provides a safe way to clean up all reference data while preserving users, categories, and tags.
 * 
 * Usage:
 *   node scripts/delete-all-references.js [--confirm] [--backup] [--dry-run]
 * 
 * Options:
 *   --confirm    Skip confirmation prompt (use with caution)
 *   --backup     Create backup before deletion
 *   --dry-run    Show what would be deleted without actually deleting
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import * as dotenv from 'dotenv';
import fetchOrig from 'node-fetch';
import fetchCookie from 'fetch-cookie';
const fetch = fetchCookie(fetchOrig);

// Load environment variables from .env file if it exists
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5002';
const DATA_DIR = path.join(__dirname, '..', 'client', 'public', 'data');
const THUMBNAILS_DIR = path.join(__dirname, '..', 'client', 'public', 'thumbnails');
const REFERENCES_FILE = path.join(DATA_DIR, 'references.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');
const BACKUP_DIR = path.join(__dirname, 'backups');

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  confirm: args.includes('--confirm'),
  backup: args.includes('--backup'),
  dryRun: args.includes('--dry-run')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}${colors.bold}SUCCESS:${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}${colors.bold}WARNING:${colors.reset} ${message}`);
}

function logInfo(message) {
  console.log(`${colors.blue}${colors.bold}INFO:${colors.reset} ${message}`);
}

// Authentication functions
function getCredentials() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const credentials = {};
    
    rl.question('Username: ', (username) => {
      credentials.username = username.trim();
      rl.question('Password: ', (password) => {
        credentials.password = password;
        rl.close();
        resolve(credentials);
      });
    });
  });
}

async function authenticate(username, password) {
  try {
    logInfo('Authenticating with RefHub...');
    
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include' // Important for session cookies
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Authentication failed: ${errorText}`);
    }
    
    const result = await response.json();
    logSuccess(`Authenticated as ${result.user.username} (${result.user.isAdmin ? 'Admin' : 'User'})`);
    return result.user;
  } catch (error) {
    logError(`Authentication failed: ${error.message}`);
    return null;
  }
}

// Utility functions
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`, 'cyan');
  }
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      logWarning(`File does not exist: ${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.trim()) {
      logWarning(`File is empty: ${filePath}`);
      return null;
    }
    
    return JSON.parse(content);
  } catch (error) {
    logError(`Failed to read JSON file ${filePath}: ${error.message}`);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    ensureDirectoryExists(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    logError(`Failed to write JSON file ${filePath}: ${error.message}`);
    return false;
  }
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `references-backup-${timestamp}.json`);
  
  try {
    ensureDirectoryExists(BACKUP_DIR);
    
    const referencesData = readJsonFile(REFERENCES_FILE);
    if (!referencesData) {
      logError('No references data to backup');
      return false;
    }
    
    writeJsonFile(backupPath, referencesData);
    logSuccess(`Backup created: ${backupPath}`);
    return true;
  } catch (error) {
    logError(`Failed to create backup: ${error.message}`);
    return false;
  }
}

function getThumbnailFiles(references) {
  const thumbnailFiles = new Set();
  
  references.forEach(reference => {
    if (reference.thumbnail) {
      // Extract filename from thumbnail path
      const thumbnailPath = reference.thumbnail;
      
      // Handle different thumbnail path formats
      let filename;
      if (thumbnailPath.startsWith('/thumbnails/')) {
        filename = path.basename(thumbnailPath);
      } else if (thumbnailPath.startsWith('thumbnails/')) {
        filename = path.basename(thumbnailPath);
      } else if (thumbnailPath.includes('/thumbnails/')) {
        filename = path.basename(thumbnailPath);
      } else if (path.extname(thumbnailPath)) {
        // Direct filename
        filename = thumbnailPath;
      } else {
        // Skip external URLs
        return;
      }
      
      if (filename) {
        thumbnailFiles.add(filename);
      }
    }
  });
  
  return Array.from(thumbnailFiles);
}

function deleteThumbnailFiles(thumbnailFiles) {
  let deletedCount = 0;
  let errorCount = 0;
  
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    logWarning(`Thumbnails directory does not exist: ${THUMBNAILS_DIR}`);
    return { deletedCount, errorCount };
  }
  
  thumbnailFiles.forEach(filename => {
    const filePath = path.join(THUMBNAILS_DIR, filename);
    
    try {
      if (fs.existsSync(filePath)) {
        if (!flags.dryRun) {
          fs.unlinkSync(filePath);
          log(`Deleted thumbnail: ${filename}`, 'cyan');
        } else {
          log(`Would delete thumbnail: ${filename}`, 'yellow');
        }
        deletedCount++;
      } else {
        logWarning(`Thumbnail file not found: ${filename}`);
      }
    } catch (error) {
      logError(`Failed to delete thumbnail ${filename}: ${error.message}`);
      errorCount++;
    }
  });
  
  return { deletedCount, errorCount };
}

function clearReferencesData() {
  try {
    const emptyData = { references: [] };
    
    if (!flags.dryRun) {
      writeJsonFile(REFERENCES_FILE, emptyData);
      logSuccess('References data cleared');
    } else {
      log('Would clear references data', 'yellow');
    }
    
    return true;
  } catch (error) {
    logError(`Failed to clear references data: ${error.message}`);
    return false;
  }
}

function clearTagsData() {
  try {
    const tagsData = readJsonFile(TAGS_FILE);
    const tagCount = tagsData && Array.isArray(tagsData.tags) ? tagsData.tags.length : 0;
    const emptyTags = { tags: [] };
    if (!flags.dryRun) {
      writeJsonFile(TAGS_FILE, emptyTags);
      logSuccess(`Tags data cleared (${tagCount} tags deleted)`);
    } else {
      log(`Would clear tags data (${tagCount} tags)`, 'yellow');
    }
    return true;
  } catch (error) {
    logError(`Failed to clear tags data: ${error.message}`);
    return false;
  }
}

function getUserConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`${colors.red}${colors.bold}WARNING: This will permanently delete ALL references and their thumbnails!\n${colors.reset}Are you sure you want to continue? (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// API functions for deleting data
async function deleteAllReferencesViaAPI() {
  try {
    logInfo('Deleting all references via API...');
    
    // Get all references first
    const response = await fetch(`${API_BASE_URL}/api/references`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch references: ${response.statusText}`);
    }
    
    const references = await response.json();
    logInfo(`Found ${references.length} references to delete via API`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // Delete each reference via API
    for (const reference of references) {
      try {
        const deleteResponse = await fetch(`${API_BASE_URL}/api/references/${reference.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (deleteResponse.ok) {
          deletedCount++;
          log(`Deleted reference: ${reference.title}`, 'green');
        } else {
          errorCount++;
          logError(`Failed to delete reference ${reference.id}: ${deleteResponse.statusText}`);
        }
      } catch (error) {
        errorCount++;
        logError(`Error deleting reference ${reference.id}: ${error.message}`);
      }
    }
    
    return { deletedCount, errorCount, totalCount: references.length };
  } catch (error) {
    logError(`Failed to delete references via API: ${error.message}`);
    return { deletedCount: 0, errorCount: 1, totalCount: 0 };
  }
}

async function clearAllTagsViaAPI() {
  try {
    logInfo('Clearing all tags via API...');
    
    // Get all tags first
    const response = await fetch(`${API_BASE_URL}/api/tags`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tags: ${response.statusText}`);
    }
    
    const tags = await response.json();
    logInfo(`Found ${tags.length} tags to delete via API`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    // Delete each tag via API
    for (const tag of tags) {
      try {
        const deleteResponse = await fetch(`${API_BASE_URL}/api/tags/${encodeURIComponent(tag)}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (deleteResponse.ok) {
          deletedCount++;
          log(`Deleted tag: ${tag}`, 'green');
        } else {
          errorCount++;
          logError(`Failed to delete tag ${tag}: ${deleteResponse.statusText}`);
        }
      } catch (error) {
        errorCount++;
        logError(`Error deleting tag ${tag}: ${error.message}`);
      }
    }
    
    return { deletedCount, errorCount, totalCount: tags.length };
  } catch (error) {
    logError(`Failed to delete tags via API: ${error.message}`);
    return { deletedCount: 0, errorCount: 1, totalCount: 0 };
  }
}

// Main execution
async function main() {
  log(`${colors.bold}RefHub - Delete All References Script${colors.reset}`, 'magenta');
  log('================================================', 'magenta');
  
  // Check if running in dry-run mode
  if (flags.dryRun) {
    logInfo('DRY RUN MODE - No files will be actually deleted');
  }
  
  // Get credentials interactively
  logInfo('Please enter your RefHub credentials:');
  const credentials = await getCredentials();
  
  if (!credentials.username || !credentials.password) {
    logError('Username and password are required');
    process.exit(1);
  }
  
  // Authenticate
  const user = await authenticate(credentials.username, credentials.password);
  if (!user) {
    logError('Authentication failed. Please check your credentials.');
    process.exit(1);
  }
  
  if (!user.isAdmin) {
    logError('Admin privileges required to delete references.');
    process.exit(1);
  }
  
  // Read current references data
  logInfo('Reading references data...');
  const referencesData = readJsonFile(REFERENCES_FILE);
  
  if (!referencesData || !referencesData.references) {
    logError('No references data found or invalid format');
    process.exit(1);
  }
  
  const references = referencesData.references;
  const referenceCount = references.length;
  
  logInfo(`Found ${referenceCount} references to delete`);
  
  // Check for tags via API
  logInfo('Checking for tags via API...');
  const tagsResponse = await fetch(`${API_BASE_URL}/api/tags`, {
    credentials: 'include'
  });
  
  let tagCount = 0;
  if (tagsResponse.ok) {
    const tags = await tagsResponse.json();
    tagCount = tags.length;
    logInfo(`Found ${tagCount} tags to delete`);
  }
  
  if (referenceCount === 0 && tagCount === 0) {
    logInfo('No references or tags found to delete');
    process.exit(0);
  }
  
  // Show summary
  log('\nSummary:', 'bold');
  if (referenceCount > 0) {
    log(`- References to delete: ${referenceCount}`, 'yellow');
  }
  if (tagCount > 0) {
    log(`- Tags to delete: ${tagCount}`, 'yellow');
  }
  
  // Create backup if requested
  if (flags.backup && !flags.dryRun) {
    log('\nCreating backup...', 'blue');
    if (!createBackup()) {
      logError('Backup failed. Aborting deletion.');
      process.exit(1);
    }
  }
  
  // Get user confirmation
  if (!flags.confirm && !flags.dryRun) {
    log('\n', 'reset');
    const confirmed = await getUserConfirmation();
    if (!confirmed) {
      logInfo('Operation cancelled by user');
      process.exit(0);
    }
  }
  
  // Execute deletion
  log('\nExecuting deletion...', 'blue');

  if (flags.dryRun) {
    log('DRY RUN: Would delete via API calls', 'yellow');
    log(`- Would delete ${referenceCount} references via API`, 'yellow');
    log(`- Would delete all tags via API`, 'yellow');
  } else {
    // Delete references via API (this will also clean up thumbnails)
    let referenceResult = { deletedCount: 0, errorCount: 0, totalCount: 0 };
    if (referenceCount > 0) {
      referenceResult = await deleteAllReferencesViaAPI();
    }
    
    // Clear tags via API
    let tagResult = { deletedCount: 0, errorCount: 0, totalCount: 0 };
    if (tagCount > 0) {
      tagResult = await clearAllTagsViaAPI();
    }
    
    // Summary
    log('\nDeletion Summary:', 'bold');
    
    if (referenceCount > 0) {
      if (referenceResult.errorCount === 0) {
        logSuccess(`Deleted ${referenceResult.deletedCount} references via API`);
      } else {
        logWarning(`Deleted ${referenceResult.deletedCount} references via API, ${referenceResult.errorCount} errors`);
      }
    }
    
    if (tagCount > 0) {
      if (tagResult.errorCount === 0) {
        logSuccess(`Deleted ${tagResult.deletedCount} tags via API`);
      } else {
        logWarning(`Deleted ${tagResult.deletedCount} tags via API, ${tagResult.errorCount} errors`);
      }
    }
  }

  if (flags.backup && !flags.dryRun) {
    logInfo('Backup was created before deletion');
  }

  log('\nOperation completed!', 'green');
}

// Handle errors
process.on('uncaughtException', (error) => {
  logError(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError(`Unhandled rejection at ${promise}: ${reason}`);
  process.exit(1);
});

// Run the script
main().catch((error) => {
  logError(`Script failed: ${error.message}`);
  process.exit(1);
}); 