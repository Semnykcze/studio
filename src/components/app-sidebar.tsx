
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquareTerminal,
  LifeBuoy,
  Wand2,
  DraftingCompass,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/visionary-prompter', icon: Wand2, label: 'Visionary Prompter', isBeta: true },
    { href: '/visionary-chatter', icon: MessageSquare, label: 'Visionary Chatter', isBeta: true },
    { href: '/visionary-builder', icon: DraftingCompass, label: 'Visionary Builder', isBeta: true },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarHeader>
          <SidebarMenuButton
            asChild
            className="w-full justify-start p-2 rounded-lg bg-primary text-primary-foreground"
            tooltip={{ children: 'Visionary Suite', side: 'right' }}
          >
            <Link href="/">
              <SquareTerminal size={24} />
              <span className="group-data-[collapsible=icon]:hidden">Visionary Suite</span>
            </Link>
          </SidebarMenuButton>
        </SidebarHeader>

        <SidebarMenu>
          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label, side: 'right' }}
                className="w-full justify-start"
              >
                <Link href={item.href} className="relative">
                  <item.icon size={20} />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                  {item.isBeta && (
                    <span className="absolute bottom-1 right-2 border border-primary/50 bg-background/10 backdrop-blur-sm text-primary/90 text-[9px] font-medium px-1 py-px rounded-[1.5px] group-data-[collapsible=icon]:hidden" title="Beta Feature">
                      BETA
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start" tooltip={{ children: 'Help & Settings', side: 'right' }}>
              <LifeBuoy size={20} />
              <span className="group-data-[collapsible=icon]:hidden">Help & Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="w-full justify-start" tooltip={{ children: 'Login/Register', side: 'right' }}>
              <Link href="/login">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person face" />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <span className="group-data-[collapsible=icon]:hidden">Login/Register</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
