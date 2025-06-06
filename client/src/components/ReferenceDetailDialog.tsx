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
          {/* Thumbnail - Full width at top */}
          {thumbnail && (
            <div className="w-full mb-6">
              <img 
                src={thumbnail} 
                alt={title}
                className="w-full h-auto max-h-96 object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content - exact match to image layout */}
          <div className="space-y-4 px-6 pb-6">
            {/* URL as main heading - large black text */}
            <div>
              <h1 className="text-4xl font-bold text-black dark:text-white break-all leading-tight">
                {link}
              </h1>
            </div>

            {/* URL again - smaller gray text, clickable */}
            <div>
              <a 
                href={link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:underline break-all"
              >
                {link}
              </a>
            </div>

            {/* Description - simple text */}
            {description && (
              <div className="mt-6">
                <p className="text-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {description}
                </p>
              </div>
            )}

            {/* Category and Tags - minimal styling */}
            {category && (
              <div className="mt-6">
                <span className="text-sm text-gray-600 dark:text-gray-400">Category: {category}</span>
              </div>
            )}

            {tags && tags.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
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