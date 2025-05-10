import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

interface HeaderProps {
  username: string;
  isAdmin: boolean;
  onSearch: (query: string) => void;
}

export default function Header({ username, isAdmin, onSearch }: HeaderProps) {
  const { logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-gray-900">RefHub</h1>
        </div>
        
        {/* Desktop search bar */}
        <div className="hidden md:block max-w-3xl w-full mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search references..."
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <Badge className="bg-secondary hover:bg-secondary/80">
              Admin
            </Badge>
          )}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-700 mr-2">{username}</span>
            <Button variant="link" className="text-primary p-0" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search references..."
            className="pl-10"
          />
        </div>
      </div>
    </header>
  );
}
