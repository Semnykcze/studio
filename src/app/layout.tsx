
import type {Metadata} from 'next';
import Link from 'next/link'; 
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { AppSwitcherButton } from '@/components/app-switcher-button'; // Added AppSwitcherButton
import { Bot } from 'lucide-react'; 

export const metadata: Metadata = {
  title: 'Visionary Prompter & Chatter', 
  description: 'Analyze images, generate optimized prompts, and chat with an AI prompt expert.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col">
        <div className="fixed top-4 right-4 z-50 print:hidden flex items-center space-x-2"> {/* Added flex and space-x-2 */}
          <AppSwitcherButton /> {/* Added the new button */}
          <ThemeToggleButton />
        </div>
        <main className="flex-grow">
          {children}
        </main>
        <footer className="w-full border-t border-border py-6 text-center text-muted-foreground text-xs md:text-sm">
          <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-2">
            <p>&copy; {new Date().getFullYear()} Visionary Apps. AI-Powered Creativity.</p>
            <nav>
              <Link href="/visionary-chatter" className="hover:text-primary transition-colors flex items-center gap-1.5">
                <Bot size={14} /> Visionary Chatter
              </Link>
            </nav>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
