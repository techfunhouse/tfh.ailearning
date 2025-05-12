/**
 * Export Static Data for GitHub Pages
 * 
 * This script exports data from the lowdb JSON database to static JSON files
 * that can be served by GitHub Pages.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DATA_DIR = path.join(__dirname, 'public', 'data');
const DIST_DATA_DIR = path.join(__dirname, 'dist', 'public', 'data');
const DEPLOY_DATA_DIR = path.join(__dirname, 'gh-pages-deploy', 'data');

// Ensure the directories exist
[PUBLIC_DATA_DIR, DIST_DATA_DIR, DEPLOY_DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// List of data files to export
const dataFiles = [
  { source: 'references.json', target: 'references.json' },
  { source: 'categories.json', target: 'categories.json' },
  { source: 'tags.json', target: 'tags.json' },
  // Add any other data files as needed
];

// Copy files from data directory to public and dist directories
console.log('Exporting static data for GitHub Pages...');

dataFiles.forEach(file => {
  const sourcePath = path.join(DATA_DIR, file.source);
  
  if (fs.existsSync(sourcePath)) {
    try {
      // Read the source file
      const data = fs.readFileSync(sourcePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      // Extract just the data arrays (remove the lowdb wrapper)
      let exportData;
      if (file.source === 'references.json') {
        exportData = jsonData.references || [];
      } else if (file.source === 'categories.json') {
        exportData = jsonData.categories || [];
      } else if (file.source === 'tags.json') {
        exportData = jsonData.tags || [];
      } else {
        // Default handling for other files
        exportData = jsonData;
      }
      
      // Write to public directory
      fs.writeFileSync(
        path.join(PUBLIC_DATA_DIR, file.target), 
        JSON.stringify(exportData, null, 2)
      );
      console.log(`✅ Exported ${file.source} to public/data/${file.target}`);
      
      // Write to dist directory if it exists
      if (fs.existsSync(DIST_DATA_DIR)) {
        fs.writeFileSync(
          path.join(DIST_DATA_DIR, file.target), 
          JSON.stringify(exportData, null, 2)
        );
        console.log(`✅ Exported ${file.source} to dist/public/data/${file.target}`);
      }
      
      // Write to deployment directory if it exists
      if (fs.existsSync(DEPLOY_DATA_DIR)) {
        fs.writeFileSync(
          path.join(DEPLOY_DATA_DIR, file.target), 
          JSON.stringify(exportData, null, 2)
        );
        console.log(`✅ Exported ${file.source} to gh-pages-deploy/data/${file.target}`);
      }
    } catch (error) {
      console.error(`❌ Error exporting ${file.source}:`, error.message);
    }
  } else {
    console.warn(`⚠️ Source file not found: ${sourcePath}`);
  }
});

console.log('Static data export complete!');