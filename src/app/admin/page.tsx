
'use client';

import React, { useState, useEffect } from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, LogOut } from 'lucide-react';
import Link from 'next/link';


const ADMIN_AUTH_KEY = 'visionaryPrompterAdminAuth';

export default function AdminPage() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const authStatus = localStorage.getItem(ADMIN_AUTH_KEY);
      if (authStatus === 'true') {
        setIsAdminAuthenticated(true);
      }
    } catch (error) {
      console.error("Error accessing localStorage for admin auth:", error);
      // Potentially handle private browsing mode or other localStorage errors
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    try {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } catch (error) {
      console.error("Error setting admin auth in localStorage:", error);
      alert("Could not save login status. You might be in private browsing mode.");
    }
    setIsAdminAuthenticated(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    } catch (error) {
      console.error("Error removing admin auth from localStorage:", error);
    }
    setIsAdminAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Loading admin area...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center mb-4 sm:mb-0">
          <LayoutDashboard className="h-8 w-8 mr-3 text-primary" />
          <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">
            Admin Panel
          </h1>
        </div>
        <div className="flex items-center space-x-2">
           <Link href="/" passHref>
                <Button variant="outline">Back to App</Button>
            </Link>
          {isAdminAuthenticated && (
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          )}
        </div>
      </header>
      
      {!isAdminAuthenticated ? (
        <AdminLoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <AdminDashboard />
      )}

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Visionary Prompter Admin</p>
      </footer>
    </div>
  );
}
