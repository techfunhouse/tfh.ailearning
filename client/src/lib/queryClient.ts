import { QueryClient, QueryFunction } from "@tanstack/react-query";

// This helper determines if we're running on GitHub Pages
function isGitHubPages(): boolean {
  return window.location.hostname.includes('github.io');
}

// Helper to adjust API URLs for GitHub Pages deployment
function getAdjustedUrl(url: string): string {
  if (isGitHubPages()) {
    // On GitHub Pages, we need to use pre-loaded mock data
    // This converts API calls like '/api/references' to './data/references.json'
    if (url.startsWith('/api/')) {
      const resource = url.replace('/api/', '');
      return `./data/${resource}.json`;
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
    return await res.json();
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
