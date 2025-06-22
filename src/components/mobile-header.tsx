
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { SquareTerminal } from 'lucide-react';
import Link from 'next/link';

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
      <SidebarTrigger />
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <SquareTerminal className="h-6 w-6 text-primary" />
        <span className="">Visionary Suite</span>
      </Link>
    </header>
  );
}
