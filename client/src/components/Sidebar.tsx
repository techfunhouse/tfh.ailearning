import * as React from "react"
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Category, Tag, InsertCategory, InsertTag } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  X, 
  Tag as TagIcon, 
  Book, 
  PlusCircle,
  Save,
  Loader2,
  Pencil as PencilIcon
} from 'lucide-react';
import { getTagColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Schema for adding a new category
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(50, "Category name is too long"),
});

// Schema for adding a new tag
const tagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(30, "Tag name is too long"),
});

interface SidebarProps {
  categories: Category[];
  tags: Tag[];
  selectedCategories: string[];
  selectedTags: string[];
  isAdmin: boolean;
  onCategoryChange: (categories: string[]) => void;
  onTagSelect: (tag: string) => void;
}

export default function Sidebar({
  categories,
  tags,
  selectedCategories,
  selectedTags,
  isAdmin,
  onCategoryChange,
  onTagSelect,
}: SidebarProps) {
  const { toast } = useToast();
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [tagFilter, setTagFilter] = useState('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditTagOpen, setIsEditTagOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string>('');
  const [editingTagId, setEditingTagId] = useState<string>('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editTagName, setEditTagName] = useState('');
  const [isGitHubSyncDialogOpen, setIsGitHubSyncDialogOpen] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
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

  // Form setup for adding a new category
  const categoryForm = useForm<{ name: string }>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Form setup for editing a category
  const editCategoryForm = useForm<{ name: string }>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: editCategoryName,
    },
  });
  
  // Update form values when editing category changes
  useEffect(() => {
    editCategoryForm.setValue('name', editCategoryName);
  }, [editCategoryName, editCategoryForm]);

  // Form setup for adding a new tag
  const tagForm = useForm<{ name: string }>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: "",
    },
  });
  
  // Form setup for editing a tag
  const editTagForm = useForm<{ name: string }>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: editTagName,
    },
  });
  
  // Update form values when editing tag changes
  useEffect(() => {
    editTagForm.setValue('name', editTagName);
  }, [editTagName, editTagForm]);

  // Mutation for adding a new category
  const addCategoryMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      const response = await apiRequest('POST', '/api/categories', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsAddCategoryOpen(false);
      categoryForm.reset();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to add category: ${error}`,
      });
    },
  });
  
  // Mutation for updating a category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest('PATCH', `/api/categories/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
      setIsEditCategoryOpen(false);
      editCategoryForm.reset();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update category: ${error}`,
      });
    },
  });

  // Mutation for adding a new tag
  const addTagMutation = useMutation({
    mutationFn: async (data: InsertTag) => {
      const response = await apiRequest('POST', '/api/tags', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tag added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      setIsAddTagOpen(false);
      tagForm.reset();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to add tag: ${error}`,
      });
    },
  });
  
  // Mutation for updating a tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await apiRequest('PATCH', `/api/tags/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tag updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
      setIsEditTagOpen(false);
      editTagForm.reset();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update tag: ${error}`,
      });
    },
  });
  
  // Mutation for deleting a category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/categories/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Category deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      // Reset to 'all' if the deleted category was selected
      onCategoryChange(['all']);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete category: ${error}`,
      });
    },
  });
  
  // Mutation for deleting a tag
  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/tags/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Tag deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to delete tag: ${error}`,
      });
    },
  });

  const handleCategoryChange = (categoryName: string, checked: boolean) => {
    let newCategories: string[];
    
    // If 'all' is selected, deselect everything else
    if (categoryName === 'all' && checked) {
      newCategories = ['all'];
    } 
    // If not 'all' and checked, remove 'all' from selection
    else if (categoryName !== 'all' && checked) {
      newCategories = selectedCategories.filter(cat => cat !== 'all');
      newCategories.push(categoryName);
    } 
    // If unchecked, just remove from selection
    else {
      newCategories = selectedCategories.filter(cat => cat !== categoryName);
      // If nothing is selected, select 'all'
      if (newCategories.length === 0) {
        newCategories = ['all'];
      }
    }
    
    onCategoryChange(newCategories);
  };

  // Filter tags based on search input
  const filteredTags = tagFilter 
    ? tags.filter(tag => tag.name.toLowerCase().includes(tagFilter.toLowerCase())) 
    : tags;

  const onSubmitCategory = (data: { name: string }) => {
    addCategoryMutation.mutate({ name: data.name });
  };

  const onSubmitTag = (data: { name: string }) => {
    addTagMutation.mutate({ name: data.name });
  };
  
  const onSubmitEditCategory = (data: { name: string }) => {
    updateCategoryMutation.mutate({ id: editingCategoryId, name: data.name });
  };
  
  const onSubmitEditTag = (data: { name: string }) => {
    updateTagMutation.mutate({ id: editingTagId, name: data.name });
  };

  return (
    <aside className="bg-card shadow-sm lg:w-72 lg:flex-shrink-0 border-r border-border/50">
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Filter className="h-5 w-5 text-primary mr-2" />
              <h2 className="text-lg font-medium">Filters</h2>
            </div>
          </div>

          {/* Clear all filters button */}
          {(selectedCategories.length > 0 && !selectedCategories.includes('all')) || 
           selectedTags.length > 0 ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mb-4 text-xs h-8 w-full justify-start text-muted-foreground hover:text-foreground"
              onClick={() => {
                onCategoryChange(['all']);
                // Clear selected tags by calling onTagSelect for each selected tag
                selectedTags.forEach(tag => onTagSelect(tag));
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear all filters
            </Button>
          ) : null}
          
          {/* Category Filters */}
          <Collapsible open={categoriesOpen} onOpenChange={setCategoriesOpen} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                    {categoriesOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div className="flex items-center">
                  <Book className="h-4 w-4 text-primary mr-1.5" />
                  <h3 className="text-sm font-medium">Categories</h3>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0" 
                onClick={() => setIsAddCategoryOpen(true)}
                title="Add New Category"
              >
                <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            </div>

            <CollapsibleContent className="space-y-1 ml-6">
              <div className="flex items-center px-2 py-1.5 rounded-md hover:bg-muted/50">
                <Checkbox 
                  id="category-all" 
                  checked={selectedCategories.includes('all')}
                  onCheckedChange={(checked) => 
                    handleCategoryChange('all', checked as boolean)
                  }
                  className="mr-2"
                />
                <Label htmlFor="category-all" className="text-sm cursor-pointer flex-1">
                  All Categories
                </Label>
              </div>
              
              {categories.map(category => (
                <div key={category.id} className="flex items-center px-2 py-1.5 rounded-md hover:bg-muted/50">
                  <Checkbox 
                    id={`category-${category.id}`} 
                    checked={selectedCategories.includes(category.name.toLowerCase())}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(category.name.toLowerCase(), checked as boolean)
                    }
                    className="mr-2"
                  />
                  <Label 
                    htmlFor={`category-${category.id}`} 
                    className="text-sm cursor-pointer flex-1"
                  >
                    {category.name}
                  </Label>
                  
                  {isAdmin && (
                    <div className="flex items-center">
                      <Button
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary ml-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingCategoryId(category.id);
                          setEditCategoryName(category.name);
                          setIsEditCategoryOpen(true);
                        }}
                        title="Edit Category"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${category.name}" category?`)) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                        title="Delete Category"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
          
          <Separator className="my-4" />
          
          {/* Tag Filters */}
          <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-0 hover:bg-transparent">
                    {tagsOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div className="flex items-center">
                  <TagIcon className="h-4 w-4 text-primary mr-1.5" />
                  <h3 className="text-sm font-medium">Tags</h3>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0" 
                onClick={() => setIsAddTagOpen(true)}
                title="Add New Tag"
              >
                <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            </div>
            
            <CollapsibleContent className="ml-6">
              <div className="mb-3">
                <Input
                  placeholder="Search tags..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-2">
                {filteredTags.length > 0 ? (
                  filteredTags.map(tag => (
                    <Badge
                      key={tag.id}
                      className={`${
                        selectedTags.includes(tag.name.toLowerCase())
                          ? 'bg-primary text-primary-foreground'
                          : getTagColor(tag.name)
                      } cursor-pointer`}
                    >
                      <span onClick={() => onTagSelect(tag.name.toLowerCase())}>
                        {tag.name}
                      </span>
                      
                      {isAdmin && (
                        <span className="flex">
                          <span
                            className="ml-1 cursor-pointer hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTagId(tag.id);
                              setEditTagName(tag.name);
                              setIsEditTagOpen(true);
                            }}
                            title="Edit Tag"
                          >
                            <PencilIcon className="h-3 w-3 mr-1" />
                          </span>
                          <span
                            className="cursor-pointer hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Are you sure you want to delete "${tag.name}" tag?`)) {
                                deleteTagMutation.mutate(tag.id);
                              }
                            }}
                            title="Delete Tag"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </span>
                      )}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No matching tags</p>
                )}
              </div>
              
              {/* Selected tags section */}
              {selectedTags.length > 0 && (
                <div className="ml-6 mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Selected Tags:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTags.map(tag => (
                      <Badge
                        key={`selected-${tag}`}
                        className="bg-primary text-primary-foreground flex items-center gap-1"
                      >
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-accent-foreground" 
                          onClick={() => onTagSelect(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              Add New Category
            </DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddCategoryOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={addCategoryMutation.isPending}
                >
                  {addCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Category
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilIcon className="h-5 w-5 text-primary" />
              Edit Category
            </DialogTitle>
          </DialogHeader>
          <Form {...editCategoryForm}>
            <form onSubmit={editCategoryForm.handleSubmit(onSubmitEditCategory)} className="space-y-4">
              <FormField
                control={editCategoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditCategoryOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={updateCategoryMutation.isPending}
                >
                  {updateCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add Tag Dialog */}
      <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-primary" />
              Add New Tag
            </DialogTitle>
          </DialogHeader>
          <Form {...tagForm}>
            <form onSubmit={tagForm.handleSubmit(onSubmitTag)} className="space-y-4">
              <FormField
                control={tagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tag name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddTagOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={addTagMutation.isPending}
                >
                  {addTagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Tag
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={isEditTagOpen} onOpenChange={setIsEditTagOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PencilIcon className="h-5 w-5 text-primary" />
              Edit Tag
            </DialogTitle>
          </DialogHeader>
          <Form {...editTagForm}>
            <form onSubmit={editTagForm.handleSubmit(onSubmitEditTag)} className="space-y-4">
              <FormField
                control={editTagForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tag Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tag name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditTagOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={updateTagMutation.isPending}
                >
                  {updateTagMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      

    </aside>
  );
}