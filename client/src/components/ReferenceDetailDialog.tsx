import * as React from "react";
import { Reference } from '@/types';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, ExternalLink, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getCategoryColor, getTagColor } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
  const isAdmin = user?.isAdmin || false;
  
  // If no reference is provided, don't render the dialog content
  if (!reference) return null;
  
  const { id, title, link, description, tags, category, thumbnail, createdBy, updatedAt } = reference;
  const loveCount = reference.loveCount || 0;
  
  const [isLoved, setIsLoved] = React.useState(false);
  const [localLoveCount, setLocalLoveCount] = React.useState(loveCount);
  
  // Navigation logic
  const currentIndex = allReferences.findIndex(ref => ref.id === id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allReferences.length - 1;
  
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
  
  // Format the date
  const formattedDate = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  
  // Love mutation
  const loveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/references/${id}/love`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update local state with defaults in case data is incomplete
      const responseLovedBy = data.lovedBy || [];
      const responseLoveCount = data.loveCount || 0;
      
      setIsLoved(user ? responseLovedBy.includes(user.id) : false);
      setLocalLoveCount(responseLoveCount);
      
      // Invalidate cache to update references
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update love status: ${error}`
      });
    }
  });
  
  const handleLoveClick = () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'Please login to love references'
      });
      return;
    }
    
    loveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`${getCategoryColor(category)}`}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
            
            {/* Navigation buttons */}
            {allReferences.length > 1 && (
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
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
            
            {isAdmin && (
              <div className="flex gap-1 text-xs text-muted-foreground ml-auto">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  <span>{formattedDate}</span>
                </div>
                <div className="flex items-center ml-3">
                  <User className="h-3 w-3 mr-1" />
                  <span>{createdBy}</span>
                </div>
              </div>
            )}
          </div>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
        </DialogHeader>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="relative h-64 md:h-80 mb-6 rounded-lg overflow-hidden">
            <img 
              src={thumbnail} 
              alt={title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.src = `https://via.placeholder.com/1200x600?text=${encodeURIComponent(title)}`;
              }}
            />
          </div>
          
          <DialogDescription className="text-base text-foreground whitespace-pre-line mb-6">
            {description}
          </DialogDescription>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {tags.map((tag, index) => (
              <Badge key={`${id}-detail-tag-${index}`} variant="secondary" className={getTagColor(tag)}>
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t flex-shrink-0">
          <div className="flex gap-4">
            <Button
              variant={isLoved ? "default" : "outline"}
              className={`${isLoved ? 'bg-pink-500 hover:bg-pink-600 text-white border-none' : 'hover:text-pink-500 hover:border-pink-500'}`}
              onClick={handleLoveClick}
              disabled={loveMutation.isPending}
            >
              <Heart className={`h-4 w-4 mr-2 ${isLoved ? 'fill-current' : ''}`} />
              <span>{localLoveCount} {localLoveCount === 1 ? 'Love' : 'Loves'}</span>
            </Button>
            
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Reference
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}