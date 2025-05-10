import React, { useState, useEffect, createContext, useContext } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { NotificationType } from '@/types';

// Create notification context
const NotificationContext = createContext<{
  showNotification: (message: string, type: 'success' | 'error' | 'warning') => void;
}>({
  showNotification: () => {},
});

export const useNotification = () => useContext(NotificationContext);

const notificationVariants = cva(
  "fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg bg-white border-l-4 z-50 transform transition-all duration-300 ease-in-out",
  {
    variants: {
      type: {
        success: "border-green-500 text-green-800",
        error: "border-red-500 text-red-800",
        warning: "border-yellow-500 text-yellow-800",
      },
    },
    defaultVariants: {
      type: "success",
    },
  }
);

interface NotificationProps extends VariantProps<typeof notificationVariants> {
  className?: string;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<NotificationType>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setNotification({
      message,
      type,
      isVisible: true,
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div
        className={cn(
          notificationVariants({ type: notification.type }),
          notification.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
        )}
      >
        <p className="text-sm font-medium">{notification.message}</p>
      </div>
    </NotificationContext.Provider>
  );
}

export function Notification({ className }: NotificationProps) {
  const [notification, setNotification] = useState<NotificationType>({
    message: '',
    type: 'success',
    isVisible: false,
  });

  // Event listener for custom notification events
  useEffect(() => {
    const handleNotification = (e: CustomEvent) => {
      const { message, type } = e.detail;
      
      setNotification({
        message,
        type,
        isVisible: true,
      });
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setNotification(prev => ({ ...prev, isVisible: false }));
      }, 3000);
    };

    window.addEventListener('notification' as any, handleNotification as EventListener);
    
    return () => {
      window.removeEventListener('notification' as any, handleNotification as EventListener);
    };
  }, []);

  // Helper function to display notifications from anywhere
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const event = new CustomEvent('notification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  };

  // Expose the function globally
  (window as any).showNotification = showNotification;

  return (
    <div
      className={cn(
        notificationVariants({ type: notification.type, className }),
        notification.isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'
      )}
    >
      <p className="text-sm font-medium">{notification.message}</p>
    </div>
  );
}
