
'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Coins, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LOCAL_STORAGE_SESSION_ID_KEY = 'visionaryPrompterSessionId';
const LOCAL_STORAGE_CREDITS_KEY_PREFIX = 'visionaryPrompterCredits_';
const INITIAL_CREDITS_FALLBACK = 0;
const DOUBLE_CLICK_THRESHOLD = 500; // milliseconds for double click
const EASTER_EGG_CREDITS = 500;

export function CreditsDisplay() {
  const [currentCredits, setCurrentCredits] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const { toast } = useToast();

  const dispatchCreditsUpdate = (newCreditsValue: number) => {
    window.dispatchEvent(new CustomEvent('creditsChanged', { detail: newCreditsValue }));
  };

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
          // If no credits found for this session, initialize with fallback
          // localStorage.setItem(creditsStorageKey, INITIAL_CREDITS_FALLBACK.toString());
          setCurrentCredits(INITIAL_CREDITS_FALLBACK);
        }
      } else {
        setCurrentCredits(INITIAL_CREDITS_FALLBACK);
      }
    };

    updateCreditsFromStorage(); 

    const handleCreditsUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<number>;
        if (typeof customEvent.detail === 'number') {
            setCurrentCredits(customEvent.detail);
        } else {
            updateCreditsFromStorage();
        }
    };

    window.addEventListener('creditsChanged', handleCreditsUpdate);
    window.addEventListener('storage', updateCreditsFromStorage);


    return () => {
      window.removeEventListener('creditsChanged', handleCreditsUpdate);
      window.removeEventListener('storage', updateCreditsFromStorage);
    };

  }, [mounted]);

  const handleCreditsClick = () => {
    if (!mounted) return;

    const now = Date.now();
    if (now - lastClickTime < DOUBLE_CLICK_THRESHOLD) {
      // Double click detected
      const sessionId = localStorage.getItem(LOCAL_STORAGE_SESSION_ID_KEY);
      if (!sessionId) {
        toast({ variant: "destructive", title: "Session Error", description: "Cannot add credits without a session." });
        setLastClickTime(0); // Reset to prevent immediate re-trigger
        return;
      }

      const creditsStorageKey = `${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`;
      const storedCredits = localStorage.getItem(creditsStorageKey);
      let currentBalance = INITIAL_CREDITS_FALLBACK; // Default to fallback if parsing fails or not found
      
      if (storedCredits !== null) {
        const parsed = parseInt(storedCredits, 10);
        if (!isNaN(parsed)) {
          currentBalance = parsed;
        }
      }

      const newBalance = currentBalance + EASTER_EGG_CREDITS;
      localStorage.setItem(creditsStorageKey, newBalance.toString());
      setCurrentCredits(newBalance);
      dispatchCreditsUpdate(newBalance);
      
      toast({
        title: "🎁 Secret Credits!",
        description: `You found an easter egg! ${EASTER_EGG_CREDITS} credits added.`,
        duration: 4000,
      });
      
      setLastClickTime(0); // Reset lastClickTime to require two new clicks for another trigger
    } else {
      setLastClickTime(now);
    }
  };

  if (!mounted) {
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
      className="h-9 rounded-full pl-2.5 pr-3 py-1 bg-background/80 backdrop-blur-sm text-xs items-center border-primary/40 text-primary/90 hover:border-primary hover:text-primary transition-colors cursor-pointer"
      title={`You have ${currentCredits === null ? '...' : currentCredits} credits. Double click for a surprise!`}
      onClick={handleCreditsClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCreditsClick(); }}
    >
      <Coins className="mr-1.5 h-4 w-4" />
      <span className="font-medium text-sm">{currentCredits === null ? '--' : currentCredits}</span>
    </Badge>
  );
}
