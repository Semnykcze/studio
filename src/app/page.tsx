
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Progress } from "@/components/ui/progress";
import { useToast } from '@/hooks/use-toast';

import { ImagePromptConfigCard } from '@/components/visionary-prompter/ImagePromptConfigCard';

import { analyzeImageGeneratePrompt, type AnalyzeImageGeneratePromptInput } from '@/ai/flows/analyze-image-generate-prompt';
import { magicPrompt, type MagicPromptInput } from '@/ai/flows/magic-prompt-flow';
import { translatePrompt, type TranslatePromptInput } from '@/ai/flows/translate-prompt-flow';
import { extendPrompt, type ExtendPromptInput } from '@/ai/flows/extend-prompt-flow';
import { generateDepthMapFromImage } from '@/lib/depth-estimation';
import { analyzeImageStyle, type AnalyzeImageStyleInput, type AnalyzeImageStyleOutput } from '@/ai/flows/analyze-image-style-flow';
import { generateImageFromPrompt, type GenerateImageFromPromptInput, type GenerateImageFromPromptOutput } from '@/ai/flows/generate-image-from-prompt-flow';
import { transformPrompt, type TransformPromptInput } from '@/ai/flows/transform-prompt-flow';
import { generateCannyEdgeMap, type GenerateCannyEdgeMapInput, type GenerateCannyEdgeMapOutput } from '@/ai/flows/generate-canny-edge-map-flow';


import { LoadingSpinner } from '@/components/loading-spinner';
import { 
  Copy, Check, Image as ImageIconLucide, Wand2, BrainCircuit, SlidersHorizontal, 
  Paintbrush, Languages, History, Trash2, DownloadCloud, Sparkles, Globe, 
  Edit3, Layers, Palette, Info, Film, Aperture, Shapes, Settings2, LightbulbIcon, FileTextIcon, Maximize, Eye, EyeOff, Brush,
  Camera, AppWindow, PencilRuler, SquareIcon, RectangleVerticalIcon, RectangleHorizontalIcon, RefreshCw, PencilLine, Link as LinkIcon, FileUp, Save, Bookmark, ArrowUpCircle,
  GitCommitHorizontal, Ban
} from 'lucide-react'; 

export type TargetModelType = 'Flux.1 Dev' | 'Midjourney' | 'Stable Diffusion' | 'DALL-E 3' | 'Leonardo AI' | 'General Text' | 'Imagen4' | 'Imagen3';
export type PromptStyleType = 'detailed' | 'creative' | 'keywords' | 'cinematic' | 'photorealistic' | 'abstract';
export type ImageTypeType = 'image' | 'photography' | 'icon' | 'logo';
export type AspectRatioType = '1:1' | 'portrait' | 'landscape';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  imagePreviewUrl?: string | null; 
  params: {
    targetModel: TargetModelType;
    promptStyle: PromptStyleType;
    minWords: number;
    maxWords: number;
    outputLanguage: string;
    photoSourceDescription?: string; 
    allowNsfw: boolean;
    imageType: ImageTypeType;
    aspectRatio: AspectRatioType;
  };
  generatedPrompt: string;
}

export interface SavedPromptEntry {
  id: string;
  name: string;
  promptText: string;
  timestamp: string;
}

const MAX_HISTORY_ITEMS = 10;
const LOCAL_STORAGE_HISTORY_KEY = 'visionaryPrompterHistory';
const LOCAL_STORAGE_PROMPT_LIBRARY_KEY = 'visionaryPrompterLibrary';
const LOCAL_STORAGE_SESSION_ID_KEY = 'visionaryPrompterSessionId';
const LOCAL_STORAGE_CREDITS_KEY_PREFIX = 'visionaryPrompterCredits_';
const INITIAL_CREDITS = 10;
const OVERALL_MIN_WORDS = 10;
const OVERALL_MAX_WORDS = 300;
const IMAGE_GENERATION_COST = 10;
const STYLE_ANALYSIS_COST = 1;
const PROMPT_TRANSFORMATION_COST = 1;
const CANNY_EDGE_MAP_COST = 1;

function generateSessionId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export default function VisionaryPrompterPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [activeImageInputTab, setActiveImageInputTab] = useState<string>('file');


  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>(''); // New state
  const [selectedTargetModel, setSelectedTargetModel] = useState<TargetModelType>('Flux.1 Dev');
  const [selectedPromptStyle, setSelectedPromptStyle] = useState<PromptStyleType>('detailed');
  const [selectedImageType, setSelectedImageType] = useState<ImageTypeType>('image');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatioType>('1:1');
  const [minWords, setMinWords] = useState<number>(25);
  const [maxWords, setMaxWords] = useState<number>(150);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [allowNsfw, setAllowNsfw] = useState<boolean>(false); 
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUrlLoading, setIsUrlLoading] = useState<boolean>(false);
  const [isMagicLoading, setIsMagicLoading] = useState<boolean>(false);
  const [isTranslateLoading, setIsTranslateLoading] = useState<boolean>(false);
  const [isExtendingLoading, setIsExtendingLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  const [generationHistory, setGenerationHistory] = useState<HistoryEntry[]>([]);
  const [promptLibrary, setPromptLibrary] = useState<SavedPromptEntry[]>([]);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  
  const [isEditingSessionId, setIsEditingSessionId] = useState<boolean>(false);
  const [newSessionIdInput, setNewSessionIdInput] = useState<string>("");

  const [generatedDepthMap, setGeneratedDepthMap] = useState<string | null>(null);
  const [isDepthMapLoading, setIsDepthMapLoading] = useState<boolean>(false);
  const [depthModelLoadProgress, setDepthModelLoadProgress] = useState<number | null>(null);
  const [isDepthModelReady, setIsDepthModelReady] = useState(false);


  const [imageStyleAnalysis, setImageStyleAnalysis] = useState<AnalyzeImageStyleOutput | null>(null);
  const [isStyleAnalysisLoading, setIsStyleAnalysisLoading] = useState<boolean>(false);

  const [generatedImageDataUri, setGeneratedImageDataUri] = useState<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState<boolean>(false);
  const [imageSeed, setImageSeed] = useState<string>('');
  const [editImagePrompt, setEditImagePrompt] = useState<string>('');

  const [transformationInstruction, setTransformationInstruction] = useState<string>('');
  const [isTransformingPrompt, setIsTransformingPrompt] = useState<boolean>(false);

  const [generatedCannyEdgeMap, setGeneratedCannyEdgeMap] = useState<string | null>(null);
  const [isCannyEdgeMapLoading, setIsCannyEdgeMapLoading] = useState<boolean>(false);


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
            imageType: entry.params?.imageType || 'image',
            aspectRatio: entry.params?.aspectRatio || '1:1',
            minWords: entry.params?.minWords || 25,
            maxWords: entry.params?.maxWords || 150,
            outputLanguage: entry.params?.outputLanguage || 'English',
            photoSourceDescription: entry.params?.photoSourceDescription || undefined,
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

    try {
        const storedLibraryJson = localStorage.getItem(LOCAL_STORAGE_PROMPT_LIBRARY_KEY);
        if (storedLibraryJson) {
            const storedLibrary = JSON.parse(storedLibraryJson) as SavedPromptEntry[];
            setPromptLibrary(storedLibrary);
        }
    } catch (error) {
        console.error("Error loading prompt library from localStorage:", error);
        try {
            localStorage.removeItem(LOCAL_STORAGE_PROMPT_LIBRARY_KEY);
        } catch (removeError) {
            console.error("Failed to remove corrupted prompt library from localStorage:", removeError);
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

  useEffect(() => {
    try {
        if (promptLibrary.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_PROMPT_LIBRARY_KEY, JSON.stringify(promptLibrary));
        } else {
            if (localStorage.getItem(LOCAL_STORAGE_PROMPT_LIBRARY_KEY)) {
              localStorage.removeItem(LOCAL_STORAGE_PROMPT_LIBRARY_KEY);
            }
        }
    } catch (error) {
        console.error("Error saving prompt library from localStorage:", error);
    }
  }, [promptLibrary]);

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
    { value: 'detailed', label: 'Detailed', icon: FileTextIcon },
    { value: 'creative', label: 'Creative', icon: Sparkles },
    { value: 'keywords', label: 'Keywords', icon: SlidersHorizontal },
    { value: 'cinematic', label: 'Cinematic', icon: Film },
    { value: 'photorealistic', label: 'Photorealistic', icon: Aperture },
    { value: 'abstract', label: 'Abstract', icon: Shapes },
  ];

  const targetModelOptions: { value: TargetModelType; label: string; icon: React.ElementType}[] = [
      { value: 'Flux.1 Dev', label: 'Flux.1 Dev', icon: LightbulbIcon },
      { value: 'Midjourney', label: 'Midjourney', icon: LightbulbIcon },
      { value: 'Stable Diffusion', label: 'Stable Diffusion', icon: LightbulbIcon },
      { value: 'DALL-E 3', label: 'DALL-E 3', icon: LightbulbIcon },
      { value: 'Leonardo AI', label: 'Leonardo AI', icon: LightbulbIcon },
      { value: 'Imagen4', label: 'Imagen 4', icon: LightbulbIcon },
      { value: 'Imagen3', label: 'Imagen 3', icon: LightbulbIcon },
      { value: 'General Text', label: 'General Text', icon: FileTextIcon },
  ];
  
  const imageTypeOptions: { value: ImageTypeType; label: string; icon: React.ElementType }[] = [
    { value: 'image', label: 'General Image', icon: ImageIconLucide },
    { value: 'photography', label: 'Photography', icon: Camera },
    { value: 'icon', label: 'Icon / Graphic', icon: AppWindow },
    { value: 'logo', label: 'Logo / Symbol', icon: PencilRuler },
  ];

  const aspectRatioOptions: { value: AspectRatioType; label: string; icon: React.ElementType }[] = [
    { value: '1:1', label: 'Square (1:1)', icon: SquareIcon },
    { value: 'portrait', label: 'Portrait (e.g., 2:3, 9:16)', icon: RectangleVerticalIcon },
    { value: 'landscape', label: 'Landscape (e.g., 3:2, 16:9)', icon: RectangleHorizontalIcon },
  ];


  const clearImageInputsAndPreview = () => {
    setUploadedImage(null);
    setImageFile(null);
    setImageUrlInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
    }
  };

  const handleClearAllInputs = () => {
    clearImageInputsAndPreview();
    setGeneratedPrompt('');
    setNegativePrompt('');
    setGeneratedImageDataUri(null);
    setEditImagePrompt('');
    setImageSeed('');
    setTransformationInstruction('');
    setGeneratedDepthMap(null);
    setImageStyleAnalysis(null);
    setGeneratedCannyEdgeMap(null);
    setActiveImageInputTab('file');
    // Optionally reset config params to defaults here if desired
    // setSelectedTargetModel('Flux.1 Dev'); 
    // etc.
    toast({ title: "Inputs Cleared", description: "All image inputs and generated content have been reset." });
  };

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
      
      // Clear previous image and related generated content when a new image is selected
      handleClearAllInputs(); // This will clear everything, including generated prompt
      setImageFile(file);
      setImageUrlInput(''); 
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoadImageFromUrl = async () => {
    if (!imageUrlInput.trim()) {
      toast({ variant: "destructive", title: "No URL provided", description: "Please enter an image URL." });
      return;
    }

    setIsUrlLoading(true);
    // Clear previous image and related generated content when a new URL is loaded
    handleClearAllInputs(); // This will clear everything
    // setImageUrlInput(imageUrlInput); // Restore the URL input as handleClearAllInputs clears it

    try {
      try {
        new URL(imageUrlInput);
      } catch (_) {
        throw new Error("Invalid URL format.");
      }

      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrlInput)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); } catch (e) {}
        const serverErrorMessage = errorData?.error || `Failed to load image. Status: ${response.status}`;
        throw new Error(serverErrorMessage);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('URL does not point to a valid image type.');
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
        setImageFile(null);
        toast({ title: "Image loaded from URL successfully!" });
      };
      reader.onerror = () => { throw new Error("Failed to read proxied image data."); };
      reader.readAsDataURL(blob);

    } catch (error: any) {
      let description = "Could not load image from the URL.";
      if (error.message) description = error.message;
      toast({ variant: "destructive", title: "Error Loading Image", description, duration: 7000 });
      setUploadedImage(null);
    } finally {
      setIsUrlLoading(false);
    }
  };


  const handleGeneratePrompt = async () => {
    if (!uploadedImage) { 
      toast({ variant: "destructive", title: "No image available", description: "Please upload an image or load from URL first." });
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
    setGeneratedPrompt(''); // Clear previous prompt
    setNegativePrompt(''); // Clear previous negative prompt
    setGeneratedImageDataUri(null); 
    setEditImagePrompt('');
    setTransformationInstruction('');
    try {
      const input: AnalyzeImageGeneratePromptInput = {
        photoDataUri: uploadedImage,
        targetModel: selectedTargetModel,
        imageType: selectedImageType,
        aspectRatio: selectedAspectRatio,
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

      let sourceDesc = 'Uploaded Image';
      if (imageFile) {
        sourceDesc = imageFile.name;
      } else if (imageUrlInput.trim()) {
        try { sourceDesc = `URL: ${new URL(imageUrlInput).hostname}`; } catch { sourceDesc = "Image from URL"; }
      }

      const newHistoryEntry: HistoryEntry = {
        id: new Date().toISOString() + Math.random().toString(36).substring(2, 15),
        timestamp: new Date().toLocaleString(),
        imagePreviewUrl: uploadedImage, 
        params: {
          targetModel: selectedTargetModel,
          promptStyle: selectedPromptStyle,
          imageType: selectedImageType,
          aspectRatio: selectedAspectRatio,
          minWords: minWords,
          maxWords: maxWords,
          outputLanguage: selectedLanguage,
          photoSourceDescription: sourceDesc,
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

  const handleTransformPrompt = async () => {
    if (!generatedPrompt.trim()) {
      toast({ variant: "destructive", title: "No Prompt to Transform", description: "Please generate a prompt first." });
      return;
    }
    if (!transformationInstruction.trim()) {
      toast({ variant: "destructive", title: "No Transformation Instruction", description: "Please enter how you want to change the prompt." });
      return;
    }
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error", description: "Session ID not available." });
      return;
    }
    if (credits === null || credits < PROMPT_TRANSFORMATION_COST) {
      toast({ variant: "destructive", title: "Not Enough Credits", description: `You need ${PROMPT_TRANSFORMATION_COST} credit(s) for prompt transformation.` });
      return;
    }

    setIsTransformingPrompt(true);
    try {
      const input: TransformPromptInput = {
        originalPrompt: generatedPrompt,
        transformationInstruction: transformationInstruction,
        promptLanguage: selectedLanguage,
      };
      const result = await transformPrompt(input);
      setGeneratedPrompt(result.transformedPrompt);
      setTransformationInstruction(''); 

      const newCredits = credits - PROMPT_TRANSFORMATION_COST;
      setCredits(newCredits);
      dispatchCreditsUpdate(newCredits);
      localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());

      toast({ title: "Prompt Transformed Successfully!", description: "The AI has updated your prompt based on your instruction." });
    } catch (error) {
      let desc = "Unknown error during prompt transformation.";
      if (error instanceof Error) desc = error.message;
      toast({ variant: "destructive", title: "Prompt Transformation Failed", description: desc });
    } finally {
      setIsTransformingPrompt(false);
    }
  };

  const processImageGeneration = async (promptToUse: string, baseImageUri?: string) => {
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error", description: "Session ID not available." });
      return;
    }
    if (credits === null || credits < IMAGE_GENERATION_COST) {
      toast({ variant: "destructive", title: "Not enough credits", description: `You need ${IMAGE_GENERATION_COST} credits.` });
      return;
    }

    setIsImageGenerating(true);
    if (!baseImageUri) {
        setEditImagePrompt(''); 
    }

    let finalPrompt = promptToUse.trim();
    if (negativePrompt.trim()) {
      finalPrompt += `\n\nAVOID THE FOLLOWING: ${negativePrompt.trim()}`;
    }
    
    try {
      const input: GenerateImageFromPromptInput = {
        prompt: finalPrompt,
        baseImageDataUri: baseImageUri,
        allowNsfw: allowNsfw,
      };
      const result: GenerateImageFromPromptOutput = await generateImageFromPrompt(input);
      setGeneratedImageDataUri(result.imageDataUri);

      const newCredits = credits - IMAGE_GENERATION_COST;
      setCredits(newCredits);
      dispatchCreditsUpdate(newCredits);
      localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      toast({ title: baseImageUri ? "Image edited successfully!" : "Image generated successfully!" });

      if (!baseImageUri && imageSeed.trim() === '') {
        setImageSeed(Date.now().toString());
      }

    } catch (error) {
      let desc = "Unknown error.";
      if (error instanceof Error) desc = error.message;
      else if (typeof error === 'object' && error && 'message' in error) desc = String((error as {message: string}).message);
      toast({ variant: "destructive", title: baseImageUri ? "Image Editing Failed" : "Image Generation Failed", description: desc });
    } finally {
      setIsImageGenerating(false);
    }
  };

  const handleTryGenerateImage = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt available", description: "Please generate a prompt first." });
      return;
    }
    let currentSeed = imageSeed;
    if (imageSeed.trim() === '') {
      currentSeed = Date.now().toString();
      setImageSeed(currentSeed);
    }
    const finalPromptForImageGeneration = `${generatedPrompt.trim()}${currentSeed ? ` (Artistic influence from seed: ${currentSeed.trim()})` : ''}`;
    await processImageGeneration(finalPromptForImageGeneration);
  };

  const handleRegenerateImage = async () => {
    if (!generatedPrompt) {
      toast({ variant: "destructive", title: "No prompt available", description: "Cannot regenerate without a base prompt." });
      return;
    }
    let currentSeed = imageSeed;
    if (imageSeed.trim() === '') { 
        currentSeed = Date.now().toString();
        setImageSeed(currentSeed); 
    }
    const finalPromptForRegeneration = `${generatedPrompt.trim()}${currentSeed ? ` (Artistic influence from seed: ${currentSeed.trim()})` : ''}`;
    await processImageGeneration(finalPromptForRegeneration);
  };

  const handleEditImage = async () => {
    if (!generatedImageDataUri) {
      toast({ variant: "destructive", title: "No image to edit", description: "Generate an image first." });
      return;
    }
    if (!editImagePrompt.trim()) {
      toast({ variant: "destructive", title: "No edit instructions", description: "Please provide a prompt for editing." });
      return;
    }
    await processImageGeneration(editImagePrompt.trim(), generatedImageDataUri);
  };


  const handleSaveGeneratedImage = () => {
    if (!generatedImageDataUri) {
      toast({ variant: "destructive", title: "No image to save" });
      return;
    }
    const link = document.createElement('a');
    link.href = generatedImageDataUri;
    const fileName = `visionary_image_${imageSeed || Date.now()}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Image download started!", description: fileName });
  };


  const handleDepthModelProgress = (progress: any) => {
    if (progress.status === 'progress') {
        const percentage = (progress.loaded / progress.total) * 100;
        setDepthModelLoadProgress(percentage);
    } else if (progress.status === 'ready') {
        // Model is ready, but pipeline might not be fully done.
    } else if (progress.status === 'done') {
        setIsDepthModelReady(true);
        setDepthModelLoadProgress(null); // Hide progress bar
    }
  };
  
  const handleGenerateDepthMap = async () => {
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for depth map generation." }); return;
    }

    setIsDepthMapLoading(true);
    setGeneratedDepthMap(null);
    
    try {
      const resultDataUri = await generateDepthMapFromImage(uploadedImage, handleDepthModelProgress);
      setGeneratedDepthMap(resultDataUri);
      toast({ title: "Depth map generated successfully!" });
    } catch (error) {
      let desc = "Unknown error during depth map generation.";
      if (error instanceof Error) desc = error.message;
      else if (typeof error === 'object' && error && 'message' in error) desc = String((error as {message:string}).message);
      toast({ variant: "destructive", title: "Depth map generation failed", description: desc });
    } finally {
      setIsDepthMapLoading(false);
      setDepthModelLoadProgress(null); // Ensure progress bar is hidden after completion/error
    }
  };

  const handleGenerateCannyEdgeMap = async () => {
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for Canny edge map generation." }); return;
    }
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error", description: "Session ID not available." }); return;
    }
    if (credits === null || credits < CANNY_EDGE_MAP_COST) {
      toast({ variant: "destructive", title: "Not enough credits", description: `You need ${CANNY_EDGE_MAP_COST} credit for Canny edge map generation.` }); return;
    }

    setIsCannyEdgeMapLoading(true);
    setGeneratedCannyEdgeMap(null);
    try {
      const input: GenerateCannyEdgeMapInput = { 
        photoDataUri: uploadedImage,
      };
      const result: GenerateCannyEdgeMapOutput = await generateCannyEdgeMap(input);
      setGeneratedCannyEdgeMap(result.cannyEdgeMapDataUri);

      const newCredits = credits - CANNY_EDGE_MAP_COST;
      setCredits(newCredits);
      dispatchCreditsUpdate(newCredits);
      localStorage.setItem(`${LOCAL_STORAGE_CREDITS_KEY_PREFIX}${sessionId}`, newCredits.toString());
      toast({ title: "Canny edge map generated successfully!" });

    } catch (error) {
      let desc = "Unknown error during Canny edge map generation.";
      if (error instanceof Error) desc = error.message;
      else if (typeof error === 'object' && error && 'message' in error) desc = String((error as {message:string}).message);
      toast({ variant: "destructive", title: "Canny edge map generation failed", description: desc });
    } finally {
      setIsCannyEdgeMapLoading(false);
    }
  };


  const handleAnalyzeImageStyle = async () => {
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for style analysis" }); return;
    }
    if (sessionId === null) {
      toast({ variant: "destructive", title: "Session Error" }); return;
    }
    if (credits === null || credits < STYLE_ANALYSIS_COST) {
      toast({ variant: "destructive", title: "No credits for style analysis", description: `You need ${STYLE_ANALYSIS_COST} credit.` }); return;
    }

    setIsStyleAnalysisLoading(true);
    setImageStyleAnalysis(null);
    try {
      const result = await analyzeImageStyle({ photoDataUri: uploadedImage });
      setImageStyleAnalysis(result);
      const newCredits = credits - STYLE_ANALYSIS_COST;
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

  const handleCopyText = (textToCopy: string, context: string = "Prompt") => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        if (context === "Prompt") setIsCopied(true);
        setTimeout(() => { if (context === "Prompt") setIsCopied(false); }, 2000);
        toast({ title: `${context} copied!` });
      })
      .catch(() => toast({ variant: "destructive", title: "Copy failed" }));
  };

  const clearHistory = () => {
    setGenerationHistory([]);
    try { localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY); } catch (e) {}
    toast({ title: "History cleared." });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    handleClearAllInputs(); // Clear current state before loading
    setUploadedImage(entry.imagePreviewUrl || null);
    setImageFile(null); 
    // Removed attempt to set imageUrlInput from history to avoid complexity with proxying/re-fetching
    setSelectedTargetModel(entry.params.targetModel);
    setSelectedPromptStyle(entry.params.promptStyle);
    setSelectedImageType(entry.params.imageType);
    setSelectedAspectRatio(entry.params.aspectRatio);
    setMinWords(entry.params.minWords);
    setMaxWords(entry.params.maxWords);
    setSelectedLanguage(entry.params.outputLanguage);
    setAllowNsfw(typeof entry.params.allowNsfw === 'boolean' ? entry.params.allowNsfw : false);
    setGeneratedPrompt(entry.generatedPrompt);
    
    toast({
      title: "Loaded from history",
      description: `${entry.params.photoSourceDescription || 'Parameters & Prompt loaded.'}${!entry.imagePreviewUrl ? ' Re-select image file or URL if needed for new generations.' : ''}`,
      duration: 5000, 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleSaveGeneratedPrompt = () => {
    if (!generatedPrompt.trim()) {
      toast({ variant: "destructive", title: "No prompt to save", description: "Please generate a prompt first." });
      return;
    }
    const name = window.prompt("Enter a name for this prompt:", `Prompt ${new Date().toLocaleTimeString()}`);
    if (name === null || name.trim() === "") {
      toast({ variant: "default", title: "Save Canceled", description: "Prompt was not saved." });
      return;
    }
    const newSavedPrompt: SavedPromptEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 15),
      name: name.trim(),
      promptText: generatedPrompt,
      timestamp: new Date().toLocaleString(),
    };
    setPromptLibrary(prev => [newSavedPrompt, ...prev]);
    toast({ title: "Prompt Saved!", description: `"${name.trim()}" added to library.` });
  };

  const handleLoadPromptFromLibrary = (promptId: string) => {
    const promptToLoad = promptLibrary.find(p => p.id === promptId);
    if (promptToLoad) {
      setGeneratedPrompt(promptToLoad.promptText);
      // Maybe clear negative prompt or other related states? For now, just loads the main prompt.
      setNegativePrompt(''); 
      toast({ title: "Prompt Loaded", description: `"${promptToLoad.name}" loaded into editor.` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeletePromptFromLibrary = (promptId: string) => {
    const promptToDelete = promptLibrary.find(p => p.id === promptId);
    if (promptToDelete && window.confirm(`Are you sure you want to delete "${promptToDelete.name}"?`)) {
        setPromptLibrary(prev => prev.filter(p => p.id !== promptId));
        toast({ title: "Prompt Deleted", description: `"${promptToDelete.name}" removed from library.` });
    }
  };

  const handleClearPromptLibrary = () => {
    if (window.confirm("Are you sure you want to delete ALL saved prompts from the library? This cannot be undone.")) {
        setPromptLibrary([]);
        toast({ title: "Prompt Library Cleared" });
    }
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

  const anyLoading = isLoading || isUrlLoading || isMagicLoading || isTranslateLoading || isExtendingLoading || isDepthMapLoading || isStyleAnalysisLoading || isImageGenerating || isTransformingPrompt || isCannyEdgeMapLoading;


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
          Upload an image, configure parameters, and let AI craft the perfect prompt &amp; analyze its style.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          <ImagePromptConfigCard
            uploadedImage={uploadedImage}
            imageFile={imageFile}
            imageUrlInput={imageUrlInput}
            setImageUrlInput={setImageUrlInput}
            activeImageInputTab={activeImageInputTab}
            setActiveImageInputTab={setActiveImageInputTab}
            isUrlLoading={isUrlLoading}
            fileInputRef={fileInputRef}
            anyLoading={anyLoading}
            credits={credits}
            
            targetModelOptions={targetModelOptions}
            imageTypeOptions={imageTypeOptions}
            aspectRatioOptions={aspectRatioOptions}
            languageOptions={languageOptions}
            promptStyleOptions={promptStyleOptions}

            selectedTargetModel={selectedTargetModel}
            setSelectedTargetModel={setSelectedTargetModel}
            selectedImageType={selectedImageType}
            setSelectedImageType={setSelectedImageType}
            selectedAspectRatio={selectedAspectRatio}
            setSelectedAspectRatio={setSelectedAspectRatio}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            selectedPromptStyle={selectedPromptStyle}
            setSelectedPromptStyle={setSelectedPromptStyle}
            
            minWords={minWords}
            maxWords={maxWords}
            onWordCountChange={handleWordCountChange}
            OVERALL_MIN_WORDS={OVERALL_MIN_WORDS}
            OVERALL_MAX_WORDS={OVERALL_MAX_WORDS}

            allowNsfw={allowNsfw}
            setAllowNsfw={setAllowNsfw}

            onImageUpload={handleImageUpload}
            onLoadImageFromUrl={handleLoadImageFromUrl}
            onGeneratePrompt={handleGeneratePrompt}
            onClearAllInputs={handleClearAllInputs} // New prop
            
            getPreviewText={() => {
                if (imageFile) return `File: ${imageFile.name}`;
                if (imageUrlInput.trim() && uploadedImage) return `From URL: ${imageUrlInput.substring(0, 40)}...`;
                return "Ready to configure";
            }}
          />


          {(generatedPrompt || isLoading) && (
            <Card className="shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                  <LightbulbIcon className="mr-2 h-5 w-5" /> AI Generated Prompt
                </CardTitle>
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
                        {isImageGenerating && !editImagePrompt && !generatedImageDataUri ? <LoadingSpinner size="0.8rem" /> : <Brush className="h-3.5 w-3.5" />} 
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
                    <Button variant="ghost" size="sm" onClick={() => handleCopyText(generatedPrompt, "Prompt")} title="Copy Prompt" disabled={anyLoading || !generatedPrompt} className="h-7 px-1.5 text-xs" aria-label="Copy Prompt">
                        {isCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Copy</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveGeneratedPrompt}
                        title="Save current prompt to library"
                        disabled={anyLoading || !generatedPrompt}
                        className="h-7 px-1.5 text-xs"
                        aria-label="Save Prompt to Library"
                    >
                        <Save className="h-3.5 w-3.5" /> <span className="ml-1 hidden sm:inline">Save</span>
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

                <div className="mt-4 pt-3 border-t border-border/60 space-y-2">
                    <Label htmlFor="negative-prompt-input" className="text-xs font-medium flex items-center">
                        <Ban className="mr-1.5 h-3.5 w-3.5 text-destructive/80" />
                        Negative Prompt (Optional - AI will try to avoid these):
                    </Label>
                    <Textarea
                        id="negative-prompt-input"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="e.g., blurry, ugly, deformed hands, watermark, text, extra limbs..."
                        className="min-h-[70px] text-sm bg-background focus-visible:ring-destructive/50 rounded-md"
                        disabled={anyLoading || !generatedPrompt}
                        aria-label="Negative prompt input"
                    />
                </div>
                
                {generatedPrompt && !isLoading && (
                  <div className="mt-4 pt-4 border-t border-border/70 space-y-2.5">
                    <div>
                      <Label htmlFor="transformation-instruction" className="text-xs font-medium flex items-center mb-1">
                          <Edit3 className="mr-1.5 h-3.5 w-3.5 text-primary/90" />
                          Refine or Transform Current Prompt:
                      </Label>
                      <Textarea
                          id="transformation-instruction"
                          value={transformationInstruction}
                          onChange={(e) => setTransformationInstruction(e.target.value)}
                          placeholder="e.g., 'make it nighttime', 'add a cyberpunk style', 'change the character's clothes to a blue dress'"
                          className="min-h-[70px] text-sm bg-background focus-visible:ring-primary/50 rounded-md"
                          disabled={anyLoading || !generatedPrompt}
                          aria-label="Instruction to transform the generated prompt"
                      />
                    </div>
                    <Button
                        onClick={handleTransformPrompt}
                        disabled={anyLoading || !generatedPrompt || !transformationInstruction.trim() || (credits !== null && credits < PROMPT_TRANSFORMATION_COST)}
                        className="w-full text-sm py-2 rounded-md"
                        variant="outline"
                        size="sm"
                    >
                        {isTransformingPrompt ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                        Apply Transformation ({PROMPT_TRANSFORMATION_COST} Credit)
                    </Button>
                    {(credits !== null && credits < PROMPT_TRANSFORMATION_COST && generatedPrompt && transformationInstruction.trim() && !isTransformingPrompt) && (
                        <p className="text-xs text-center text-destructive -mt-1">Not enough credits for transformation.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(generatedImageDataUri || isImageGenerating) && (
             <Card className="shadow-md mt-6 md:mt-8">
                <CardHeader className="border-b flex flex-row items-center justify-between py-3 px-4 md:py-4 md:px-6">
                    <div className="flex items-center">
                        <ImageIconLucide className="mr-2 h-5 w-5 text-primary" /> 
                        <CardTitle className="text-base md:text-lg font-headline text-primary">
                            {isImageGenerating && !generatedImageDataUri ? "Generating Image..." : "Generated Image"}
                        </CardTitle>
                    </div>
                    <div className="flex items-center space-x-1.5">
                        <Label htmlFor="image-seed-input" className="text-xs text-muted-foreground whitespace-nowrap">Seed:</Label>
                        <Input
                            id="image-seed-input"
                            type="text"
                            value={imageSeed}
                            onChange={(e) => setImageSeed(e.target.value)}
                            placeholder="Auto"
                            className="h-7 w-20 md:w-24 text-xs px-2"
                            disabled={isImageGenerating}
                            aria-label="Image generation seed"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 relative">
                    {isImageGenerating && !generatedImageDataUri && ( 
                        <div className="flex items-center justify-center min-h-[256px] aspect-square w-full max-w-md mx-auto bg-muted/50 rounded-md">
                            <LoadingSpinner size="2rem" message="Conjuring pixels..." />
                        </div>
                    )}
                    {generatedImageDataUri && (
                      <>
                        <div className="aspect-square w-full max-w-md mx-auto relative rounded-md overflow-hidden border animate-fade-in-fast">
                            <Image src={generatedImageDataUri} alt="AI Generated Image" layout="fill" objectFit="contain" data-ai-hint="generated art"/>
                             {isImageGenerating && ( 
                                <div className="absolute inset-0 flex items-center justify-center bg-card/50 backdrop-blur-sm rounded-md">
                                    <LoadingSpinner size="2rem" message="Updating image..." />
                                </div>
                             )}
                        </div>
                        <div className="mt-4 flex items-center justify-end space-x-1 border border-input rounded-md p-1 bg-muted/50 max-w-md mx-auto">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleRegenerateImage}
                                title={`Regenerate Image (${IMAGE_GENERATION_COST} Credits)`} 
                                disabled={isImageGenerating || !generatedPrompt || (credits !== null && credits < IMAGE_GENERATION_COST)} 
                                className="h-7 px-1.5 text-xs" 
                                aria-label="Regenerate Image"
                            >
                                {isImageGenerating && !editImagePrompt ? <LoadingSpinner size="0.8rem" /> : <RefreshCw className="h-3.5 w-3.5" />} 
                                <span className="ml-1 hidden sm:inline">Regenerate ({IMAGE_GENERATION_COST} Cr)</span>
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleSaveGeneratedImage} 
                                title="Save Image" 
                                disabled={isImageGenerating || !generatedImageDataUri} 
                                className="h-7 px-1.5 text-xs" 
                                aria-label="Save Image"
                            >
                                <DownloadCloud className="h-3.5 w-3.5" />
                                <span className="ml-1 hidden sm:inline">Save</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" disabled title="Upscale (Coming Soon)">
                              <Layers className="h-3.5 w-3.5 opacity-50" /> <span className="ml-1 hidden sm:inline opacity-50">Upscale</span>
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-1.5 text-xs" disabled title="Variations (Coming Soon)">
                              <Wand2 className="h-3.5 w-3.5 opacity-50" /> <span className="ml-1 hidden sm:inline opacity-50">Variations</span>
                            </Button>
                        </div>
                        {(credits !== null && credits < IMAGE_GENERATION_COST && generatedImageDataUri && !isImageGenerating) && (
                          <p className="text-xs text-center text-destructive mt-2 max-w-md mx-auto">Not enough credits to regenerate or edit.</p>
                        )}

                        <div className="mt-4 max-w-md mx-auto space-y-2">
                           <Label htmlFor="edit-image-prompt" className="text-xs font-medium flex items-center">
                             <PencilLine className="mr-1.5 h-3.5 w-3.5 text-primary" /> Edit Image Prompt:
                           </Label>
                           <Textarea
                             id="edit-image-prompt"
                             value={editImagePrompt}
                             onChange={(e) => setEditImagePrompt(e.target.value)}
                             placeholder="Describe changes, e.g., 'make the sky purple', 'add a cat on the roof'..."
                             className="min-h-[70px] text-sm bg-background focus-visible:ring-primary/50 rounded-md"
                             disabled={isImageGenerating}
                           />
                           <Button
                             onClick={handleEditImage}
                             disabled={isImageGenerating || !editImagePrompt.trim() || !generatedImageDataUri || (credits !== null && credits < IMAGE_GENERATION_COST)}
                             className="w-full text-sm py-2 rounded-md"
                             size="sm"
                             variant="outline"
                           >
                             {isImageGenerating && editImagePrompt ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Brush className="mr-1.5 h-4 w-4" />}
                             Edit Image ({IMAGE_GENERATION_COST} Credits)
                           </Button>
                        </div>
                      </>
                    )}
                </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Palette className="mr-2 h-5 w-5" /> Image Style Analysis
              </CardTitle>
              <CardDescription className="text-sm">Identify artistic style, colors, mood. ({STYLE_ANALYSIS_COST} Credit)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
              <Button onClick={handleAnalyzeImageStyle} disabled={anyLoading || !uploadedImage || credits === null || credits < STYLE_ANALYSIS_COST} className="w-full mb-4 text-sm py-2" variant="outline" aria-label={credits !== null && credits < STYLE_ANALYSIS_COST ? "Analyze Image Style (No credits left)" : "Analyze Image Style"}>
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
              {credits !== null && credits < STYLE_ANALYSIS_COST && !anyLoading && uploadedImage && !isStyleAnalysisLoading && (<p className="text-xs text-center text-destructive mt-2">Not enough credits for style analysis.</p>)}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <Layers className="mr-2 h-5 w-5" /> Depth Map (Client-Side)
              </CardTitle>
              <CardDescription className="text-sm">Generate a depth map using a local model. No credit cost.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
               <Button onClick={handleGenerateDepthMap} disabled={anyLoading || !uploadedImage} className="w-full mb-4 text-sm py-2" variant="outline">
                {isDepthMapLoading && depthModelLoadProgress === null ? (
                  <LoadingSpinner size="0.9rem" className="mr-2" />
                ) : (
                  <Layers className="mr-1.5 h-4 w-4" />
                )}
                {isDepthMapLoading && depthModelLoadProgress !== null ? 'Loading Model...' : 'Generate Depth Map'}
              </Button>
              {!uploadedImage && !isDepthMapLoading && (<p className="text-xs text-muted-foreground text-center py-2">Upload an image to enable depth map generation.</p>)}
              
              {isDepthMapLoading && depthModelLoadProgress !== null && (
                <div className="mt-2 space-y-1.5">
                    <Progress value={depthModelLoadProgress} className="w-full h-2" />
                    <p className="text-xs text-muted-foreground text-center">Initializing depth model... (this happens once)</p>
                </div>
              )}
              {isDepthMapLoading && depthModelLoadProgress === null && (
                 <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                    <LoadingSpinner size="1.5rem" message="Generating depth map..." />
                </div>
              )}

              {generatedDepthMap && !isDepthMapLoading && (
                <div className="aspect-video w-full relative rounded-md overflow-hidden border mt-2 animate-fade-in-fast">
                  <Image src={generatedDepthMap} alt="Generated depth map" layout="fill" objectFit="contain" data-ai-hint="depth map"/>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <GitCommitHorizontal className="mr-2 h-5 w-5" /> Edge Detection (Canny)
              </CardTitle>
              <CardDescription className="text-sm">Generate a Canny edge map for ControlNet. ({CANNY_EDGE_MAP_COST} Credit)</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
              <Button onClick={handleGenerateCannyEdgeMap} disabled={anyLoading || !uploadedImage || credits === null || credits < CANNY_EDGE_MAP_COST} className="w-full mb-4 text-sm py-2" variant="outline" aria-label={credits !== null && credits < CANNY_EDGE_MAP_COST ? "Generate Canny Edge Map (No credits left)" : "Generate Canny Edge Map"}>
                {isCannyEdgeMapLoading ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <GitCommitHorizontal className="mr-1.5 h-4 w-4" />} Generate Canny Edges
              </Button>
              {!uploadedImage && !isCannyEdgeMapLoading && (<p className="text-xs text-muted-foreground text-center py-2">Upload an image to enable Canny edge map generation.</p>)}
              {isCannyEdgeMapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                  <LoadingSpinner size="1.5rem" message="Generating Canny edges..." />
                </div>
              )}
              {generatedCannyEdgeMap && !isCannyEdgeMapLoading && (
                <div className="aspect-video w-full relative rounded-md overflow-hidden border mt-2 animate-fade-in-fast">
                  <Image src={generatedCannyEdgeMap} alt="Generated Canny edge map" layout="fill" objectFit="contain" data-ai-hint="canny edge map"/>
                </div>
              )}
              {credits !== null && credits < CANNY_EDGE_MAP_COST && !anyLoading && uploadedImage && !isCannyEdgeMapLoading && (<p className="text-xs text-center text-destructive mt-2">Not enough credits for Canny edge map.</p>)}
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
                           <Image src={entry.imagePreviewUrl} alt="History item preview" layout="fill" objectFit="cover" data-ai-hint="history preview"/>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIconLucide className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex-grow overflow-hidden">
                        <p className="font-medium text-xs sm:text-sm truncate text-foreground" title={entry.params.photoSourceDescription || 'Uploaded Image'}>
                          {entry.params.photoSourceDescription || 'Previously Uploaded Image'}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
                      </div>
                       <Badge variant="outline" className="ml-auto hidden sm:inline-flex text-xs px-1.5 py-0.5 font-normal">{entry.params.targetModel}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-3 px-4 md:pb-4 md:px-6 space-y-2.5 bg-muted/30">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs text-muted-foreground p-2 rounded-md border bg-background/50">
                      <div><strong>Model:</strong> {entry.params.targetModel}</div>
                      <div><strong>Img Type:</strong> {entry.params.imageType}</div>
                      <div><strong>Aspect:</strong> {entry.params.aspectRatio}</div>
                      <div><strong>Lang:</strong> {entry.params.outputLanguage}</div>
                      <div><strong>Style:</strong> {entry.params.promptStyle}</div>
                      <div><strong>Words:</strong> {entry.params.minWords}-{entry.params.maxWords}</div>
                      <div><strong>NSFW:</strong> {entry.params.allowNsfw ? <Eye className="inline h-3 w-3 text-green-600" /> : <EyeOff className="inline h-3 w-3 text-red-600" />}</div>
                    </div>
                    <div className="relative">
                      <Textarea value={entry.generatedPrompt} readOnly className="min-h-[70px] text-xs bg-background" />
                      <Button variant="ghost" size="icon" onClick={() => handleCopyText(entry.generatedPrompt, "History Prompt")} className="absolute top-1 right-1 text-muted-foreground hover:text-primary h-6 w-6" aria-label="Copy prompt from history" disabled={anyLoading}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => loadFromHistory(entry)} disabled={anyLoading} className="text-xs h-8 px-2">
                      <DownloadCloud className="mr-1.5 h-3.5 w-3.5" /> Load Settings &amp; Prompt
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {promptLibrary.length > 0 && (
        <Card className="w-full mt-8 md:mt-12 shadow-md">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b">
            <div className="flex items-center mb-2 sm:mb-0">
              <Bookmark className="mr-2 h-5 w-5 text-primary" />
              <CardTitle className="text-lg md:text-xl font-headline text-primary">Prompt Library</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearPromptLibrary} className="text-destructive hover:bg-destructive/5 border-destructive/50 hover:border-destructive/70 self-start sm:self-center text-xs h-8 px-2" disabled={anyLoading}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear Library
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-1">
             {promptLibrary.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground text-center">Your prompt library is empty. Save prompts to see them here.</p>
            ) : (
            <Accordion type="single" collapsible className="w-full">
              {promptLibrary.map((savedPrompt) => (
                <AccordionItem value={savedPrompt.id} key={savedPrompt.id} className="border-b last:border-b-0">
                  <AccordionTrigger className="hover:no-underline py-2.5 px-3 md:py-3 md:px-4 text-left text-sm group" disabled={anyLoading}>
                    <div className="flex items-center space-x-3 w-full">
                       <Bookmark className="h-4 w-4 text-primary/70 shrink-0" />
                      <div className="flex-grow overflow-hidden">
                        <p className="font-medium text-xs sm:text-sm truncate text-foreground" title={savedPrompt.name}>
                          {savedPrompt.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{savedPrompt.timestamp}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-1 pb-3 px-4 md:pb-4 md:px-6 space-y-2.5 bg-muted/30">
                    <Textarea value={savedPrompt.promptText} readOnly className="min-h-[70px] text-xs bg-background" />
                    <div className="flex flex-wrap gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => handleLoadPromptFromLibrary(savedPrompt.id)} disabled={anyLoading} className="text-xs h-8 px-2">
                            <ArrowUpCircle className="mr-1.5 h-3.5 w-3.5" /> Load to Editor
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleCopyText(savedPrompt.promptText, "Library Prompt")} disabled={anyLoading} className="text-xs h-8 px-2">
                            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePromptFromLibrary(savedPrompt.id)} disabled={anyLoading} className="text-xs h-8 px-2 text-destructive hover:text-destructive">
                            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                        </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            )}
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
