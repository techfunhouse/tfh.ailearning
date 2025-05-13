import { Octokit } from '@octokit/rest';
import { Base64 } from 'js-base64';
import { storage } from '../storage.js';
import path from 'path';
import * as fs from 'fs';

// Interface for GitHub sync configuration
interface GitHubSyncConfig {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
  dataFilesPaths: {
    categories: string;
    references: string;
    tags: string;
  };
}

// Interface for the sync result
interface SyncResult {
  message: string;
  prUrl?: string;
  prNumber?: number;
  changedFiles?: string[];
  dryRun?: boolean;
}

/**
 * Validates GitHub configuration
 */
export function validateGitHubConfig(): GitHubSyncConfig | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';
  
  if (!token || !owner || !repo) {
    return null;
  }
  
  // Default paths for data files
  const dataFilesPaths = {
    categories: process.env.GITHUB_CATEGORIES_PATH || 'data/categories.json',
    references: process.env.GITHUB_REFERENCES_PATH || 'data/references.json',
    tags: process.env.GITHUB_TAGS_PATH || 'data/tags.json'
  };
  
  return {
    token,
    owner,
    repo,
    baseBranch,
    dataFilesPaths
  };
}

/**
 * Checks if the data needs syncing by comparing local and remote files
 */
async function checkIfSyncNeeded(
  octokit: Octokit, 
  config: GitHubSyncConfig, 
  localData: { categories: any, references: any, tags: any }
): Promise<{ needsSync: boolean, changedFiles: string[] }> {
  const changedFiles: string[] = [];
  
  // Helper function to fetch and compare a file
  const compareFile = async (type: 'categories' | 'references' | 'tags') => {
    try {
      const { data: fileData } = await octokit.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: config.dataFilesPaths[type],
        ref: `heads/${config.baseBranch}`
      });
      
      // Handle file content
      if ('content' in fileData && fileData.content) {
        // Decode base64 content
        const content = Base64.decode(fileData.content);
        
        try {
          // Parse the JSON content
          const remoteData = JSON.parse(content);
          
          // Deep compare objects (ignore formatting, order)
          const isEqual = JSON.stringify(sortObject(remoteData)) === 
                          JSON.stringify(sortObject(localData[type]));
          
          if (!isEqual) {
            changedFiles.push(config.dataFilesPaths[type]);
            return true;
          }
          
          return false;
        } catch (parseError) {
          console.error(`Error parsing JSON from GitHub for ${type}:`, parseError);
          // If we can't parse, assume it needs sync
          changedFiles.push(config.dataFilesPaths[type]);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      // If the file doesn't exist or there's another error
      console.error(`Error fetching ${type} file from GitHub:`, error);
      changedFiles.push(config.dataFilesPaths[type]);
      return true; // Need to sync if we can't fetch the file
    }
  };
  
  // Check all three data types
  const categoriesChanged = await compareFile('categories');
  const referencesChanged = await compareFile('references');
  const tagsChanged = await compareFile('tags');
  
  return {
    needsSync: categoriesChanged || referencesChanged || tagsChanged,
    changedFiles
  };
}

/**
 * Sort object keys for consistent comparison
 */
function sortObject(obj: any): any {
  if (Array.isArray(obj)) {
    // If it's an array, sort each element if it's an object
    return obj.map(item => typeof item === 'object' && item !== null ? sortObject(item) : item);
  } else if (typeof obj === 'object' && obj !== null) {
    // If it's an object, create a new object with sorted keys
    return Object.keys(obj)
      .sort()
      .reduce((result, key) => {
        result[key] = typeof obj[key] === 'object' && obj[key] !== null 
          ? sortObject(obj[key]) 
          : obj[key];
        return result;
      }, {} as any);
  }
  
  // Return as is for primitive values
  return obj;
}

/**
 * Create or update a file in the repository
 */
async function createCommitForFile(
  octokit: Octokit, 
  options: {
    owner: string;
    repo: string;
    path: string;
    content: string;
    message: string;
    branch: string;
  }
): Promise<void> {
  // Try to get the current file (to check if it exists and get its SHA)
  try {
    const { data: existingFile } = await octokit.repos.getContent({
      owner: options.owner,
      repo: options.repo,
      path: options.path,
      ref: options.branch
    });
    
    // File exists, update it
    if ('sha' in existingFile) {
      await octokit.repos.createOrUpdateFileContents({
        owner: options.owner,
        repo: options.repo,
        path: options.path,
        message: options.message,
        content: Base64.encode(options.content),
        sha: existingFile.sha,
        branch: options.branch
      });
    }
  } catch (error) {
    // File doesn't exist, create it
    await octokit.repos.createOrUpdateFileContents({
      owner: options.owner,
      repo: options.repo,
      path: options.path,
      message: options.message,
      content: Base64.encode(options.content),
      branch: options.branch
    });
  }
}

/**
 * Check GitHub sync status and optionally create a PR
 */
export async function syncWithGitHub(dryRun: boolean = false): Promise<SyncResult> {
  // Validate GitHub configuration
  const config = validateGitHubConfig();
  if (!config) {
    return { 
      message: 'GitHub configuration is incomplete. Please check GITHUB_TOKEN, GITHUB_REPO_OWNER, and GITHUB_REPO_NAME environment variables.' 
    };
  }
  
  try {
    // Initialize Octokit
    const octokit = new Octokit({ auth: config.token });
    
    // Get current data from storage
    const categories = await storage.getCategories();
    const references = await storage.getReferences();
    const tags = await storage.getTags();
    
    const localData = { categories, references, tags };
    
    // Check if sync is needed
    const { needsSync, changedFiles } = await checkIfSyncNeeded(octokit, config, localData);
    
    if (!needsSync) {
      return { message: 'Data is already in sync with GitHub repository. No PR needed.' };
    }
    
    // If just checking without creating PR
    if (dryRun) {
      return { 
        message: `Changes detected in ${changedFiles.length} file(s). PR would be created for: ${changedFiles.join(', ')}`,
        changedFiles,
        dryRun: true
      };
    }
    
    // Create a new branch for the changes
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const branchName = `data-sync-${timestamp}`;
    
    // Get latest commit SHA from base branch
    const { data: refData } = await octokit.git.getRef({
      owner: config.owner,
      repo: config.repo,
      ref: `heads/${config.baseBranch}`
    });
    const baseSHA = refData.object.sha;
    
    // Create new branch
    await octokit.git.createRef({
      owner: config.owner,
      repo: config.repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSHA
    });
    
    // Create commits for changed files
    const commitPromises = [];
    
    if (changedFiles.includes(config.dataFilesPaths.categories)) {
      commitPromises.push(
        createCommitForFile(octokit, {
          owner: config.owner,
          repo: config.repo,
          path: config.dataFilesPaths.categories,
          content: JSON.stringify(categories, null, 2),
          message: 'Update categories data',
          branch: branchName
        })
      );
    }
    
    if (changedFiles.includes(config.dataFilesPaths.references)) {
      commitPromises.push(
        createCommitForFile(octokit, {
          owner: config.owner,
          repo: config.repo,
          path: config.dataFilesPaths.references,
          content: JSON.stringify(references, null, 2),
          message: 'Update references data',
          branch: branchName
        })
      );
    }
    
    if (changedFiles.includes(config.dataFilesPaths.tags)) {
      commitPromises.push(
        createCommitForFile(octokit, {
          owner: config.owner,
          repo: config.repo,
          path: config.dataFilesPaths.tags,
          content: JSON.stringify(tags, null, 2),
          message: 'Update tags data',
          branch: branchName
        })
      );
    }
    
    // Wait for all commits to complete
    await Promise.all(commitPromises);
    
    // Create Pull Request
    const { data: pr } = await octokit.pulls.create({
      owner: config.owner,
      repo: config.repo,
      title: `Sync data files from application - ${new Date().toLocaleString()}`,
      body: `This PR was automatically generated to sync data changes from the Reference Viewer application.
      
## Changes
${changedFiles.map(file => `- Updated \`${file}\``).join('\n')}

## Stats
- Categories: ${categories.length}
- References: ${references.length}
- Tags: ${tags.length}`,
      head: branchName,
      base: config.baseBranch
    });
    
    return {
      message: 'Pull Request created successfully',
      prUrl: pr.html_url,
      prNumber: pr.number,
      changedFiles
    };
  } catch (error) {
    console.error('Error syncing with GitHub:', error);
    return { 
      message: `Failed to sync with GitHub: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}