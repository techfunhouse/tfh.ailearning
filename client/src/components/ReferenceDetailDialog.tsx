import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ExternalLink, 
  Tag, 
  ChevronLeft, 
  ChevronRight,
  Folder
} from "lucide-react";
import { Reference } from "@/types";
import { getTagColor } from "@/lib/utils";

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
  


  // If no reference is provided, don't render anything
  if (!reference) {
    return null;
  }

  const { title, link, description, tags, category, thumbnail } = reference;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <DialogTitle className="text-2xl font-bold gradient-text line-clamp-2 flex-1 pr-4">
              {title}
            </DialogTitle>
            
            {/* Navigation Controls - top right with margin to avoid close button */}
            {allReferences.length > 1 && (
              <div className="flex items-center gap-2 flex-shrink-0 mr-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={!hasPrevious}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
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

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Thumbnail Section */}
            {thumbnail && (
              <div className="relative">
                <img 
                  src={thumbnail} 
                  alt={title}
                  className="w-full h-64 object-cover rounded-lg border shadow-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Content Section */}
            <div className="space-y-4">
              {/* Link */}
              <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 break-all">
                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                <a href={link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {link}
                </a>
              </div>

              {/* Category Badge */}
              <div>
                <Badge variant="secondary" className="text-xs">
                  <Folder className="h-3 w-3 mr-1" />
                  {category}
                </Badge>
              </div>

              {/* Description */}
              {description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline"
                        className={`text-xs ${getTagColor(tag)}`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 border-t sm:flex-row">
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