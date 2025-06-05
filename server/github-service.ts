import { Octokit } from "@octokit/rest";
import { storage } from "./storage";
import fs from "fs";
import path from "path";

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface SyncResult {
  message: string;
  prUrl?: string;
  prNumber?: number;
  changedFiles?: string[];
  dryRun?: boolean;
}

export interface GitHubStatus {
  isTokenConfigured: boolean;
  owner: string | null;
  repo: string | null;
  branch: string;
  message: string;
}

export class GitHubService {
  private octokit: Octokit | null = null;
  private config: GitHubConfig | null = null;

  constructor() {
    this.initializeConfig();
  }

  private initializeConfig() {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    if (token && owner && repo) {
      this.config = { token, owner, repo, branch };
      this.octokit = new Octokit({ auth: token });
    }
  }

  getStatus(): GitHubStatus {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || 'main';

    return {
      isTokenConfigured: !!token,
      owner: owner || null,
      repo: repo || null,
      branch: branch,
      message: token && owner && repo ? 'GitHub is configured' : 'GitHub configuration incomplete'
    };
  }

  async checkSyncStatus(): Promise<{ hasChanges: boolean; message: string; changedFiles: string[] }> {
    if (!this.config || !this.octokit) {
      throw new Error('GitHub configuration incomplete');
    }

    // Always assume we have changes for now - in a real implementation,
    // this would compare local data with the repository
    return {
      hasChanges: true,
      message: "Ready to sync with GitHub",
      changedFiles: ["data/references.json", "data/categories.json", "data/tags.json"]
    };
  }

  async syncToGitHub(dryRun: boolean = false): Promise<SyncResult> {
    if (!this.config || !this.octokit) {
      throw new Error('GitHub configuration incomplete');
    }

    try {
      // Get current data from storage
      const references = await storage.getReferences();
      const categories = await storage.getCategories();
      const tags = await storage.getTags();

      const dataToSync = {
        references,
        categories,
        tags,
        lastUpdated: new Date().toISOString()
      };

      if (dryRun) {
        return {
          message: "Dry run completed - no changes made to repository",
          changedFiles: ["data/references.json", "data/categories.json", "data/tags.json"],
          dryRun: true
        };
      }

      // Get the default branch SHA
      const { data: ref } = await this.octokit.git.getRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `heads/${this.config.branch}`
      });

      const baseSha = ref.object.sha;

      // Create a new branch for the PR
      const branchName = `ai-learning-resources-sync-${Date.now()}`;
      
      await this.octokit.git.createRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha
      });

      // Create or update data files
      const filesToUpdate = [
        {
          path: 'data/references.json',
          content: JSON.stringify(references, null, 2)
        },
        {
          path: 'data/categories.json',
          content: JSON.stringify(categories, null, 2)
        },
        {
          path: 'data/tags.json',
          content: JSON.stringify(tags, null, 2)
        },
        {
          path: 'data/backup.json',
          content: JSON.stringify(dataToSync, null, 2)
        }
      ];

      // Update files in the new branch
      for (const file of filesToUpdate) {
        try {
          // Try to get existing file
          const { data: existingFile } = await this.octokit.repos.getContent({
            owner: this.config.owner,
            repo: this.config.repo,
            path: file.path,
            ref: branchName
          });

          // Update existing file
          await this.octokit.repos.createOrUpdateFileContents({
            owner: this.config.owner,
            repo: this.config.repo,
            path: file.path,
            message: `Update ${file.path} via AI Learning Resources sync`,
            content: Buffer.from(file.content).toString('base64'),
            sha: Array.isArray(existingFile) ? existingFile[0].sha : existingFile.sha,
            branch: branchName
          });
        } catch (error) {
          // File doesn't exist, create it
          await this.octokit.repos.createOrUpdateFileContents({
            owner: this.config.owner,
            repo: this.config.repo,
            path: file.path,
            message: `Create ${file.path} via AI Learning Resources sync`,
            content: Buffer.from(file.content).toString('base64'),
            branch: branchName
          });
        }
      }

      // Create pull request
      const { data: pr } = await this.octokit.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title: `AI Learning Resources Sync - ${new Date().toLocaleDateString()}`,
        head: branchName,
        base: this.config.branch,
        body: `
# AI Learning Resources Data Sync

This pull request contains the latest data from the AI Learning Resources application:

## Changes
- **${references.length}** references
- **${categories.length}** categories  
- **${tags.length}** tags

## Files Updated
${filesToUpdate.map(f => `- \`${f.path}\``).join('\n')}

## Summary
This sync was automatically generated from the AI Learning Resources admin interface.

Last updated: ${new Date().toLocaleString()}
        `
      });

      return {
        message: "GitHub sync completed successfully",
        prUrl: pr.html_url,
        prNumber: pr.number,
        changedFiles: filesToUpdate.map(f => f.path),
        dryRun: false
      };

    } catch (error) {
      console.error('GitHub sync error:', error);
      throw new Error(`Failed to sync with GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const githubService = new GitHubService();