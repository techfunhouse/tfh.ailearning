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
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Navigation Controls */}
              {allReferences.length > 1 && (
                <div className="flex items-center gap-2 mr-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={!hasPrevious}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-muted-foreground px-2">
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
              
              <DialogTitle className="text-xl font-semibold line-clamp-2">
                {title}
              </DialogTitle>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Thumbnail and Basic Info */}
            <div className="flex gap-6">
              {/* Thumbnail */}
              <div className="flex-shrink-0">
                <div className="w-32 h-24 rounded-lg overflow-hidden border bg-muted">
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
                    <ExternalLink className="h-8 w-8" />
                  </div>
                </div>
              </div>
              
              {/* Basic Info */}
              <div className="flex-1 space-y-3">
                {/* Category Badge */}
                <div>
                  <Badge 
                    variant="secondary" 
                    className={`${getCategoryColor(category)} text-white border-none`}
                  >
                    {category}
                  </Badge>
                </div>
                
                {/* Tags */}
                {tags && tags.length > 0 && (
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
                )}
                
                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{createdBy}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {description && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="border-t p-6 flex-shrink-0">
          <div className="flex gap-3">
            <Button
              variant="outline" 
              size="sm"
              className={`flex-none ${isLoved ? 'bg-pink-500 hover:bg-pink-600 text-white border-none' : 'hover:text-pink-500 hover:border-pink-500'}`}
              onClick={handleLoveClick}
              disabled={loveMutation.isPending}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLoved ? 'fill-current' : ''}`} />
              {localLoveCount}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}