/**
 * Fix JSON files for deployment
 * 
 * This script properly extracts the arrays from lowdb-formatted JSON files
 * and saves them in the format expected by the deployed application.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const SOURCE_DIR = path.join(__dirname, 'data');
const TARGET_DIR = path.join(__dirname, 'deploy', 'data');

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

// Files to process
const files = [
  { filename: 'references.json', key: 'references' },
  { filename: 'categories.json', key: 'categories' },
  { filename: 'tags.json', key: 'tags' }
];

console.log('Processing JSON files for deployment...');

// Process each file
files.forEach(({ filename, key }) => {
  const sourcePath = path.join(SOURCE_DIR, filename);
  const targetPath = path.join(TARGET_DIR, filename);
  
  if (fs.existsSync(sourcePath)) {
    try {
      // Read source file
      const fileContent = fs.readFileSync(sourcePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      // Extract the array from the lowdb structure
      const arrayData = jsonData[key] || [];
      
      // Write the extracted array to the target file
      fs.writeFileSync(targetPath, JSON.stringify(arrayData, null, 2));
      
      console.log(`✓ Processed ${filename} successfully`);
    } catch (error) {
      console.error(`✗ Error processing ${filename}: ${error.message}`);
    }
  } else {
    console.warn(`⚠ Source file not found: ${sourcePath}`);
  }
});

console.log('JSON processing complete!');

// Also create a basic sample data set if the files don't exist
if (!fs.existsSync(path.join(TARGET_DIR, 'references.json'))) {
  console.log('Creating sample data files as fallback...');
  
  // Sample references
  const sampleReferences = [
    {
      id: "sample-1",
      title: "Sample Reference",
      link: "https://example.com",
      description: "This is a sample reference",
      category: "Sample",
      tags: ["sample", "example"],
      thumbnail: "https://images.unsplash.com/photo-1590479773265-7464e5d48118",
      loveCount: 5,
      createdBy: "system",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
  
  // Sample categories
  const sampleCategories = [
    {
      id: "sample-cat",
      name: "Sample"
    }
  ];
  
  // Sample tags
  const sampleTags = [
    {
      id: "sample-tag-1",
      name: "sample"
    },
    {
      id: "sample-tag-2", 
      name: "example"
    }
  ];
  
  // Write sample files
  fs.writeFileSync(path.join(TARGET_DIR, 'references.json'), JSON.stringify(sampleReferences, null, 2));
  fs.writeFileSync(path.join(TARGET_DIR, 'categories.json'), JSON.stringify(sampleCategories, null, 2));
  fs.writeFileSync(path.join(TARGET_DIR, 'tags.json'), JSON.stringify(sampleTags, null, 2));
  
  console.log('Sample data files created successfully');
}

// Create a copy of these files in the public directory for development
const PUBLIC_DATA_DIR = path.join(__dirname, 'public', 'data');
if (!fs.existsSync(PUBLIC_DATA_DIR)) {
  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
}

// Copy files from deploy/data to public/data
fs.readdirSync(TARGET_DIR).forEach(file => {
  fs.copyFileSync(
    path.join(TARGET_DIR, file),
    path.join(PUBLIC_DATA_DIR, file)
  );
});

console.log('Files also copied to public/data directory for development');