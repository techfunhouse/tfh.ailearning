import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useThumbnailRefresh(thumbnailPath: string) {
  const queryClient = useQueryClient();
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Disable all polling to prevent server overload
    return;

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
            
            // Check if this looks like a real screenshot (not loading/error)
            // Real screenshots are typically larger than loading placeholders
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > 5000) {
              setIsCompleted(true);
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
              }
            }
          }
        }
      } catch (error) {
        // Silently handle errors - file might still be generating
      }
    };

    // Check immediately
    checkThumbnailUpdate();
    
    // Only start polling if not completed
    if (!isCompleted) {
      // Check every 3 seconds for responsiveness
      intervalRef.current = setInterval(checkThumbnailUpdate, 3000);

      // Stop checking after 45 seconds to prevent endless polling
      timeoutRef.current = setTimeout(() => {
        setIsCompleted(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 45000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [thumbnailPath, queryClient, lastModified, isCompleted]);
}