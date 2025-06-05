import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Reference, Category, Tag } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import {
  BookmarkPlus,
  Link as LinkIcon,
  Save,
  Loader2,
  Tag as TagIcon,
  Image,
  FileText,
} from "lucide-react";

interface AddEditReferenceDialogProps {
  isOpen: boolean;
  reference: Reference | null;
  categories: Category[];
  tags: Tag[];
  onClose: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  link: z.string().url("Valid URL is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  tags: z.string().array().min(1, "At least one tag is required"),
  thumbnail: z.string().optional(),
});

type ReferenceFormData = z.infer<typeof formSchema>;

export default function AddEditReferenceDialog({
  isOpen,
  reference,
  categories,
  tags,
  onClose,
}: AddEditReferenceDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  // const [, navigate] = useLocation();
  const isEditing = !!reference;
  const [tagInput, setTagInput] = useState("");

  const form = useForm<ReferenceFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      link: "",
      description: "",
      category: "",
      tags: [],
      thumbnail: "",
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
      setTagInput(reference.tags.join(", "));
    } else {
      form.reset({
        title: "",
        link: "",
        description: "",
        category: "",
        tags: [],
        thumbnail: "",
      });
      setTagInput("");
    }
  }, [reference, form]);

  // Parse tags from comma-separated input
  const parseTagsFromInput = (input: string): string[] => {
    return input
      .split(",")
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  // Get tag suggestions based on current input
  const getTagSuggestions = (input: string): Tag[] => {
    if (!input.trim()) return [];
    
    const currentTags = parseTagsFromInput(input);
    const lastTag = currentTags[currentTags.length - 1] || "";
    
    if (!lastTag) return [];
    
    return tags
      .filter(tag => 
        tag.name.toLowerCase().includes(lastTag.toLowerCase()) &&
        !currentTags.includes(tag.name)
      )
      .slice(0, 5);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ReferenceFormData) => {
      return await apiRequest("POST", "/api/references", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/references"] });
      onClose();
      form.reset();
      setTagInput("");
      toast({
        title: "Reference Created",
        description: "Reference has been created successfully. Thumbnail will be generated in the background.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create reference",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ReferenceFormData) => {
      return await apiRequest("PATCH", `/api/references/${reference!.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/references"] });
      onClose();
      form.reset();
      setTagInput("");
      toast({
        title: "Reference Updated",
        description: "Reference has been updated successfully. Thumbnail will be regenerated if URL changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update reference",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ReferenceFormData) => {
    const processedData = {
      ...data,
      tags: parseTagsFromInput(tagInput),
    };

    if (isEditing) {
      updateMutation.mutate(processedData);
    } else {
      createMutation.mutate(processedData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleTagInputChange = (value: string) => {
    setTagInput(value);
  };

  const addTagFromSuggestion = (tagName: string) => {
    const currentTags = parseTagsFromInput(tagInput);
    if (currentTags.length > 0) {
      // Replace the last incomplete tag with the selected one
      currentTags[currentTags.length - 1] = tagName;
      setTagInput(currentTags.join(", ") + ", ");
    } else {
      setTagInput(tagName + ", ");
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <FileText className="h-5 w-5" />
                Edit Reference
              </>
            ) : (
              <>
                <BookmarkPlus className="h-5 w-5" />
                Add New Reference
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter reference title..."
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* URL Field */}
              <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Thumbnail Generation Info */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Image className="h-4 w-4" />
                  <span>Thumbnail will be generated automatically in the background</span>
                </div>
              </div>

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this reference..."
                        className="min-h-[100px]"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Field */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tags Field */}
              <FormField
                control={form.control}
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4" />
                      Tags
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          placeholder="Enter tags separated by commas (e.g., react, javascript, tutorial)"
                          value={tagInput}
                          onChange={(e) => handleTagInputChange(e.target.value)}
                          disabled={isLoading}
                        />
                        
                        {/* Tag Suggestions */}
                        {tagInput && getTagSuggestions(tagInput).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground">Suggestions:</span>
                            {getTagSuggestions(tagInput).map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="cursor-pointer hover:bg-muted"
                                onClick={() => addTagFromSuggestion(tag.name)}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Current Tags Preview */}
                        {tagInput && parseTagsFromInput(tagInput).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground">Current tags:</span>
                            {parseTagsFromInput(tagInput).map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 pt-4">
          <Separator className="mb-4" />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isLoading ? "Saving..." : (isEditing ? "Update Reference" : "Create Reference")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}