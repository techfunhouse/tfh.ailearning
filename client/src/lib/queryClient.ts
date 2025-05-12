import { QueryClient, QueryFunction } from "@tanstack/react-query";

// This helper determines if we're running on GitHub Pages or as a static deployment
function isStaticDeployment(): boolean {
  // First check for environment variable flag
  if (import.meta.env.VITE_GITHUB_PAGES === 'true') {
    console.log('Static deployment mode set by environment variables');
    return true;
  }
  
  // Check if we're on GitHub Pages domain
  if (window.location.hostname.includes('github.io')) {
    console.log('Detected GitHub Pages domain');
    return true;
  }
  
  // Check if we're on a custom domain
  if (isCustomDomain()) {
    // Check if we have a meta tag indicating we're on a custom domain GitHub Pages deployment
    const customDomainMeta = document.querySelector('meta[name="custom-domain"]');
    if (customDomainMeta) {
      console.log('Detected custom domain with GitHub Pages meta tag');
      return true;
    }
  }
  
  // Not on GitHub Pages or static deployment
  return false;
}

// Check if we're using a custom domain
function isCustomDomain(): boolean {
  // First check if we have an explicit flag set
  if (import.meta.env.VITE_USE_CUSTOM_DOMAIN === 'true') {
    console.log('Using custom domain explicitly set in environment variables');
    return true;
  }
  
  // Otherwise detect based on hostname
  const hostname = window.location.hostname;
  return !hostname.includes('github.io') && 
         !hostname.includes('replit.app') && 
         hostname !== 'localhost' &&
         !hostname.includes('127.0.0.1');
}

// Original isGitHubPages function for backward compatibility
function isGitHubPages(): boolean {
  return isStaticDeployment();
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
  if (isStaticDeployment()) {
    // Log for debugging
    console.log(`Adjusting URL for static deployment: ${url}`);
    
    // Check if we're using a custom domain
    const usingCustomDomain = isCustomDomain();
    if (usingCustomDomain) {
      console.log(`Using custom domain adjustments for: ${url}`);
    }
    
    // For static deployment, we need to use pre-loaded JSON files
    // This converts API calls like '/api/references' to 'data/references.json'
    if (url.startsWith('/api/')) {
      const resource = url.replace('/api/', '');
      
      // For core data resources, redirect to static JSON files
      if (resource === 'references' || resource === 'categories' || resource === 'tags') {
        // Static JSON data path
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
      
      // For other API endpoints that mutate data, return a dummy URL
      // These will fail on GitHub Pages, but we handle those errors gracefully
      if (url.includes('create') || url.includes('update') || url.includes('delete') || 
          url.includes('toggle')) {
        console.log(`${url} is a mutation endpoint, not supported in static deployment`);
        // This endpoint will be caught by error handling and show appropriate messaging
        return url;
      }
    }
    
    // Handle asset paths by adding repository name prefix if needed
    const basePath = usingCustomDomain ? '' : getBasePath().replace(/\/$/, ''); // Remove trailing slash if present
    
    // Common static asset path patterns
    const staticPathPatterns = ['/assets/', '/images/', '/static/', '/data/'];
    for (const pattern of staticPathPatterns) {
      if (url.startsWith(pattern)) {
        const adjustedUrl = `${basePath}${url}`;
        console.log(`Static Deployment: Adjusting static path ${url} to ${adjustedUrl}`);
        return adjustedUrl;
      }
    }
    
    // For any other URLs with leading slash, ensure they're properly prefixed
    if (url.startsWith('/')) {
      const adjustedUrl = `${basePath}${url}`;
      console.log(`Static Deployment: Prefixing URL ${url} to ${adjustedUrl}`);
      return adjustedUrl;
    }
  }
  
  // Return original URL for non-static deployment environments
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Special handling for static deployments
    if (isStaticDeployment() && (res.status === 404 || res.status === 405)) {
      if (res.url.includes('create') || res.url.includes('update') || res.url.includes('delete')) {
        throw new Error(`This feature is not available in read-only mode. Data modifications are disabled in the static deployment.`);
      }
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Adjust URL for static deployment if needed
  const adjustedUrl = getAdjustedUrl(url);
  
  // In static deployment mode:
  // 1. Use GET for data fetching regardless of the original method
  // 2. Skip sending body data for mutations (they'll fail gracefully)
  const isStaticMode = isStaticDeployment();
  const effectiveMethod = isStaticMode ? 'GET' : method;
  
  // Debug logging
  console.log(`API ${effectiveMethod} request to: ${adjustedUrl}`, 
    isStaticMode ? '(Static deployment mode)' : '');
  
  // Special case for mutation operations in static deployment
  if (isStaticMode && 
      (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE')) {
    console.log(`Mutation operation attempted in static deployment mode: ${method} ${url}`);
    
    // For explicitly handled resources, we could return mock responses
    if (url.startsWith('/api/')) {
      const resource = url.replace('/api/', '');
      
      // If this is a mutation to one of our core resources, return appropriate response
      if (resource.startsWith('references') || resource.startsWith('categories') || resource.startsWith('tags')) {
        console.warn(`Mutation to ${resource} attempted in static mode - operation will fail`);
      }
    }
  }
  
  try {
    const res = await fetch(adjustedUrl, {
      method: effectiveMethod,
      headers: data && !isStaticMode ? { "Content-Type": "application/json" } : {},
      body: data && !isStaticMode ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Special handling for fetch errors in static deployment (likely CORS or network issues)
    if (isStaticMode && error instanceof TypeError && error.message.includes('fetch')) {
      console.error(`Network error in static deployment mode: ${error.message}`);
      throw new Error(`Cannot perform this operation in static deployment mode. Please use the full application for this feature.`);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Adjust URL for static deployment if needed
    const url = getAdjustedUrl(queryKey[0] as string);
    const isStaticMode = isStaticDeployment();
    
    // Log the query request
    console.log(`Query request to: ${url}`, isStaticMode ? '(Static deployment mode)' : '');
    
    try {
      const res = await fetch(url, {
        credentials: "include",
      });

      // Handle 401 unauthorized according to specified behavior
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      // Handle 404 not found for static deployment with better error
      if (isStaticMode && res.status === 404) {
        console.error(`Resource not found in static deployment: ${url}`);
        
        // For core data endpoints, throw a more helpful error
        if (url.includes('references.json') || url.includes('categories.json') || url.includes('tags.json')) {
          throw new Error(`Failed to load data file: ${url.split('/').pop()}. Make sure the file exists in the deployment.`);
        }
        
        throw new Error(`Resource not found: ${url}`);
      }

      await throwIfResNotOk(res);
      
      // Parse JSON response
      let jsonData = await res.json();
      
      // Handle data formatting for static JSON files
      if (isStaticMode) {
        console.log(`Static deployment data for ${url}:`, jsonData);
        
        // If endpoint maps to our static JSON files
        if (url.includes('references.json') || url.includes('categories.json') || url.includes('tags.json')) {
          // Process data based on URL
          const processData = () => {
            // Always ensure we return an array
            if (!Array.isArray(jsonData)) {
              console.warn(`Data is not an array for ${url}, attempting to convert...`);
              
              if (jsonData && typeof jsonData === 'object') {
                // Try to extract data from common properties based on file name
                if (url.includes('references')) {
                  if (jsonData.references) {
                    console.log('Found references property, using it');
                    return jsonData.references;
                  }
                } else if (url.includes('categories')) {
                  if (jsonData.categories) {
                    console.log('Found categories property, using it');
                    return jsonData.categories;
                  }
                } else if (url.includes('tags')) {
                  if (jsonData.tags) {
                    console.log('Found tags property, using it');
                    return jsonData.tags;
                  }
                }
                
                // Generic fallbacks if specific property not found
                const keys = Object.keys(jsonData);
                if (keys.length === 1 && Array.isArray(jsonData[keys[0]])) {
                  // Single property containing array (common lowdb format)
                  console.log(`Found single array property ${keys[0]}, using it`);
                  return jsonData[keys[0]];
                } else if (keys.length > 0) {
                  // Convert object to array if it has keys (might be a record/map)
                  console.log('Converting object values to array');
                  return Object.values(jsonData);
                }
                
                console.warn('Could not extract data, returning empty array');
                return [];
              } else {
                console.warn('Invalid data format, returning empty array');
                return [];
              }
            }
            
            // Already an array, return as is
            return jsonData;
          };
          
          // Process the data
          jsonData = processData();
          
          // Final validation to ensure we have a valid array
          if (!Array.isArray(jsonData)) {
            console.error('Failed to convert data to array, using empty array');
            jsonData = [];
          }
        }
      }
      
      return jsonData;
    } catch (error) {
      // Improved error handling for static deployment
      if (isStaticMode) {
        console.error(`Error in static deployment query:`, error);
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error(`Network error: Unable to load data in static deployment mode. This might be due to CORS restrictions or network connectivity issues.`);
        }
      }
      
      throw error;
    }
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
