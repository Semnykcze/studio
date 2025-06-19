
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from '@/hooks/use-toast';
import { analyzeImageGeneratePrompt, type AnalyzeImageGeneratePromptInput } from '@/ai/flows/analyze-image-generate-prompt';
import { magicPrompt, type MagicPromptInput } from '@/ai/flows/magic-prompt-flow';
import { translatePrompt, type TranslatePromptInput } from '@/ai/flows/translate-prompt-flow';
import { extendPrompt, type ExtendPromptInput } from '@/ai/flows/extend-prompt-flow';
//import { generateDepthMap, type GenerateDepthMapInput } from '@/ai/flows/generate-depth-map-flow';
import { analyzeImageStyle, type AnalyzeImageStyleInput, type AnalyzeImageStyleOutput } from '@/ai/flows/analyze-image-style-flow';
import { generateImageFromPrompt, type GenerateImageFromPromptInput } from '@/ai/flows/generate-image-from-prompt-flow';


import { LoadingSpinner } from '@/components/loading-spinner';
import { 
  UploadCloud, Copy, Check, Image as ImageIcon, Wand2, BrainCircuit, SlidersHorizontal, 
  Paintbrush, Languages, History, Trash2, DownloadCloud, Sparkles, Globe, 
  Edit3, Layers, Palette, Info, Film, Aperture, Shapes, Settings2, Lightbulb, FileText, Maximize, Eye, EyeOff, Brush
} from 'lucide-react';

type TargetModelType = 'Flux.1 Dev' | 'Midjourney' | 'Stable Diffusion' | 'DALL-E 3' | 'Leonardo AI' | 'General Text' | 'Imagen4' | 'Imagen3';
type PromptStyleType = 'detailed' | 'creative' | 'keywords' | 'cinematic' | 'photorealistic' | 'abstract';

interface HistoryEntry {
  id: string;
  timestamp: string;
  imagePreviewUrl?: string | null; 
  params: {
    targetModel: TargetModelType;
    promptStyle: PromptStyleType;
    minWords: number;
    maxWords: number;
    outputLanguage: string;
    photoFileName?: string;
    allowNsfw: boolean;
  };
  generatedPrompt: string;
}

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_HISTORY_KEY = 'visionaryPrompterHistory';
const LOCAL_STORAGE_SESSION_ID_KEY = 'visionaryPrompterSessionId';
const LOCAL_STORAGE_CREDITS_KEY_PREFIX = 'visionaryPrompterCredits_';
const INITIAL_CREDITS = 10;
const OVERALL_MIN_WORDS = 10;
const OVERALL_MAX_WORDS = 300;
const IMAGE_GENERATION_COST = 10;

function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export default function VisionaryPrompterPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [selectedTargetModel, setSelectedTargetModel] = useState<TargetModelType>('Flux.1 Dev');
  const [selectedPromptStyle, setSelectedPromptStyle] = useState<PromptStyleType>('detailed');
  const [minWords, setMinWords] = useState<number>(25);
  const [maxWords, setMaxWords] = useState<number>(150);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [allowNsfw, setAllowNsfw] = useState<boolean>(false); 
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMagicLoading, setIsMagicLoading] = useState<boolean>(false);
  const [isTranslateLoading, setIsTranslateLoading] = useState<boolean>(false);
  const [isExtendingLoading, setIsExtendingLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  const [generationHistory, setGenerationHistory] = useState<HistoryEntry[]>([]);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  
  const [isEditingSessionId, setIsEditingSessionId] = useState<boolean>(false);
  const [newSessionIdInput, setNewSessionIdInput] = useState<string>("");

  const [generatedDepthMap, setGeneratedDepthMap] = useState<string | null>(null);
  const [isDepthMapLoading, setIsDepthMapLoading] = useState<boolean>(false);

  const [imageStyleAnalysis, setImageStyleAnalysis] = useState<AnalyzeImageStyleOutput | null>(null);
  const [isStyleAnalysisLoading, setIsStyleAnalysisLoading] = useState<boolean>(false);

  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState<boolean>(false);


  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const dispatchCreditsUpdate = (newCreditsValue: number) => {
    window.dispatchEvent(new CustomEvent('creditsChanged', { detail: newCreditsValue }));
  };

  useEffect(() => {
    let currentSessionId = localStorage.getItem(LOCAL_STORAGE_SESSION_ID_KEY);
    if (!currentSessionId) {
      currentSessionId = generateSessionId();
      localStorage.setItem(LOCAL_STORAGE_SESSION_ID_KEY, currentSessionId);
    }
    setSessionId(currentSessionId);
  }, []);

  useEffect(() => {
    if (!sessionId) return; 

    const creditsStorageKey = `${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`;
    try {
      const storedCredits = localStorage.getItem(creditsStorageKey);
      let currentCreditsValue: number;
      if (storedCredits === null) {
        currentCreditsValue = INITIAL_CREDITS;
        localStorage.setItem(creditsStorageKey, INITIAL_CREDITS.toString());
      } else {
        const parsedCredits = parseInt(storedCredits, 10);
        if (isNaN(parsedCredits)) {
            currentCreditsValue = INITIAL_CREDITS;
            localStorage.setItem(creditsStorageKey, INITIAL_CREDITS.toString());
        } else {
            currentCreditsValue = parsedCredits;
        }
      }
      setCredits(currentCreditsValue);
      dispatchCreditsUpdate(currentCreditsValue);

    } catch (error) {
      setCredits(INITIAL_CREDITS); 
      dispatchCreditsUpdate(INITIAL_CREDITS);
      toast({
        variant: "destructive",
        title: "Credit System Error",
        description: "Could not load credits.",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, toast]);

  useEffect(() => {
    try {
      const storedHistoryJson = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      if (storedHistoryJson) {
        const storedHistory = JSON.parse(storedHistoryJson) as Omit<HistoryEntry, 'imagePreviewUrl'>[];
        const historyWithPlaceholders = storedHistory.map(entry => ({
          ...entry,
          params: {
            targetModel: entry.params?.targetModel || 'Flux.1 Dev',
            promptStyle: entry.params?.promptStyle || 'detailed',
            minWords: entry.params?.minWords || 25,
            maxWords: entry.params?.maxWords || 150,
            outputLanguage: entry.params?.outputLanguage || 'English',
            photoFileName: entry.params?.photoFileName || undefined,
            allowNsfw: typeof entry.params?.allowNsfw === 'boolean' ? entry.params.allowNsfw : false,
          },
          imagePreviewUrl: null, 
        }));
        setGenerationHistory(historyWithPlaceholders);
      }
    } catch (error) {
      console.error("Error loading history from localStorage:", error);
      try {
        localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
      } catch (removeError) {
        console.error("Failed to remove corrupted history from localStorage:", removeError);
      }
    }
  }, []);

  useEffect(() => {
    const historyToStore = generationHistory.map(entry => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imagePreviewUrl, ...rest } = entry; 
      return rest;
    });

    try {
      if (historyToStore.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(historyToStore));
      } else {
        if (localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)) {
          localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY);
        }
      }
    } catch (error) {
      console.error("Error saving history to localStorage:", error);
    }
  }, [generationHistory]);


  const languageOptions: { value: string; label: string; icon?: React.ElementType }[] = [
    { value: 'English', label: 'English', icon: Globe },
    { value: 'Czech', label: 'Čeština', icon: Globe },
    { value: 'Spanish', label: 'Español', icon: Globe },
    { value: 'French', label: 'Français', icon: Globe },
    { value: 'German', label: 'Deutsch', icon: Globe },
    { value: 'Japanese', label: '日本語', icon: Globe },
    { value: 'Korean', label: '한국어', icon: Globe },
    { value: 'Chinese', label: '中文', icon: Globe },
  ];

  const promptStyleOptions: { value: PromptStyleType; label: string; icon: React.ElementType }[] = [
    { value: 'detailed', label: 'Detailed', icon: FileText },
    { value: 'creative', label: 'Creative', icon: Sparkles },
    { value: 'keywords', label: 'Keywords', icon: SlidersHorizontal },
    { value: 'cinematic', label: 'Cinematic', icon: Film },
    { value: 'photorealistic', label: 'Photorealistic', icon: Aperture },
    { value: 'abstract', label: 'Abstract', icon: Shapes },
  ];

  const targetModelOptions: { value: TargetModelType; label: string; icon: React.ElementType}[] = [
      { value: 'Flux.1 Dev', label: 'Flux.1 Dev', icon: Lightbulb },
      { value: 'Midjourney', label: 'Midjourney', icon: Lightbulb },
      { value: 'Stable Diffusion', label: 'Stable Diffusion', icon: Lightbulb },
      { value: 'DALL-E 3', label: 'DALL-E 3', icon: Lightbulb },
      { value: 'Leonardo AI', label: 'Leonardo AI', icon: Lightbulb },
      { value: 'Imagen4', label: 'Imagen 4', icon: Lightbulb },
      { value: 'Imagen3', label: 'Imagen 3', icon: Lightbulb },
      { value: 'General Text', label: 'General Text', icon: FileText },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { 
        toast({ variant: "destructive", title: "Image too large", description: "Max 50MB." });
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        toast({ variant: "destructive", title: "Invalid file type", description: "Use JPG, PNG, WEBP or GIF." });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      setGeneratedPrompt(''); 
      setGeneratedDepthMap(null); 
      setImageStyleAnalysis(null);
      setGeneratedImageDataUri(null); // Reset generated image
    }
  };

  const handleGeneratePrompt = async () => {
    if (!uploadedImage || !imageFile) {
      toast({ variant: "destructive", title: "No image uploaded", description: "Please upload an image first." });
      return;
    }
     if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error", description: "Session ID not available. Please refresh."});
      return;
    }
    if (credits === null || credits <= 0) {
      toast({ variant: "destructive", title: "No credits left", description: "You have run out of credits." });
      return;
    }
    if (minWords > maxWords) {
      toast({ variant: "destructive", title: "Invalid Word Count", description: "Min words cannot be greater than Max words." });
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    setGeneratedImageDataUri(null); // Reset image when generating new prompt
    try {
      const input: AnalyzeImageGeneratePromptInput = {
        photoDataUri: uploadedImage,
        targetModel: selectedTargetModel,
        minWords: minWords,
        maxWords: maxWords,
        promptStyle: selectedPromptStyle,
        outputLanguage: selectedLanguage,
        allowNsfw: allowNsfw,
      };
      const result = await analyzeImageGeneratePrompt(input);
      setGeneratedPrompt(result.prompt);

      const newCredits = credits - 1;
      setCredits(newCredits);
      dispatchCreditsUpdate(newCredits);
      const creditsStorageKey = `${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`;
      localStorage.setItem(creditsStorageKey, newCredits.toString());

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString() + Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toLocaleString(),
        imagePreviewUrl: uploadedImage, 
        params: {
          targetModel: selectedTargetModel,
          promptStyle: selectedPromptStyle,
          minWords: minWords,
          maxWords: maxWords,
          outputLanguage: selectedLanguage,
          photoFileName: imageFile.name,
          allowNsfw: allowNsfw,
        },
        generatedPrompt: result.prompt,
      };
      setGenerationHistory(prev => [newHistoryEntry, ...prev].slice(0, MAX_HISTORY_ITEMS));

    } catch (error) {
      let errorMessage = "An unknown error occurred.";
      if (error instanceof Error) errorMessage = error.message;
      else if (typeof error === 'string') errorMessage = error;
      toast({ variant: "destructive", title: "Error generating prompt", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicPrompt = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt to enhance" }); return;
    }
    setIsMagicLoading(true);
    try {
      const result = await magicPrompt({ originalPrompt: generatedPrompt, promptLanguage: selectedLanguage });
      setGeneratedPrompt(result.magicPrompt); 
      toast({ title: "Prompt enhanced!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Magic enhancement failed", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsMagicLoading(false);
    }
  };

  const handleExtendPrompt = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt to extend" }); return;
    }
    setIsExtendingLoading(true);
    try {
      const result = await extendPrompt({ originalPrompt: generatedPrompt, promptLanguage: selectedLanguage, maxWords: maxWords });
      setGeneratedPrompt(result.extendedPrompt);
      toast({ title: "Prompt extended!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Prompt extension failed", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsExtendingLoading(false);
    }
  };

  const handleTranslatePrompt = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt to translate" }); return;
    }
    setIsTranslateLoading(true);
    try {
      const result = await translatePrompt({ originalPrompt: generatedPrompt, targetLanguage: selectedLanguage });
      setGeneratedPrompt(result.translatedPrompt); 
      toast({ title: `Prompt translated to ${selectedLanguage}!`});
    } catch (error) {
      toast({ variant: "destructive", title: "Translation failed", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsTranslateLoading(false);
    }
  };

  const handleTryGenerateImage = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt available", description: "Please generate a prompt first." });
      return;
    }
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error", description: "Session ID not available." });
      return;
    }
    if (credits === null || credits < IMAGE_GENERATION_COST) {
      toast({ variant: "destructive", title: "Not enough credits", description: `You need ${IMAGE_GENERATION_COST} credits to generate an image.` });
      return;
    }

    setIsImageGenerating(true);
    setGeneratedImageDataUri(null);
    try {
      const input: GenerateImageFromPromptInput = {
        prompt: generatedPrompt,
        allowNsfw: allowNsfw, // Pass the NSFW preference
      };
      const result = await generateImageFromPrompt(input);
      setGeneratedImageDataUri(result.imageDataUri);

      const newCredits = credits - IMAGE_GENERATION_COST;
      setCredits(newCredits);
      dispatchCreditsUpdate(newCredits);
      localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      toast({ title: "Image generated successfully!" });
    } catch (error) {
      let desc = "Unknown error.";
      if (error instanceof Error) desc = error.message;
      else if (typeof error === 'object' && error && 'message' in error) desc = String((error as {message: string}).message);
      toast({ variant: "destructive", title: "Image Generation Failed", description: desc });
    } finally {
      setIsImageGenerating(false);
    }
  };


  const handleGenerateDepthMap = async () => {
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for depth map" }); return;
    }
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error" }); return;
    }
    if (credits === null || credits <= 0) {
      toast({ variant: "destructive", title: "No credits for depth map" }); return;
    }

    setIsDepthMapLoading(true);
    setGeneratedDepthMap(null);
    try {
      //const result = await generateDepthMap({ photoDataUri: uploadedImage });
      //setGeneratedDepthMap(result.depthMapDataUri);
      //const newCredits = credits - 1;
      //setCredits(newCredits);
      //dispatchCreditsUpdate(newCredits);
      //localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      toast({ title: "Depth map generation is currently disabled.", description: "This feature will be re-enabled soon." });
    } catch (error) {
      let desc = "Unknown error.";
      if (error instanceof Error) desc = error.message;
      else if (typeof error === 'object' && error && 'message' in error) desc = String((error as {message:string}).message);
      toast({ variant: "destructive", title: "Depth map failed", description: desc });
    } finally {
      setIsDepthMapLoading(false);
    }
  };
  const handleAnalyzeImageStyle = async () => {
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for style analysis" }); return;
    }
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error" }); return;
    }
    if (credits === null || credits <= 0) {
      toast({ variant: "destructive", title: "No credits for style analysis" }); return;
    }

    setIsStyleAnalysisLoading(true);
    setImageStyleAnalysis(null);
    try {
      const result = await analyzeImageStyle({ photoDataUri: uploadedImage });
      setImageStyleAnalysis(result);
      const newCredits = credits - 1;
      setCredits(newCredits);
      dispatchCreditsUpdate(newCredits);
      localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      toast({ title: "Image style analysis complete!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Style analysis failed", description: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsStyleAnalysisLoading(false);
    }
  };

  const handleCopyPrompt = (textToCopy: string) => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
        toast({ title: "Prompt copied!" });
      })
      .catch(() => toast({ variant: "destructive", title: "Copy failed" }));
  };

  const clearHistory = () => {
    setGenerationHistory([]);
    try { localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY); } catch (e) {}
    toast({ title: "History cleared." });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setUploadedImage(entry.imagePreviewUrl || null);
    setImageFile(null); 
    setSelectedTargetModel(entry.params.targetModel);
    setSelectedPromptStyle(entry.params.promptStyle);
    setMinWords(entry.params.minWords);
    setMaxWords(entry.params.maxWords);
    setSelectedLanguage(entry.params.outputLanguage);
    setAllowNsfw(typeof entry.params.allowNsfw === 'boolean' ? entry.params.allowNsfw : false);
    setGeneratedPrompt(entry.generatedPrompt);
    setGeneratedDepthMap(null); 
    setImageStyleAnalysis(null);
    setGeneratedImageDataUri(null); // Reset image when loading from history

    toast({
      title: "Loaded from history",
      description: `${entry.params.photoFileName || 'Image preview shown.'}${!entry.imagePreviewUrl ? ' Re-upload image for new generation.' : ''}`,
      duration: 5000, 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSessionIdChange = () => {
    if (newSessionIdInput.trim() === "") {
      toast({ variant: "destructive", title: "Invalid Session ID" }); return;
    }
    const newId = newSessionIdInput.trim();
    localStorage.setItem(LOCAL_STORAGE_SESSION_ID_KEY, newId);
    setSessionId(newId); 
    setIsEditingSessionId(false);
    setNewSessionIdInput(""); 
    toast({ title: "Session ID Changed", description: `Switched to ${newId}.` });
  };
  
  const handleWordCountChange = (newRange: number[]) => {
    let newMin = Math.max(OVERALL_MIN_WORDS, newRange[0]);
    let newMax = Math.min(OVERALL_MAX_WORDS, newRange[1]);
    if (newMin > newMax) newMin = newMax; 
    setMinWords(newMin);
    setMaxWords(newMax);
  };

  const anyLoading = isLoading || isMagicLoading || isTranslateLoading || isExtendingLoading || isDepthMapLoading || isStyleAnalysisLoading || isImageGenerating;

  const renderSelectTrigger = (icon: React.ElementType, placeholder: string, value?: string) => (
    <SelectTrigger className="w-full text-sm md:text-base pl-3 pr-2 py-2 h-10 data-[placeholder]:text-muted-foreground">
       <div className="flex items-center gap-2">
        {React.createElement(icon, { className: "h-4 w-4 text-primary/80"})}
        <SelectValue placeholder={placeholder}>{value}</SelectValue>
      </div>
    </SelectTrigger>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 print:p-0">
      <header className="w-full mb-8 md:mb-12 text-center">
        <div className="inline-flex items-center justify-center space-x-2 mb-3">
          <BrainCircuit className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-primary tracking-tight">
            Visionary Prompter
          </h1>
        </div>
        <p className="text-base sm:text-md md:text-lg text-muted-foreground max-w-xl mx-auto">
          Upload an image, configure parameters, and let AI craft the perfect prompt & analyze its style.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Column 1: Configuration & Image Preview */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader className="border-b">
                <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Settings2 className="mr-2 h-5 w-5" />
                Image & Prompt Configuration
                </CardTitle>
                <CardDescription className="text-sm">Upload your image and fine-tune generation settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload Section */}
              <div className="space-y-3">
                <Label htmlFor="image-upload" className="text-sm font-medium flex items-center">
                  <UploadCloud className="mr-2 h-4 w-4 text-primary" /> Upload Image
                </Label>
                <div
                  className={`aspect-video w-full rounded-md border-2 border-dashed transition-all duration-300 ease-in-out
                    ${uploadedImage ? 'border-primary/50 hover:border-primary' : 'border-input hover:border-primary/70 bg-muted/50'} 
                    flex items-center justify-center cursor-pointer group relative overflow-hidden`}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload image"
                >
                  {uploadedImage ? (
                    <Image src={uploadedImage} alt="Uploaded preview" layout="fill" objectFit="contain" className="p-0.5" data-ai-hint="user uploaded" />
                  ) : (
                    <div className="text-center p-4">
                      <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">Click or Drag & Drop</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF, WEBP (Max 50MB)</p>
                    </div>
                  )}
                </div>
                <Input id="image-upload" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
              </div>

              {/* Configuration Options Section */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="target-model-select" className="text-xs font-medium mb-1 block">Target AI Model</Label>
                  <Select value={selectedTargetModel} onValueChange={(value: string) => setSelectedTargetModel(value as TargetModelType)} disabled={anyLoading}>
                    {renderSelectTrigger(Lightbulb, "Select target model", selectedTargetModel)}
                    <SelectContent>
                      {targetModelOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          <div className="flex items-center gap-2">
                            {React.createElement(opt.icon, { className: "h-4 w-4 opacity-70"})} {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language-select" className="text-xs font-medium mb-1 block">Output Language</Label>
                  <Select value={selectedLanguage} onValueChange={(value: string) => setSelectedLanguage(value)} disabled={anyLoading}>
                    {renderSelectTrigger(Languages, "Select language", languageOptions.find(l => l.value === selectedLanguage)?.label)}
                    <SelectContent>
                      {languageOptions.map(lang => (
                        <SelectItem key={lang.value} value={lang.value} className="text-sm">
                           <div className="flex items-center gap-2">
                            {lang.icon && React.createElement(lang.icon, { className: "h-4 w-4 opacity-70"})} {lang.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="prompt-style-select" className="text-xs font-medium mb-1 block">Prompt Style</Label>
                  <Select value={selectedPromptStyle} onValueChange={(value: string) => setSelectedPromptStyle(value as PromptStyleType)} disabled={anyLoading}>
                     {renderSelectTrigger(Paintbrush, "Select prompt style", promptStyleOptions.find(p => p.value === selectedPromptStyle)?.label)}
                    <SelectContent>
                      {promptStyleOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value} className="text-sm">
                          <div className="flex items-center gap-2">
                            {React.createElement(opt.icon, { className: "h-4 w-4 opacity-70"})} {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between items-center mb-1">
                        <Label htmlFor="word-count-slider" className="text-xs font-medium">Prompt Word Count</Label>
                        <Badge variant="secondary" className="text-xs font-medium text-primary px-1.5 py-0.5">{minWords} - {maxWords} words</Badge>
                    </div>
                    <Slider
                        id="word-count-slider"
                        min={OVERALL_MIN_WORDS} max={OVERALL_MAX_WORDS} step={5}
                        value={[minWords, maxWords]} onValueChange={handleWordCountChange}
                        disabled={anyLoading}
                        aria-label={`Word count range slider, current range ${minWords} to ${maxWords} words.`}
                    />
                     <p className="text-xs text-muted-foreground pt-0.5">Range: {OVERALL_MIN_WORDS}-{OVERALL_MAX_WORDS}.</p>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="allow-nsfw-config-switch"
                    checked={allowNsfw}
                    onCheckedChange={setAllowNsfw}
                    disabled={anyLoading}
                    aria-label="Toggle to allow potentially NSFW content in prompts"
                  />
                  <Label htmlFor="allow-nsfw-config-switch" className="text-xs text-muted-foreground cursor-pointer">
                    Allow Potentially NSFW Content
                  </Label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="p-4 md:p-6 border-t">
              <Button
                onClick={handleGeneratePrompt}
                disabled={anyLoading || !uploadedImage || credits === null || credits <= 0}
                className="w-full text-sm py-2.5 rounded-md font-semibold"
                size="lg"
                aria-label={credits !== null && credits <=0 ? "Generate Prompt (No credits left)" : "Generate Prompt"}
              >
                {isLoading ? <LoadingSpinner size="1rem" className="mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate Visionary Prompt
              </Button>
            </CardFooter>
             {credits !== null && credits <= 0 && !anyLoading && (
              <p className="text-xs text-center text-destructive pb-4 px-6 -mt-2">You have run out of credits.</p>
            )}
          </Card>

          {/* Generated Prompt Section */}
          {(generatedPrompt || isLoading) && (
            <Card className="shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                  <Lightbulb className="mr-2 h-5 w-5" /> AI Generated Prompt
                </CardTitle>
                <CardDescription className="text-sm">Your crafted prompt. Use the tools to refine or copy it.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 relative">
                {isLoading && !generatedPrompt && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                    <LoadingSpinner size="1.5rem" message="Analyzing & crafting..." />
                    </div>
                )}
                <div className="mb-2.5 flex items-center justify-end space-x-1 border border-input rounded-md p-1 bg-muted/50">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleTryGenerateImage} 
                        title={`Try Generate Image (${IMAGE_GENERATION_COST} Credits)`} 
                        disabled={anyLoading || !generatedPrompt || (credits !== null && credits < IMAGE_GENERATION_COST)} 
                        className="h-7 px-1.5 text-xs" 
                        aria-label="Try Generate Image"
                    >
                        {isImageGenerating ? <LoadingSpinner size="0.8rem" /> : <Brush className="h-3.5 w-3.5" />} 
                        <span className="ml-1 hidden sm:inline">Generate ({IMAGE_GENERATION_COST} Cr)</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleMagicPrompt} title="Magic Enhance" disabled={anyLoading || !generatedPrompt} className="h-7 px-1.5 text-xs" aria-label="Magic Enhance Prompt">
                        {isMagicLoading ? <LoadingSpinner size="0.8rem" /> : <Sparkles className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Magic</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExtendPrompt} title="Extend Prompt" disabled={anyLoading || !generatedPrompt} className="h-7 px-1.5 text-xs" aria-label="Extend Prompt">
                        {isExtendingLoading ? <LoadingSpinner size="0.8rem" /> : <Maximize className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Extend</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleTranslatePrompt} title="Translate Prompt" disabled={anyLoading || !generatedPrompt} className="h-7 px-1.5 text-xs" aria-label="Translate Prompt">
                        {isTranslateLoading ? <LoadingSpinner size="0.8rem" /> : <Globe className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Translate</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCopyPrompt(generatedPrompt)} title="Copy Prompt" disabled={anyLoading || !generatedPrompt} className="h-7 px-1.5 text-xs" aria-label="Copy Prompt">
                        {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Copy</span>
                    </Button>
                </div>
                <Textarea
                  id="generated-prompt"
                  value={generatedPrompt}
                  readOnly
                  placeholder={isLoading ? "Generating your visionary prompt..." : "Your AI-generated prompt will appear here..."}
                  className="min-h-[120px] md:min-h-[150px] text-sm bg-background focus-visible:ring-primary/50 rounded-md"
                  aria-live="polite"
                />
              </CardContent>
            </Card>
          )}

          {/* Generated Image Display Section */}
          {(generatedImageDataUri || isImageGenerating) && (
             <Card className="shadow-md mt-6 md:mt-8">
                <CardHeader className="border-b">
                    <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                        <ImageIcon className="mr-2 h-5 w-5" /> 
                        {isImageGenerating ? "Generating Image..." : "Generated Image"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                    {isImageGenerating ? (
                        <div className="flex items-center justify-center min-h-[256px] aspect-square w-full max-w-md mx-auto bg-muted/50 rounded-md">
                            <LoadingSpinner size="2rem" message="Conjuring pixels..." />
                        </div>
                    ) : generatedImageDataUri ? (
                        <div className="aspect-square w-full max-w-md mx-auto relative rounded-md overflow-hidden border animate-fade-in-fast">
                            <Image src={generatedImageDataUri} alt="AI Generated Image" layout="fill" objectFit="contain" data-ai-hint="generated art" />
                        </div>
                    ) : null}
                </CardContent>
            </Card>
          )}

        </div>

        {/* Column 2: Analysis Tools */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Palette className="mr-2 h-5 w-5" /> Image Style Analysis
              </CardTitle>
              <CardDescription className="text-sm">Identify artistic style, colors, mood. (1 Credit)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
              <Button onClick={handleAnalyzeImageStyle} disabled={anyLoading || !uploadedImage || credits === null || credits <= 0} className="w-full mb-4 text-sm py-2" variant="outline" aria-label={credits !== null && credits <=0 ? "Analyze Image Style (No credits left)" : "Analyze Image Style"}>
                {isStyleAnalysisLoading ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Paintbrush className="mr-1.5 h-4 w-4" />} Analyze Style
              </Button>
              {!uploadedImage && !isStyleAnalysisLoading && (<p className="text-xs text-muted-foreground text-center py-2">Upload an image to enable style analysis.</p>)}
              {isStyleAnalysisLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                  <LoadingSpinner size="1.5rem" message="Analyzing style..." />
                </div>
              )}
              {imageStyleAnalysis && !isStyleAnalysisLoading && (
                <div className="space-y-2.5 text-xs animate-fade-in-fast">
                  <div className="p-2.5 bg-muted/50 rounded-md border">
                    <h4 className="font-semibold text-primary/90 mb-0.5 text-sm">Identified Style:</h4>
                    <p className="text-foreground">{imageStyleAnalysis.identifiedStyle || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-md border">
                    <h4 className="font-semibold text-primary/90 mb-0.5 text-sm">Overall Mood:</h4>
                    <p className="text-foreground">{imageStyleAnalysis.overallMood || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-md border">
                    <h4 className="font-semibold text-primary/90 mb-1 text-sm">Dominant Colors:</h4>
                    {imageStyleAnalysis.dominantColors && imageStyleAnalysis.dominantColors.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {imageStyleAnalysis.dominantColors.map((color, index) => ( <Badge key={index} variant="secondary" className="font-normal text-xs px-1.5 py-0.5">{color}</Badge> ))}
                      </div>
                    ) : <p className="text-muted-foreground">N/A</p>}
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-md border">
                    <h4 className="font-semibold text-primary/90 mb-0.5 text-sm">Composition Notes:</h4>
                    <p className="text-foreground">{imageStyleAnalysis.compositionNotes || 'N/A'}</p>
                  </div>
                  <div className="p-2.5 bg-muted/50 rounded-md border">
                    <h4 className="font-semibold text-primary/90 mb-1 text-sm">Style Keywords:</h4>
                    {imageStyleAnalysis.styleKeywords && imageStyleAnalysis.styleKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {imageStyleAnalysis.styleKeywords.map((keyword, index) => ( <Badge key={index} variant="outline" className="font-normal text-xs px-1.5 py-0.5">{keyword}</Badge> ))}
                    </div>
                    ) : <p className="text-muted-foreground">N/A</p>}
                  </div>
                </div>
              )}
              {credits !== null && credits <= 0 && !anyLoading && uploadedImage && !isStyleAnalysisLoading && (<p className="text-xs text-center text-destructive mt-2">Not enough credits for style analysis.</p>)}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Layers className="mr-2 h-5 w-5" /> Depth Map (Experimental)
              </CardTitle>
              <CardDescription className="text-sm">Generate a depth map. (1 Credit)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
              <Alert variant="default" className="mb-4 bg-accent/10 border-accent/30 text-accent-foreground/90">
                <Info className="h-4 w-4 text-accent-foreground/80" />
                <AlertTitle className="font-semibold text-sm">Experimental Feature (Currently Disabled)</AlertTitle>
                <AlertDescription className="text-xs">Depth map generation is temporarily disabled.</AlertDescription>
              </Alert>
              <Button onClick={handleGenerateDepthMap} disabled={true || anyLoading || !uploadedImage || credits === null || credits <= 0} className="w-full mb-4 text-sm py-2" variant="outline" aria-label={credits !== null && credits <=0 ? "Generate Depth Map (No credits left)" : "Generate Depth Map"}>
                {isDepthMapLoading ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Layers className="mr-1.5 h-4 w-4" />} Generate Depth Map
              </Button>
              {!uploadedImage && !isDepthMapLoading && (<p className="text-xs text-muted-foreground text-center py-2">Upload an image to enable depth map generation.</p>)}
              {isDepthMapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                  <LoadingSpinner size="1.5rem" message="Generating depth map..." />
                </div>
              )}
              {generatedDepthMap && !isDepthMapLoading && (
                <div className="aspect-video w-full relative rounded-md overflow-hidden border mt-2 animate-fade-in-fast">
                  <Image src={generatedDepthMap} alt="Generated depth map" layout="fill" objectFit="contain" data-ai-hint="depth map"/>
                </div>
              )}
              {credits !== null && credits <= 0 && !anyLoading && uploadedImage && !isDepthMapLoading && (<p className="text-xs text-center text-destructive mt-2">Not enough credits for depth map.</p>)}
            </CardContent>
          </Card>
        </div>
      </div>

      {generationHistory.length > 0 && (
        <Card className="w-full mt-8 md:mt-12 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b">
            <div className="flex items-center mb-2 sm:mb-0">
              <History className="mr-2 h-5 w-5 text-primary" />
              <CardTitle className="text-lg md:text-xl font-headline text-primary">Generation History</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={clearHistory} className="text-destructive hover:bg-destructive/5 border-destructive/50 hover:border-destructive/70 self-start sm:self-center text-xs h-8 px-2" disabled={anyLoading}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear All
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-1">
            <Accordion type="single" collapsible className="w-full">
              {generationHistory.map((entry) => (
                <AccordionItem value={entry.id} key={entry.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline py-2.5 px-3 md:py-3 md:px-4 text-left text-sm group" disabled={anyLoading}>
                    <div className="flex items-center space-x-3 w-full">
                      <div className="w-12 h-10 md:w-16 md:h-12 relative rounded overflow-hidden border shrink-0 bg-muted group-hover:border-primary/30 transition-colors">
                        {entry.imagePreviewUrl ? (
                           <Image src={entry.imagePreviewUrl} alt="History item preview" layout="fill" objectFit="cover" data-ai-hint="history preview" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <p className="font-medium text-xs sm:text-sm truncate text-foreground" title={entry.params.photoFileName || 'Uploaded Image'}>
                          {entry.params.photoFileName || 'Previously Uploaded Image'}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                      </div>
                       <Badge variant="outline" className="ml-auto hidden sm:inline-flex text-xs px-1.5 py-0.5 font-normal">{entry.params.targetModel}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-3 px-4 md:pb-4 md:px-6 space-y-2.5 bg-muted/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-muted-foreground p-2 rounded-md border bg-background/50">
                      <div><strong>Model:</strong> {entry.params.targetModel}</div>
                      <div><strong>Lang:</strong> {entry.params.outputLanguage}</div>
                      <div><strong>Style:</strong> {entry.params.promptStyle}</div>
                      <div><strong>Words:</strong> {entry.params.minWords}-{entry.params.maxWords}</div>
                      <div><strong>NSFW:</strong> {entry.params.allowNsfw ? <Eye className="inline h-3 w-3 text-green-600" /> : <EyeOff className="inline h-3 w-3 text-red-600" />}</div>
                    </div>
                    <div className="relative">
                      <Textarea value={entry.generatedPrompt} readOnly className="min-h-[70px] text-xs bg-background" />
                      <Button variant="ghost" size="icon" onClick={() => handleCopyPrompt(entry.generatedPrompt)} className="absolute top-1 right-1 text-muted-foreground hover:text-primary h-6 w-6" aria-label="Copy prompt from history" disabled={anyLoading}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadFromHistory(entry)} disabled={anyLoading} className="text-xs h-8 px-2">
                      <DownloadCloud className="mr-1.5 h-3.5 w-3.5" /> Load Settings & Prompt
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <footer className="mt-12 md:mt-16 py-6 text-center text-xs text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Visionary Prompter. AI-Powered Creativity.</p>
        {sessionId && !isEditingSessionId && (
          <div className="text-xs mt-1.5">
            Session:{" "}
            <Button variant="link" className="p-0 h-auto text-xs text-primary/80 hover:underline" onClick={() => { setNewSessionIdInput(sessionId); setIsEditingSessionId(true); }} title="Edit Session ID" disabled={anyLoading}>
              {sessionId.length > 15 ? `${sessionId.substring(0,15)}...` : sessionId} <Edit3 className="ml-0.5 h-2.5 w-2.5" />
            </Button>
          </div>
        )}
        {isEditingSessionId && sessionId && (
          <div className="mt-2 flex flex-col sm:flex-row items-center justify-center gap-1.5 max-w-sm mx-auto">
            <Label htmlFor="session-id-input" className="text-xs sr-only">New Session ID:</Label>
            <Input id="session-id-input" type="text" value={newSessionIdInput} onChange={(e) => setNewSessionIdInput(e.target.value)} placeholder="Enter or generate new Session ID" className="text-xs h-8 w-full sm:w-auto flex-grow" onKeyDown={(e) => { if (e.key === 'Enter') handleSessionIdChange(); }} disabled={anyLoading} />
            <div className="flex gap-1.5 mt-1 sm:mt-0">
              <Button size="sm" onClick={handleSessionIdChange} className="h-8 text-xs px-2.5" disabled={anyLoading}>Set ID</Button>
              <Button variant="ghost" size="sm" onClick={() => setIsEditingSessionId(false)} className="h-8 text-xs px-2.5" disabled={anyLoading}>Cancel</Button>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

