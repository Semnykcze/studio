
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';
import { analyzeImageGeneratePrompt, type AnalyzeImageGeneratePromptInput } from '@/ai/flows/analyze-image-generate-prompt';
import { magicPrompt, type MagicPromptInput } from '@/ai/flows/magic-prompt-flow';
import { translatePrompt, type TranslatePromptInput } from '@/ai/flows/translate-prompt-flow';
import { LoadingSpinner } from '@/components/loading-spinner';
import { UploadCloud, Copy, Check, Image as ImageIcon, Wand2, BrainCircuit, SlidersHorizontal, Paintbrush, Languages, History, Trash2, DownloadCloud, Sparkles, Globe } from 'lucide-react';

type TargetModelType = 'Flux.1 Dev' | 'Midjourney' | 'Stable Diffusion' | 'General Text';
type PromptStyleType = 'detailed' | 'creative' | 'keywords';

interface HistoryEntry {
  id: string;
  timestamp: string;
  imagePreviewUrl?: string | null; 
  params: {
    targetModel: TargetModelType;
    promptStyle: PromptStyleType;
    maxWords: number;
    outputLanguage: string;
    photoFileName?: string;
  };
  generatedPrompt: string;
}

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_HISTORY_KEY = 'visionaryPrompterHistory';

export default function VisionaryPrompterPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [selectedTargetModel, setSelectedTargetModel] = useState<TargetModelType>('Flux.1 Dev');
  const [selectedPromptStyle, setSelectedPromptStyle] = useState<PromptStyleType>('detailed');
  const [maxWords, setMaxWords] = useState<number>(150);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMagicLoading, setIsMagicLoading] = useState<boolean>(false);
  const [isTranslateLoading, setIsTranslateLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [generationHistory, setGenerationHistory] = useState<HistoryEntry[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const storedHistoryJson = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (storedHistoryJson) {
        const storedHistory = JSON.parse(storedHistoryJson) as Omit<HistoryEntry, 'imagePreviewUrl'>[];
        const historyWithPlaceholders = storedHistory.map(entry => ({
          ...entry,
          imagePreviewUrl: null, 
        }));
        setGenerationHistory(historyWithPlaceholders);
      }
    } catch (error) {
      console.error("Error loading history from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY); 
      toast({
        variant: "destructive",
        title: "Failed to load history",
        description: "History data might be corrupted and has been cleared.",
      });
    }
  }, [toast]);

  useEffect(() => {
    const historyToStore = generationHistory.map(entry => {
      const { imagePreviewUrl, ...rest } = entry; 
      return rest;
    });
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(historyToStore));
    } catch (error) {
      console.error("Error saving history to localStorage:", error);
      toast({
        variant: "destructive",
        title: "Failed to save history",
        description: "Could not save generation history. LocalStorage quota might be exceeded.",
      });
    }
  }, [generationHistory, toast]);

  const languageOptions: { value: string; label: string }[] = [
    { value: 'English', label: 'English' },
    { value: 'Czech', label: 'Čeština (Czech)' },
    { value: 'Spanish', label: 'Español (Spanish)' },
    { value: 'French', label: 'Français (French)' },
    { value: 'German', label: 'Deutsch (German)' },
    { value: 'Japanese', label: '日本語 (Japanese)' },
    { value: 'Korean', label: '한국어 (Korean)' },
    { value: 'Chinese', label: '中文 (Chinese)' },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { 
        toast({
          variant: "destructive",
          title: "Image too large",
          description: "Please upload an image smaller than 4MB.",
        });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a JPG, PNG, WEBP or GIF image.",
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setGeneratedPrompt('');
    }
  };

  const handleGeneratePrompt = async () => {
    if (!uploadedImage || !imageFile) {
      toast({
        variant: "destructive",
        title: "No image uploaded",
        description: "Please upload an image first.",
      });
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    try {
      const input: AnalyzeImageGeneratePromptInput = {
        photoDataUri: uploadedImage,
        targetModel: selectedTargetModel,
        maxWords: maxWords,
        promptStyle: selectedPromptStyle,
        outputLanguage: selectedLanguage,
      };
      const result = await analyzeImageGeneratePrompt(input);
      setGeneratedPrompt(result.prompt);

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString() + Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toLocaleString(),
        imagePreviewUrl: uploadedImage, 
        params: {
          targetModel: selectedTargetModel,
          promptStyle: selectedPromptStyle,
          maxWords: maxWords,
          outputLanguage: selectedLanguage,
          photoFileName: imageFile.name,
        },
        generatedPrompt: result.prompt,
      };
      setGenerationHistory(prev => [newHistoryEntry, ...prev].slice(0, MAX_HISTORY_ITEMS));

    } catch (error) {
      console.error("Error generating prompt:", error);
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({
        variant: "destructive",
        title: "Error generating prompt",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicPrompt = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt to enhance", description: "Please generate a prompt first." });
      return;
    }
    setIsMagicLoading(true);
    try {
      const input: MagicPromptInput = {
        originalPrompt: generatedPrompt,
        promptLanguage: selectedLanguage, // Assumes current prompt is in selectedLanguage or LLM can handle it
      };
      const result = await magicPrompt(input);
      setGeneratedPrompt(result.magicPrompt);
      toast({ title: "Prompt enhanced!" });
    } catch (error) {
      console.error("Error enhancing prompt:", error);
      toast({ variant: "destructive", title: "Error enhancing prompt", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleTranslatePrompt = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt to translate", description: "Please generate a prompt first." });
      return;
    }
    setIsTranslateLoading(true);
    try {
      const input: TranslatePromptInput = {
        originalPrompt: generatedPrompt,
        targetLanguage: selectedLanguage, // Translates to the currently selected language in main dropdown
      };
      const result = await translatePrompt(input);
      setGeneratedPrompt(result.translatedPrompt);
      toast({ title: `Prompt translated to ${selectedLanguage}!`});
    } catch (error) {
      console.error("Error translating prompt:", error);
      toast({ variant: "destructive", title: "Error translating prompt", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsTranslateLoading(false);
    }
  };


  const handleCopyPrompt = (textToCopy: string, uniqueId?: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        if (!uniqueId) { 
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
        toast({ title: "Prompt copied to clipboard!" });
      })
      .catch(err => {
        console.error("Failed to copy prompt:", err);
        toast({ variant: "destructive", title: "Failed to copy prompt" });
      });
  };

  const clearHistory = () => {
    setGenerationHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
    } catch (error) {
       console.error("Error clearing history from localStorage:", error);
    }
    toast({ title: "Generation history cleared." });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    if (entry.imagePreviewUrl) {
      setUploadedImage(entry.imagePreviewUrl);
    } else {
      setUploadedImage(null); 
    }
    setImageFile(null); 
    
    setSelectedTargetModel(entry.params.targetModel);
    setSelectedPromptStyle(entry.params.promptStyle);
    setMaxWords(entry.params.maxWords);
    setSelectedLanguage(entry.params.outputLanguage);
    setGeneratedPrompt(entry.generatedPrompt);

    if (entry.imagePreviewUrl) {
        toast({ title: "Settings loaded from history", description: entry.params.photoFileName ? `Image: ${entry.params.photoFileName} (preview shown)` : "Image preview shown."});
    } else {
        toast({ 
            title: "Settings loaded from history", 
            description: `${entry.params.photoFileName ? `Original image: ${entry.params.photoFileName}. ` : ''}Image data is not stored in history. Please re-upload the image if you want to generate a new prompt with it.`,
            duration: 5000,
        });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-background text-foreground">
      <header className="w-full max-w-5xl mb-8 md:mb-12 text-center">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <BrainCircuit className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">
            Visionary Prompter
          </h1>
        </div>
        <p className="text-lg md:text-xl text-muted-foreground">
          Upload an image, and let AI craft the perfect prompt in your chosen language and style.
        </p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-xl rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center">
              <UploadCloud className="mr-2 h-6 w-6 text-primary" />
              Configure & Generate
            </CardTitle>
            <CardDescription>Upload your image and set generation parameters. Analysis is done by Gemini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="image-upload" className="text-base">Upload Image</Label>
              <div 
                className="flex items-center justify-center w-full p-6 border-2 border-dashed rounded-lg cursor-pointer border-input hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                tabIndex={0}
                role="button"
                aria-label="Upload image"
              >
                <div className="text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP up to 4MB</p>
                </div>
              </div>
              <Input 
                id="image-upload" 
                type="file" 
                accept="image/png, image/jpeg, image/gif, image/webp" 
                onChange={handleImageUpload} 
                ref={fileInputRef}
                className="hidden" 
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="target-model-select" className="text-base">Target Prompt Model</Label>
              <Select value={selectedTargetModel} onValueChange={(value: string) => setSelectedTargetModel(value as TargetModelType)}>
                <SelectTrigger id="target-model-select" className="w-full text-base">
                  <SelectValue placeholder="Select target model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flux.1 Dev">Flux.1 Dev</SelectItem>
                  <SelectItem value="Midjourney">Midjourney</SelectItem>
                  <SelectItem value="Stable Diffusion">Stable Diffusion</SelectItem>
                  <SelectItem value="General Text">General Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language-select" className="text-base flex items-center">
                <Languages className="mr-2 h-4 w-4 text-primary" /> Output Language
              </Label>
              <Select value={selectedLanguage} onValueChange={(value: string) => setSelectedLanguage(value)}>
                <SelectTrigger id="language-select" className="w-full text-base">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt-style-select" className="text-base flex items-center">
                 <Paintbrush className="mr-2 h-4 w-4 text-primary" /> Prompt Style
              </Label>
              <Select value={selectedPromptStyle} onValueChange={(value: string) => setSelectedPromptStyle(value as PromptStyleType)}>
                <SelectTrigger id="prompt-style-select" className="w-full text-base">
                  <SelectValue placeholder="Select prompt style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="keywords">Keywords-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="max-words-slider" className="text-base flex items-center">
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" /> Max Prompt Words
                </Label>
                <span className="text-sm font-medium text-primary">{maxWords} words</span>
              </div>
              <Slider
                id="max-words-slider"
                min={50}
                max={250}
                step={10}
                value={[maxWords]}
                onValueChange={(value: number[]) => setMaxWords(value[0])}
                className="w-full"
              />
               <p className="text-xs text-muted-foreground">Range: 50 - 250 words.</p>
            </div>

            <Button 
              onClick={handleGeneratePrompt} 
              disabled={isLoading || !uploadedImage || isMagicLoading || isTranslateLoading} 
              className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
            >
              {isLoading ? (
                <LoadingSpinner size="1.25rem" className="mr-2" />
              ) : (
                <Wand2 className="mr-2 h-5 w-5" />
              )}
              Generate Prompt
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-xl rounded-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center">
              <ImageIcon className="mr-2 h-6 w-6 text-primary" />
              Preview & Prompt
            </CardTitle>
            <CardDescription>Your uploaded image and the AI-generated prompt.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            {uploadedImage ? (
              <div className="aspect-video w-full relative rounded-lg overflow-hidden border border-input">
                <Image src={uploadedImage} alt="Uploaded preview" layout="fill" objectFit="contain" data-ai-hint="user uploaded" />
              </div>
            ) : (
              <div className="aspect-video w-full flex items-center justify-center bg-muted rounded-lg border border-dashed border-input">
                <p className="text-muted-foreground">Image preview will appear here</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="generated-prompt" className="text-base">Generated Prompt</Label>
              <div className="relative">
                <Textarea
                  id="generated-prompt"
                  value={generatedPrompt}
                  readOnly
                  placeholder={isLoading ? "Generating your visionary prompt..." : "Your AI-generated prompt will appear here..."}
                  className="min-h-[150px] text-base bg-muted/50 focus-visible:ring-accent rounded-md"
                  aria-live="polite"
                />
                {generatedPrompt && !isLoading && (
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMagicPrompt}
                      title="Magic Prompt"
                      disabled={isMagicLoading || isTranslateLoading || isLoading}
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Enhance prompt"
                    >
                      {isMagicLoading ? <LoadingSpinner size="1rem" /> : <Sparkles className="h-5 w-5" />}
                    </Button>
                     <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleTranslatePrompt}
                      title="Translate Prompt"
                      disabled={isMagicLoading || isTranslateLoading || isLoading}
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Translate prompt"
                    >
                      {isTranslateLoading ? <LoadingSpinner size="1rem" /> : <Globe className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyPrompt(generatedPrompt)}
                      title="Copy Prompt"
                      disabled={isMagicLoading || isTranslateLoading || isLoading}
                      className="text-muted-foreground hover:text-primary"
                      aria-label="Copy prompt"
                    >
                      {isCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  </div>
                )}
              </div>
            </div>
             {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg z-10">
                  <LoadingSpinner size="2rem" message="Analyzing image & crafting prompt..." />
                </div>
              )}
          </CardContent>
        </Card>
      </main>

      {generationHistory.length > 0 && (
        <Card className="w-full max-w-5xl mt-8 shadow-xl rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center">
              <History className="mr-2 h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-headline">Generation History</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={clearHistory} className="text-destructive hover:bg-destructive/10 border-destructive/50">
              <Trash2 className="mr-2 h-4 w-4" /> Clear History
            </Button>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {generationHistory.map((entry, index) => (
                <AccordionItem value={`item-${index}`} key={entry.id} className="border-b-input">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center space-x-3">
                      <div className="w-16 h-12 relative rounded overflow-hidden border border-input shrink-0">
                        {entry.imagePreviewUrl ? (
                           <Image src={entry.imagePreviewUrl} alt="History item preview" layout="fill" objectFit="cover" data-ai-hint="history preview" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]" title={entry.params.photoFileName || 'Uploaded Image'}>
                          {entry.params.photoFileName || 'Uploaded Image'}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 pb-4 space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-md border border-input">
                      <p><strong>Target Model:</strong> {entry.params.targetModel}</p>
                      <p><strong>Language:</strong> {entry.params.outputLanguage}</p>
                      <p><strong>Style:</strong> {entry.params.promptStyle}</p>
                      <p><strong>Max Words:</strong> {entry.params.maxWords}</p>
                    </div>
                    <div className="relative">
                      <Textarea
                        value={entry.generatedPrompt}
                        readOnly
                        className="min-h-[100px] text-sm bg-muted/50 rounded-md"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyPrompt(entry.generatedPrompt, entry.id)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-primary"
                        aria-label="Copy prompt from history"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadFromHistory(entry)}>
                      <DownloadCloud className="mr-2 h-4 w-4" /> Load these settings & prompt
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Visionary Prompter. Harnessing AI for creative expression.</p>
      </footer>
    </div>
  );
}
