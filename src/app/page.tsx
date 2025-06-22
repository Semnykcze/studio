
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, MessageSquare, DraftingCompass, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const features = [
    {
      icon: Wand2,
      title: 'Visionary Prompter',
      description: 'Analyze any image and let our AI generate a highly detailed and optimized prompt for various models like Midjourney, DALL-E 3, and more.',
      link: '/visionary-prompter',
      linkText: 'Try the Prompter',
    },
    {
      icon: MessageSquare,
      title: 'Visionary Chatter',
      description: 'Chat with an AI expert to brainstorm ideas, refine your concepts, and get guidance on crafting the perfect image generation prompt.',
      link: '/visionary-chatter',
      linkText: 'Start Chatting',
    },
    {
      icon: DraftingCompass,
      title: 'Visionary Builder',
      description: 'Construct complex prompts tag-by-tag with AI-powered keyword suggestions to build the perfect scene with granular control.',
      link: '/visionary-builder',
      linkText: 'Build a Prompt',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 bg-gradient-to-br from-card to-background">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary font-headline">
                Welcome to Visionary Suite
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Your complete AI-powered toolkit for creative image generation and prompt engineering. Unleash your imagination and bring your ideas to life.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row justify-center">
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/visionary-prompter">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">
                    Login / Register
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">A Tool for Every Vision</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Whether you're a seasoned prompt engineer or just starting, our suite provides the perfect tool to enhance your creative workflow.
              </p>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="flex flex-col h-full hover:border-primary/50 transition-colors duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="p-2 bg-primary/10 rounded-md border border-primary/20">
                         <feature.icon className="h-6 w-6 text-primary" />
                       </div>
                       <CardTitle className="text-xl font-headline">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={feature.link}>
                        {feature.linkText}
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
