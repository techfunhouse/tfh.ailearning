import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
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
  Loader2
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

  // Form setup for adding a new category
  const categoryForm = useForm<{ name: string }>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
    },
  });

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

            <CollapsibleContent>
              <div className="ml-6 mb-3">
                <Input
                  placeholder="Filter tags..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="h-8 text-sm bg-muted/40"
                />
              </div>
              
              <div className="ml-6 flex flex-wrap gap-1.5">
                {filteredTags.length > 0 ? (
                  filteredTags.map(tag => (
                    <Badge
                      key={tag.id}
                      variant={selectedTags.includes(tag.name.toLowerCase()) ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        selectedTags.includes(tag.name.toLowerCase())
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : `hover:bg-muted ${getTagColor(tag.name)}`
                      }`}
                      onClick={() => onTagSelect(tag.name.toLowerCase())}
                    >
                      {tag.name}
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
                      <Input placeholder="Enter category name" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddCategoryOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addCategoryMutation.isPending}
                  className="gap-1"
                >
                  {addCategoryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Add Category
                    </>
                  )}
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
                      <Input placeholder="Enter tag name" {...field} autoFocus />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddTagOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addTagMutation.isPending}
                  className="gap-1"
                >
                  {addTagMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Add Tag
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
