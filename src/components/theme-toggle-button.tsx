
'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggleButton() {
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setCurrentTheme(initialTheme);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [currentTheme, mounted]);

  const toggleTheme = () => {
    setCurrentTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  if (!mounted) {
    // Render a placeholder or null on the server/initial client render to avoid mismatch
    return <Button variant="ghost" size="icon" className="w-9 h-9 opacity-0" disabled aria-label="Toggle theme" />;
  }

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme} 
      aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
      className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-foreground/70 hover:text-foreground"
      title={`Switch to ${currentTheme === 'light' ? 'Dark' : 'Light'} Mode`}
    >
      {currentTheme === 'light' ? (
        <Moon className="h-[1.1rem] w-[1.1rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
    </Button>
  );
}
