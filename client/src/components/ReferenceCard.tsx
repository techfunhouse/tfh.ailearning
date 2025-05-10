import { Reference } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReferenceCardProps {
  reference: Reference;
  isAdmin: boolean;
  onEdit: () => void;
}

// Badge colors based on tag names
const getTagColor = (tag: string) => {
  const colorMap: Record<string, string> = {
    javascript: 'bg-blue-100 text-blue-800',
    'ui/ux': 'bg-green-100 text-green-800',
    algorithm: 'bg-purple-100 text-purple-800',
    database: 'bg-yellow-100 text-yellow-800',
    frontend: 'bg-red-100 text-red-800',
    backend: 'bg-indigo-100 text-indigo-800',
    mobile: 'bg-pink-100 text-pink-800',
    productivity: 'bg-orange-100 text-orange-800',
    tools: 'bg-teal-100 text-teal-800',
    data: 'bg-cyan-100 text-cyan-800',
    visualization: 'bg-violet-100 text-violet-800',
    design: 'bg-lime-100 text-lime-800',
    development: 'bg-amber-100 text-amber-800',
    performance: 'bg-rose-100 text-rose-800',
  };
  
  return colorMap[tag.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

// Category colors
const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    programming: 'bg-blue-100 text-blue-800',
    design: 'bg-green-100 text-green-800',
    research: 'bg-purple-100 text-purple-800',
    tools: 'bg-yellow-100 text-yellow-800',
  };
  
  return colorMap[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export default function ReferenceCard({ reference, isAdmin, onEdit }: ReferenceCardProps) {
  const { id, title, link, description, tags, category, thumbnail, updatedAt } = reference;
  
  // Format the date
  const formattedDate = formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  
  return (
    <Card className="overflow-hidden shadow hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col">
      <div className="relative h-48">
        <img 
          src={thumbnail} 
          alt={title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 bg-white rounded-full shadow-sm hover:bg-gray-100"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4 text-gray-600" />
              <span className="sr-only">Edit</span>
            </Button>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent py-2 px-4">
          <Badge className={getCategoryColor(category)}>
            {category}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{description}</p>
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.map((tag, index) => (
            <Badge key={`${id}-tag-${index}`} variant="secondary" className={getTagColor(tag)}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="px-4 py-3 bg-gray-50 flex justify-between items-center">
        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-primary hover:text-primary/80 text-sm font-medium"
        >
          View Reference
        </a>
        <div className="text-xs text-gray-500">Updated {formattedDate}</div>
      </div>
    </Card>
  );
}
