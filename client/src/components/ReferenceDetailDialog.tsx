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
  Folder,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { Reference } from "@/types";
import { getTagColor } from "@/lib/utils";

interface ReferenceDetailDialogProps {
  reference: Reference | null;
  isOpen: boolean;
  onClose: () => void;
  allReferences?: Reference[];
  onNavigate?: (direction: 'prev' | 'next') => void;
  onEdit?: (reference: Reference) => void;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}

export default function ReferenceDetailDialog({ 
  reference, 
  isOpen, 
  onClose,
  allReferences = [],
  onNavigate,
  onEdit,
  onDelete,
  isAdmin = false
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


      </DialogContent>
    </Dialog>
  );
}