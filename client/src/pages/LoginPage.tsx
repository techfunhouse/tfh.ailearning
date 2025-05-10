import * as React from "react";
import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, BookOpen, Lock } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, user } = useAuth();
  const [, navigate] = useLocation();
  
  // If user is already logged in, redirect to home page
  useEffect(() => {
    if (user) {
      navigate('/home');
    }
  }, [user, navigate]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    await login(data);
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="icon-container h-16 w-16 bg-primary/10 rounded-full">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="gradient-text font-bold mb-2">RefHub</h1>
          <p className="text-muted-foreground">Your personal reference management system</p>
        </div>
        
        <Card className="w-full shadow-lg border-opacity-50">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Sign in to your account</CardTitle>
            <CardDescription>
              Enter your credentials to access your references
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your username" 
                          {...field} 
                          className="border-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          {...field} 
                          className="border-input"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full mt-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          
          <CardFooter className="flex justify-center border-t pt-4">
            <div className="text-sm text-muted-foreground">
              <p>Demo credentials:</p>
              <p><strong>Admin:</strong> admin / admin123</p>
              <p><strong>User:</strong> user / user123</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
