import { Reference } from '@/types';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, ExternalLink, Calendar, User, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getTagColor, getCategoryColor } from '@/lib/utils';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface ReferenceCardProps {
  reference: Reference;
  isAdmin: boolean;
  onEdit: () => void;
}

export default function ReferenceCard({ reference, isAdmin, onEdit }: ReferenceCardProps) {
  const { id, title, link, description, tags, category, thumbnail, createdBy, updatedAt } = reference;
  // Handle potentially undefined love properties by providing defaults
  const lovedBy = reference.lovedBy || [];
  const loveCount = reference.loveCount || 0;
  
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoved, setIsLoved] = useState(user ? lovedBy.includes(user.id) : false);
  const [localLoveCount, setLocalLoveCount] = useState(loveCount);
  
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
    <Card className="overflow-hidden shadow-md border-border/40 card-hover flex flex-col h-full">
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
        
        {/* Admin edit button */}
        {isAdmin && (
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute top-2 right-2 h-8 w-8 bg-white/90 rounded-full shadow-md hover:bg-white"
            onClick={onEdit}
          >
            <Edit className="h-4 w-4 text-primary" />
            <span className="sr-only">Edit</span>
          </Button>
        )}
        
        {/* Category badge */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-3">
          <Badge variant="outline" className={`text-white border-none ${getCategoryColor(category)}`}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
        </div>
      </div>
      
      <CardContent className="flex-1 p-4">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{description}</p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag, index) => (
            <Badge key={`${id}-tag-${index}`} variant="secondary" className={getTagColor(tag)}>
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-muted-foreground border-muted">
              +{tags.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="bg-muted/30 p-3 flex flex-col space-y-2 border-t">
        {isAdmin && (
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <User className="h-3 w-3 mr-1" />
              <span>{createdBy}</span>
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
            title={isLoved ? "Unlike" : "Love this reference"}
          >
            <Heart className={`h-3.5 w-3.5 mr-1 ${isLoved ? 'fill-current' : ''}`} />
            <span>{localLoveCount}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => window.open(link, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            View Reference
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
