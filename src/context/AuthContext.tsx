
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/lib/db';
import { LoadingSpinner } from '@/components/loading-spinner';

// Omit passwordHash from the user object we store in context/local storage
export type AuthUser = Omit<User, 'passwordHash'>;

interface AuthContextType {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('visionary-user');
      if (storedUser) {
        setUserState(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('visionary-user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUser = (user: AuthUser | null) => {
    setUserState(user);
    if (user) {
      localStorage.setItem('visionary-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('visionary-user');
    }
  };
  
  const logout = () => {
      setUser(null);
      // In a real app, you might want to call an API endpoint to invalidate a server session/token
      window.location.href = '/login'; // Redirect to login page for a full refresh
  }

  // If still loading, show a full-page spinner.
  // This prevents a flash of the logged-out state before the user is loaded from localStorage.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoadingSpinner size="2rem" message="Loading session..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
