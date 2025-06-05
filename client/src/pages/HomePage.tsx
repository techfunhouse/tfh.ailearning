import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useInView } from "react-intersection-observer";

import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ReferenceCard from "@/components/ReferenceCard";
import AddEditReferenceDialog from "@/components/AddEditReferenceDialog";
import ReferenceDetailDialog from "@/components/ReferenceDetailDialog";
import { Reference, Category, Tag } from "@/types";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  FileSearch,
  Loader2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  PlusIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";


export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const [references, setReferences] = useState<Reference[]>([]);
  const [filteredReferences, setFilteredReferences] = useState<Reference[]>([]);
  const [displayReferences, setDisplayReferences] = useState<Reference[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "all",
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReference, setEditingReference] = useState<Reference | null>(
    null,
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedReference, setSelectedReference] = useState<Reference | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  
  // Pagination and infinite scroll
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const [isAtStart, setIsAtStart] = useState(true);
  const [isAtEnd, setIsAtEnd] = useState(false);
  const itemsPerPage = 12;
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: false
  });

  // No longer redirect to login - authenticated state is handled per feature

  // Fetch references
  const { data: referencesData, isLoading: loadingReferences } = useQuery({
    queryKey: ["/api/references"],
    staleTime: 60000, // 1 minute
  });

  // Fetch categories
  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: Infinity, // Categories don't change often
  });

  // Fetch tags
  const { data: tagsData } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    staleTime: Infinity, // Tags don't change often
  });

  // Define categories and tags state
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  // Ensure we have valid arrays to work with
  const safeReferences = Array.isArray(references) ? references : [];
  
  // Setup fuzzy search with Fuse.js
  const fuse = new Fuse(safeReferences, {
    keys: ["title", "description", "tags"],
    threshold: 0.4,
  });

  // Update references when data is fetched
  useEffect(() => {
    if (referencesData) {
      // Ensure we're working with arrays
      const safeData = Array.isArray(referencesData) ? referencesData : 
                      (typeof referencesData === 'object' && referencesData !== null) ? 
                        Object.values(referencesData) : [];
                        
      // Make sure each reference has required properties
      const normalizedData = safeData.map(ref => ({
        ...ref,
        id: ref.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
        tags: Array.isArray(ref.tags) ? ref.tags : [],
        category: ref.category || 'Uncategorized',
        loveCount: ref.loveCount || 0
      }));
      
      setReferences(normalizedData);
      setFilteredReferences(normalizedData);
      setDisplayReferences(normalizedData.slice(0, itemsPerPage));
      setHasMore(normalizedData.length > itemsPerPage);
      setPage(1);
    }
  }, [referencesData, itemsPerPage]);
  
  // Update categories when data is fetched
  useEffect(() => {
    if (categoriesData) {
      // Ensure we're working with arrays
      const safeData = (Array.isArray(categoriesData) ? categoriesData : 
                      (typeof categoriesData === 'object' && categoriesData !== null) ? 
                        Object.values(categoriesData) : []) as Array<Record<string, any>>;
                        
      // Make sure each category has required properties
      const normalizedData = safeData.map((cat) => ({
        id: cat?.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
        name: cat?.name || 'Uncategorized'
      }));
      
      setCategories(normalizedData);
    }
  }, [categoriesData]);

  // Update tags when data is fetched
  useEffect(() => {
    if (tagsData) {
      // Ensure we're working with arrays
      const safeData = (Array.isArray(tagsData) ? tagsData : 
                      (typeof tagsData === 'object' && tagsData !== null) ? 
                        Object.values(tagsData) : []) as Array<Record<string, any>>;
                        
      // Make sure each tag has required properties
      const normalizedData = safeData.map((tag) => ({
        id: tag?.id || `temp-${Math.random().toString(36).substring(2, 9)}`,
        name: tag?.name || 'Unnamed'
      }));
      
      setTags(normalizedData);
    }
  }, [tagsData]);
  

  
  // Add scroll event listener for scroll to top button and category scrolling
  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled down 300px
      if (window.scrollY > 300) {
        setShowScrollToTop(true);
      } else {
        setShowScrollToTop(false);
      }
    };
    
    // Add keyboard shortcut (Home key) for scrolling to top
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Home') {
        scrollToTop();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  // Effect to track horizontal scroll position of categories container
  useEffect(() => {
    const container = document.getElementById('category-scroll-container');
    if (!container) return;
    
    const handleCategoryScroll = () => {
      const isStart = container.scrollLeft <= 5;
      const isEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
      
      setIsAtStart(isStart);
      setIsAtEnd(isEnd);
    };
    
    // Initial check
    handleCategoryScroll();
    
    // Add event listeners
    container.addEventListener('scroll', handleCategoryScroll);
    window.addEventListener('resize', handleCategoryScroll);
    
    return () => {
      container.removeEventListener('scroll', handleCategoryScroll);
      window.removeEventListener('resize', handleCategoryScroll);
    };
  }, []);
  
  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Filter references when search or filters change
  useEffect(() => {
    let result = [...references];

    // Apply search filter
    if (searchQuery) {
      const searchResults = fuse.search(searchQuery);
      result = searchResults.map((item) => item.item);
    }

    // Apply category filter if not "all"
    if (selectedCategories.length > 0 && !selectedCategories.includes("all")) {
      result = result.filter((ref) =>
        selectedCategories.some(selectedCat => 
          selectedCat.toLowerCase() === ref.category.toLowerCase()
        ),
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      result = result.filter((ref) =>
        selectedTags.some((tag) => ref.tags.includes(tag)),
      );
    }

    // Reset pagination when filters change
    setPage(1);
    setFilteredReferences(result);
    setDisplayReferences(result.slice(0, itemsPerPage));
    setHasMore(result.length > itemsPerPage);
  }, [searchQuery, selectedCategories, selectedTags, references, itemsPerPage]);
  
  // Handle pagination when inView changes
  useEffect(() => {
    if (inView && hasMore) {
      const nextPage = page + 1;
      const start = (nextPage - 1) * itemsPerPage;
      const end = nextPage * itemsPerPage;
      
      if (start < filteredReferences.length) {
        setPage(nextPage);
        setDisplayReferences(prev => [
          ...prev,
          ...filteredReferences.slice(start, end)
        ]);
        setHasMore(end < filteredReferences.length);
      } else {
        setHasMore(false);
      }
    }
  }, [inView, filteredReferences, page, hasMore, itemsPerPage]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryChange = (categories: string[]) => {
    setSelectedCategories(categories);
  };

  const handleTagSelect = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
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

  const handleViewReference = (reference: Reference) => {
    setSelectedReference(reference);
    setIsDetailDialogOpen(true);
  };

  const handleNavigateReference = (direction: 'prev' | 'next') => {
    if (!selectedReference) return;
    
    const currentIndex = filteredReferences.findIndex(ref => ref.id === selectedReference.id);
    let nextIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < filteredReferences.length - 1) {
      nextIndex = currentIndex + 1;
    }
    
    if (nextIndex !== currentIndex) {
      setSelectedReference(filteredReferences[nextIndex]);
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingReference(null);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Create category count data with safe handling for GitHub Pages
  const categoryCounts = (() => {
    // Ensure categoriesData is actually an array
    const safeCategories = Array.isArray(categoriesData) 
      ? categoriesData 
      : (categoriesData && typeof categoriesData === 'object')
        ? Object.values(categoriesData)
        : [];
        
    // Now safely reduce the array
    return safeCategories.reduce<Record<string, number>>((acc, category) => {
      // Ensure category has a name property
      const categoryName = (category as any)?.name ? (category as any).name.toLowerCase() : 'unknown';
      acc[categoryName] = safeReferences.filter(
        (ref) => ref.category && ref.category.toLowerCase() === categoryName,
      ).length;
      return acc;
    }, {});
  })() || {};

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        username={user?.username}
        isAdmin={isAdmin}
        onSearch={handleSearch}
      />

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop sidebar */}
        <div className={`hidden lg:block transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-80'}`}>
          <div className="relative h-full">
            {/* Collapse toggle button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="absolute top-4 -right-3 z-10 bg-background border rounded-full shadow-sm hover:shadow-md"
            >
              {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            
            <Sidebar
              categories={categories}
              tags={tags}
              selectedCategories={selectedCategories}
              selectedTags={selectedTags}
              isAdmin={isAdmin}
              onCategoryChange={handleCategoryChange}
              onTagSelect={handleTagSelect}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapsed={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        </div>

        {/* Mobile sidebar toggle and filters summary */}
        <div className="lg:hidden bg-card border-b px-4 py-2 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMobileSidebar}
            className="flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {!selectedCategories.includes("all") &&
              selectedCategories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
            {selectedTags.map((tag) => (
              <Badge key={tag} variant="default">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Mobile sidebar */}
        {isMobileSidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={(e) => {
              // Close the sidebar when clicking the backdrop, but not when clicking inside the sidebar
              if (e.target === e.currentTarget) {
                setIsMobileSidebarOpen(false);
              }
            }}
          >
            <div className="fixed inset-y-0 left-0 w-full sm:w-3/4 max-w-sm bg-card shadow-lg animate-in slide-in-from-left" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-semibold">Filters</h2>
                <Button variant="ghost" size="sm" onClick={toggleMobileSidebar}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Sidebar
                categories={categories}
                tags={tags}
                selectedCategories={selectedCategories}
                selectedTags={selectedTags}
                isAdmin={isAdmin}
                onCategoryChange={(cats) => {
                  handleCategoryChange(cats);
                  setIsMobileSidebarOpen(false);
                }}
                onTagSelect={(tag) => {
                  handleTagSelect(tag);
                  // Don't close the sidebar when selecting tags so users can select multiple
                }}
              />
            </div>
          </div>
        )}

        <main className="flex-1 bg-background p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Header area with stats */}
            <div className="mb-8">
              {/* Active Filters Display */}
              {((selectedCategories.length > 0 && !selectedCategories.includes("all")) || selectedTags.length > 0) && (
                <div className="bg-muted rounded-lg p-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
                    
                    {/* Selected Categories */}
                    {selectedCategories.length > 0 && !selectedCategories.includes("all") && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCategories.map(cat => (
                          <Badge 
                            key={cat} 
                            variant="secondary"
                            className="flex items-center gap-1 px-2.5 py-1"
                          >
                            <span>{cat}</span>
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleCategoryChange(
                                selectedCategories.filter(c => c !== cat).length > 0 
                                  ? selectedCategories.filter(c => c !== cat) 
                                  : ["all"]
                              )}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Selected Tags */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map(tag => (
                          <Badge 
                            key={tag} 
                            variant="default"
                            className="flex items-center gap-1 px-2.5 py-1"
                          >
                            <span>{tag}</span>
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleTagSelect(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {/* Clear all filters button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs ml-auto"
                      onClick={() => {
                        handleCategoryChange(["all"]);
                        setSelectedTags([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold mb-1">Learning Sources</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {filteredReferences.length} references available
                    {(selectedCategories.length > 0 &&
                      !selectedCategories.includes("all")) ||
                    selectedTags.length > 0
                      ? " with current filters"
                      : ""}
                  </p>
                </div>

                {isAdmin && (
                  <Button
                    onClick={handleAddReference}
                    className="flex items-center justify-center gap-1 shadow-sm w-full sm:w-auto"
                    size="sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span className="hidden xs:inline">Add Reference</span>
                    <span className="xs:hidden">Add Ref</span>
                  </Button>
                )}
              </div>

              {/* Category summary cards - Horizontal layout */}
              <div className="relative mb-6">
                {/* Left scroll button */}
                {!isAtStart && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-md animate-in fade-in"
                    onClick={() => {
                      const container = document.getElementById('category-scroll-container');
                      if (container) {
                        container.scrollBy({ left: -300, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Right scroll button */}
                {!isAtEnd && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 rounded-full bg-background/80 backdrop-blur-sm shadow-md animate-in fade-in"
                    onClick={() => {
                      const container = document.getElementById('category-scroll-container');
                      if (container) {
                        container.scrollBy({ left: 300, behavior: 'smooth' });
                      }
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Scrollable container */}
                <div 
                  id="category-scroll-container" 
                  className="flex gap-4 overflow-x-auto py-2 px-10 scrollbar-hide"
                >
                  {/* Total card */}
                  <Card className="bg-primary/5 border-primary/20 flex-shrink-0 w-[230px]">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p className="text-2xl font-semibold">
                            {references.length}
                          </p>
                        </div>
                        <Badge variant="outline" className="h-8 w-8 flex items-center justify-center p-0 rounded-full">
                          <BookOpen className="h-5 w-5" />
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Category cards */}
                  {Array.isArray(categoriesData) ? 
                    categoriesData.map((category) => (
                      <Card 
                        key={category.id || `cat-${Math.random()}`} 
                        className="bg-muted/30 flex-shrink-0 w-[230px] hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleCategoryChange([category.name?.toLowerCase() || 'unknown'])}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-xs text-muted-foreground capitalize">
                                {category.name || 'Uncategorized'}
                              </p>
                              <p className="text-2xl font-medium capitalize">
                                {category.name || 'Uncategorized'}
                              </p>
                            </div>
                            <Badge variant="outline" className="px-2 py-1 rounded-full">
                              {categoryCounts[category.name?.toLowerCase() || ''] || 0}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  : <div>No categories available</div>}
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* References grid */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-lg flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                {searchQuery
                  ? `Search Results for "${searchQuery}"`
                  : !selectedCategories.includes("all")
                    ? `${selectedCategories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")} Resources`
                    : "All Resources"}
              </h2>
            </div>

            {loadingReferences ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Card
                    key={item}
                    className="overflow-hidden shadow-md flex flex-col h-80 animate-pulse"
                  >
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
                  <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {displayReferences.map((reference) => (
                      <ReferenceCard
                        key={reference.id}
                        reference={reference}
                        isAdmin={isAdmin}
                        onEdit={() => handleEditReference(reference)}
                        onDelete={(id) => console.log("Reference deleted:", id)}
                        onView={handleViewReference}
                      />
                    ))}
                    
                    {/* Infinite scroll loading indicator */}
                    {hasMore && (
                      <div 
                        ref={ref} 
                        className="col-span-full flex items-center justify-center p-4"
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Loading more resources...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <Card className="border-dashed py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center p-6">
                      <div className="icon-container h-12 w-12 mb-4 bg-muted">
                        <FileSearch className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">
                        No Resources Found
                      </h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        {searchQuery
                          ? `No results match your search query "${searchQuery}".`
                          : "No resources matched your current filter selections."}
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setSelectedCategories(["all"]);
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

      <ReferenceDetailDialog
        reference={selectedReference}
        isOpen={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        allReferences={filteredReferences}
        onNavigate={handleNavigateReference}
      />
      
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <Button
          className="fixed bottom-6 right-6 p-2 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground z-50 flex items-center justify-center"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          title="Scroll to top (Press Home key as shortcut)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
          <span className="ml-2 hidden sm:inline">Back to top (Home key)</span>
        </Button>
      )}
      

    </div>
  );
}
