import { Reference, Category, Tag } from '@/types';

// Static data loader for GitHub Pages deployment
export class StaticDataLoader {
  private static cache: {
    references?: Reference[];
    categories?: Category[];
    tags?: Tag[];
  } = {};

  static async loadReferences(): Promise<Reference[]> {
    if (this.cache.references) {
      return this.cache.references;
    }

    try {
      console.log('Loading static references from /data/references.json');
      const response = await fetch('/data/references.json');
      console.log('References fetch response:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Failed to load references: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('References data loaded:', data);
      // Handle both direct array and wrapped object formats
      const references: Reference[] = Array.isArray(data) ? data : (data?.references || []);
      this.cache.references = references;
      return this.cache.references;
    } catch (error) {
      console.error('Error loading static references:', error);
      console.log('Attempting to load from alternative path...');
      try {
        const altResponse = await fetch('./data/references.json');
        if (altResponse.ok) {
          const altData = await altResponse.json();
          const altReferences: Reference[] = Array.isArray(altData) ? altData : (altData?.references || []);
          this.cache.references = altReferences;
          return this.cache.references;
        }
      } catch (altError) {
        console.error('Alternative path also failed:', altError);
      }
      return [];
    }
  }

  static async loadCategories(): Promise<Category[]> {
    if (this.cache.categories) {
      return this.cache.categories;
    }

    try {
      console.log('Loading static categories from /data/categories.json');
      const response = await fetch('/data/categories.json');
      console.log('Categories fetch response:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Categories data loaded:', data);
      // Handle both direct array and wrapped object formats
      const categories: Category[] = Array.isArray(data) ? data : (data?.categories || []);
      this.cache.categories = categories;
      return this.cache.categories;
    } catch (error) {
      console.error('Error loading static categories:', error);
      try {
        const altResponse = await fetch('./data/categories.json');
        if (altResponse.ok) {
          const altData = await altResponse.json();
          const altCategories: Category[] = Array.isArray(altData) ? altData : (altData?.categories || []);
          this.cache.categories = altCategories;
          return this.cache.categories;
        }
      } catch (altError) {
        console.error('Alternative path also failed:', altError);
      }
      return [];
    }
  }

  static async loadTags(): Promise<Tag[]> {
    if (this.cache.tags) {
      return this.cache.tags;
    }

    try {
      console.log('Loading static tags from /data/tags.json');
      const response = await fetch('/data/tags.json');
      console.log('Tags fetch response:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Failed to load tags: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Tags data loaded:', data);
      // Handle both direct array and wrapped object formats
      const tags: Tag[] = Array.isArray(data) ? data : (data?.tags || []);
      this.cache.tags = tags;
      return this.cache.tags;
    } catch (error) {
      console.error('Error loading static tags:', error);
      try {
        const altResponse = await fetch('./data/tags.json');
        if (altResponse.ok) {
          const altData = await altResponse.json();
          const altTags: Tag[] = Array.isArray(altData) ? altData : (altData?.tags ?? []);
          this.cache.tags = altTags;
          return this.cache.tags;
        }
      } catch (altError) {
        console.error('Alternative path also failed:', altError);
      }
      return [];
    }
  }

  static clearCache(): void {
    this.cache = {};
  }
}