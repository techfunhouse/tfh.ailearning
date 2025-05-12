#!/usr/bin/env node
/**
 * This script analyzes an HTML file from a URL to check asset paths
 * and diagnose problems with custom domain deployments.
 */

import https from 'https';
import fs from 'fs';

const TARGET_URL = 'https://aireferencehub.techfunhouse.com/';
const OUTPUT_FILE = './analyzed-html.txt';

console.log(`🔍 Analyzing HTML from: ${TARGET_URL}`);
console.log('Please wait...');

// Function to fetch the HTML content
function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Request failed with status code ${res.statusCode}`));
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString();
        resolve(html);
      });
    }).on('error', reject);
  });
}

// Main function
async function main() {
  try {
    // Fetch the HTML
    const html = await fetchHTML(TARGET_URL);
    
    // Analyze the HTML
    let analysis = `==== HTML Analysis for ${TARGET_URL} ====\n\n`;
    
    // Check <base> tag
    const baseTagMatch = html.match(/<base[^>]*href="([^"]*)"[^>]*>/);
    analysis += "== BASE TAG ==\n";
    if (baseTagMatch) {
      analysis += `Found <base> tag with href="${baseTagMatch[1]}"\n`;
    } else {
      analysis += "No <base> tag found\n";
    }
    
    // Extract all <link> tags (CSS)
    const linkRegex = /<link[^>]*href="([^"]*)"[^>]*>/g;
    let linkMatch;
    let linkCount = 0;
    
    analysis += "\n== CSS LINKS ==\n";
    while ((linkMatch = linkRegex.exec(html)) !== null) {
      if (linkMatch[1].includes('.css')) {
        linkCount++;
        analysis += `${linkCount}. ${linkMatch[1]}\n`;
      }
    }
    if (linkCount === 0) {
      analysis += "No CSS links found\n";
    }
    
    // Extract all <script> tags
    const scriptRegex = /<script[^>]*src="([^"]*)"[^>]*>/g;
    let scriptMatch;
    let scriptCount = 0;
    
    analysis += "\n== SCRIPT TAGS ==\n";
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
      scriptCount++;
      analysis += `${scriptCount}. ${scriptMatch[1]}\n`;
    }
    if (scriptCount === 0) {
      analysis += "No script tags with src attribute found\n";
    }
    
    // Check for possible path patterns
    analysis += "\n== PATH ANALYSIS ==\n";
    const repoNameInPaths = html.includes('/ReferenceViewer/');
    analysis += `Repository name in paths: ${repoNameInPaths ? 'YES - PROBLEM DETECTED' : 'No'}\n`;
    
    if (repoNameInPaths) {
      // Count occurrences
      const matches = html.match(/\/ReferenceViewer\//g);
      analysis += `Found ${matches ? matches.length : 0} occurrences of '/ReferenceViewer/' in the HTML\n`;
      
      // Sample a few for context
      const contextRegex = /([^"']{0,30})\/ReferenceViewer\/([^"']{0,30})/g;
      let contextMatch;
      let contextCount = 0;
      
      analysis += "\n== SAMPLE CONTEXTS ==\n";
      while ((contextMatch = contextRegex.exec(html)) !== null && contextCount < 5) {
        contextCount++;
        analysis += `${contextCount}. ...${contextMatch[1]}/ReferenceViewer/${contextMatch[2]}...\n`;
      }
    }
    
    // Add the HTML content for reference
    analysis += "\n\n==== FULL HTML CONTENT ====\n\n";
    analysis += html;
    
    // Save the analysis to a file
    fs.writeFileSync(OUTPUT_FILE, analysis);
    
    console.log(`✅ Analysis complete and saved to ${OUTPUT_FILE}`);
    console.log(`Repository name in paths: ${repoNameInPaths ? '⚠️ YES - PROBLEM DETECTED' : '✅ No - Paths look good'}`);
    
    if (repoNameInPaths) {
      console.log('\nPROBLEM DETECTED: The HTML still contains references to /ReferenceViewer/ in paths');
      console.log('This is likely causing the 404 errors for CSS and JS files.');
      console.log('\nPlease check the generated file for more details.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();