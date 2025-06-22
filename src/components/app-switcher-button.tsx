
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppSwitcherButton() {
  const pathname = usePathname();

  const isChatterPage = pathname === '/visionary-chatter';
  const isPrompterPage = pathname === '/visionary-prompter';

  if (!isChatterPage && !isPrompterPage) {
    return null; // Don't render the button on other pages
  }

  const targetPath = isChatterPage ? '/visionary-prompter' : '/visionary-chatter';
  const IconToDisplay = isChatterPage ? Wand2 : MessageSquare;
  const buttonTitle = isChatterPage ? 'Switch to Visionary Prompter' : 'Switch to Visionary Chatter';
  const ariaLabel = buttonTitle;

  return (
    <Button
      variant="outline"
      size="icon"
      asChild
      className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-foreground/70 hover:text-foreground"
      title={buttonTitle}
    >
      <Link href={targetPath} aria-label={ariaLabel}>
        <IconToDisplay className="h-[1.1rem] w-[1.1rem]" />
      </Link>
    </Button>
  );
}
