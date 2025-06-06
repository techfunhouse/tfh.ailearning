
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Category, InsertCategory } from '@/types';
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
  Loader2,
  Pencil as PencilIcon
} from 'lucide-react';
import { getTagColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useAuth } from '@/hooks/useAuth';
import ConfirmationDialog from './ConfirmationDialog';

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
  tags: string[];
  selectedCategories: string[];
  selectedTags: string[];
  isAdmin: boolean;
  onCategoryChange: (categories: string[]) => void;
  onTagSelect: (tag: string) => void;
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

export default function Sidebar({
  categories,
  tags,
  selectedCategories,
  selectedTags,
  isAdmin,
  onCategoryChange,
  onTagSelect,
  isCollapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [tagFilter, setTagFilter] = useState('');
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string>('');
  const [editCategoryName, setEditCategoryName] = useState('');

  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [isDeleteTagDialogOpen, setIsDeleteTagDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{id: string, name: string} | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  


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
    mutationFn: async (tagName: string) => {
      const response = await apiRequest('POST', '/api/tags', { tag: tagName });
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

  // Filter tags based on search input with proper type checking
  const filteredTags = tagFilter 
    ? tags.filter(tag => {
        if (typeof tag === 'string') {
          return tag.toLowerCase().includes(tagFilter.toLowerCase());
        } else if (tag && typeof tag === 'object' && 'name' in tag) {
          // Handle legacy tag objects during migration
          return (tag as any).name.toLowerCase().includes(tagFilter.toLowerCase());
        }
        return false;
      })
    : tags;

  const onSubmitCategory = (data: { name: string }) => {
    addCategoryMutation.mutate({ name: data.name });
  };

  const onSubmitTag = (data: { name: string }) => {
    addTagMutation.mutate(data.name);
  };
  
  const onSubmitEditCategory = (data: { name: string }) => {
    updateCategoryMutation.mutate({ id: editingCategoryId, name: data.name });
  };
  

  
  // Handle category deletion confirmation
  const handleConfirmCategoryDelete = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
      setIsDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    }
  };
  
  // Handle tag deletion confirmation
  const handleConfirmTagDelete = () => {
    if (tagToDelete) {
      deleteTagMutation.mutate(tagToDelete);
      setIsDeleteTagDialogOpen(false);
      setTagToDelete(null);
    }
  };



  return (
    <>
      <aside className={`bg-card shadow-sm lg:flex-shrink-0 border-r border-border/50 transition-all duration-300 ${isCollapsed ? 'lg:w-16' : 'lg:w-72'}`}>
        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className={`px-4 py-6 ${isCollapsed ? 'px-2' : ''}`}>
            <div className={`flex items-center justify-between mb-6 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="flex items-center">
                <Filter className="h-5 w-5 text-primary mr-2" />
                {!isCollapsed && <h2 className="text-lg font-medium">Filters</h2>}
              </div>
            </div>

            {/* Clear all filters button */}
            {!isCollapsed && ((selectedCategories.length > 0 && !selectedCategories.includes('all')) || 
             selectedTags.length > 0) ? (
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
            {isCollapsed ? (
              <div className="mb-4 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  title="Categories"
                  onClick={() => onToggleCollapsed && onToggleCollapsed()}
                >
                  <Book className="h-4 w-4 text-primary" />
                </Button>
              </div>
            ) : (
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
                  
                  {user && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => setIsAddCategoryOpen(true)}
                      title="Add New Category"
                    >
                      <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  )}
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
                      checked={selectedCategories.includes(category.name)}
                      onCheckedChange={(checked) => 
                        handleCategoryChange(category.name, checked as boolean)
                      }
                      className="mr-2"
                    />
                    <Label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer flex-1">
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
                            setCategoryToDelete({id: category.id, name: category.name});
                            setIsDeleteCategoryDialogOpen(true);
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
            )}
            
            {/* Tags Filter */}
            {isCollapsed ? (
              <div className="mb-4 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  title="Tags"
                  onClick={() => onToggleCollapsed && onToggleCollapsed()}
                >
                  <TagIcon className="h-4 w-4 text-primary" />
                </Button>
              </div>
            ) : (
              <Collapsible open={tagsOpen} onOpenChange={setTagsOpen} className="mb-4">
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
                  
                  {user && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0" 
                      onClick={() => setIsAddTagOpen(true)}
                      title="Add New Tag"
                    >
                      <PlusCircle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  )}
                </div>
              
              <CollapsibleContent className="ml-6">
                <div className="mb-2">
                  <Input
                    placeholder="Search tags..."
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {filteredTags.map(tag => {
                    // Handle both string and object formats during migration
                    const tagName = typeof tag === 'string' ? tag : (tag as any)?.name || 'Unknown';
                    const tagKey = typeof tag === 'string' ? tag : (tag as any)?.id || tagName;
                    
                    return (
                      <Badge 
                        key={tagKey} 
                        variant={selectedTags.includes(tagName) ? "default" : "outline"}
                        className={`cursor-pointer ${selectedTags.includes(tagName) ? 'text-white' : 'hover:bg-muted'}`}
                        style={{
                          backgroundColor: selectedTags.includes(tagName) ? getTagColor(tagName) : 'transparent',
                          borderColor: getTagColor(tagName),
                          color: selectedTags.includes(tagName) ? 'white' : 'hsl(var(--foreground))',
                        }}
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent event bubbling
                          onTagSelect(tagName);
                        }}
                      >
                        {tagName}
                        {isAdmin && (
                          <span className="flex items-center ml-1.5">
                            <span
                              className="cursor-pointer hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTagToDelete(tagName);
                                setIsDeleteTagDialogOpen(true);
                              }}
                              title="Delete Tag"
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                  {filteredTags.length === 0 && (
                    <div className="text-sm text-muted-foreground py-2">No tags found</div>
                  )}
                </div>
              </CollapsibleContent>
              </Collapsible>
            )}
            

          </div>
        </ScrollArea>
      </aside>
        
      {/* Add Category Dialog */}
        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
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
                    type="submit" 
                    disabled={addCategoryMutation.isPending}
                  >
                    {addCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              <DialogTitle>Edit Category</DialogTitle>
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
                    type="submit" 
                    disabled={updateCategoryMutation.isPending}
                  >
                    {updateCategoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
              <DialogTitle>Add New Tag</DialogTitle>
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
                    type="submit" 
                    disabled={addTagMutation.isPending}
                  >
                    {addTagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Tag
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        

        

      
      {/* Category delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={isDeleteCategoryDialogOpen}
        title="Delete Category"
        description={categoryToDelete ? `Are you sure you want to delete "${categoryToDelete.name}" category? All references in this category will be affected.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmCategoryDelete}
        onCancel={() => {
          setIsDeleteCategoryDialogOpen(false);
          setCategoryToDelete(null);
        }}
      />
      
      {/* Tag delete confirmation dialog */}
      <ConfirmationDialog
        isOpen={isDeleteTagDialogOpen}
        title="Delete Tag"
        description={tagToDelete ? `Are you sure you want to delete "${tagToDelete}" tag? This will remove the tag from all references.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmTagDelete}
        onCancel={() => {
          setIsDeleteTagDialogOpen(false);
          setTagToDelete(null);
        }}
      />
    </>
  );
}