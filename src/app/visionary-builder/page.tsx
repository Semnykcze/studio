
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardFooter, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { generateRelatedTags, type GenerateRelatedTagsInput } from '@/ai/flows/generate-related-tags-flow';
import { transformPrompt, type TransformPromptInput } from '@/ai/flows/transform-prompt-flow';
import { LoadingSpinner } from '@/components/loading-spinner';
import { DraftingCompass, Wand2, Copy, Check, Sparkles, PlusCircle, Info, X, Edit, MessageCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const LOCAL_STORAGE_BUILDER_PROMPT_KEY = 'visionaryBuilderPrompt';
const LOCAL_STORAGE_SESSION_ID_KEY = 'visionaryPrompterSessionId'; // Reuse for credits
const LOCAL_STORAGE_CREDITS_KEY_PREFIX = 'visionaryPrompterCredits_'; // Reuse for credits
const RELATED_TAGS_GENERATION_COST = 1;
const PROMPT_TRANSFORMATION_COST = 1;

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
  const [transformationInstruction, setTransformationInstruction] = useState<string>('');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);

  const { toast } = useToast();

  const dispatchCreditsUpdate = (newCreditsValue: number) => {
    window.dispatchEvent(new CustomEvent('creditsChanged', { detail: newCreditsValue }));
  };
  
  useEffect(() => {
    let currentSessionId = localStorage.getItem(LOCAL_STORAGE_SESSION_ID_KEY);
    if (currentSessionId) {
      setSessionId(currentSessionId);
    } else {
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
      const parsedCredits = parseInt(storedCredits, 10);
       if (!isNaN(parsedCredits)) {
        setCredits(parsedCredits);
      } else {
        localStorage.setItem(creditsStorageKey, '10');
        setCredits(10);
        dispatchCreditsUpdate(10);
      }
    } else {
      localStorage.setItem(creditsStorageKey, '10'); 
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

  const parsePromptToTags = useCallback((promptText: string) => {
    if (!promptText.trim()) {
      setDisplayTags([]);
      return;
    }
    const newTagTexts = promptText.split(',').map(t => t.trim()).filter(t => t.length > 0);

    setDisplayTags(prevDisplayTags => {
      return newTagTexts.map((tagText, index) => {
        const existingTagWithSameText = prevDisplayTags.find(dt => dt.text === tagText);
        
        if (existingTagWithSameText) {
          // If a tag with the exact same text exists, reuse its full state (including ID and suggestions)
          return { ...existingTagWithSameText };
        } else {
          // If no tag with the exact same text exists, this is effectively a new tag or a modified one.
          // Generate a new unique ID and reset its specific state like suggestions.
          return {
            id: `tag-${Date.now()}-${index}-${Math.random().toString(36).substring(7)}`,
            text: tagText,
            suggestions: [],
            isLoadingSuggestions: false,
            popoverOpen: false,
          };
        }
      });
    });
  }, []);


  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_BUILDER_PROMPT_KEY, mainPrompt);
    parsePromptToTags(mainPrompt);
  }, [mainPrompt, parsePromptToTags]);


  const handleRemoveTag = (tagIdToRemove: string) => {
    const newDisplayTags = displayTags.filter(tag => tag.id !== tagIdToRemove);
    const newMainPrompt = newDisplayTags.map(tag => tag.text).join(', ');
    setMainPrompt(newMainPrompt);
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
      prevTags.map(t => (t.id === tagId ? { ...t, isLoadingSuggestions: true, suggestions: [], popoverOpen: true } : t)) 
    );

    try {
      const input: GenerateRelatedTagsInput = {
        targetTag: targetTag.text,
        fullPromptContext: mainPrompt,
      };
      const result = await generateRelatedTags(input);
      
      setDisplayTags(prevTags =>
        prevTags.map(t => (t.id === tagId ? { ...t, suggestions: result.suggestedKeywords, isLoadingSuggestions: false } : t))
      );

      if (sessionId && credits !== null) {
        const newCredits = credits - RELATED_TAGS_GENERATION_COST;
        setCredits(newCredits);
        dispatchCreditsUpdate(newCredits);
        localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error generating suggestions", description: error instanceof Error ? error.message : String(error) });
      setDisplayTags(prevTags =>
        prevTags.map(t => (t.id === tagId ? { ...t, isLoadingSuggestions: false, popoverOpen: false } : t)) 
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
          if (newOpenState && !t.suggestions?.length && !t.isLoadingSuggestions) {
            handleGenerateSuggestions(tagId); 
            return { ...t, popoverOpen: newOpenState, isLoadingSuggestions: true };
          }
          return { ...t, popoverOpen: newOpenState };
        }
        return t;
      })
    );
  };

  const handleTransformPrompt = async () => {
    if (!mainPrompt.trim()) {
      toast({ variant: "destructive", title: "No prompt to transform", description: "Please enter a prompt in the main area first." });
      return;
    }
    if (!transformationInstruction.trim()) {
      toast({ variant: "destructive", title: "No transformation instruction", description: "Please describe how you want to change the prompt." });
      return;
    }
    if (credits === null || credits < PROMPT_TRANSFORMATION_COST) {
      toast({ variant: "destructive", title: "Not enough credits", description: `You need ${PROMPT_TRANSFORMATION_COST} credit(s) for transformation.` });
      return;
    }

    setIsTransforming(true);
    try {
      const input: TransformPromptInput = {
        originalPrompt: mainPrompt,
        transformationInstruction: transformationInstruction,
      };
      const result = await transformPrompt(input);
      setMainPrompt(result.transformedPrompt); 
      setTransformationInstruction(''); 
      
      if (sessionId && credits !== null) {
        const newCredits = credits - PROMPT_TRANSFORMATION_COST;
        setCredits(newCredits);
        dispatchCreditsUpdate(newCredits);
        localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      }
      toast({ title: "Prompt transformed successfully!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Prompt transformation failed", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsTransforming(false);
    }
  };
  
  const anyLoading = displayTags.some(tag => tag.isLoadingSuggestions) || isTransforming;

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
          Craft detailed prompts tag by tag with AI-powered keyword suggestions and transformations.
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
                Type your base prompt. Use commas (,) to separate distinct ideas or tags.
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
                  Click <Wand2 size={14} className="inline align-text-bottom"/> on a tag for AI suggestions ({RELATED_TAGS_GENERATION_COST} credit/tag). Hover for <X size={14} className="inline align-text-bottom text-destructive"/> to remove.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-wrap gap-2.5">
                  {displayTags.map((tag) => (
                    <Popover key={tag.id} open={tag.popoverOpen} onOpenChange={(open) => togglePopover(tag.id, open)}>
                      <div className="relative group/tag">
                        <PopoverTrigger asChild>
                          <Badge
                            variant="outline"
                            className="text-sm py-1 pl-2.5 pr-1 cursor-pointer hover:bg-accent/50 transition-colors group relative flex items-center gap-1"
                            onClick={() => { 
                                if (!(tag.popoverOpen && tag.suggestions?.length)) {
                                    handleGenerateSuggestions(tag.id);
                                } else if (tag.popoverOpen) {
                                   togglePopover(tag.id, false); 
                                } else {
                                   togglePopover(tag.id, true); 
                                }
                            }}
                          >
                            {tag.text}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="ml-0.5 h-5 w-5 p-0 opacity-60 group-hover/tag:opacity-100 text-primary hover:bg-primary/10"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                if (tag.popoverOpen && tag.suggestions?.length) { 
                                    togglePopover(tag.id, false);
                                } else { 
                                    handleGenerateSuggestions(tag.id);
                                }
                              }}
                              disabled={tag.isLoadingSuggestions || (credits !== null && credits < RELATED_TAGS_GENERATION_COST)}
                              aria-label={`Get suggestions for ${tag.text}`}
                              title={`Get AI suggestions (${RELATED_TAGS_GENERATION_COST} credit)`}
                            >
                              {tag.isLoadingSuggestions ? <LoadingSpinner size="0.6rem" /> : <Wand2 size={11} />}
                            </Button>
                          </Badge>
                        </PopoverTrigger>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute -top-1.5 -right-1.5 h-4 w-4 p-0 rounded-full bg-muted/70 hover:bg-destructive/80 hover:text-destructive-foreground text-muted-foreground opacity-0 group-hover/tag:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag.id); }}
                            aria-label={`Remove tag ${tag.text}`}
                            title="Remove tag"
                            disabled={anyLoading}
                        >
                            <X size={10} />
                        </Button>
                      </div>
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

          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Edit className="mr-2 h-5 w-5" /> Transform Full Prompt
              </CardTitle>
              <CardDescription className="text-sm">
                Describe how you want to change the entire prompt above. Costs {PROMPT_TRANSFORMATION_COST} credit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-3">
              <Textarea
                id="transformation-instruction"
                placeholder="e.g., 'make it nighttime and add a spooky atmosphere', 'rewrite this to be more abstract', 'focus on the character's expression'..."
                value={transformationInstruction}
                onChange={(e) => setTransformationInstruction(e.target.value)}
                className="min-h-[80px] text-sm bg-background focus-visible:ring-primary/50 rounded-md"
                disabled={anyLoading || !mainPrompt.trim()}
              />
              <Button 
                onClick={handleTransformPrompt} 
                disabled={anyLoading || !mainPrompt.trim() || !transformationInstruction.trim() || (credits !== null && credits < PROMPT_TRANSFORMATION_COST)} 
                className="w-full text-sm py-2"
              >
                {isTransforming ? <LoadingSpinner size="1rem" className="mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Transform Prompt
              </Button>
              {(!mainPrompt.trim() && !anyLoading) && (
                <p className="text-xs text-muted-foreground text-center">Enter a main prompt first to enable transformation.</p>
              )}
              {(credits !== null && credits < PROMPT_TRANSFORMATION_COST && mainPrompt.trim() && transformationInstruction.trim() && !anyLoading) && (
                <p className="text-xs text-destructive text-center">Not enough credits for prompt transformation.</p>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="md:col-span-1 space-y-6">
           <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg font-headline flex items-center text-primary">
                <Info className="mr-2 h-5 w-5" /> How to Use
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 text-sm space-y-2 text-muted-foreground">
                <p>1. Start by typing your core ideas into the "Main Prompt" area. Use commas (,) to separate distinct concepts (tags).</p>
                <p>2. Tags will appear below. Hover over a tag to see the <X size={14} className="inline align-text-bottom text-destructive"/> icon to remove it.</p>
                <p>3. Click the <Wand2 size={14} className="inline align-text-bottom"/> icon on a tag to get AI keyword suggestions ({RELATED_TAGS_GENERATION_COST} credit).</p>
                <p>4. Click <PlusCircle size={14} className="inline align-text-bottom text-green-500"/> next to a suggestion to add it to your main prompt.</p>
                <p>5. Use the "Transform Full Prompt" section to describe changes to the entire prompt ({PROMPT_TRANSFORMATION_COST} credit).</p>
                <p>6. Once happy, use "Copy Full Prompt" to use it in your image generator.</p>
            </CardContent>
          </Card>
          <Alert>
            <DraftingCompass className="h-4 w-4" />
            <AlertTitle>Tip!</AlertTitle>
            <AlertDescription className="text-xs">
              For best results with AI suggestions, make your initial tags relatively focused. Broad tags might yield very generic suggestions. When transforming, be clear with your instructions.
            </AlertDescription>
          </Alert>
        </div>
      </div>
       <footer className="mt-12 md:mt-16 py-6 text-center text-xs text-muted-foreground border-t">
        <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-2">
            <p>&copy; {new Date().getFullYear()} Visionary Builder. AI-Powered Creativity.</p>
            <nav className="flex gap-x-3">
              <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1.5">
                 <Wand2 size={14} /> Visionary Prompter
              </Link>
              <Link href="/visionary-chatter" className="hover:text-primary transition-colors flex items-center gap-1.5">
                <MessageCircle size={14} /> Visionary Chatter
              </Link>
            </nav>
        </div>
         {sessionId && (<p className="text-xs mt-1">Session: {sessionId.length > 15 ? `${sessionId.substring(0,15)}...` : sessionId}</p>)}
      </footer>
    </div>
  );
}
