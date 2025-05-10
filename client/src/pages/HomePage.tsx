import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Fuse from 'fuse.js';

import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReferenceCard from '@/components/ReferenceCard';
import AddEditReferenceDialog from '@/components/AddEditReferenceDialog';
import { Reference, Category, Tag } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusIcon } from 'lucide-react';

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [references, setReferences] = useState<Reference[]>([]);
  const [filteredReferences, setFilteredReferences] = useState<Reference[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['all']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<Reference | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch references
  const { data: referencesData, isLoading: loadingReferences } = useQuery({
    queryKey: ['/api/references'],
    staleTime: 60000, // 1 minute
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['/api/categories'],
    staleTime: Infinity, // Categories don't change often
  });

  // Fetch tags
  const { data: tagsData } = useQuery({
    queryKey: ['/api/tags'],
    staleTime: Infinity, // Tags don't change often
  });

  // Setup fuzzy search with Fuse.js
  const fuse = new Fuse(references, {
    keys: ['title', 'description', 'tags'],
    threshold: 0.4,
  });

  // Update references when data is fetched
  useEffect(() => {
    if (referencesData) {
      setReferences(referencesData);
      setFilteredReferences(referencesData);
    }
  }, [referencesData]);

  // Filter references when search or filters change
  useEffect(() => {
    let result = [...references];

    // Apply search filter
    if (searchQuery) {
      const searchResults = fuse.search(searchQuery);
      result = searchResults.map(item => item.item);
    }

    // Apply category filter if not "all"
    if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
      result = result.filter(ref => selectedCategories.includes(ref.category));
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter(ref => 
        selectedTags.some(tag => ref.tags.includes(tag))
      );
    }

    setFilteredReferences(result);
  }, [searchQuery, selectedCategories, selectedTags, references]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
  };

  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddReference = () => {
    setEditingReference(null);
    setIsAddDialogOpen(true);
  };

  const handleEditReference = (reference: Reference) => {
    setEditingReference(reference);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingReference(null);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        username={user.username} 
        isAdmin={isAdmin} 
        onSearch={handleSearch}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        <Sidebar 
          categories={categoriesData || []} 
          tags={tagsData || []} 
          selectedCategories={selectedCategories}
          selectedTags={selectedTags}
          onCategoryChange={handleCategoryChange}
          onTagSelect={handleTagSelect}
        />

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">All References</h2>
            
            {isAdmin && (
              <Button onClick={handleAddReference} className="flex items-center">
                <PlusIcon className="mr-1 h-4 w-4" />
                Add Reference
              </Button>
            )}
          </div>
          
          {loadingReferences ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="bg-white overflow-hidden shadow rounded-lg flex flex-col h-80 animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredReferences.length > 0 ? (
                filteredReferences.map((reference) => (
                  <ReferenceCard
                    key={reference.id}
                    reference={reference}
                    isAdmin={isAdmin}
                    onEdit={() => handleEditReference(reference)}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-10">
                  <p className="text-gray-500">No references found.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <AddEditReferenceDialog
        isOpen={isAddDialogOpen}
        reference={editingReference}
        categories={categoriesData || []}
        tags={tagsData || []}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
