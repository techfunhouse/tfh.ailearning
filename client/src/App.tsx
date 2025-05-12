import * as React from "react"
import { Switch, Route, useLocation, useRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { Notification } from "@/components/ui/notification";

import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/not-found";

// This handles GitHub Pages path rewriting
// GitHub Pages uses a pattern like this for SPA routing:
// /?/some/path -> maps to -> /some/path
const useHashQueryRouter = () => {
  // Initialize wouter
  const router = useRouter();
  const [location, setLocation] = useLocation();
  
  React.useEffect(() => {
    // Check if we're on GitHub Pages with the query parameter format
    if (location.includes('/?/')) {
      // Convert /?/path to /path
      const realPath = location.replace('/?/', '/');
      if (realPath !== location) {
        console.log(`GitHub Pages routing: Redirecting from ${location} to ${realPath}`);
        setLocation(realPath);
      }
    }
  }, [location, setLocation]);

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
          <Notification />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
