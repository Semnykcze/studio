
import type {Metadata} from 'next';
import Link from 'next/link'; 
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { TopRightMenu } from '@/components/TopRightMenu'; // Changed
import { Bot, DraftingCompass, Home, Menu as MenuIcon } from 'lucide-react'; // Added MenuIcon

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col">
        <div className="fixed top-4 right-4 z-50 print:hidden flex items-center space-x-2">
          <TopRightMenu />
        </div>
        <main className="flex-grow">
          {children}
        </main>
        <footer className="w-full border-t border-border py-6 text-center text-muted-foreground text-xs md:text-sm">
          <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-2">
            <p>&copy; {new Date().getFullYear()} Visionary Apps. AI-Powered Creativity.</p>
            <nav className="flex gap-x-3">
              <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1.5">
                 <Home size={14} /> Visionary Prompter
              </Link>
              <Link href="/visionary-chatter" className="hover:text-primary transition-colors flex items-center gap-1.5">
                <Bot size={14} /> Visionary Chatter
              </Link>
              <Link href="/visionary-builder" className="hover:text-primary transition-colors flex items-center gap-1.5">
                <DraftingCompass size={14} /> Visionary Builder
              </Link>
            </nav>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
