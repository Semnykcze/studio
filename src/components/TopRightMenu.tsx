
'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Menu, Settings, User, UserPlus } from 'lucide-react';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { WhatsNewButton } from '@/components/whats-new-button';
import { AppSwitcherButton } from '@/components/app-switcher-button';
import { VisionaryBuilderNavButton } from '@/components/visionary-builder-nav-button';

export function TopRightMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-foreground/70 hover:text-foreground"
          title="Open Menu"
        >
          <Menu className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Open Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Visionary Suite</p>
            <p className="text-xs leading-none text-muted-foreground">
              AI Creative Tools
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
         <div className="px-2 py-1.5 text-xs text-muted-foreground">Toggle Theme:</div>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent">
            <ThemeToggleButton />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
           <WhatsNewButton />
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
           <AppSwitcherButton />
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
            <VisionaryBuilderNavButton />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/register" className="flex items-center w-full">
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Register</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => alert('Login clicked! (Placeholder for next step)')}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Login</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/admin" className="flex items-center w-full">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
