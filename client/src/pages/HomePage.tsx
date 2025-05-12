import * as React from "react"
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useInView } from "react-intersection-observer";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import ReferenceCard from "@/components/ReferenceCard";
import AddEditReferenceDialog from "@/components/AddEditReferenceDialog";
import { Reference, Category, Tag } from "@/types";
import { Button } from "@/components/ui/button";
import {
  PlusIcon,
  LayoutGrid,
  BookOpen,
  Filter,
  FileSearch,
  Loader2,
  X,
  GitBranchPlus,
  Github,
  GitPullRequest,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function HomePage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
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
  const [isGitHubSyncDialogOpen, setIsGitHubSyncDialogOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
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
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: Infinity, // Categories don't change often
  });

  // Fetch tags
  const { data: tagsData } = useQuery({
    queryKey: ["/api/tags"],
    staleTime: Infinity, // Tags don't change often
  });

  // Setup fuzzy search with Fuse.js
  const fuse = new Fuse(references, {
    keys: ["title", "description", "tags"],
    threshold: 0.4,
  });

  // Update references when data is fetched
  useEffect(() => {
    if (referencesData) {
      setReferences(referencesData);
      setFilteredReferences(referencesData);
      setDisplayReferences(referencesData.slice(0, itemsPerPage));
      setHasMore(referencesData.length > itemsPerPage);
      setPage(1);
    }
  }, [referencesData, itemsPerPage]);
  
  // GitHub sync functionality
  const checkGitHubConfig = async () => {
    try {
      setIsSyncing(true);
      setSyncResult(null);
      
      const response = await apiRequest('GET', '/api/admin/github-status');
      const data = await response.json();
      
      setSyncResult({
        ...data,
        syncCheckResult: null,
        syncResult: null
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to check GitHub configuration: ${error}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  const checkSyncStatus = async () => {
    try {
      setIsSyncing(true);
      
      const response = await apiRequest('GET', '/api/admin/github-sync/check');
      const data = await response.json();
      
      setSyncResult({
        ...syncResult,
        syncCheckResult: data,
        syncResult: null
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to check sync status: ${error}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  const createPullRequest = async () => {
    try {
      setIsSyncing(true);
      
      const response = await apiRequest('POST', '/api/admin/github-sync');
      const data = await response.json();
      
      setSyncResult({
        ...syncResult,
        syncResult: data
      });
      
      if (data.prUrl) {
        toast({
          title: 'Success',
          description: 'Pull request created successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to create pull request: ${error}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
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
        selectedCategories.includes(ref.category),
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

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingReference(null);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Create category count data
  const categoryCounts =
    categoriesData?.reduce<Record<string, number>>((acc, category) => {
      const categoryName = category.name.toLowerCase();
      acc[categoryName] = references.filter(
        (ref) => ref.category === categoryName,
      ).length;
      return acc;
    }, {}) || {};

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        username={user?.username}
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
            isAdmin={isAdmin}
            onCategoryChange={handleCategoryChange}
            onTagSelect={handleTagSelect}
          />
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
                isAdmin={isAdmin}
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
                    {(selectedCategories.length > 0 &&
                      !selectedCategories.includes("all")) ||
                    selectedTags.length > 0
                      ? " with current filters"
                      : ""}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsGitHubSyncDialogOpen(true)}
                      variant="outline"
                      className="flex items-center gap-1 shadow-sm"
                      size="sm"
                    >
                      <GitBranchPlus className="h-4 w-4" />
                      GitHub Sync
                    </Button>
                    <Button
                      onClick={handleAddReference}
                      className="flex items-center gap-1 shadow-sm"
                      size="sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Add Reference
                    </Button>
                  </div>
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
                  {categoriesData?.map((category) => (
                    <Card 
                      key={category.id} 
                      className="bg-muted/30 flex-shrink-0 w-[230px] hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleCategoryChange([category.name.toLowerCase()])}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs text-muted-foreground capitalize">
                              {category.name}
                            </p>
                            <p className="text-2xl font-medium capitalize">
                              {category.name}
                            </p>
                          </div>
                          <Badge variant="outline" className="px-2 py-1 rounded-full">
                            {categoryCounts[category.name.toLowerCase()] || 0}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                    ? `${selectedCategories.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")} References`
                    : "All References"}
              </h2>
            </div>

            {loadingReferences ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {displayReferences.map((reference) => (
                      <ReferenceCard
                        key={reference.id}
                        reference={reference}
                        isAdmin={isAdmin}
                        onEdit={() => handleEditReference(reference)}
                        onDelete={(id) => console.log("Reference deleted:", id)}
                      />
                    ))}
                    
                    {/* Infinite scroll loading indicator */}
                    {hasMore && (
                      <div 
                        ref={ref} 
                        className="col-span-full flex items-center justify-center p-4"
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2">Loading more references...</span>
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
                        No References Found
                      </h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        {searchQuery
                          ? `No results match your search query "${searchQuery}".`
                          : "No references matched your current filter selections."}
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
      
      {/* GitHub Sync Dialog */}
      <Dialog open={isGitHubSyncDialogOpen} onOpenChange={setIsGitHubSyncDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5 text-primary" />
              GitHub Data Sync
            </DialogTitle>
            <DialogDescription>
              Sync your data changes to the GitHub repository by creating a pull request.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* GitHub Configuration Status */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Configuration Status</h3>
              
              <div className="rounded-md border p-4">
                {isSyncing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Checking GitHub configuration...</span>
                  </div>
                ) : syncResult ? (
                  <div>
                    {syncResult.configured ? (
                      <div className="text-sm space-y-2">
                        <div className="flex items-center text-green-600">
                          <span className="font-medium">✓ GitHub is configured correctly</span>
                        </div>
                        <div className="space-y-1 mt-2">
                          <div className="text-xs text-muted-foreground">Repository: {syncResult.owner}/{syncResult.repo}</div>
                          <div className="text-xs text-muted-foreground">Branch: {syncResult.baseBranch}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-amber-600">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        <span className="text-sm">{syncResult.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center text-muted-foreground text-sm">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span>Click "Check Configuration" to verify GitHub setup</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Sync Changes Section */}
            {syncResult && syncResult.configured && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sync Changes</h3>
                <div className="rounded-md border p-4 space-y-4">
                  {syncResult.syncCheckResult ? (
                    <div>
                      {syncResult.syncCheckResult.needsSync ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-amber-600">
                            <span className="text-sm">Changes detected. {syncResult.syncCheckResult.changedFiles.length} file(s) need to be synced.</span>
                          </div>
                          <div className="space-y-1 mt-2">
                            <div className="text-xs font-medium">Files to sync:</div>
                            <ul className="text-xs text-muted-foreground list-disc pl-4">
                              {syncResult.syncCheckResult.changedFiles.map((file: string, index: number) => (
                                <li key={index}>{file}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center text-green-600">
                          <span className="text-sm">✓ Data is already in sync with GitHub</span>
                        </div>
                      )}
                    </div>
                  ) : syncResult.syncResult ? (
                    <div>
                      {syncResult.syncResult.prUrl ? (
                        <div className="space-y-2">
                          <div className="flex items-center text-green-600">
                            <span className="text-sm">✓ Pull request created successfully</span>
                          </div>
                          <div className="space-y-1 mt-2">
                            <div className="text-xs font-medium">Pull Request Details:</div>
                            <div className="text-xs text-muted-foreground">PR #{syncResult.syncResult.prNumber}</div>
                            <a 
                              href={syncResult.syncResult.prUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline inline-flex items-center"
                            >
                              <GitPullRequest className="h-3 w-3 mr-1" />
                              View Pull Request
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-600">
                          <span className="text-sm">{syncResult.syncResult.message}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center text-muted-foreground text-sm">
                      <span>Click "Check for Changes" to see if any data files need to be synced.</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-between">
            <div className="space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSyncing}
                onClick={checkGitHubConfig}
              >
                {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Check Configuration
              </Button>
              
              {syncResult && syncResult.configured && !syncResult.syncResult && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSyncing}
                  onClick={checkSyncStatus}
                >
                  {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Check for Changes
                </Button>
              )}
            </div>
            
            {syncResult && syncResult.configured && syncResult.syncCheckResult && syncResult.syncCheckResult.needsSync && !syncResult.syncResult && (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={isSyncing}
                onClick={createPullRequest}
              >
                {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Pull Request
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
