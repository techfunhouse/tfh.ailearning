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
      const response = await fetch('/data/references.json');
      if (!response.ok) {
        throw new Error(`Failed to load references: ${response.status}`);
      }
      const data = await response.json();
      this.cache.references = Array.isArray(data) ? data : [];
      return this.cache.references;
    } catch (error) {
      console.error('Error loading static references:', error);
      return [];
    }
  }

  static async loadCategories(): Promise<Category[]> {
    if (this.cache.categories) {
      return this.cache.categories;
    }

    try {
      const response = await fetch('/data/categories.json');
      if (!response.ok) {
        throw new Error(`Failed to load categories: ${response.status}`);
      }
      const data = await response.json();
      this.cache.categories = Array.isArray(data) ? data : [];
      return this.cache.categories;
    } catch (error) {
      console.error('Error loading static categories:', error);
      return [];
    }
  }

  static async loadTags(): Promise<Tag[]> {
    if (this.cache.tags) {
      return this.cache.tags;
    }

    try {
      const response = await fetch('/data/tags.json');
      if (!response.ok) {
        throw new Error(`Failed to load tags: ${response.status}`);
      }
      const data = await response.json();
      this.cache.tags = Array.isArray(data) ? data : [];
      return this.cache.tags;
    } catch (error) {
      console.error('Error loading static tags:', error);
      return [];
    }
  }

  static clearCache(): void {
    this.cache = {};
  }
}