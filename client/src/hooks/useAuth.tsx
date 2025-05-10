import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { User, LoginCredentials } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Check if user is already logged in from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      // In a real app, we would make an API call here
      try {
        const response = await apiRequest('POST', '/api/login', credentials);
        const data = await response.json();
        
        // Store user data in localStorage and state
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        toast({
          title: 'Success',
          description: 'Login successful!',
        });
        
        // Redirect to home page
        navigate('/');
      } catch (error) {
        console.error('Login error:', error);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: 'Invalid username or password',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Make API call to logout
      await apiRequest('POST', '/api/logout');
      
      // Clear local state
      localStorage.removeItem('user');
      setUser(null);
      
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
      
      // Force reload to avoid any routing issues
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error with the API call, clear local state
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/';
    }
  };

  const isAdmin = user?.isAdmin || false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
