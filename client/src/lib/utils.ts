import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    programming: 'bg-blue-100 text-blue-800',
    design: 'bg-green-100 text-green-800',
    research: 'bg-purple-100 text-purple-800',
    tools: 'bg-yellow-100 text-yellow-800',
  };

  return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

export const getTagColor = (tag: string): string => {
  const colors: Record<string, string> = {
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

  return colors[tag.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

// Default thumbnail images by category
export const getDefaultThumbnail = (category: string): string => {
  const thumbnails: Record<string, string> = {
    programming: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
    design: 'https://images.unsplash.com/photo-1516031190212-da133013de50?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
    research: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
    tools: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80',
  };

  return thumbnails[category.toLowerCase()] || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=300&q=80';
};
