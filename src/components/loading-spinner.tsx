"use client";

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: number | string;
  message?: string;
}

export function LoadingSpinner({ className, size = "1.5rem", message }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-primary" aria-live="polite" aria-busy="true">
      <Loader2
        className={cn('animate-spin', className)}
        style={{ width: size, height: size }}
      />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <span className="sr-only">{message || "Loading..."}</span>
    </div>
  );
}
