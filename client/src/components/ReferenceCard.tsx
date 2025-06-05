import * as React from "react"
import { Reference } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, ExternalLink, Calendar, User, Heart, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTagColor, getCategoryColor } from '@/lib/utils';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
// // import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ConfirmationDialog from './ConfirmationDialog';

interface ReferenceCardProps {
  reference: Reference;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete?: (id: string) => void;
  onView?: (reference: Reference) => void;
}

export default function ReferenceCard({ reference, isAdmin, onEdit, onDelete, onView }: ReferenceCardProps) {
  const { id, title, link, description, tags, category, thumbnail, createdBy, updatedAt } = reference;
  // Handle potentially undefined love count by providing default
  const loveCount = reference.loveCount || 0;
  

  const { toast } = useToast();
  const [isLoved, setIsLoved] = useState(false); // Always start as not loved
  const [localLoveCount, setLocalLoveCount] = useState(loveCount);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Format the date
  const formattedDate = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  
  // Love mutation
  const loveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/references/${id}/love`);
      return response.json();
    },
    onSuccess: (data) => {
      // Update local state with default count in case data is incomplete
      const responseLoveCount = data.loveCount || 0;
      
      setIsLoved(true); // Set to loved after clicking
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
  
  const handleLoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the dialog
    loveMutation.mutate();
  };
  
  // Open the detail dialog
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open the detail dialog if clicking on buttons or links
    if (
      (e.target as HTMLElement).closest('button') || 
      (e.target as HTMLElement).closest('a')
    ) {
      return;
    }
    if (onView) {
      onView(reference);
    } else {
      setIsDetailOpen(true);
    }
  };
  
  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the dialog
    window.open(link, '_blank', 'noopener,noreferrer');
  };
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('DELETE', `/api/references/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reference deleted",
        description: "The reference was successfully deleted",
      });
      
      // Invalidate cache to update references
      queryClient.invalidateQueries({ queryKey: ['/api/references'] });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: "Error",
        description: "Failed to delete reference. Please try again.",
      });
      console.error("Error deleting reference:", error);
    }
  });

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the dialog
    onEdit();
  };
  
  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail dialog
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirmation of delete
  const handleConfirmDelete = () => {
    deleteMutation.mutate();
    if (onDelete) {
      onDelete(id);
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <Card 
        className="overflow-hidden shadow-md border-border/40 card-hover flex flex-col h-full cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="relative h-48">
          <img 
            src={thumbnail} 
            alt={title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = `https://via.placeholder.com/800x400?text=${encodeURIComponent(title)}`;
            }}
          />
          
          {/* Admin edit and delete buttons */}
          {isAdmin && (
            <div className="absolute top-2 right-2 flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-white/90 rounded-full shadow-md hover:bg-white"
                onClick={handleEditClick}
              >
                <Edit className="h-4 w-4 text-primary" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 bg-white/90 rounded-full shadow-md hover:bg-white hover:bg-red-50"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
          
          {/* Category badge */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-3">
            <Badge variant="outline" className={`text-white border-none ${getCategoryColor(category)}`}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          </div>
        </div>
        
        <CardContent className="flex-1 p-3 sm:p-4">
          <h3 className="text-base sm:text-lg font-semibold mb-2 line-clamp-2">{title}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-3 sm:mb-4">{description}</p>
          
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.slice(0, 3).map((tag, index) => (
              <Badge key={`${id}-tag-${index}`} variant="secondary" className={`text-xs ${getTagColor(tag)}`}>
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs text-muted-foreground border-muted">
                +{tags.length - 3} more
              </Badge>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/30 p-2 sm:p-3 flex flex-col space-y-2 border-t">
          {isAdmin && (
            <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center w-full gap-1 xs:gap-0">
              <div className="flex items-center text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                <span className="truncate">{formattedDate}</span>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <User className="h-3 w-3 mr-1" />
                <span className="truncate">{createdBy}</span>
              </div>
            </div>
          )}
          
          <div className="flex gap-2 items-center">
            <Button
              variant={isLoved ? "default" : "outline"}
              size="sm"
              className={`flex-none ${isLoved ? 'bg-pink-500 hover:bg-pink-600 text-white border-none' : 'hover:text-pink-500 hover:border-pink-500'}`}
              onClick={handleLoveClick}
              disabled={loveMutation.isPending}
              title={isLoved ? "Unlike" : "Love this resource"}
            >
              <Heart className={`h-3.5 w-3.5 mr-1 ${isLoved ? 'fill-current' : ''}`} />
              <span>{localLoveCount}</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleExternalLinkClick}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">View Resource</span>
              <span className="sm:hidden">View</span>
            </Button>
          </div>
        </CardFooter>
      </Card>
      
      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`${getCategoryColor(category)}`}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
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
          
          <div className="relative h-64 md:h-80 mt-2 mb-6 rounded-lg overflow-hidden">
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
          
          <div className="flex gap-4 mt-3">
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
              onClick={handleExternalLinkClick}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Reference
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation Dialog for Delete */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Resource"
        description={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteDialogOpen(false)}
      />
    </>
  );
}