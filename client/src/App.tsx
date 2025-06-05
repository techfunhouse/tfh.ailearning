import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";

import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";

// This handles GitHub Pages path rewriting
// GitHub Pages uses a pattern like this for SPA routing:
// /?/some/path -> maps to -> /some/path
const useHashQueryRouter = () => {
  const [location, setLocation] = useLocation();
  
  // Check if we're on GitHub Pages with the query parameter format
  if (typeof window !== 'undefined' && location.includes('/?/')) {
    // Convert /?/path to /path
    const realPath = location.replace('/?/', '/');
    if (realPath !== location) {
      console.log(`GitHub Pages routing: Redirecting from ${location} to ${realPath}`);
      setLocation(realPath);
    }
  }

  return { location, setLocation };
};

function Router() {
  // Use our custom location hook for GitHub Pages compatibility
  const { location } = useHashQueryRouter();

  return (
    <Switch location={location}>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/:rest*" component={HomePage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
  
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
