
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Gift } from 'lucide-react';

const features = [
  {
    title: "Image Editing & Regeneration in Visionary Prompter",
    description: "After generating an image, you can now provide a new text prompt to edit it. Also, regenerate images with control over a 'seed' value to influence style or get variations. You can also save the generated image directly.",
  },
  {
    title: "AI Keyword Suggestions in Visionary Builder",
    description: "When crafting prompts in Visionary Builder, click the magic wand icon next to any tag to get AI-powered suggestions for related keywords and phrases (costs 1 credit).",
  },
  {
    title: "Prompt Transformation in Visionary Builder",
    description: "You can now apply AI-driven transformations to your entire composed prompt in Visionary Builder using natural language instructions, similar to the feature in the Prompter (costs 1 credit).",
  },
  {
    title: "Visionary Builder Enhancements",
    description: "Tags can now be removed, and the 'X' button for removal is only visible on hover for a cleaner interface. You can also transform your entire prompt using AI instructions.",
  },
  {
    title: "Image Editing in Visionary Prompter",
    description: "You can now edit your generated images by providing a text prompt. The AI will modify the existing image based on your instructions.",
  },
  {
    title: "Image Generation Seed Control",
    description: "The Visionary Prompter now includes an editable seed for image generation. A default seed is applied if none is provided, helping to influence or replicate artistic styles.",
  },
  {
    title: "Enhanced Visionary Chatter",
    description: "Chatter is now more professional, can engage in general conversation about image generation, and intelligently edit prompts based on your requests and conversation history.",
  },
  {
    title: "Advanced Prompt Configuration",
    description: "Specify desired Image Type (e.g., photography, logo) and Aspect Ratio (e.g., 1:1, landscape) in Visionary Prompter for more tailored AI prompts.",
  },
  {
    title: "NSFW Content Toggle",
    description: "A new switch in Visionary Prompter allows you to configure whether prompts can lead to potentially NSFW content, adjusting AI safety filters accordingly.",
  },
];

const uniqueFeatures = features.reduce((acc, current) => {
  const x = acc.find(item => item.title === current.title && item.description === current.description);
  if (!x) {
    return acc.concat([current]);
  } else {
    return acc;
  }
}, [] as {title: string; description: string}[]);


export function WhatsNewButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="w-9 h-9 rounded-full bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground text-foreground/70 hover:text-foreground"
          title="What's New"
        >
          <Gift className="h-[1.1rem] w-[1.1rem]" />
          <span className="sr-only">What's New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center">
            <Gift className="mr-2 h-5 w-5 text-primary" />
            What's New in Visionary Suite
          </DialogTitle>
          <DialogDescription>
            Check out the latest features and improvements we've added.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-2">
          {uniqueFeatures.map((feature, index) => (
            <div key={index} className="p-3 border rounded-md bg-muted/50">
              <h3 className="font-semibold text-sm text-primary mb-0.5">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
        <DialogFooter className="pt-4 border-t">
          <Button onClick={() => setIsOpen(false)} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
