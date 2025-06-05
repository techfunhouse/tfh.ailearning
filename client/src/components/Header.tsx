import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, LogOut } from "lucide-react";
import { SiLinkedin } from "react-icons/si";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  username?: string;
  isAdmin?: boolean;
  onSearch: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const { logout, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Check if user is logged in
  const isLoggedIn = !!user;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-card border-b sticky top-0 z-10">
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="icon-container h-9 w-9">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold gradient-text">
            <span className="hidden sm:inline">AI Learning Resources</span>
            <span className="sm:hidden sm:inline">AI Learning Resources</span>
          </h1>
        </div>

        {/* Desktop search bar */}
        <div className="hidden md:block max-w-3xl w-full mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search references..."
              className="pl-10 bg-muted/40"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Created by section */}
          <a
            href="https://linkedin.com/in/girivenkatesan"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <img
              src="/bygvensan.jpg"
              alt="Created by Giri Venkatesan - LinkedIn"
              className="h-8 w-auto rounded"
            />
          </a>

          {/* Mobile version - just icon */}
          <a
            href="https://linkedin.com/in/girivenkatesan"
            target="_blank"
            rel="noopener noreferrer"
            className="sm:hidden flex items-center text-muted-foreground hover:text-primary transition-colors"
            title="Created by Giri Venkatesan"
          >
            <SiLinkedin className="h-4 w-4" />
          </a>

          {isLoggedIn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(user?.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.isAdmin ? "Administrator" : "Curator"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user?.isAdmin && (
                  <DropdownMenuItem className="flex items-center">
                    <Badge className="mr-2 bg-accent text-accent-foreground">
                      Admin
                    </Badge>
                    Administrator Access
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="flex items-center"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Mobile search bar */}
      <div className="md:hidden px-4 pb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search references..."
            className="pl-10 bg-muted/40"
          />
        </div>
      </div>
    </header>
  );
}
