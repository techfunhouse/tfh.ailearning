import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { User, LoginCredentials } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, isStaticDeployment } from '@/lib/queryClient';
import { 
  validateStaticCredentials,
  createStaticSession, 
  getStaticSession, 
  clearStaticSession 
} from '@/lib/static-auth';

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

  // Check if user is already logged in
  useEffect(() => {
    const isStatic = isStaticDeployment();
    
    if (isStatic) {
      // Check for static session
      const staticUser = getStaticSession();
      if (staticUser) {
        setUser(staticUser);
      }
    } else {
      // Check localStorage for development mode
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
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      const isStatic = isStaticDeployment();
      
      if (isStatic) {
        // Use static authentication for GitHub Pages
        const staticUser = validateStaticCredentials(credentials.username, credentials.password);
        
        if (staticUser) {
          createStaticSession(staticUser);
          setUser(staticUser);
          
          toast({
            title: 'Success',
            description: 'Login successful!',
          });
          
          navigate('/');
        } else {
          throw new Error('Invalid credentials');
        }
      } else {
        // Use API authentication for development
        const response = await apiRequest('POST', '/api/login', credentials);
        const data = await response.json();
        
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        
        toast({
          title: 'Success',
          description: 'Login successful!',
        });
        
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: 'Invalid username or password',
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const isStatic = isStaticDeployment();
    
    if (isStatic) {
      clearStaticSession();
    } else {
      localStorage.removeItem('user');
    }
    
    setUser(null);
    
    toast({
      title: 'Logged out',
      description: 'You have been logged out successfully',
    });
    
    // Force a redirect to home
    window.location.href = '/';
  };

  const isAdmin = user?.isAdmin || false;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};
