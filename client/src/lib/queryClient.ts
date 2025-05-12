import { QueryClient, QueryFunction } from "@tanstack/react-query";

// This helper determines if we're running on GitHub Pages
function isGitHubPages(): boolean {
  return window.location.hostname.includes('github.io');
}

// Check if we're using a custom domain
function isCustomDomain(): boolean {
  const hostname = window.location.hostname;
  return !hostname.includes('github.io') && 
         !hostname.includes('replit.app') && 
         hostname !== 'localhost' &&
         !hostname.includes('127.0.0.1');
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
    // Custom domain with CNAME should use root path
    if (isCustomDomain()) {
      console.log('Using root path for custom domain');
      return '/';
    }
    console.log('Using GitHub Pages mode from environment variables');
    return '/ReferenceViewer/';
  }
  
  // Check for custom domain
  if (isCustomDomain()) {
    console.log('Detected custom domain, using root path');
    return '/';
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
  if (isGitHubPages() || import.meta.env.VITE_GITHUB_PAGES === 'true') {
    // Log for debugging
    console.log(`Adjusting URL for GitHub Pages: ${url}`);
    
    // Check if we're using a custom domain
    const usingCustomDomain = isCustomDomain();
    if (usingCustomDomain) {
      console.log(`Using custom domain adjustments for: ${url}`);
    }
    
    // On GitHub Pages, we need to use pre-loaded mock data
    // This converts API calls like '/api/references' to 'data/references.json'
    if (url.startsWith('/api/')) {
      const resource = url.replace('/api/', '');
      if (resource === 'references' || resource === 'categories' || resource === 'tags') {
        // GitHub Pages data path
        if (usingCustomDomain) {
          // For custom domains, use root-relative paths
          const dataUrl = `/data/${resource}.json`;
          console.log(`Custom Domain: Converting ${url} to ${dataUrl}`);
          return dataUrl;
        } else {
          // For github.io domain, use repository name in the path
          const basePath = getBasePath().replace(/\/$/, ''); // Remove trailing slash if present
          const dataUrl = `${basePath}/data/${resource}.json`;
          console.log(`GitHub Pages: Converting ${url} to ${dataUrl}`);
          return dataUrl;
        }
      }
    }
    
    // Handle asset paths by adding repository name prefix if needed
    const basePath = usingCustomDomain ? '' : getBasePath().replace(/\/$/, ''); // Remove trailing slash if present
    
    // Common static asset path patterns
    const staticPathPatterns = ['/assets/', '/images/', '/static/', '/data/'];
    for (const pattern of staticPathPatterns) {
      if (url.startsWith(pattern)) {
        const adjustedUrl = `${basePath}${url}`;
        console.log(`GitHub Pages: Adjusting static path ${url} to ${adjustedUrl}`);
        return adjustedUrl;
      }
    }
    
    // For any other URLs with leading slash, ensure they're properly prefixed
    if (url.startsWith('/')) {
      const adjustedUrl = `${basePath}${url}`;
      console.log(`GitHub Pages: Prefixing URL ${url} to ${adjustedUrl}`);
      return adjustedUrl;
    }
  }
  
  // Return original URL for non-GitHub Pages environments
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
