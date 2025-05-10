import Fuse from 'fuse.js';
import { Reference } from '@/types';

// Create a reusable function to set up Fuse.js search
export const setupFuseSearch = (references: Reference[]): Fuse<Reference> => {
  const options = {
    keys: ['title', 'description', 'tags', 'category'],
    threshold: 0.4, // Lower values = more strict matching
    includeScore: true,
    useExtendedSearch: true,
  };

  return new Fuse(references, options);
};

// Search function that returns filtered references
export const searchReferences = (
  fuse: Fuse<Reference>,
  query: string
): Reference[] => {
  if (!query) return [];
  
  const results = fuse.search(query);
  return results.map(result => result.item);
};

// Filter references by category
export const filterByCategory = (
  references: Reference[],
  categories: string[]
): Reference[] => {
  if (categories.includes('all')) return references;
  
  return references.filter(ref => 
    categories.includes(ref.category.toLowerCase())
  );
};

// Filter references by tags
export const filterByTags = (
  references: Reference[],
  tags: string[]
): Reference[] => {
  if (!tags.length) return references;
  
  return references.filter(ref => 
    tags.some(tag => ref.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()))
  );
};
