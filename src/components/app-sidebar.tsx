
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SquareTerminal,
  Settings,
  Wand2,
  DraftingCompass,
  MessageSquare,
  LogOut,
  Coins,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { href: '/visionary-prompter', icon: Wand2, label: 'Visionary Prompter' },
    { href: '/visionary-chatter', icon: MessageSquare, label: 'Visionary Chatter' },
    { href: '/visionary-builder', icon: DraftingCompass, label: 'Visionary Builder' },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-12 w-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 justify-center"
              tooltip={{ children: 'Visionary Suite Home', side: 'right' }}
            >
              <Link href="/">
                <SquareTerminal size={24} />
                <span className="group-data-[collapsible=icon]:hidden">Visionary Suite</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarSeparator className="my-3" />

          {navItems.map(item => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="h-12 w-12 rounded-2xl"
                tooltip={{ children: item.label, side: 'right' }}
              >
                <Link href={item.href} className="relative justify-center">
                  <item.icon size={22} />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-12 w-12 rounded-2xl justify-center" tooltip={{ children: 'Settings', side: 'right' }}>
              <Link href="/admin">
                <Settings size={22} />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          {user ? (
            <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto md:h-12 w-12 rounded-2xl justify-center !p-0 data-[state=open]:h-auto" tooltip={{ children: user.username, side: 'right' }}>
                    <div className="flex flex-col items-center group-data-[collapsible=icon]:w-full w-full py-2 group-data-[collapsible=icon]:py-0">
                       <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${user.username}`} alt={user.username} data-ai-hint="avatar robot" />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="group-data-[collapsible=icon]:hidden w-full px-2 mt-2 space-y-2 text-center">
                           <p className="text-sm font-medium truncate w-full">{user.username}</p>
                           <div className="flex items-center justify-center text-xs text-primary bg-primary/10 rounded-md py-1 px-2 w-full">
                                <Coins className="mr-1.5 h-3.5 w-3.5" />
                                <span>{user.credits} Credits</span>
                           </div>
                           <Button variant="ghost" size="sm" onClick={logout} className="w-full mt-2 h-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                               <LogOut className="mr-2 h-4 w-4" />
                               Logout
                           </Button>
                        </div>
                    </div>
                </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-12 w-12 rounded-2xl justify-center" tooltip={{ children: 'Login / Register', side: 'right' }}>
                <Link href="/login">
                    <Avatar className="h-10 w-10">
                    <AvatarImage src="https://placehold.co/100x100.png" alt="User" data-ai-hint="person face" />
                    <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <span className="group-data-[collapsible=icon]:hidden">Login/Register</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          )}

        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
