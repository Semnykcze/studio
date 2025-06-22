
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

import { ImagePromptConfigCard } from '@/components/visionary-prompter/ImagePromptConfigCard';

import { analyzeImageGeneratePrompt, type AnalyzeImageGeneratePromptInput } from '@/ai/flows/analyze-image-generate-prompt';
import { magicPrompt } from '@/ai/flows/magic-prompt-flow';
import { translatePrompt } from '@/ai/flows/translate-prompt-flow';
import { extendPrompt } from '@/ai/flows/extend-prompt-flow';
import { analyzeImageStyle, type AnalyzeImageStyleOutput } from '@/ai/flows/analyze-image-style-flow';
import { generateImageFromPrompt, type GenerateImageFromPromptInput, type GenerateImageFromPromptOutput } from '@/ai/flows/generate-image-from-prompt-flow';
import { transformPrompt, type TransformPromptInput } from '@/ai/flows/transform-prompt-flow';
import { generateCannyEdgeMap, type GenerateCannyEdgeMapInput, type GenerateCannyEdgeMapOutput } from '@/ai/flows/generate-canny-edge-map-flow';


import { LoadingSpinner } from '@/components/loading-spinner';
import { 
  Copy, Check, Image as ImageIconLucide, Wand2, BrainCircuit, SlidersHorizontal, 
  Paintbrush, Languages, History, Trash2, DownloadCloud, Sparkles, Globe, 
  Edit3, Layers, Palette, Info, Film, Aperture, Shapes, Settings2, LightbulbIcon, FileTextIcon, Maximize, Eye, EyeOff, Brush,
  Camera, AppWindow, PencilRuler, SquareIcon, RectangleVerticalIcon, RectangleHorizontalIcon, RefreshCw, PencilLine, Link as LinkIcon, FileUp, Save, Bookmark, ArrowUpCircle,
  GitCommitHorizontal, Ban, User, Lock
} from 'lucide-react'; 

const DepthMapCard = dynamic(
  () => import('@/components/visionary-prompter/DepthMapCard'),
  { 
    ssr: false,
    loading: () => (
      <Card className="shadow-md">
        <CardHeader className="border-b">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-9 w-full" />
          <p className="text-xs text-muted-foreground text-center py-2">Loading Depth Map Tool...</p>
        </CardContent>
      </Card>
    )
  }
);


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
const OVERALL_MIN_WORDS = 10;
const OVERALL_MAX_WORDS = 300;

export default function VisionaryPrompterPage() {
  // Auth State - for now, we assume user is logged out.
  // In a real app, this would come from a context or session.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

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
    if (!isLoggedIn) return; // Don't save history if not logged in
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
  }, [generationHistory, isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) return; // Don't save library if not logged in
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
  }, [promptLibrary, isLoggedIn]);

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
    setImageStyleAnalysis(null);
    setGeneratedCannyEdgeMap(null);
    setActiveImageInputTab('file');
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
      
      handleClearAllInputs(); 
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
    handleClearAllInputs(); 

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
    if (minWords > maxWords && isLoggedIn) { // Word count validation only for logged in users
      toast({ variant: "destructive", title: "Invalid Word Count", description: "Min words cannot be greater than Max words." });
      return;
    }

    setIsLoading(true);
    setGeneratedPrompt('');
    setNegativePrompt('');
    setGeneratedImageDataUri(null); 
    setEditImagePrompt('');
    setTransformationInstruction('');
    try {
      const input: AnalyzeImageGeneratePromptInput = {
        photoDataUri: uploadedImage,
        targetModel: isLoggedIn ? selectedTargetModel : 'Flux.1 Dev',
        imageType: isLoggedIn ? selectedImageType : 'image',
        aspectRatio: isLoggedIn ? selectedAspectRatio : '1:1',
        minWords: isLoggedIn ? minWords : 25,
        maxWords: isLoggedIn ? maxWords : 150,
        promptStyle: isLoggedIn ? selectedPromptStyle : 'detailed',
        outputLanguage: isLoggedIn ? selectedLanguage : 'English',
        allowNsfw: isLoggedIn ? allowNsfw : false,
      };
      const result = await analyzeImageGeneratePrompt(input);
      setGeneratedPrompt(result.prompt);
      
      if (isLoggedIn) {
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
      }

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
    if (!isLoggedIn || !generatedPrompt) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
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
    if (!isLoggedIn || !generatedPrompt) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
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
    if (!isLoggedIn || !generatedPrompt) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
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
    if (!isLoggedIn) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
    }
    if (!generatedPrompt.trim()) {
      toast({ variant: "destructive", title: "No Prompt to Transform", description: "Please generate a prompt first." });
      return;
    }
    if (!transformationInstruction.trim()) {
      toast({ variant: "destructive", title: "No Transformation Instruction", description: "Please enter how you want to change the prompt." });
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
     if (!isLoggedIn) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
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
    if (!isLoggedIn) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
    }
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
    if (!isLoggedIn) return;
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
    if (!isLoggedIn) return;
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
    if (!isLoggedIn || !generatedImageDataUri) {
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
  
  const handleGenerateCannyEdgeMap = async () => {
    if (!isLoggedIn) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
    }
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for Canny edge map generation." }); return;
    }

    setIsCannyEdgeMapLoading(true);
    setGeneratedCannyEdgeMap(null);
    try {
      const input: GenerateCannyEdgeMapInput = { 
        photoDataUri: uploadedImage,
      };
      const result: GenerateCannyEdgeMapOutput = await generateCannyEdgeMap(input);
      setGeneratedCannyEdgeMap(result.cannyEdgeMapDataUri);

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
    if (!isLoggedIn) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to use this feature." });
       return;
    }
    if (!uploadedImage) {
      toast({ variant: "destructive", title: "No image for style analysis" }); return;
    }
    
    setIsStyleAnalysisLoading(true);
    setImageStyleAnalysis(null);
    try {
      const result = await analyzeImageStyle({ photoDataUri: uploadedImage });
      setImageStyleAnalysis(result);
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
    if (!isLoggedIn) return;
    setGenerationHistory([]);
    try { localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY); } catch (e) {}
    toast({ title: "History cleared." });
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    if (!isLoggedIn) return;
    handleClearAllInputs(); 
    setUploadedImage(entry.imagePreviewUrl || null);
    setImageFile(null); 
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
    if (!isLoggedIn) {
       toast({ variant: "destructive", title: "Feature Unavailable", description: "You must be logged in to save prompts." });
       return;
    }
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
    if (!isLoggedIn) return;
    const promptToLoad = promptLibrary.find(p => p.id === promptId);
    if (promptToLoad) {
      setGeneratedPrompt(promptToLoad.promptText);
      setNegativePrompt(''); 
      toast({ title: "Prompt Loaded", description: `"${promptToLoad.name}" loaded into editor.` });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeletePromptFromLibrary = (promptId: string) => {
    if (!isLoggedIn) return;
    const promptToDelete = promptLibrary.find(p => p.id === promptId);
    if (promptToDelete && window.confirm(`Are you sure you want to delete "${promptToDelete.name}"?`)) {
        setPromptLibrary(prev => prev.filter(p => p.id !== promptId));
        toast({ title: "Prompt Deleted", description: `"${promptToDelete.name}" removed from library.` });
    }
  };

  const handleClearPromptLibrary = () => {
    if (!isLoggedIn) return;
    if (window.confirm("Are you sure you want to delete ALL saved prompts from the library? This cannot be undone.")) {
        setPromptLibrary([]);
        toast({ title: "Prompt Library Cleared" });
    }
  };

  const handleWordCountChange = (newRange: number[]) => {
    let newMin = Math.max(OVERALL_MIN_WORDS, newRange[0]);
    let newMax = Math.min(OVERALL_MAX_WORDS, newRange[1]);
    if (newMin > newMax) newMin = newMax; 
    setMinWords(newMin);
    setMaxWords(newMax);
  };

  const anyLoading = isLoading || isUrlLoading || isMagicLoading || isTranslateLoading || isExtendingLoading || isStyleAnalysisLoading || isImageGenerating || isTransformingPrompt || isCannyEdgeMapLoading;


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
        
      {!isLoggedIn && (
        <Alert className="mb-6 md:mb-8 border-primary/20">
          <Lock className="h-4 w-4" />
          <AlertTitle>You are in Guest Mode</AlertTitle>
          <AlertDescription className="text-xs">
            Most features are disabled. You can upload an image and perform a basic prompt generation.
            Please <a href="/login" className="font-bold underline hover:text-primary">log in</a> or <a href="/register" className="font-bold underline hover:text-primary">register</a> to unlock all features.
          </AlertDescription>
        </Alert>
      )}


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
            onClearAllInputs={handleClearAllInputs} 
            
            disabled={!isLoggedIn}

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
                        title="Try Generate Image"
                        disabled={anyLoading || !generatedPrompt || !isLoggedIn} 
                        className="h-7 px-1.5 text-xs" 
                        aria-label="Try Generate Image"
                    >
                        {isImageGenerating && !editImagePrompt && !generatedImageDataUri ? <LoadingSpinner size="0.8rem" /> : <Brush className="h-3.5 w-3.5" />} 
                        <span className="ml-1 hidden sm:inline">Generate</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleMagicPrompt} title="Magic Enhance" disabled={anyLoading || !generatedPrompt || !isLoggedIn} className="h-7 px-1.5 text-xs" aria-label="Magic Enhance Prompt">
                        {isMagicLoading ? <LoadingSpinner size="0.8rem" /> : <Sparkles className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Magic</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleExtendPrompt} title="Extend Prompt" disabled={anyLoading || !generatedPrompt || !isLoggedIn} className="h-7 px-1.5 text-xs" aria-label="Extend Prompt">
                        {isExtendingLoading ? <LoadingSpinner size="0.8rem" /> : <Maximize className="h-3.5 w-3.5" />} <span className="ml-1 hidden sm:inline">Extend</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleTranslatePrompt} title="Translate Prompt" disabled={anyLoading || !generatedPrompt || !isLoggedIn} className="h-7 px-1.5 text-xs" aria-label="Translate Prompt">
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
                        disabled={anyLoading || !generatedPrompt || !isLoggedIn}
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
                        disabled={anyLoading || !generatedPrompt || !isLoggedIn}
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
                          disabled={anyLoading || !generatedPrompt || !isLoggedIn}
                          aria-label="Instruction to transform the generated prompt"
                      />
                    </div>
                    <Button
                        onClick={handleTransformPrompt}
                        disabled={anyLoading || !generatedPrompt || !transformationInstruction.trim() || !isLoggedIn}
                        className="w-full text-sm py-2 rounded-md"
                        variant="outline"
                        size="sm"
                    >
                        {isTransformingPrompt ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Wand2 className="mr-1.5 h-4 w-4" />}
                        Apply Transformation
                    </Button>
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
                            disabled={isImageGenerating || !isLoggedIn}
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
                                title="Regenerate Image"
                                disabled={isImageGenerating || !generatedPrompt || !isLoggedIn} 
                                className="h-7 px-1.5 text-xs" 
                                aria-label="Regenerate Image"
                            >
                                {isImageGenerating && !editImagePrompt ? <LoadingSpinner size="0.8rem" /> : <RefreshCw className="h-3.5 w-3.5" />} 
                                <span className="ml-1 hidden sm:inline">Regenerate</span>
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleSaveGeneratedImage} 
                                title="Save Image" 
                                disabled={isImageGenerating || !generatedImageDataUri || !isLoggedIn} 
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
                             disabled={isImageGenerating || !isLoggedIn}
                           />
                           <Button
                             onClick={handleEditImage}
                             disabled={isImageGenerating || !editImagePrompt.trim() || !generatedImageDataUri || !isLoggedIn}
                             className="w-full text-sm py-2 rounded-md"
                             size="sm"
                             variant="outline"
                           >
                             {isImageGenerating && editImagePrompt ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Brush className="mr-1.5 h-4 w-4" />}
                             Edit Image
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
              <CardDescription className="text-sm">Identify artistic style, colors, and mood.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
              <Button onClick={handleAnalyzeImageStyle} disabled={anyLoading || !uploadedImage || !isLoggedIn} className="w-full mb-4 text-sm py-2" variant="outline" aria-label="Analyze Image Style">
                {isStyleAnalysisLoading ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <Paintbrush className="mr-1.5 h-4 w-4" />} Analyze Style
              </Button>
              {!uploadedImage && !isStyleAnalysisLoading && (<p className="text-xs text-muted-foreground text-center py-2">Upload an image to enable style analysis.</p>)}
              {!isLoggedIn && uploadedImage && (<p className="text-xs text-muted-foreground text-center py-2">Login to use this feature.</p>)}
              {isStyleAnalysisLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                  <LoadingSpinner size="1.5rem" message="Analyzing style..." />
                </div>
              )}
              {imageStyleAnalysis && !isStyleAnalysisLoading && isLoggedIn && (
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
            </CardContent>
          </Card>

          <DepthMapCard uploadedImage={uploadedImage} anyLoading={anyLoading || !isLoggedIn} />

          <Card className="shadow-md">
            <CardHeader className="border-b">
              <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                <GitCommitHorizontal className="mr-2 h-5 w-5" /> Edge Detection (Canny)
              </CardTitle>
              <CardDescription className="text-sm">Generate a Canny edge map for ControlNet.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
              <Button onClick={handleGenerateCannyEdgeMap} disabled={anyLoading || !uploadedImage || !isLoggedIn} className="w-full mb-4 text-sm py-2" variant="outline" aria-label="Generate Canny Edge Map">
                {isCannyEdgeMapLoading ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <GitCommitHorizontal className="mr-1.5 h-4 w-4" />} Generate Canny Edges
              </Button>
              {!uploadedImage && !isCannyEdgeMapLoading && (<p className="text-xs text-muted-foreground text-center py-2">Upload an image to enable Canny edge map generation.</p>)}
              {!isLoggedIn && uploadedImage && (<p className="text-xs text-muted-foreground text-center py-2">Login to use this feature.</p>)}
              {isCannyEdgeMapLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm rounded-b-md z-10">
                  <LoadingSpinner size="1.5rem" message="Generating Canny edges..." />
                </div>
              )}
              {generatedCannyEdgeMap && !isCannyEdgeMapLoading && isLoggedIn &&(
                <div className="aspect-video w-full relative rounded-md overflow-hidden border mt-2 animate-fade-in-fast">
                  <Image src={generatedCannyEdgeMap} alt="Generated Canny edge map" layout="fill" objectFit="contain" data-ai-hint="canny edge map"/>
                </div>
              )}
            </CardContent>
          </Card>


        </div>
      </div>

      {isLoggedIn && generationHistory.length > 0 && (
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

      {isLoggedIn && promptLibrary.length > 0 && (
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
      </footer>
    </div>
  );
}
