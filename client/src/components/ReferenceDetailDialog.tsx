import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ExternalLink, 
  Heart, 
  User, 
  Calendar, 
  Tag, 
  ChevronLeft, 
  ChevronRight,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Reference } from "@/types";
import { getCategoryColor, getTagColor } from "@/lib/utils";

interface ReferenceDetailDialogProps {
  reference: Reference | null;
  isOpen: boolean;
  onClose: () => void;
  allReferences?: Reference[];
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export default function ReferenceDetailDialog({ 
  reference, 
  isOpen, 
  onClose,
  allReferences = [],
  onNavigate
}: ReferenceDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoved, setIsLoved] = React.useState(false);
  const [localLoveCount, setLocalLoveCount] = React.useState(0);
  
  const isAdmin = user?.isAdmin || false;
  
  // Update local state when reference changes
  React.useEffect(() => {
    if (reference) {
      setLocalLoveCount(reference.loveCount || 0);
      // Check if current user has loved this reference
      setIsLoved(false); // Reset for simplicity
    }
  }, [reference]);
  
  // Navigation logic - only calculate if reference exists
  const currentIndex = React.useMemo(() => {
    if (!reference || !allReferences.length) return -1;
    return allReferences.findIndex(ref => ref.id === reference.id);
  }, [reference, allReferences]);
  
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allReferences.length - 1;
  
  const handlePrevious = () => {
    if (hasPrevious && onNavigate) {
      onNavigate('prev');
    }
  };
  
  const handleNext = () => {
    if (hasNext && onNavigate) {
      onNavigate('next');
    }
  };
  
  // Love mutation
  const loveMutation = useMutation({
    mutationFn: async () => {
      if (!reference) throw new Error('No reference selected');
      const response = await apiRequest('POST', `/api/references/${reference.id}/love`);
      return response.json();
    },
    onSuccess: (data) => {
      const responseLoveCount = data.loveCount || 0;
      setLocalLoveCount(responseLoveCount);
      setIsLoved(!isLoved);
      
      toast({
        title: isLoved ? "Removed from favorites" : "Added to favorites",
        description: isLoved 
          ? "Resource removed from your favorites" 
          : "Resource added to your favorites",
      });
      
      // Invalidate and refetch references
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
    },
    onError: (error) => {
      console.error('Error toggling love:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleLoveClick = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add resources to favorites.",
        variant: "destructive",
      });
      return;
    }
    
    loveMutation.mutate();
  };

  // If no reference is provided, don't render anything
  if (!reference) {
    return null;
  }

  const { id, title, link, description, tags, category, thumbnail, createdBy, updatedAt } = reference;
  const formattedDate = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="space-y-3">
            <DialogTitle className="text-2xl font-bold gradient-text line-clamp-2">
              {title}
            </DialogTitle>
            
            {/* Navigation Controls - on separate line for mobile */}
            {allReferences.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground px-3">
                  {currentIndex + 1} of {allReferences.length}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Resource Details Card */}
          <Card>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Thumbnail */}
                <div className="md:col-span-1">
                  <div className="aspect-[4/3] rounded-lg overflow-hidden border-2 border-border bg-muted/30">
                    {thumbnail ? (
                      <img 
                        src={thumbnail} 
                        alt={title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ExternalLink className="h-12 w-12" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="md:col-span-1 space-y-4">
                  {/* Category */}
                  <div>
                    <div className="hidden md:block">
                      <h3 className="font-semibold mb-2">Category</h3>
                      <Badge 
                        variant="secondary" 
                        className={`${getCategoryColor(category)} text-white border-none text-lg font-bold px-4 py-2 shadow-md`}
                      >
                        {category.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="md:hidden">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Category:</span> {category}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  {description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {description}
                      </p>
                    </div>
                  )}

                  {/* Tags */}
                  {tags && tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => (
                          <Badge 
                            key={tag} 
                            variant="outline"
                            className={`${getTagColor(tag)} border-current`}
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Information */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>Created by {createdBy}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Updated {formattedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row">
          <Button
            variant="outline" 
            className={`flex-none ${isLoved ? 'bg-pink-500 hover:bg-pink-600 text-white border-none' : 'hover:text-pink-500 hover:border-pink-500'}`}
            onClick={handleLoveClick}
            disabled={loveMutation.isPending}
          >
            <Heart className={`h-4 w-4 mr-2 ${isLoved ? 'fill-current' : ''}`} />
            {localLoveCount} Love{localLoveCount !== 1 ? 's' : ''}
          </Button>
          
          <Button 
            variant="default" 
            className="flex-1"
            onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Visit Resource
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}