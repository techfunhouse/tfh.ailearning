#!/usr/bin/env node

/**
 * RefHub - Create Reference from URL Script
 * 
 * This script analyzes webpage URLs and automatically creates reference entries
 * by extracting content, determining categories and tags, and calling the API.
 * 
 * Usage:
 *   node scripts/create-reference-from-url.js <URL> [options]
 *   node scripts/create-reference-from-url.js --file <filepath> [options]
 *   node scripts/create-reference-from-url.js --csv <csvfile> [options]
 * 
 * Examples:
 *   node scripts/create-reference-from-url.js https://example.com
 *   node scripts/create-reference-from-url.js --file urls.txt
 *   node scripts/create-reference-from-url.js --csv references.csv
 *   node scripts/create-reference-from-url.js --csv references.csv --category "Programming"
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
const CATEGORIES_FILE = path.join(DATA_DIR, 'categories.json');
const TAGS_FILE = path.join(DATA_DIR, 'tags.json');

// Processing configuration
const PROCESSING_DELAY = parseInt(process.env.PROCESSING_DELAY) || 3000; // 3 seconds between items
const THUMBNAIL_WAIT_TIME = 30000; // 30 seconds max wait for thumbnail
const THUMBNAIL_CHECK_INTERVAL = 2000; // Check every 2 seconds

// Parse command line arguments
const args = process.argv.slice(2);

// Parse flags
const flags = {};
let url = null;
let filePath = null;
let csvFilePath = null;
let processingDelay = PROCESSING_DELAY;

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    if (args[i] === '--file' && args[i + 1]) {
      filePath = args[i + 1];
      i++; // Skip next argument
    } else if (args[i] === '--csv' && args[i + 1]) {
      csvFilePath = args[i + 1];
      i++; // Skip next argument
    } else if (args[i] === '--delay' && args[i + 1]) {
      processingDelay = parseInt(args[i + 1]) * 1000; // Convert seconds to milliseconds
      i++; // Skip next argument
    } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
      flags[args[i].slice(2)] = args[i + 1];
      i++; // Skip next argument
    }
  } else if (!url && !filePath && !csvFilePath) {
    // First non-flag argument is treated as URL
    url = args[i];
  }
}

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

// Utility functions
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    logError(`Failed to read ${filePath}: ${error.message}`);
    return null;
  }
}

function readUrlFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const urls = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')) // Skip empty lines and comments
      .filter(line => {
        try {
          new URL(line);
          return true;
        } catch {
          logWarning(`Skipping invalid URL: ${line}`);
          return false;
        }
      });
    
    return urls;
  } catch (error) {
    logError(`Failed to read URL file: ${error.message}`);
    return null;
  }
}

function readCsvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    // Parse header
    const headerLine = lines[0];
    const headers = parseCsvLine(headerLine);
    
    // Validate headers
    const expectedHeaders = ['URL', 'Page Title', 'Description', 'Tags'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
    }
    
    // Parse data rows
    const references = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.startsWith('#')) continue; // Skip empty lines and comments
      
      try {
        const values = parseCsvLine(line);
        if (values.length < 4) {
          logWarning(`Skipping line ${i + 1}: insufficient columns`);
          continue;
        }
        
        const [url, title, description, tags] = values;
        
        // Validate URL
        try {
          new URL(url);
        } catch {
          logWarning(`Skipping line ${i + 1}: invalid URL "${url}"`);
          continue;
        }
        
        // Parse tags
        const tagArray = tags.split(',').map(t => t.trim()).filter(t => t);
        
        references.push({
          url: url.trim(),
          title: cleanTitle(title.trim()),
          description: cleanTitle(description.trim()),
          tags: tagArray
        });
      } catch (error) {
        logWarning(`Skipping line ${i + 1}: ${error.message}`);
      }
    }
    
    return references;
  } catch (error) {
    logError(`Failed to read CSV file: ${error.message}`);
    return null;
  }
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  values.push(current);
  
  return values;
}

function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return 'unknown';
  }
}

function extractKeywords(text) {
  // Remove HTML tags and normalize
  const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
  
  // Common stop words to exclude
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'his', 'hers', 'ours', 'theirs'
  ]);
  
  // Extract words and filter
  const words = cleanText.match(/\b[a-z]{3,}\b/g) || [];
  const wordCount = {};
  
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

function categorizeByKeywords(keywords, domain, existingCategories) {
  // Enhanced keyword mappings with weighted importance
  const categoryKeywords = {
    'Video Learning': {
      primary: ['video', 'youtube', 'lecture', 'course', 'tutorial', 'class', 'lesson', 'training', 'education'],
      secondary: ['learning', 'teaching', 'instruction', 'demo', 'presentation', 'webinar'],
      domains: ['youtube.com', 'vimeo.com', 'ted.com', 'khanacademy.org', 'udemy.com', 'coursera.org', 'edx.org', 'pluralsight.com'],
      weight: 1.0
    },
    'Tutorials': {
      primary: ['tutorial', 'guide', 'how-to', 'step-by-step', 'walkthrough', 'example', 'demo', 'lesson', 'instruction'],
      secondary: ['manual', 'documentation', 'guide', 'tips', 'tricks', 'best-practices'],
      domains: ['css-tricks.com', 'developer.mozilla.org', 'w3schools.com', 'tutorialspoint.com'],
      weight: 1.0
    },
    'Online Learning': {
      primary: ['course', 'learning', 'education', 'training', 'class', 'lesson', 'academy', 'school', 'university', 'college', 'institute'],
      secondary: ['platform', 'program', 'curriculum', 'syllabus', 'certificate', 'degree'],
      domains: ['coursera.org', 'edx.org', 'udemy.com', 'pluralsight.com', 'freecodecamp.org', 'khanacademy.org', 'mit.edu', 'stanford.edu', 'harvard.edu'],
      weight: 1.0
    },
    'Communities': {
      primary: ['community', 'forum', 'discussion', 'group', 'chat', 'social', 'network', 'meetup'],
      secondary: ['slack', 'discord', 'reddit', 'stackoverflow', 'github', 'gitlab', 'bitbucket'],
      domains: ['github.com', 'stackoverflow.com', 'reddit.com', 'discord.com', 'slack.com', 'meetup.com'],
      weight: 1.0
    },
    'Research Portals': {
      primary: ['research', 'paper', 'study', 'analysis', 'academic', 'journal', 'publication', 'conference', 'proceedings'],
      secondary: ['arxiv', 'scholar', 'science', 'methodology', 'experiment', 'survey'],
      domains: ['arxiv.org', 'scholar.google.com', 'researchgate.net', 'ieee.org', 'acm.org', 'springer.com', 'sciencedirect.com'],
      weight: 1.2
    },
    'Academic Papers': {
      primary: ['paper', 'research', 'academic', 'journal', 'publication', 'conference', 'proceedings', 'thesis', 'dissertation'],
      secondary: ['arxiv', 'scholar', 'science', 'study', 'analysis', 'methodology'],
      domains: ['arxiv.org', 'scholar.google.com', 'researchgate.net', 'ieee.org', 'acm.org', 'springer.com', 'sciencedirect.com'],
      weight: 1.2
    },
    'Workshops': {
      primary: ['workshop', 'training', 'session', 'event', 'conference', 'meetup', 'hackathon', 'bootcamp', 'seminar'],
      secondary: ['webinar', 'summit', 'symposium', 'colloquium', 'panel', 'roundtable'],
      domains: ['meetup.com', 'eventbrite.com', 'conference.com'],
      weight: 1.0
    },
    'Podcasts': {
      primary: ['podcast', 'audio', 'episode', 'show', 'broadcast', 'radio', 'interview', 'discussion', 'conversation'],
      secondary: ['streaming', 'audio', 'voice', 'talk', 'speech'],
      domains: ['spotify.com', 'apple.com', 'google.com', 'anchor.fm', 'libsyn.com'],
      weight: 1.0
    },
    'General': {
      primary: ['general', 'misc', 'other', 'various', 'mixed'],
      secondary: [],
      domains: [],
      weight: 0.5
    }
  };
  
  // Score each existing category based on keyword matches and domain
  const scores = {};
  
  existingCategories.forEach(category => {
    const categoryConfig = categoryKeywords[category.name];
    if (!categoryConfig) {
      scores[category.name] = 0;
      return;
    }
    
    let score = 0;
    
    // Check primary keywords (higher weight)
    keywords.forEach(keyword => {
      if (categoryConfig.primary.includes(keyword)) {
        score += 3 * categoryConfig.weight;
      }
    });
    
    // Check secondary keywords (lower weight)
    keywords.forEach(keyword => {
      if (categoryConfig.secondary.includes(keyword)) {
        score += 1 * categoryConfig.weight;
      }
    });
    
    // Domain-specific scoring (highest weight)
    if (categoryConfig.domains.some(domainPattern => domain.includes(domainPattern))) {
      score += 5 * categoryConfig.weight;
    }
    
    // Special domain patterns
    if (domain.includes('youtube') && category.name === 'Video Learning') {
      score += 4;
    }
    if (domain.includes('github') && category.name === 'Communities') {
      score += 4;
    }
    if (domain.includes('stackoverflow') && category.name === 'Communities') {
      score += 4;
    }
    if (domain.includes('arxiv') && (category.name === 'Academic Papers' || category.name === 'Research Portals')) {
      score += 4;
    }
    if (domain.includes('scholar') && (category.name === 'Academic Papers' || category.name === 'Research Portals')) {
      score += 4;
    }
    if ((domain.includes('udemy') || domain.includes('coursera') || domain.includes('edx')) && 
        (category.name === 'Video Learning' || category.name === 'Online Learning')) {
      score += 4;
    }
    if (domain.includes('stanford') || domain.includes('mit') || domain.includes('harvard')) {
      if (category.name === 'Academic Papers' || category.name === 'Research Portals') {
        score += 3;
      }
    }
    
    scores[category.name] = score;
  });
  
  // Find the category with the highest score
  const sortedCategories = Object.entries(scores)
    .sort(([,a], [,b]) => b - a);
  
  const bestCategory = sortedCategories[0];
  const secondBestCategory = sortedCategories[1];
  
  // Return the best matching category if score is significant
  if (bestCategory && bestCategory[1] >= 3) {
    return bestCategory[0];
  }
  
  // If scores are close, prefer more specific categories
  if (bestCategory && secondBestCategory && 
      bestCategory[1] > 0 && 
      (bestCategory[1] - secondBestCategory[1]) < 2) {
    
    // Prefer more specific categories over General
    if (bestCategory[0] === 'General' && secondBestCategory[1] > 0) {
      return secondBestCategory[0];
    }
    if (secondBestCategory[0] === 'General' && bestCategory[1] > 0) {
      return bestCategory[0];
    }
  }
  
  // Return the best category if it has any score, otherwise default to General
  return bestCategory && bestCategory[1] > 0 ? bestCategory[0] : 'General';
}

function generateTags(keywords, domain, title) {
  const allText = `${title} ${domain} ${keywords.join(' ')}`.toLowerCase();
  const tagCandidates = new Set();
  
  // High-priority tech tags (most relevant)
  const priorityTechTags = [
    'ai', 'ml', 'machine-learning', 'artificial-intelligence', 'data-science', 'python', 'javascript', 
    'react', 'node', 'typescript', 'aws', 'docker', 'git', 'github', 'design', 'ui', 'ux',
    'frontend', 'backend', 'fullstack', 'devops', 'security', 'database', 'api', 'cloud'
  ];
  
  // Medium-priority tech tags
  const mediumTechTags = [
    'vue', 'angular', 'html', 'css', 'mobile', 'web', 'analytics', 'productivity', 
    'tools', 'framework', 'library', 'tutorial', 'guide', 'course', 'learning'
  ];
  
  // Domain-specific tag mappings
  const domainTags = {
    'github.com': 'github',
    'stackoverflow.com': 'stackoverflow',
    'medium.com': 'medium',
    'dev.to': 'dev.to',
    'css-tricks.com': 'css',
    'developer.mozilla.org': 'documentation',
    'coursera.org': 'course',
    'edx.org': 'course',
    'udemy.com': 'course',
    'pluralsight.com': 'course',
    'freecodecamp.org': 'course',
    'khanacademy.org': 'course',
    'youtube.com': 'video',
    'vimeo.com': 'video',
    'ted.com': 'video',
    'arxiv.org': 'research',
    'scholar.google.com': 'research',
    'researchgate.net': 'research',
    'ieee.org': 'research',
    'acm.org': 'research'
  };
  
  // Add domain-specific tag first (highest priority)
  const domainTag = domainTags[domain] || null;
  if (domainTag) {
    tagCandidates.add(domainTag);
  }
  
  // Add priority tech tags that match content
  priorityTechTags.forEach(tag => {
    if (allText.includes(tag.replace('-', ' ')) || allText.includes(tag)) {
      tagCandidates.add(tag);
    }
  });
  
  // Add medium priority tags if we still have room
  if (tagCandidates.size < 3) {
    mediumTechTags.forEach(tag => {
      if (allText.includes(tag.replace('-', ' ')) || allText.includes(tag)) {
        tagCandidates.add(tag);
      }
    });
  }
  
  // Add top 1-2 most relevant keywords as tags (only if they're meaningful)
  const meaningfulKeywords = keywords
    .filter(keyword => keyword.length > 3 && keyword.length < 15) // Avoid very short or very long keywords
    .filter(keyword => !['null', 'undefined', 'function', 'return', 'object', 'array', 'string', 'number'].includes(keyword)) // Filter out common programming terms
    .slice(0, 2);
  
  meaningfulKeywords.forEach(keyword => {
    if (tagCandidates.size < 5) { // Only add if we haven't reached the limit
      tagCandidates.add(keyword);
    }
  });
  
  // Convert to array and limit to 5 tags maximum
  const finalTags = Array.from(tagCandidates).slice(0, 5);
  
  // Ensure we have at least 2 tags if possible
  if (finalTags.length < 2 && keywords.length > 0) {
    const fallbackKeyword = keywords.find(k => k.length > 3 && k.length < 15);
    if (fallbackKeyword && !finalTags.includes(fallbackKeyword)) {
      finalTags.push(fallbackKeyword);
    }
  }
  
  return finalTags;
}

async function scrapeWebpage(url) {
  try {
    logInfo(`Fetching content from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      // Provide specific error messages for common HTTP status codes
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      switch (response.status) {
        case 404:
          errorMessage = `Page not found (404): The URL "${url}" does not exist or has been moved.`;
          break;
        case 403:
          errorMessage = `Access forbidden (403): The server is blocking access to "${url}".`;
          break;
        case 401:
          errorMessage = `Unauthorized (401): Authentication required to access "${url}".`;
          break;
        case 500:
          errorMessage = `Server error (500): The server encountered an error while processing "${url}".`;
          break;
        case 503:
          errorMessage = `Service unavailable (503): The server is temporarily unavailable for "${url}".`;
          break;
        default:
          errorMessage = `HTTP ${response.status}: ${response.statusText} - Failed to access "${url}".`;
      }
      
      throw new Error(errorMessage);
    }
    
    const html = await response.text();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Untitled';
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const description = descMatch ? descMatch[1].trim() : '';
    
    // Extract content from body
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    
    // Extract keywords from content
    const keywords = extractKeywords(bodyContent);
    
    return {
      title,
      description,
      keywords,
      html
    };
  } catch (error) {
    // Provide more context for different types of errors
    if (error.message.includes('HTTP')) {
      logError(error.message);
    } else if (error.code === 'ENOTFOUND') {
      logError(`Domain not found: Unable to resolve the domain for "${url}". Please check the URL.`);
    } else if (error.code === 'ECONNREFUSED') {
      logError(`Connection refused: Unable to connect to "${url}". The server may be down.`);
    } else if (error.code === 'ETIMEDOUT') {
      logError(`Connection timeout: The request to "${url}" timed out. Please try again later.`);
    } else {
      logError(`Failed to scrape "${url}": ${error.message}`);
    }
    return null;
  }
}

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

async function createReference(referenceData) {
  try {
    logInfo('Creating reference via API...');
    
    const response = await fetch(`${API_BASE_URL}/api/references`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(referenceData),
      credentials: 'include' // Important for session cookies
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    logError(`Failed to create reference: ${error.message}`);
    return null;
  }
}

async function waitForThumbnail(referenceId, maxWaitTime = THUMBNAIL_WAIT_TIME) {
  const startTime = Date.now();
  const checkInterval = THUMBNAIL_CHECK_INTERVAL; // Check every 2 seconds
  
  logInfo('Waiting for thumbnail generation to complete...');
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/references/${referenceId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const reference = await response.json();
        if (reference.thumbnail && reference.thumbnail !== 'pending') {
          logSuccess('Thumbnail generation completed successfully');
          return true;
        }
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    } catch (error) {
      logWarning(`Error checking thumbnail status: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }
  
  logWarning('Thumbnail generation timeout - proceeding anyway');
  return false;
}

function getUserConfirmation(url, title, category, tags) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    log('\nReference Preview:', 'bold');
    log(`URL: ${url}`, 'cyan');
    log(`Title: ${title}`, 'cyan');
    log(`Category: ${category}`, 'cyan');
    log(`Tags: ${tags.join(', ')}`, 'cyan');
    
    rl.question('\nCreate this reference? (yes/no/edit/skip): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

function editReference() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const reference = {};
    
    rl.question('Title: ', (title) => {
      reference.title = title;
      rl.question('Category: ', (category) => {
        reference.category = category;
        rl.question('Tags (comma-separated): ', (tags) => {
          reference.tags = tags.split(',').map(t => t.trim()).filter(t => t);
          rl.close();
          resolve(reference);
        });
      });
    });
  });
}

async function processUrl(url, user, categories, existingTags, flags) {
  log(`\n${colors.bold}Processing: ${url}${colors.reset}`, 'magenta');
  
  // Scrape webpage
  const scrapedData = await scrapeWebpage(url);
  if (!scrapedData) {
    logWarning(`Skipping "${url}" due to scraping failure. Moving to next URL...`);
    return false;
  }
  
  // Extract domain
  const domain = extractDomain(url);
  
  // Determine category
  let category = flags.category;
  if (!category) {
    category = categorizeByKeywords(scrapedData.keywords, domain, categories);
    logInfo(`Auto-detected category: ${category}`);
  }
  
  // Generate tags
  let tags = flags.tags ? flags.tags.split(',').map(t => t.trim()) : [];
  if (tags.length === 0) {
    tags = generateTags(scrapedData.keywords, domain, scrapedData.title);
    logInfo(`Auto-generated tags: ${tags.join(', ')}`);
  }
  
  // Use custom title or scraped title
  const title = cleanTitle(flags.title || scrapedData.title);
  const description = cleanTitle(scrapedData.description || `Content from ${domain}`);
  
  // Create reference data
  const referenceData = {
    title,
    link: url,
    description,
    category: category.toLowerCase(),
    tags
  };
    
  // Create the reference
  const result = await createReference(referenceData);
  
  if (result) {
    logSuccess('Reference created successfully!');
    log(`ID: ${result.id}`, 'cyan');
    log(`Title: ${result.title}`, 'cyan');
    log(`Category: ${result.category}`, 'cyan');
    log(`Tags: ${result.tags.join(', ')}`, 'cyan');
    
    if (result.thumbnail) {
      logInfo('Thumbnail generation triggered automatically');
      // Wait for thumbnail generation to complete
      await waitForThumbnail(result.id);
    }
    return true;
  } else {
    logError('Failed to create reference');
    return false;
  }
}

async function processCsvReference(referenceData, user, categories, existingTags, flags) {
  log(`\n${colors.bold}Processing CSV Reference: ${referenceData.url}${colors.reset}`, 'magenta');
  
  // Extract domain
  const domain = extractDomain(referenceData.url);
  
  // Determine category
  let category = flags.category;
  if (!category) {
    // Use keywords from title and description for categorization
    const keywords = extractKeywords(`${referenceData.title} ${referenceData.description}`);
    category = categorizeByKeywords(keywords, domain, categories);
    logInfo(`Auto-detected category: ${category}`);
  }
  
  // Use provided tags or generate new ones
  let tags = referenceData.tags;
  if (tags.length === 0) {
    const keywords = extractKeywords(`${referenceData.title} ${referenceData.description}`);
    tags = generateTags(keywords, domain, referenceData.title);
    logInfo(`Auto-generated tags: ${tags.join(', ')}`);
  }
  
  // Create reference data
  const apiReferenceData = {
    title: referenceData.title,
    link: referenceData.url,
    description: referenceData.description,
    category: category.toLowerCase(),
    tags
  };
    
  // Create the reference
  const result = await createReference(apiReferenceData);
  
  if (result) {
    logSuccess('Reference created successfully!');
    log(`ID: ${result.id}`, 'cyan');
    log(`Title: ${result.title}`, 'cyan');
    log(`Category: ${result.category}`, 'cyan');
    log(`Tags: ${result.tags.join(', ')}`, 'cyan');
    
    if (result.thumbnail) {
      logInfo('Thumbnail generation triggered automatically');
      // Wait for thumbnail generation to complete
      await waitForThumbnail(result.id);
    }
    return true;
  } else {
    logError('Failed to create reference');
    return false;
  }
}

// Main execution
async function main() {
  log(`${colors.bold}RefHub - Create Reference from URL${colors.reset}`, 'magenta');
  log('============================================', 'magenta');
  
  // Validate input
  if (!url && !filePath && !csvFilePath) {
    logError('Please provide either a URL, a file path, or a CSV file');
    log('Usage: node scripts/create-reference-from-url.js <URL> [options]', 'yellow');
    log('Usage: node scripts/create-reference-from-url.js --file <filepath> [options]', 'yellow');
    log('Usage: node scripts/create-reference-from-url.js --csv <csvfile> [options]', 'yellow');
    log('Options:', 'yellow');
    log('  --delay <seconds>    Delay between processing items (default: 3)', 'yellow');
    log('  --category <name>    Override auto-detected category', 'yellow');
    log('  --tags <tags>        Override auto-generated tags (comma-separated)', 'yellow');
    log('  --title <title>      Override scraped title', 'yellow');
    log('  --dry-run           Preview without creating references', 'yellow');
    process.exit(1);
  }
  
  if (url) {
    try {
      new URL(url);
    } catch (error) {
      logError('Invalid URL provided');
      process.exit(1);
    }
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
    logError('Admin privileges required to create references.');
    process.exit(1);
  }
  
  // Load existing categories and tags
  const categoriesData = readJsonFile(CATEGORIES_FILE);
  const tagsData = readJsonFile(TAGS_FILE);
  
  const categories = categoriesData?.categories || [];
  const existingTags = tagsData?.tags || [];
  
  logInfo(`Loaded ${categories.length} categories and ${existingTags.length} tags`);
  
  // Show processing configuration
  logInfo(`Processing configuration:`);
  logInfo(`  - Delay between items: ${processingDelay/1000} seconds`);
  logInfo(`  - Thumbnail wait time: ${THUMBNAIL_WAIT_TIME/1000} seconds`);
  logInfo(`  - Thumbnail check interval: ${THUMBNAIL_CHECK_INTERVAL/1000} seconds`);
  
  // Process URLs
  let urls = [];
  let csvReferences = [];
  
  if (filePath) {
    urls = readUrlFile(filePath);
    if (!urls || urls.length === 0) {
      logError('No valid URLs found in file');
      process.exit(1);
    }
    logInfo(`Found ${urls.length} URLs to process`);
  } else if (csvFilePath) {
    csvReferences = readCsvFile(csvFilePath);
    if (!csvReferences || csvReferences.length === 0) {
      logError('No valid references found in CSV file');
      process.exit(1);
    }
    logInfo(`Found ${csvReferences.length} references to process from CSV`);
  } else {
    urls = [url];
  }
  
  // Process each URL or CSV reference sequentially
  let successCount = 0;
  let failureCount = 0;
  let failedItems = [];
  
  if (csvReferences.length > 0) {
    // Process CSV references
    for (let i = 0; i < csvReferences.length; i++) {
      const currentReference = csvReferences[i];
      log(`\n${colors.bold}Progress: ${i + 1}/${csvReferences.length}${colors.reset}`, 'blue');
      
      const result = await processCsvReference(currentReference, user, categories, existingTags, flags);
      
      if (result === null) {
        logInfo('Processing stopped by user');
        break;
      } else if (result === true) {
        successCount++;
      } else {
        failureCount++;
        failedItems.push(currentReference.url);
      }
      
      // Add a longer delay between requests to prevent server overload
      if (i < csvReferences.length - 1) {
        logInfo(`Waiting ${processingDelay/1000} seconds before processing next item...`);
        await new Promise(resolve => setTimeout(resolve, processingDelay));
      }
    }
  } else {
    // Process URLs (existing logic)
    for (let i = 0; i < urls.length; i++) {
      const currentUrl = urls[i];
      log(`\n${colors.bold}Progress: ${i + 1}/${urls.length}${colors.reset}`, 'blue');
      
      const result = await processUrl(currentUrl, user, categories, existingTags, flags);
      
      if (result === null) {
        logInfo('Processing stopped by user');
        break;
      } else if (result === true) {
        successCount++;
      } else {
        failureCount++;
        failedItems.push(currentUrl);
      }
      
      // Add a longer delay between requests to prevent server overload
      if (i < urls.length - 1) {
        logInfo(`Waiting ${processingDelay/1000} seconds before processing next item...`);
        await new Promise(resolve => setTimeout(resolve, processingDelay));
      }
    }
  }
  
  // Summary
  log(`\n${colors.bold}Processing Complete!${colors.reset}`, 'green');
  log(`Successfully created: ${successCount} references`, 'green');
  log(`Failed: ${failureCount} references`, failureCount > 0 ? 'red' : 'green');
  log(`Total processed: ${csvReferences.length > 0 ? csvReferences.length : urls.length} items`, 'blue');
  
  // Show failed items if any
  if (failedItems.length > 0) {
    log(`\n${colors.bold}Failed Items:${colors.reset}`, 'red');
    failedItems.forEach((failedItem, index) => {
      log(`${index + 1}. ${failedItem}`, 'red');
    });
    log(`\n${colors.yellow}Tip: Check the items above for typos, or they may have been moved/deleted.${colors.reset}`, 'yellow');
  }
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

// Clean up HTML entities and tags from title
function cleanTitle(title) {
  if (!title) return '';
  // Remove HTML tags
  let clean = title.replace(/<[^>]*>/g, ' ');
  // Decode HTML entities
  clean = clean.replace(/&amp;/gi, '&')
               .replace(/&lt;/gi, '<')
               .replace(/&gt;/gi, '>')
               .replace(/&quot;/gi, '"')
               .replace(/&#39;/gi, "'")
               .replace(/&nbsp;/gi, ' ')
               .replace(/&rsquo;/gi, "'")
               .replace(/&lsquo;/gi, "'")
               .replace(/&ldquo;/gi, '"')
               .replace(/&rdquo;/gi, '"')
               .replace(/&hellip;/gi, '...')
               .replace(/&mdash;/gi, '-')
               .replace(/&ndash;/gi, '-')
               .replace(/&copy;/gi, '(c)')
               .replace(/&reg;/gi, '(R)')
               .replace(/&euro;/gi, '€')
               .replace(/&pound;/gi, '£')
               .replace(/&yen;/gi, '¥')
               .replace(/&bull;/gi, '•')
               .replace(/&apos;/gi, "'");
  // Remove extra whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}
