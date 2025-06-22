
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppSidebar } from '@/components/app-sidebar';
import { MobileHeader } from '@/components/mobile-header';
import { SidebarProvider } from '@/components/ui/sidebar';

export const metadata: Metadata = {
  title: 'Visionary Suite', 
  description: 'Analyze images, generate optimized prompts, chat with an AI prompt expert, and build prompts.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen">
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <div className="md:pl-[var(--sidebar-width-icon)] group-data-[state=expanded]/sidebar-wrapper:md:pl-[var(--sidebar-width)] transition-[padding-left] ease-linear duration-200">
            <MobileHeader />
            <main className="h-screen overflow-y-auto">
              {children}
            </main>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
