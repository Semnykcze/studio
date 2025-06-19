
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DraftingCompass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function VisionaryBuilderNavButton() {
  const pathname = usePathname();

  // Determine if the button should be active (i.e., not on admin pages or other utility pages)
  // For now, let's assume it's visible on main app pages: Prompter, Chatter, Builder
  const isAppPage = ['/', '/visionary-chatter', '/visionary-builder'].includes(pathname);

  if (!isAppPage) {
    return null; 
  }

  return (
    <Button
      variant="outline"
      size="icon"
      asChild
      className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-foreground/70 hover:text-foreground"
      title="Open Visionary Builder"
    >
      <Link href="/visionary-builder" aria-label="Open Visionary Builder">
        <DraftingCompass className="h-[1.1rem] w-[1.1rem]" />
      </Link>
    </Button>
  );
}
