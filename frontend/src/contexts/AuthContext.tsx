'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authAPI, ApiError } from '@/library/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_trainer: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup', '/'];

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      
      if (!storedUser) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Validate with backend
      try {
        const response = await authAPI.getCurrentUser();
        if (response.authenticated && response.user) {
          setUser(response.user);
          localStorage.setItem('user', JSON.stringify(response.user));
        } else {
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        localStorage.removeItem('user');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (credentials: { login: string; password: string }) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.ok && response.user) {
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        router.push('/dashboard');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Login failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!user && !isPublicRoute) {
      router.push('/login');
    } else if (user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, pathname]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
