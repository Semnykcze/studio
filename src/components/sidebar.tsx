
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquareTerminal,
  LifeBuoy,
  Wand2,
  DraftingCompass,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Wand2, label: 'Visionary Prompter' },
    { href: '/visionary-chatter', icon: MessageSquare, label: 'Visionary Chatter' },
    { href: '/visionary-builder', icon: DraftingCompass, label: 'Visionary Builder' },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="w-16 hidden md:flex flex-col items-center justify-between p-2 bg-card border-r">
        <div className="flex flex-col items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/">
                <Button variant="ghost" size="icon" className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <SquareTerminal size={24} />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Visionary Suite</TooltipContent>
          </Tooltip>
          
          {/* Navigation Items */}
          {navItems.map(item => (
             <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                    <Link href={item.href}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={pathname === item.href ? 'text-primary bg-accent' : 'text-muted-foreground hover:text-primary hover:bg-accent'}
                        >
                            <item.icon size={20} />
                        </Button>
                    </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
             </Tooltip>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary hover:bg-accent">
                <LifeBuoy size={20} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Help & Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
               <Link href="/login">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person face" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Login/Register</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
