import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useThumbnailRefresh(thumbnailPath: string) {
  const queryClient = useQueryClient();
  const [lastModified, setLastModified] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailPath || !thumbnailPath.startsWith('/thumbnails/')) {
      return;
    }

    // Check for thumbnail file changes using HEAD request to get last-modified
    const checkThumbnailUpdate = async () => {
      try {
        const response = await fetch(thumbnailPath, { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          const currentModified = response.headers.get('last-modified');
          
          if (currentModified && currentModified !== lastModified) {
            setLastModified(currentModified);
            
            // Only invalidate cache if this is not the first check
            if (lastModified !== null) {
              queryClient.invalidateQueries({ queryKey: ['/api/references'] });
            }
          }
        }
      } catch (error) {
        // Silently handle errors - file might still be generating
      }
    };

    // Check immediately
    checkThumbnailUpdate();
    
    // Check every 5 seconds instead of 2 (reduced frequency)
    const interval = setInterval(checkThumbnailUpdate, 5000);

    // Stop checking after 60 seconds (extended timeout for complex sites)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 60000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [thumbnailPath, queryClient, lastModified]);
}