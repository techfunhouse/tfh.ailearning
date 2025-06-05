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
import { ScrollArea } from "@/components/ui/scroll-area";
import { getTagColor } from "@/lib/utils";
import {
  BookmarkPlus,
  Link as LinkIcon,
  Save,
  Loader2,
  Tag as TagIcon,
  Image,
  FileText,
  Check,
  AlertCircle,
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
  const { user, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const isEditing = !!reference;
  const [tagFilter, setTagFilter] = useState("");
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");

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
    }
  }, [reference, form]);

  // Function to generate thumbnail using the new local system
  const generateThumbnail = async () => {
    const formData = form.getValues();
    if (!formData.link || !formData.title || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in URL, title, and category before generating thumbnail.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingThumbnail(true);
    try {
      const response = await apiRequest("/api/thumbnails/generate", {
        method: "POST",
        body: JSON.stringify({
          url: formData.link,
          title: formData.title,
          category: formData.category,
        }),
      });

      if (response.success) {
        setThumbnailPreview(response.thumbnailPath);
        form.setValue("thumbnail", response.thumbnailPath);
        toast({
          title: "Thumbnail Generated",
          description: `Generated using ${response.method} method.`,
        });
      }
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
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
      return await apiRequest("/api/references", {
        method: "POST",
        body: JSON.stringify(data),
      });
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
      return await apiRequest(`/api/references/${reference?.id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
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

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(tagFilter.toLowerCase())
  );

  const selectedTags = form.watch("tags") || [];

  const toggleTag = (tagName: string) => {
    const currentTags = form.getValues("tags") || [];
    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((t) => t !== tagName)
      : [...currentTags, tagName];
    form.setValue("tags", newTags);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Thumbnail Preview Section */}
            {(thumbnailPreview || isGeneratingThumbnail) && (
              <div className="space-y-2">
                <FormLabel className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Thumbnail Preview
                </FormLabel>
                <div className="flex items-center gap-3">
                  {isGeneratingThumbnail ? (
                    <div className="w-40 h-24 bg-muted rounded-lg flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : thumbnailPreview ? (
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-40 h-24 object-cover rounded-lg border"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateThumbnail}
                    disabled={isGeneratingThumbnail}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGeneratingThumbnail ? "animate-spin" : ""}`} />
                    {isGeneratingThumbnail ? "Generating..." : "Generate Thumbnail"}
                  </Button>
                </div>
              </div>
            )}

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
                  <FormDescription>
                    Search and select tags for this reference.
                  </FormDescription>
                  <div className="space-y-3">
                    {/* Selected Tags */}
                    {selectedTags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tagName) => (
                          <Badge
                            key={tagName}
                            variant="secondary"
                            className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            style={{ backgroundColor: getTagColor(tagName) }}
                            onClick={() => toggleTag(tagName)}
                          >
                            {tagName}
                            <Check className="ml-1 h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Tag Search */}
                    <Input
                      placeholder="Search tags..."
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      disabled={isLoading}
                    />

                    {/* Available Tags */}
                    <ScrollArea className="h-32 w-full border rounded-md p-2">
                      <div className="flex flex-wrap gap-2">
                        {filteredTags.map((tag) => {
                          const isSelected = selectedTags.includes(tag.name);
                          return (
                            <Badge
                              key={tag.id}
                              variant={isSelected ? "default" : "outline"}
                              className="cursor-pointer"
                              style={
                                isSelected
                                  ? { backgroundColor: getTagColor(tag.name) }
                                  : {}
                              }
                              onClick={() => toggleTag(tag.name)}
                            >
                              {tag.name}
                              {isSelected && <Check className="ml-1 h-3 w-3" />}
                            </Badge>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isEditing ? "Update Reference" : "Add Reference"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}