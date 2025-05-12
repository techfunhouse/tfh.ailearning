import { QueryClient, QueryFunction } from "@tanstack/react-query";

// This helper determines if we're running on GitHub Pages
function isGitHubPages(): boolean {
  return window.location.hostname.includes('github.io');
}

// Get the base path from environment variables or determine dynamically
const getBasePath = (): string => {
  // First check environment variables
  if (import.meta.env.VITE_BASE_PATH) {
    const envBasePath = import.meta.env.VITE_BASE_PATH;
    console.log(`Using base path from environment: ${envBasePath}`);
    return envBasePath;
  }
  
  // Next check if we're explicitly in GitHub Pages mode
  if (import.meta.env.VITE_GITHUB_PAGES === 'true') {
    console.log('Using GitHub Pages mode from environment variables');
    return '/ReferenceViewer/';
  }
  
  // Finally, detect GitHub Pages based on hostname
  if (isGitHubPages()) {
    console.log('Detected GitHub Pages domain, using ReferenceViewer path');
    return '/ReferenceViewer/';
  }
  
  // Default for local/Replit development
  return '/';
};

// Helper to adjust API URLs for GitHub Pages deployment
function getAdjustedUrl(url: string): string {
  if (isGitHubPages()) {
    // On GitHub Pages, we need to use pre-loaded mock data
    // This converts API calls like '/api/references' to 'data/references.json'
    if (url.startsWith('/api/')) {
      const resource = url.replace('/api/', '');
      if (resource === 'references' || resource === 'categories' || resource === 'tags') {
        // GitHub Pages data path uses repo name in the path
        const basePath = getBasePath().replace(/\/$/, ''); // Remove trailing slash if present
        console.log(`GitHub Pages: Converting ${url} to ${basePath}/data/${resource}.json`);
        return `${basePath}/data/${resource}.json`;
      }
    }
    
    // For asset URLs, ensure they have the proper GitHub Pages prefix
    if (url.startsWith('/assets/')) {
      const basePath = getBasePath().replace(/\/$/, ''); // Remove trailing slash if present
      return `${basePath}${url}`;
    }
    
    // For any other URLs with leading slash, ensure they're properly prefixed
    if (url.startsWith('/')) {
      const basePath = getBasePath().replace(/\/$/, ''); // Remove trailing slash if present
      return `${basePath}${url}`;
    }
  }
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Adjust URL for GitHub Pages if needed
  const adjustedUrl = getAdjustedUrl(url);
  
  // Use GET for GitHub Pages data fetching regardless of the original method
  const effectiveMethod = isGitHubPages() ? 'GET' : method;
  
  // Log the request in development
  if (import.meta.env.DEV) {
    console.log(`API ${effectiveMethod} request to: ${adjustedUrl}`, 
      isGitHubPages() ? '(GitHub Pages mode)' : '');
  }
  
  const res = await fetch(adjustedUrl, {
    method: effectiveMethod,
    headers: data && !isGitHubPages() ? { "Content-Type": "application/json" } : {},
    body: data && !isGitHubPages() ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Adjust URL for GitHub Pages if needed
    const url = getAdjustedUrl(queryKey[0] as string);
    
    // Log the query in development
    if (import.meta.env.DEV) {
      console.log(`Query request to: ${url}`, 
        isGitHubPages() ? '(GitHub Pages mode)' : '');
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    
    // Safe handling of JSON response
    let jsonData = await res.json();
    
    // For GitHub Pages deployment, ensure we're returning arrays when expected
    if (isGitHubPages()) {
      console.log(`GitHub Pages data for ${url}:`, jsonData);
      
      // If endpoint maps to our static JSON files
      if (url.includes('references.json') || url.includes('categories.json') || url.includes('tags.json')) {
        // Always ensure we return an array
        if (!Array.isArray(jsonData)) {
          console.warn(`Data is not an array for ${url}, attempting to convert...`);
          
          if (jsonData && typeof jsonData === 'object') {
            // Try to extract data from common properties
            if (jsonData.references) {
              console.log('Found references property, using it');
              jsonData = jsonData.references;
            } else if (jsonData.categories) {
              console.log('Found categories property, using it');
              jsonData = jsonData.categories;
            } else if (jsonData.tags) {
              console.log('Found tags property, using it');
              jsonData = jsonData.tags;
            } else if (Object.keys(jsonData).length > 0) {
              // Convert object to array if it has keys (might be a record/map)
              console.log('Converting object values to array');
              jsonData = Object.values(jsonData);
            } else {
              console.warn('Could not extract data, returning empty array');
              jsonData = [];
            }
          } else {
            console.warn('Invalid data format, returning empty array');
            jsonData = [];
          }
        }
        
        // Final check to ensure we have a valid array
        if (!Array.isArray(jsonData)) {
          console.error('Failed to convert data to array, using empty array');
          jsonData = [];
        }
      }
    }
    
    return jsonData;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
