import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Reference, Category, Tag, ReferenceFormData } from '@/types';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { getTagColor } from '@/lib/utils';
import { 
  BookmarkPlus, 
  Link as LinkIcon, 
  Save, 
  Loader2, 
  Tag as TagIcon,
  Image,
  FileText,
  Check, 
  AlertCircle
} from 'lucide-react';

interface AddEditReferenceDialogProps {
  isOpen: boolean;
  reference: Reference | null;
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  link: z.string().url('Valid URL is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category is required'),
  tags: z.string().array().min(1, 'At least one tag is required'),
  thumbnail: z.string().url('Valid thumbnail URL is required'),
});

export default function AddEditReferenceDialog({
  isOpen,
  reference,
  categories,
  tags,
  onClose,
}: AddEditReferenceDialogProps) {
  const { toast } = useToast();
  const isEditing = !!reference;
  const [tagFilter, setTagFilter] = useState('');
  const [isFetchingThumbnail, setIsFetchingThumbnail] = useState(false);
  const [thumbnailFetched, setThumbnailFetched] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);
  const DEFAULT_THUMBNAIL = 'https://unsplash.com/photos/black-and-silver-laptop-computer-NoOrDKxUfzo';

  const form = useForm<ReferenceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      link: '',
      description: '',
      category: '',
      tags: [],
      thumbnail: '',
    },
  });

  // Reset form when reference changes
  useEffect(() => {
    if (reference) {
      form.reset({
        title: reference.title,
        link: reference.link,
        description: reference.description,
        category: reference.category,
        tags: reference.tags,
        thumbnail: reference.thumbnail,
      });
      setThumbnailFetched(true); // Mark as fetched for existing references
    } else {
      form.reset({
        title: '',
        link: '',
        description: '',
        category: '',
        tags: [],
        thumbnail: '',
      });
      setThumbnailFetched(false);
      setThumbnailError(false);
    }
  }, [reference, form]);
  
  // Function to fetch thumbnail from microlink.io
  const fetchThumbnailFromUrl = async (url: string) => {
    if (!url || url.trim() === '') return;
    
    try {
      setIsFetchingThumbnail(true);
      setThumbnailError(false);
      
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true`);
      const data = await response.json();
      
      if (data.status === 'success' && data.data?.screenshot?.url) {
        form.setValue('thumbnail', data.data.screenshot.url);
        setThumbnailFetched(true);
        toast({
          title: "Thumbnail generated",
          description: "A thumbnail image has been automatically generated.",
          duration: 3000,
        });
      } else {
        throw new Error('Failed to generate thumbnail');
      }
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      setThumbnailError(true);
      form.setValue('thumbnail', DEFAULT_THUMBNAIL);
      toast({
        title: "Thumbnail generation failed",
        description: "Using default thumbnail instead.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsFetchingThumbnail(false);
    }
  };

  // Create mutation for adding a reference
  const addMutation = useMutation({
    mutationFn: async (data: ReferenceFormData) => {
      const response = await apiRequest('POST', '/api/references', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Reference added successfully',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to add reference: ${error}`,
      });
    },
  });

  // Update mutation for editing a reference
  const updateMutation = useMutation({
    mutationFn: async (data: ReferenceFormData) => {
      const response = await apiRequest('PUT', `/api/references/${reference?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Reference updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
      onClose();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update reference: ${error}`,
      });
    },
  });

  const onSubmit = async (data: ReferenceFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      addMutation.mutate(data);
    }
  };

  // Consider a form "pending" if it's submitting OR if it's actively fetching a thumbnail
  const isPending = addMutation.isPending || updateMutation.isPending || isFetchingThumbnail;

  // Filter tags based on search input
  const filteredTags = tagFilter 
    ? tags.filter(tag => tag.name.toLowerCase().includes(tagFilter.toLowerCase())) 
    : tags;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isEditing ? (
              <>
                <Save className="h-5 w-5 text-primary" />
                Edit Reference
              </>
            ) : (
              <>
                <BookmarkPlus className="h-5 w-5 text-primary" />
                Add New Reference
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update the details of your reference below."
              : "Add a new reference to your collection."}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(80vh-10rem)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <BookmarkPlus className="h-4 w-4 text-primary" />
                      Title
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a descriptive title" 
                        {...field} 
                        className="focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <LinkIcon className="h-4 w-4 text-primary" />
                      URL
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/resource" 
                        {...field} 
                        className="focus-visible:ring-primary"
                        onBlur={(e) => {
                          field.onBlur(); // Call the original onBlur
                          const url = e.target.value;
                          if (url && !isEditing && !thumbnailFetched && !isFetchingThumbnail) {
                            // Only fetch thumbnail if URL is valid
                            const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
                            if (urlRegex.test(url)) {
                              fetchThumbnailFromUrl(url);
                            }
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {isFetchingThumbnail ? (
                        <span className="flex items-center text-amber-500">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Generating thumbnail...
                        </span>
                      ) : thumbnailFetched ? (
                        <span className="flex items-center text-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Thumbnail generated
                        </span>
                      ) : thumbnailError ? (
                        <span className="flex items-center text-red-500">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Using default thumbnail
                        </span>
                      ) : (
                        "The direct link to the reference resource"
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-primary" />
                      Description
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Provide a brief summary of this reference" 
                        {...field} 
                        className="min-h-24 focus-visible:ring-primary"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid sm:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <TagIcon className="h-4 w-4 text-primary" />
                        Category
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="focus:ring-primary">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.name.toLowerCase()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="thumbnail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Image className="h-4 w-4 text-primary" />
                        Thumbnail
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input 
                            placeholder="https://example.com/image.jpg" 
                            {...field} 
                            className="focus-visible:ring-primary"
                            disabled={isFetchingThumbnail}
                          />
                          {field.value && (
                            <div className="relative h-32 w-full overflow-hidden rounded-md border">
                              <img 
                                src={field.value} 
                                alt="Thumbnail preview" 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = DEFAULT_THUMBNAIL;
                                  setThumbnailError(true);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <TagIcon className="h-4 w-4 text-primary" />
                      Tags
                    </FormLabel>
                    <Input
                      placeholder="Filter tags..."
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="mb-3 h-8 text-sm focus-visible:ring-primary"
                    />
                    <FormControl>
                      <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-12 bg-muted/20">
                        {filteredTags.map(tag => (
                          <Badge
                            key={tag.id}
                            variant={field.value.includes(tag.name.toLowerCase()) ? "default" : "outline"}
                            className={`cursor-pointer transition-all ${
                              field.value.includes(tag.name.toLowerCase())
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : `hover:bg-muted ${getTagColor(tag.name)}`
                            }`}
                            onClick={() => {
                              const tagName = tag.name.toLowerCase();
                              const newTags = field.value.includes(tagName)
                                ? field.value.filter(t => t !== tagName)
                                : [...field.value, tagName];
                              field.onChange(newTags);
                            }}
                          >
                            {field.value.includes(tag.name.toLowerCase()) && (
                              <Check className="mr-1 h-3 w-3" />
                            )}
                            {tag.name}
                          </Badge>
                        ))}
                        {filteredTags.length === 0 && (
                          <div className="text-sm text-muted-foreground p-1">
                            No matching tags
                          </div>
                        )}
                      </div>
                    </FormControl>
                    {field.value.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Selected tags:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {field.value.map(tag => (
                            <Badge
                              key={`selected-${tag}`}
                              className="bg-primary text-primary-foreground"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </ScrollArea>

        <DialogFooter className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={isPending} className="gap-2">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEditing ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? 'Update Reference' : 'Add Reference'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
