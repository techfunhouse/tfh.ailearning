#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// CSV parsing function
function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
  }
  
  return rows;
}

// Authentication function
async function authenticate(baseUrl, username, password) {
  const response = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const cookies = response.headers.get('set-cookie');
  return cookies;
}

// Get existing references
async function getExistingReferences(baseUrl, cookies) {
  const response = await fetch(`${baseUrl}/api/references`, {
    headers: {
      Cookie: cookies,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch references: ${response.status}`);
  }

  return await response.json();
}

// Get existing categories and tags
async function getExistingData(baseUrl, cookies) {
  const [categoriesRes, tagsRes] = await Promise.all([
    fetch(`${baseUrl}/api/categories`, { headers: { Cookie: cookies } }),
    fetch(`${baseUrl}/api/tags`, { headers: { Cookie: cookies } })
  ]);

  const categories = await categoriesRes.json();
  const tags = await tagsRes.json();

  return { categories, tags };
}

// Create new reference
async function createReference(baseUrl, cookies, referenceData) {
  const response = await fetch(`${baseUrl}/api/references`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify(referenceData),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create reference: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Create new tag
async function createTag(baseUrl, cookies, tagName) {
  const response = await fetch(`${baseUrl}/api/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookies,
    },
    body: JSON.stringify({ name: tagName }),
  });

  if (!response.ok) {
    console.warn(`Failed to create tag "${tagName}": ${response.status}`);
    return null;
  }

  return await response.json();
}

// Validate URL format
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// Normalize URL
function normalizeUrl(url) {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url.replace(/\/+$/, ''); // Remove trailing slashes
}

// Main import function
async function importReferences(csvFilePath, baseUrl = 'http://localhost:5000') {
  console.log('Starting CSV import process...\n');

  // Read CSV file
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('No valid rows found in CSV file');
    process.exit(1);
  }

  console.log(`Found ${rows.length} references to import`);

  // Get credentials
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const username = await new Promise(resolve => {
    rl.question('Username: ', resolve);
  });

  const password = await new Promise(resolve => {
    rl.question('Password: ', (input) => {
      console.log(''); // Add newline after password
      resolve(input);
    });
  });

  rl.close();

  try {
    // Authenticate
    console.log('Authenticating...');
    const cookies = await authenticate(baseUrl, username, password);

    // Get existing data
    console.log('Fetching existing data...');
    const existingReferences = await getExistingReferences(baseUrl, cookies);
    const { categories, tags } = await getExistingData(baseUrl, cookies);

    const existingUrls = new Set(existingReferences.map(ref => ref.link));
    const existingTagNames = new Set(tags.map(tag => tag.name));
    const existingCategoryNames = new Set(categories.map(cat => cat.name));

    // Process imports
    console.log('\nProcessing imports...\n');
    
    const results = {
      successful: 0,
      skipped: 0,
      failed: 0,
      newTags: [],
      errors: []
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const progress = `[${i + 1}/${rows.length}]`;
      
      try {
        // Validate required fields
        if (!row.title || !row.link) {
          console.log(`${progress} FAILED (missing data):`);
          console.log(`   Title: ${row.title || 'MISSING'}`);
          console.log(`   URL: ${row.link || 'MISSING'}`);
          console.log('');
          results.failed++;
          results.errors.push(`Row ${i + 1}: Missing title or link`);
          continue;
        }

        // Normalize and validate URL
        const normalizedUrl = normalizeUrl(row.link);
        if (!isValidUrl(normalizedUrl)) {
          console.log(`${progress} FAILED (invalid URL):`);
          console.log(`   Title: ${row.title}`);
          console.log(`   URL: ${row.link} -> ${normalizedUrl}`);
          console.log('');
          results.failed++;
          results.errors.push(`Row ${i + 1}: Invalid URL format`);
          continue;
        }

        // Check for duplicates
        if (existingUrls.has(normalizedUrl)) {
          console.log(`${progress} SKIPPED (duplicate):`);
          console.log(`   Title: ${row.title}`);
          console.log(`   URL: ${normalizedUrl}`);
          console.log(`   Tags: ${row.tags || 'none'}`);
          console.log('');
          results.skipped++;
          continue;
        }

        // Validate category
        if (row.category && !existingCategoryNames.has(row.category)) {
          console.log(`${progress} Unknown category: ${row.category} (will use default)`);
          row.category = categories[0]?.name || 'General';
        }

        // Process tags
        const rowTags = row.tags ? row.tags.split(';').map(tag => tag.trim()).filter(Boolean) : [];
        const validTags = [];

        for (const tagName of rowTags) {
          if (!existingTagNames.has(tagName)) {
            // Create new tag
            const newTag = await createTag(baseUrl, cookies, tagName);
            if (newTag) {
              existingTagNames.add(tagName);
              results.newTags.push(tagName);
              console.log(`${progress} NEW TAG CREATED: "${tagName}"`);
            }
          }
          validTags.push(tagName);
        }

        // Create reference
        const referenceData = {
          title: row.title,
          link: normalizedUrl,
          description: row.description || '',
          category: row.category || categories[0]?.name || 'General',
          tags: validTags
        };

        const newReference = await createReference(baseUrl, cookies, referenceData);
        console.log(`${progress} CREATED:`);
        console.log(`   Title: ${row.title}`);
        console.log(`   URL: ${normalizedUrl}`);
        console.log(`   Category: ${referenceData.category}`);
        console.log(`   Tags: ${validTags.length > 0 ? validTags.join(', ') : 'none'}`);
        console.log(`   Thumbnail: Generating screenshot...`);
        console.log('');
        
        existingUrls.add(normalizedUrl);
        results.successful++;

        // Small delay to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`${progress} FAILED (error):`);
        console.log(`   Title: ${row.title}`);
        console.log(`   URL: ${row.link}`);
        console.log(`   Error: ${error.message}`);
        console.log('');
        results.failed++;
        results.errors.push(`Row ${i + 1} (${row.title}): ${error.message}`);
      }
    }

    // Print summary
    console.log('\nImport Summary:');
    console.log(`Successful: ${results.successful}`);
    console.log(`Skipped (duplicates): ${results.skipped}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.newTags.length > 0) {
      console.log(`New tags created: ${results.newTags.join(', ')}`);
    }

    if (results.errors.length > 0) {
      console.log('\nErrors:');
      results.errors.forEach(error => console.log(`   ${error}`));
    }

    console.log('\nImport process completed!');
    
  } catch (error) {
    console.error(`Import failed: ${error.message}`);
    process.exit(1);
  }
}

// CLI handling
if (require.main === module) {
  const csvFile = process.argv[2];
  const baseUrl = process.argv[3] || 'http://localhost:5000';

  if (!csvFile) {
    console.log('Usage: node import-references.js <csv-file> [base-url]');
    console.log('Example: node import-references.js references.csv');
    console.log('Example: node import-references.js references.csv http://localhost:5000');
    process.exit(1);
  }

  importReferences(csvFile, baseUrl);
}

module.exports = { importReferences };