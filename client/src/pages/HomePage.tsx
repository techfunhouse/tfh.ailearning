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
import { PlusIcon, LayoutGrid, BookOpen, Filter, FileSearch, Loader2, X } from 'lucide-react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  if (!user) return null;

  // Create category count data
  const categoryCounts = categoriesData?.reduce<Record<string, number>>((acc, category) => {
    const categoryName = category.name.toLowerCase();
    acc[categoryName] = references.filter(ref => ref.category === categoryName).length;
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        username={user.username} 
        isAdmin={isAdmin} 
        onSearch={handleSearch}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar 
            categories={categoriesData || []} 
            tags={tagsData || []} 
            selectedCategories={selectedCategories}
            selectedTags={selectedTags}
            onCategoryChange={handleCategoryChange}
            onTagSelect={handleTagSelect}
          />
        </div>

        {/* Mobile sidebar toggle and filters summary */}
        <div className="lg:hidden bg-card border-b px-4 py-2 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={toggleMobileSidebar} className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {!selectedCategories.includes('all') && selectedCategories.map(category => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
            {selectedTags.map(tag => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Mobile sidebar */}
        {isMobileSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 w-full sm:w-3/4 max-w-sm bg-card shadow-lg animate-in slide-in-from-left">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-semibold">Filters</h2>
                <Button variant="ghost" size="sm" onClick={toggleMobileSidebar}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Sidebar 
                categories={categoriesData || []} 
                tags={tagsData || []} 
                selectedCategories={selectedCategories}
                selectedTags={selectedTags}
                onCategoryChange={(cats) => {
                  handleCategoryChange(cats);
                  setIsMobileSidebarOpen(false);
                }}
                onTagSelect={(tag) => {
                  handleTagSelect(tag);
                }}
              />
            </div>
          </div>
        )}

        <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Header area with stats */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">Reference Library</h1>
                  <p className="text-muted-foreground">
                    {filteredReferences.length} references available
                    {(selectedCategories.length > 0 && !selectedCategories.includes('all')) || selectedTags.length > 0 
                      ? ' with current filters' 
                      : ''}
                  </p>
                </div>
                
                {isAdmin && (
                  <Button 
                    onClick={handleAddReference} 
                    className="flex items-center gap-1 shadow-sm"
                    size="sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Reference
                  </Button>
                )}
              </div>
              
              {/* Category summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-2xl font-semibold">{references.length}</p>
                    </div>
                    <div className="icon-container h-10 w-10">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
                
                {categoriesData?.slice(0, 3).map(category => (
                  <Card key={category.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-muted-foreground capitalize">{category.name}</p>
                        <Badge variant="outline" className="h-5 px-1.5">
                          {categoryCounts[category.name.toLowerCase()] || 0}
                        </Badge>
                      </div>
                      <p className="text-lg font-medium capitalize mt-1">{category.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <Separator className="mb-6" />
            
            {/* References grid */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-lg flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {searchQuery 
                  ? `Search Results for "${searchQuery}"`
                  : !selectedCategories.includes('all')
                    ? `${selectedCategories.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')} References`
                    : "All References"
                }
              </h2>
            </div>
            
            {loadingReferences ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Card key={item} className="overflow-hidden shadow-md flex flex-col h-80 animate-pulse">
                    <div className="h-48 bg-muted"></div>
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {filteredReferences.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredReferences.map((reference) => (
                      <ReferenceCard
                        key={reference.id}
                        reference={reference}
                        isAdmin={isAdmin}
                        onEdit={() => handleEditReference(reference)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center p-6">
                      <div className="icon-container h-12 w-12 mb-4 bg-muted">
                        <FileSearch className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No References Found</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        {searchQuery 
                          ? `No results match your search query "${searchQuery}".` 
                          : "No references matched your current filter selections."}
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategories(['all']);
                          setSelectedTags([]);
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
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
