import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Reference, Category, Tag, ReferenceFormData } from "@/types";
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
  RefreshCw,
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

export default function AddEditReferenceDialog({
  isOpen,
  reference,
  categories,
  tags,
  onClose,
}: AddEditReferenceDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isEditing = !!reference;
  const [tagInput, setTagInput] = useState("");
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);
  const [thumbnailError, setThumbnailError] = useState(false);

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
      setThumbnailPreview(reference.thumbnail || "");
      setThumbnailGenerated(true);
      setThumbnailError(false);
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
      setThumbnailPreview("");
      setThumbnailGenerated(false);
      setThumbnailError(false);
      setTagInput("");
    }
  }, [reference, form]);

  // Auto-generate thumbnail when required fields are filled
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!isEditing && values.title && values.link && values.category && !thumbnailGenerated && !isGeneratingThumbnail) {
        generateThumbnail();
      }
    });
    return () => subscription.unsubscribe();
  }, [form, isEditing, thumbnailGenerated, isGeneratingThumbnail]);

  // Parse tags from comma-separated input
  const parseTagsFromInput = (input: string): string[] => {
    return input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  // Handle tag input changes
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    const parsedTags = parseTagsFromInput(value);
    form.setValue("tags", parsedTags);
  };

  // Get tag suggestions for autocomplete
  const getTagSuggestions = () => {
    if (!tagInput) return [];
    const currentTags = parseTagsFromInput(tagInput);
    const lastTag = currentTags[currentTags.length - 1] || '';
    
    return tags
      .filter(tag => 
        tag.name.toLowerCase().includes(lastTag.toLowerCase()) &&
        !currentTags.includes(tag.name)
      )
      .slice(0, 5);
  };

  // Function to generate thumbnail
  const generateThumbnail = async () => {
    const formData = form.getValues();
    if (!formData.link || !formData.title || !formData.category) {
      return;
    }

    setIsGeneratingThumbnail(true);
    setThumbnailError(false);
    setThumbnailGenerated(false);

    try {
      const response = await apiRequest("POST", "/api/thumbnails/generate", {
        url: formData.link,
        title: formData.title,
        category: formData.category,
      });

      const result = await response.json();
      if (result.success) {
        // Ensure the thumbnail path works for the frontend
        const thumbnailUrl = result.thumbnailPath.startsWith('/') ? result.thumbnailPath : `/${result.thumbnailPath}`;
        setThumbnailPreview(thumbnailUrl);
        form.setValue("thumbnail", result.thumbnailPath);
        setThumbnailGenerated(true);
        toast({
          title: "Thumbnail Generated",
          description: `Generated using ${result.method} method.`,
        });
      } else {
        throw new Error("Thumbnail generation failed");
      }
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
      setThumbnailError(true);
      setThumbnailGenerated(true);
      
      toast({
        title: "Generation Failed",
        description: "Could not generate thumbnail. The system will create one automatically when saving.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingThumbnail(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: ReferenceFormData) => {
      return await apiRequest("POST", "/api/references", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/references"] });
      onClose();
      form.reset();
      toast({
        title: "Reference added",
        description: "Your reference has been successfully added.",
      });
    },
    onError: (error: any) => {
      console.error("Error creating reference:", error);
      toast({
        title: "Error adding reference",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ReferenceFormData) => {
      return await apiRequest("PATCH", `/api/references/${reference?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/references"] });
      onClose();
      form.reset();
      toast({
        title: "Reference updated",
        description: "Your reference has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error("Error updating reference:", error);
      toast({
        title: "Error updating reference",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: ReferenceFormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to add or edit references.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const submitDisabled = isLoading || isGeneratingThumbnail || (!isEditing && !thumbnailGenerated);

  const tagSuggestions = getTagSuggestions();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-5 w-5" />
            {isEditing ? "Edit Reference" : "Add New Reference"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the reference information below."
              : "Add a new reference to your collection. The system will automatically generate a thumbnail for you."}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-1">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Title Field */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Title
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter reference title"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Link Field */}
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

              {/* Thumbnail Preview Section - Moved after URL */}
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Thumbnail Preview
                  {isGeneratingThumbnail && (
                    <span className="text-sm text-muted-foreground">(Generating...)</span>
                  )}
                  {thumbnailGenerated && !thumbnailError && (
                    <span className="text-sm text-green-600">(Ready)</span>
                  )}
                  {thumbnailError && (
                    <span className="text-sm text-orange-600">(Will generate automatically)</span>
                  )}
                </FormLabel>
                <div className="flex items-center gap-3">
                  {isGeneratingThumbnail ? (
                    <div className="w-40 h-24 bg-muted rounded-lg flex flex-col items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      <span className="text-xs text-muted-foreground">Generating thumbnail...</span>
                    </div>
                  ) : thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-40 h-24 object-cover rounded-lg border"
                    />
                  ) : (
                    <div className="w-40 h-24 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-xs text-muted-foreground text-center">
                        {isEditing ? "Click regenerate to update thumbnail" : "Fill in title, URL, and category to generate thumbnail"}
                      </span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateThumbnail}
                    disabled={isGeneratingThumbnail || !form.watch("title") || !form.watch("link") || !form.watch("category")}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGeneratingThumbnail ? "animate-spin" : ""}`} />
                    {isGeneratingThumbnail ? "Generating..." : (isEditing ? "Regenerate" : "Generate")}
                  </Button>
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

              {/* Tags Field - Free Flow with Autocomplete */}
              <FormField
                control={form.control}
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4" />
                      Tags
                    </FormLabel>
                    <FormDescription>
                      Enter tags separated by commas. New tags will be created automatically.
                    </FormDescription>
                    <div className="space-y-3">
                      {/* Tag Input */}
                      <FormControl>
                        <Input
                          placeholder="Enter tags separated by commas (e.g., react, javascript, tutorial)"
                          value={tagInput}
                          onChange={(e) => handleTagInputChange(e.target.value)}
                          disabled={isLoading}
                        />
                      </FormControl>

                      {/* Tag Suggestions */}
                      {tagSuggestions.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Suggestions:</div>
                          <div className="flex flex-wrap gap-2">
                            {tagSuggestions.map((tag) => (
                              <Badge
                                key={tag.id}
                                variant="outline"
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => {
                                  const currentTags = parseTagsFromInput(tagInput);
                                  currentTags[currentTags.length - 1] = tag.name;
                                  const newInput = currentTags.join(", ");
                                  handleTagInputChange(newInput);
                                }}
                              >
                                {tag.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current Tags Preview */}
                      {tagInput && (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Current tags:</div>
                          <div className="flex flex-wrap gap-2">
                            {parseTagsFromInput(tagInput).map((tag, index) => (
                              <Badge key={index} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitDisabled}
            onClick={form.handleSubmit(onSubmit)}
            className="flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isGeneratingThumbnail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isLoading 
              ? (isEditing ? "Updating..." : "Adding...") 
              : isGeneratingThumbnail 
                ? "Generating Thumbnail..." 
                : (isEditing ? "Update Reference" : "Add Reference")
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}