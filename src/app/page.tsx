
'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from "@/components/ui/slider";
import { useToast } from '@/hooks/use-toast';
import { analyzeImageGeneratePrompt, type AnalyzeImageGeneratePromptInput } from '@/ai/flows/analyze-image-generate-prompt';
import { LoadingSpinner } from '@/components/loading-spinner';
import { UploadCloud, Copy, Check, Image as ImageIcon, Wand2, BrainCircuit, SlidersHorizontal } from 'lucide-react';

type AnalysisModelType = 'gemini' | 'gemma';
type TargetModelType = 'Flux.1 Dev' | 'Midjourney' | 'Stable Diffusion' | 'General Text';

export default function VisionaryPrompterPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [selectedAnalysisModel, setSelectedAnalysisModel] = useState<AnalysisModelType>('gemini');
  const [selectedTargetModel, setSelectedTargetModel] = useState<TargetModelType>('Flux.1 Dev');
  const [maxWords, setMaxWords] = useState<number>(150);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) { // Limit file size to 4MB
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
      setGeneratedPrompt(''); // Clear previous prompt
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
        modelType: selectedAnalysisModel,
        targetModel: selectedTargetModel,
        maxWords: maxWords,
      };
      const result = await analyzeImageGeneratePrompt(input);
      setGeneratedPrompt(result.prompt);
    } catch (error) {
      console.error("Error generating prompt:", error);
      toast({
        variant: "destructive",
        title: "Error generating prompt",
        description: error instanceof Error ? error.message : "An unknown error occurred. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt)
      .then(() => {
        setIsCopied(true);
        toast({ title: "Prompt copied to clipboard!" });
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error("Failed to copy prompt:", err);
        toast({ variant: "destructive", title: "Failed to copy prompt" });
      });
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
          Upload an image, and let AI craft the perfect prompt.
        </p>
      </header>

      <main className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-headline flex items-center">
              <UploadCloud className="mr-2 h-6 w-6 text-primary" />
              Configure & Generate
            </CardTitle>
            <CardDescription>Upload your image and set generation parameters.</CardDescription>
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
              <Label htmlFor="analysis-model-select" className="text-base">Analysis Model</Label>
              <Select value={selectedAnalysisModel} onValueChange={(value: string) => setSelectedAnalysisModel(value as AnalysisModelType)}>
                <SelectTrigger id="analysis-model-select" className="w-full text-base">
                  <SelectValue placeholder="Select analysis model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="gemma">Gemma (Free, No API Key)</SelectItem>
                </SelectContent>
              </Select>
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
              disabled={isLoading || !uploadedImage} 
              className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
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

        <Card className="shadow-xl">
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
                  className="min-h-[150px] text-base bg-muted/50 focus-visible:ring-accent"
                  aria-live="polite"
                />
                {generatedPrompt && !isLoading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyPrompt}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-primary"
                    aria-label="Copy prompt"
                  >
                    {isCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                  </Button>
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
      <footer className="mt-12 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Visionary Prompter. Harnessing AI for creative expression.</p>
      </footer>
    </div>
  );
}

