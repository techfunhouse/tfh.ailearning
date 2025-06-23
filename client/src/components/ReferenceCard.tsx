import * as React from "react"
import { Reference } from '@/types';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { getTagColor, getCategoryColor } from '@/lib/utils';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  const { id, title, link, description, tags, category, thumbnail } = reference;
  
  const { toast } = useToast();
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Simple check if thumbnail is a loading placeholder
  const isThumbnailGenerating = reference.thumbnail.includes('loading') || reference.thumbnail.includes('generating');

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
        title: "Success",
        description: "Reference deleted successfully.",
      });
      
      // Invalidate and refetch references
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
          {imageError ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-gray-600">
              <div className="text-center p-4">
                <div className="text-2xl mb-2">📚</div>
                <div className="text-sm font-medium">{title}</div>
              </div>
            </div>
          ) : (
            <img 
              src={thumbnail} 
              alt={title} 
              className="w-full h-full object-contain bg-gray-50"
              onError={() => {
                setImageError(true);
              }}
            />
          )}
          
          {/* Action Icons - Top Right Corner */}
          <div className="absolute top-2 right-2 flex gap-1">
            {/* View/Visit Icon */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExternalLinkClick}
              className="h-8 w-8 p-0 bg-blue-500 hover:bg-blue-600 text-white shadow-md"
              title="Visit Resource"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            {/* Edit Icon - only show for admins */}
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEditClick}
                className="h-8 w-8 p-0 bg-green-500 hover:bg-green-600 text-white shadow-md"
                title="Edit Reference"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            
            {/* Delete Icon - only show for admins */}
            {isAdmin && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeleteClick}
                className="h-8 w-8 p-0 bg-red-500 hover:bg-red-600 text-white shadow-md"
                title="Delete Reference"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Thumbnail generation overlay */}
          {isThumbnailGenerating && (
            <div className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-white/90 rounded-lg px-4 py-2 flex items-center gap-2 shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Generating thumbnail...
                </span>
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="outline" className={`${getCategoryColor(category)} mb-1`}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
            {title}
          </h3>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">
            {description}
          </p>
          
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className={`text-xs ${getTagColor(tag)}`}>
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        

      </Card>
      
      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`${getCategoryColor(category)}`}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Badge>
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
          
          {tags && tags.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className={getTagColor(tag)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4 border-t">
            <Button asChild className="flex-1 bg-green-600 hover:bg-green-700 text-white border-none shadow-md">
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Resource
              </a>
            </Button>
            
            {isAdmin && (
              <Button variant="outline" onClick={() => {
                setIsDetailOpen(false);
                onEdit();
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        title="Delete Reference"
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