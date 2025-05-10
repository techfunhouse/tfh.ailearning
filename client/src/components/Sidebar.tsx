import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Category, Tag } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  categories: Category[];
  tags: Tag[];
  selectedCategories: string[];
  selectedTags: string[];
  onCategoryChange: (categories: string[]) => void;
  onTagSelect: (tag: string) => void;
}

export default function Sidebar({
  categories,
  tags,
  selectedCategories,
  selectedTags,
  onCategoryChange,
  onTagSelect,
}: SidebarProps) {
  const handleCategoryChange = (categoryName: string, checked: boolean) => {
    let newCategories: string[];
    
    // If 'all' is selected, deselect everything else
    if (categoryName === 'all' && checked) {
      newCategories = ['all'];
    } 
    // If not 'all' and checked, remove 'all' from selection
    else if (categoryName !== 'all' && checked) {
      newCategories = selectedCategories.filter(cat => cat !== 'all');
      newCategories.push(categoryName);
    } 
    // If unchecked, just remove from selection
    else {
      newCategories = selectedCategories.filter(cat => cat !== categoryName);
      // If nothing is selected, select 'all'
      if (newCategories.length === 0) {
        newCategories = ['all'];
      }
    }
    
    onCategoryChange(newCategories);
  };

  // Badge colors based on tag names
  const getTagColor = (tag: string) => {
    const colorMap: Record<string, string> = {
      javascript: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      'ui/ux': 'bg-green-100 text-green-800 hover:bg-green-200',
      algorithm: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
      database: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      frontend: 'bg-red-100 text-red-800 hover:bg-red-200',
      backend: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
      mobile: 'bg-pink-100 text-pink-800 hover:bg-pink-200',
      productivity: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      tools: 'bg-teal-100 text-teal-800 hover:bg-teal-200',
      data: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
      visualization: 'bg-violet-100 text-violet-800 hover:bg-violet-200',
      design: 'bg-lime-100 text-lime-800 hover:bg-lime-200',
      development: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
      performance: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
    };
    
    return colorMap[tag.toLowerCase()] || 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  };

  return (
    <aside className="bg-white shadow-sm lg:w-64 lg:flex-shrink-0 border-r border-gray-200">
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
          
          {/* Category Filters */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500">Categories</h3>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="category-all" 
                  checked={selectedCategories.includes('all')}
                  onCheckedChange={(checked) => 
                    handleCategoryChange('all', checked as boolean)
                  }
                />
                <Label htmlFor="category-all">All Categories</Label>
              </div>
              
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category.id}`} 
                    checked={selectedCategories.includes(category.name.toLowerCase())}
                    onCheckedChange={(checked) => 
                      handleCategoryChange(category.name.toLowerCase(), checked as boolean)
                    }
                  />
                  <Label htmlFor={`category-${category.id}`}>{category.name}</Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tag Filters */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500">Tags</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map(tag => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className={`cursor-pointer transition-all ${
                    getTagColor(tag.name)
                  } ${
                    selectedTags.includes(tag.name.toLowerCase())
                      ? 'ring-2 ring-offset-2 ring-primary'
                      : ''
                  }`}
                  onClick={() => onTagSelect(tag.name.toLowerCase())}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
