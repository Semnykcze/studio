
'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Coins } from 'lucide-react';

const LOCAL_STORAGE_SESSION_ID_KEY = 'visionaryPrompterSessionId';
const LOCAL_STORAGE_CREDITS_KEY_PREFIX = 'visionaryPrompterCredits_';
const INITIAL_CREDITS_FALLBACK = 0; 

export function CreditsDisplay() {
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const updateCreditsFromStorage = () => {
      const sessionId = localStorage.getItem(LOCAL_STORAGE_SESSION_ID_KEY);
      if (sessionId) {
        const creditsStorageKey = `${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`;
        const storedCredits = localStorage.getItem(creditsStorageKey);
        if (storedCredits !== null) {
          const parsedCredits = parseInt(storedCredits, 10);
          if (!isNaN(parsedCredits)) {
            setCurrentCredits(parsedCredits);
          } else {
            setCurrentCredits(INITIAL_CREDITS_FALLBACK);
          }
        } else {
          setCurrentCredits(INITIAL_CREDITS_FALLBACK);
        }
      } else {
        setCurrentCredits(INITIAL_CREDITS_FALLBACK);
      }
    };

    updateCreditsFromStorage(); // Initial read

    // Listen for custom event to update credits
    const handleCreditsUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<number>;
        if (typeof customEvent.detail === 'number') {
            setCurrentCredits(customEvent.detail);
        } else {
            // If event detail is not a number, re-fetch from storage
            updateCreditsFromStorage();
        }
    };

    window.addEventListener('creditsChanged', handleCreditsUpdate);
    // Also listen to storage events for changes from other tabs (though less likely for this app's structure)
    window.addEventListener('storage', updateCreditsFromStorage);


    return () => {
      window.removeEventListener('creditsChanged', handleCreditsUpdate);
      window.removeEventListener('storage', updateCreditsFromStorage);
    };

  }, [mounted]);

  if (!mounted) {
    // Render a placeholder or null to avoid hydration mismatch during SSR
    return (
      <Badge variant="outline" className="h-9 rounded-full px-3 py-1 bg-background/80 backdrop-blur-sm text-xs items-center text-transparent select-none">
        <Coins className="mr-1.5 h-3.5 w-3.5" />
        <span>--</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="h-9 rounded-full pl-2.5 pr-3 py-1 bg-background/80 backdrop-blur-sm text-xs items-center border-primary/40 text-primary/90 hover:border-primary hover:text-primary transition-colors"
      title={`You have ${currentCredits === null ? '...' : currentCredits} credits`}
    >
      <Coins className="mr-1.5 h-4 w-4" />
      <span className="font-medium text-sm">{currentCredits === null ? '--' : currentCredits}</span>
    </Badge>
  );
}
