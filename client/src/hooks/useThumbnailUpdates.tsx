import { useEffect, useState } from 'react';
import { Reference } from '@/types';
import { queryClient } from '@/lib/queryClient';

interface ThumbnailUpdate {
  type: 'thumbnail-update';
  referenceId: string;
  status: 'completed' | 'failed';
  thumbnailPath: string;
}

export function useThumbnailUpdates(reference: Reference) {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if thumbnail generation is actively in progress
    if (!reference.thumbnailId || 
        reference.thumbnailStatus === 'completed' || 
        reference.thumbnailStatus === 'failed' ||
        !reference.thumbnailStatus || 
        reference.thumbnailStatus === 'pending') {
      return;
    }

    // Set up Server-Sent Events connection for real-time updates
    const baseUrl = window.location.origin;
    const eventSource = new EventSource(`${baseUrl}/api/thumbnails/stream/${reference.id}`);
    
    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data: ThumbnailUpdate = JSON.parse(event.data);
        
        if (data.type === 'thumbnail-update') {
          // Update the query cache with new thumbnail data
          queryClient.setQueryData(['references'], (oldData: Reference[] | undefined) => {
            if (!oldData) return oldData;
            
            return oldData.map(ref => 
              ref.id === data.referenceId 
                ? { 
                    ...ref, 
                    thumbnail: data.thumbnailPath, 
                    thumbnailStatus: data.status as any 
                  }
                : ref
            );
          });

          // Invalidate and refetch to ensure consistency
          queryClient.invalidateQueries({ queryKey: ['references'] });
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [reference.id, reference.thumbnailId, reference.thumbnailStatus]);

  return isConnected;
}