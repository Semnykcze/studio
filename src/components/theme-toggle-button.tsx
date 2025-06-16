
'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggleButton() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // This effect runs once on mount to set the initial theme
    // from localStorage or system preference.
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setCurrentTheme(initialTheme);
  }, []);

  useEffect(() => {
    // This effect runs whenever currentTheme changes to update
    // the class on <html> and persist to localStorage.
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // To prevent hydration mismatch, we can render a placeholder or null on the server,
  // or ensure the button's initial state matches what useEffect will set it to.
  // For simplicity, we'll let useEffect handle the initial correct rendering.
  // The button will briefly show the default 'light' icon before useEffect updates.

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme} 
      aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      className="w-9 h-9 text-primary hover:text-accent-foreground hover:bg-accent"
    >
      {currentTheme === 'light' ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  );
}
