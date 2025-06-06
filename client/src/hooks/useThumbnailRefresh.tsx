import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useThumbnailRefresh(thumbnailPath: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!thumbnailPath || !thumbnailPath.startsWith('/thumbnails/')) {
      return;
    }

    // Set up periodic checking for thumbnail updates
    const checkThumbnailUpdate = () => {
      const img = new Image();
      const cacheBuster = `?v=${Date.now()}`;
      
      img.onload = () => {
        // If image loads successfully, invalidate cache to refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/references'] });
      };
      
      img.onerror = () => {
        // If image fails to load, it might still be generating
        // Continue checking
      };
      
      img.src = thumbnailPath + cacheBuster;
    };

    // Check immediately and then every 2 seconds for updates
    checkThumbnailUpdate();
    const interval = setInterval(checkThumbnailUpdate, 2000);

    // Clean up after 30 seconds (thumbnail should be done by then)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [thumbnailPath, queryClient]);
}