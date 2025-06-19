
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { generateRelatedTags, type GenerateRelatedTagsInput } from '@/ai/flows/generate-related-tags-flow';
import { LoadingSpinner } from '@/components/loading-spinner';
import { DraftingCompass, Wand2, Copy, Check, Sparkles, PlusCircle, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const LOCAL_STORAGE_BUILDER_PROMPT_KEY = 'visionaryBuilderPrompt';
const LOCAL_STORAGE_SESSION_ID_KEY = 'visionaryPrompterSessionId'; // Reuse for credits
const LOCAL_STORAGE_CREDITS_KEY_PREFIX = 'visionaryPrompterCredits_'; // Reuse for credits
const RELATED_TAGS_GENERATION_COST = 1;

interface DisplayTag {
  id: string;
  text: string;
  suggestions?: string[];
  isLoadingSuggestions?: boolean;
  popoverOpen?: boolean;
}

export default function VisionaryBuilderPage() {
  const [mainPrompt, setMainPrompt] = useState<string>('');
  const [displayTags, setDisplayTags] = useState<DisplayTag[]>([]);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { toast } = useToast();

  const dispatchCreditsUpdate = (newCreditsValue: number) => {
    window.dispatchEvent(new CustomEvent('creditsChanged', { detail: newCreditsValue }));
  };
  
  useEffect(() => {
    let currentSessionId = localStorage.getItem(LOCAL_STORAGE_SESSION_ID_KEY);
    if (currentSessionId) {
      setSessionId(currentSessionId);
    } else {
      // Fallback or generate if necessary, though it should exist from other pages
      const newId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      localStorage.setItem(LOCAL_STORAGE_SESSION_ID_KEY, newId);
      setSessionId(newId);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    const creditsStorageKey = `${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`;
    const storedCredits = localStorage.getItem(creditsStorageKey);
    if (storedCredits !== null) {
      setCredits(parseInt(storedCredits, 10));
    } else {
      // Initialize if not found, though ideally set by Prompter page first
      localStorage.setItem(creditsStorageKey, '10'); // Default to 10 if no other page set it
      setCredits(10);
      dispatchCreditsUpdate(10);
    }
  }, [sessionId]);

  useEffect(() => {
    const savedPrompt = localStorage.getItem(LOCAL_STORAGE_BUILDER_PROMPT_KEY);
    if (savedPrompt) {
      setMainPrompt(savedPrompt);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_BUILDER_PROMPT_KEY, mainPrompt);
    parsePromptToTags(mainPrompt);
  }, [mainPrompt]);


  const parsePromptToTags = (prompt: string) => {
    if (!prompt.trim()) {
      setDisplayTags([]);
      return;
    }
    const parsed = prompt
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map((tagText, index) => {
        const existingTag = displayTags.find(dt => dt.text === tagText && dt.id.startsWith(`tag-${index}`));
        return {
          id: existingTag?.id || `tag-${index}-${Date.now()}`,
          text: tagText,
          suggestions: existingTag?.suggestions || [],
          isLoadingSuggestions: existingTag?.isLoadingSuggestions || false,
          popoverOpen: existingTag?.popoverOpen || false,
        };
      });
    setDisplayTags(parsed);
  };
  
  const handleGenerateSuggestions = async (tagId: string) => {
    const tagIndex = displayTags.findIndex(t => t.id === tagId);
    if (tagIndex === -1) return;

    const targetTag = displayTags[tagIndex];

    if (credits === null || credits < RELATED_TAGS_GENERATION_COST) {
      toast({ variant: "destructive", title: "Not enough credits", description: `You need ${RELATED_TAGS_GENERATION_COST} credit(s).` });
      return;
    }
    
    setDisplayTags(prevTags =>
      prevTags.map(t => (t.id === tagId ? { ...t, isLoadingSuggestions: true, suggestions: [] } : t))
    );

    try {
      const input: GenerateRelatedTagsInput = {
        targetTag: targetTag.text,
        fullPromptContext: mainPrompt,
      };
      const result = await generateRelatedTags(input);
      
      setDisplayTags(prevTags =>
        prevTags.map(t => (t.id === tagId ? { ...t, suggestions: result.suggestedKeywords, isLoadingSuggestions: false, popoverOpen: true } : t))
      );

      if (sessionId && credits !== null) {
        const newCredits = credits - RELATED_TAGS_GENERATION_COST;
        setCredits(newCredits);
        dispatchCreditsUpdate(newCredits);
        localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      }
      toast({ title: `Suggestions for "${targetTag.text}" generated!` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error generating suggestions", description: error instanceof Error ? error.message : String(error) });
      setDisplayTags(prevTags =>
        prevTags.map(t => (t.id === tagId ? { ...t, isLoadingSuggestions: false } : t))
      );
    }
  };

  const addSuggestionToPrompt = (suggestion: string) => {
    setMainPrompt(prev => {
      const trimmedPrev = prev.trim();
      if (!trimmedPrev) return suggestion;
      if (trimmedPrev.endsWith(',')) {
        return `${trimmedPrev} ${suggestion}`;
      }
      return `${trimmedPrev}, ${suggestion}`;
    });
  };

  const handleCopyPrompt = () => {
    if (!mainPrompt) return;
    navigator.clipboard.writeText(mainPrompt)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({ title: "Prompt copied!" });
      })
      .catch(() => toast({ variant: "destructive", title: "Copy failed" }));
  };

  const togglePopover = (tagId: string, open?: boolean) => {
    setDisplayTags(prevTags =>
      prevTags.map(t => {
        if (t.id === tagId) {
          const newOpenState = typeof open === 'boolean' ? open : !t.popoverOpen;
          // If opening and no suggestions yet, and not loading, then fetch.
          if (newOpenState && !t.suggestions?.length && !t.isLoadingSuggestions) {
            handleGenerateSuggestions(tagId); // Auto-fetch if opening and empty
            return { ...t, popoverOpen: newOpenState, isLoadingSuggestions: true };
          }
          return { ...t, popoverOpen: newOpenState };
        }
        return t; // Close other popovers if needed: { ...t, popoverOpen: false };
      })
    );
  };
  
  const anyLoading = displayTags.some(tag => tag.isLoadingSuggestions);

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 print:p-0">
      <header className="w-full mb-8 md:mb-12 text-center">
        <div className="inline-flex items-center justify-center space-x-2 mb-3">
          <DraftingCompass className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary tracking-tight">
            Visionary Builder
          </h1>
        </div>
        <p className="text-base sm:text-md md:text-lg text-muted-foreground max-w-xl mx-auto">
          Craft detailed prompts tag by tag with AI-powered keyword suggestions.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Wand2 className="mr-2 h-5 w-5" /> Main Prompt
              </CardTitle>
              <CardDescription className="text-sm">
                Type your base prompt here. Use commas to separate distinct ideas or tags.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <Textarea
                id="main-prompt-builder"
                placeholder="e.g., mystical forest, ancient runes, glowing particles, cinematic lighting..."
                value={mainPrompt}
                onChange={(e) => setMainPrompt(e.target.value)}
                className="min-h-[150px] md:min-h-[200px] text-sm bg-background focus-visible:ring-primary/50 rounded-md"
                disabled={anyLoading}
              />
            </CardContent>
            <CardFooter className="p-4 md:p-6 border-t justify-end">
              <Button onClick={handleCopyPrompt} disabled={!mainPrompt || anyLoading} className="text-sm py-2">
                {isCopied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy Full Prompt
              </Button>
            </CardFooter>
          </Card>

          {displayTags.length > 0 && (
            <Card className="shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                  <Sparkles className="mr-2 h-5 w-5" /> Enhance Tags
                </CardTitle>
                <CardDescription className="text-sm">
                  Click the <Wand2 size={14} className="inline align-text-bottom"/> icon on a tag to get AI suggestions. Costs {RELATED_TAGS_GENERATION_COST} credit per tag.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-wrap gap-2">
                  {displayTags.map((tag) => (
                    <Popover key={tag.id} open={tag.popoverOpen} onOpenChange={(open) => togglePopover(tag.id, open)}>
                      <PopoverTrigger asChild>
                        <Badge
                          variant="outline"
                          className="text-sm py-1 px-2.5 cursor-pointer hover:bg-accent/50 transition-colors group relative"
                        >
                          {tag.text}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-1 h-5 w-5 p-0 opacity-70 group-hover:opacity-100 text-primary hover:bg-primary/10"
                            onClick={(e) => { 
                              e.stopPropagation(); // Prevent PopoverTrigger from firing again
                              if (tag.popoverOpen && tag.suggestions?.length) { // If already open with suggestions, just toggle
                                  togglePopover(tag.id, false);
                              } else { // Otherwise, fetch/refetch
                                  handleGenerateSuggestions(tag.id);
                              }
                            }}
                            disabled={tag.isLoadingSuggestions || (credits !== null && credits < RELATED_TAGS_GENERATION_COST)}
                            aria-label={`Get suggestions for ${tag.text}`}
                            title={`Get AI suggestions (${RELATED_TAGS_GENERATION_COST} credit)`}
                          >
                            {tag.isLoadingSuggestions ? <LoadingSpinner size="0.7rem" /> : <Wand2 size={12} />}
                          </Button>
                        </Badge>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-0" side="bottom" align="start">
                        <ScrollArea className="max-h-60">
                           <div className="p-2 space-y-1">
                            {tag.isLoadingSuggestions && !tag.suggestions?.length && (
                                <div className="flex items-center justify-center py-4">
                                    <LoadingSpinner message="Loading..." size="1rem"/>
                                </div>
                            )}
                            {!tag.isLoadingSuggestions && !tag.suggestions?.length && (
                                <p className="text-xs text-muted-foreground p-2 text-center">No suggestions found or an error occurred.</p>
                            )}
                            {tag.suggestions && tag.suggestions.map((suggestion, idx) => (
                              <Button
                                key={idx}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-auto py-1.5 px-2"
                                onClick={() => {
                                    addSuggestionToPrompt(suggestion);
                                    togglePopover(tag.id, false);
                                }}
                              >
                                <PlusCircle size={12} className="mr-1.5 text-green-500"/> {suggestion}
                              </Button>
                            ))}
                           </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
                 {(credits !== null && credits < RELATED_TAGS_GENERATION_COST && displayTags.some(t => !t.suggestions?.length)) && (
                    <p className="text-xs text-destructive mt-3">Not enough credits to generate new tag suggestions.</p>
                 )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
           <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-headline flex items-center text-primary">
                <Info className="mr-2 h-5 w-5" /> How to Use
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 text-sm space-y-2 text-muted-foreground">
                <p>1. Start by typing your core ideas into the "Main Prompt" area. Use commas (,) to separate distinct concepts, which will be treated as individual "tags".</p>
                <p>2. The parsed tags will appear below. Click the <Wand2 size={14} className="inline align-text-bottom"/> icon next to any tag to generate AI-powered keyword suggestions for it (costs {RELATED_TAGS_GENERATION_COST} credit).</p>
                <p>3. In the popover, click on <PlusCircle size={14} className="inline align-text-bottom text-green-500"/> next to a suggestion to add it to your main prompt.</p>
                <p>4. Continue refining your prompt by adding more tags or getting more suggestions.</p>
                <p>5. Once you're happy, use the "Copy Full Prompt" button to use it in your favorite image generator!</p>
            </CardContent>
          </Card>
          <Alert>
            <DraftingCompass className="h-4 w-4" />
            <AlertTitle>Tip!</AlertTitle>
            <AlertDescription className="text-xs">
              For best results with AI suggestions, make your initial tags relatively focused. Broad tags might yield very generic suggestions.
            </AlertDescription>
          </Alert>
        </div>
      </div>
       <footer className="mt-12 md:mt-16 py-6 text-center text-xs text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Visionary Builder. AI-Powered Creativity.</p>
         {sessionId && (<p className="text-xs mt-1">Session: {sessionId.length > 15 ? `${sessionId.substring(0,15)}...` : sessionId}</p>)}
      </footer>
    </div>
  );
}
