
import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/loading-spinner';
import type { TargetModelType, PromptStyleType, ImageTypeType, AspectRatioType } from '@/app/visionary-prompter/page';

import {
  UploadCloud, Wand2, Settings2, Lightbulb, ImageIcon, Camera, AppWindow, PencilRuler,
  Square, RectangleVertical, RectangleHorizontal, Languages, Paintbrush, Link as LinkIcon, FileUp, DownloadCloud, Trash2
} from 'lucide-react';

interface OptionType {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface ImagePromptConfigCardProps {
  uploadedImage: string | null;
  imageFile: File | null; 
  imageUrlInput: string;
  setImageUrlInput: React.Dispatch<React.SetStateAction<string>>;
  activeImageInputTab: string;
  setActiveImageInputTab: React.Dispatch<React.SetStateAction<string>>;
  isUrlLoading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  anyLoading: boolean;
  disabled: boolean;

  targetModelOptions: { value: TargetModelType; label: string; icon: React.ElementType }[];
  imageTypeOptions: { value: ImageTypeType; label: string; icon: React.ElementType }[];
  aspectRatioOptions: { value: AspectRatioType; label: string; icon: React.ElementType }[];
  languageOptions: { value: string; label: string; icon?: React.ElementType }[];
  promptStyleOptions: { value: PromptStyleType; label: string; icon: React.ElementType }[];

  selectedTargetModel: TargetModelType;
  setSelectedTargetModel: (value: TargetModelType) => void;
  selectedImageType: ImageTypeType;
  setSelectedImageType: (value: ImageTypeType) => void;
  selectedAspectRatio: AspectRatioType;
  setSelectedAspectRatio: (value: AspectRatioType) => void;
  selectedLanguage: string;
  setSelectedLanguage: (value: string) => void;
  selectedPromptStyle: PromptStyleType;
  setSelectedPromptStyle: (value: PromptStyleType) => void;

  minWords: number;
  maxWords: number;
  onWordCountChange: (newRange: number[]) => void;
  OVERALL_MIN_WORDS: number;
  OVERALL_MAX_WORDS: number;

  allowNsfw: boolean;
  setAllowNsfw: React.Dispatch<React.SetStateAction<boolean>>;

  onImageUpload: React.ChangeEventHandler<HTMLInputElement>;
  onLoadImageFromUrl: () => Promise<void>;
  onGeneratePrompt: () => Promise<void>;
  onClearAllInputs: () => void; 
  getPreviewText: () => string;
}

export function ImagePromptConfigCard({
  uploadedImage,
  imageFile,
  imageUrlInput,
  setImageUrlInput,
  activeImageInputTab,
  setActiveImageInputTab,
  isUrlLoading,
  fileInputRef,
  anyLoading,
  disabled,
  targetModelOptions,
  imageTypeOptions,
  aspectRatioOptions,
  languageOptions,
  promptStyleOptions,
  selectedTargetModel,
  setSelectedTargetModel,
  selectedImageType,
  setSelectedImageType,
  selectedAspectRatio,
  setSelectedAspectRatio,
  selectedLanguage,
  setSelectedLanguage,
  selectedPromptStyle,
  setSelectedPromptStyle,
  minWords,
  maxWords,
  onWordCountChange,
  OVERALL_MIN_WORDS,
  OVERALL_MAX_WORDS,
  allowNsfw,
  setAllowNsfw,
  onImageUpload,
  onLoadImageFromUrl,
  onGeneratePrompt,
  onClearAllInputs,
  getPreviewText
}: ImagePromptConfigCardProps) {

  const renderSelectTrigger = (icon: React.ElementType, placeholder: string, value?: string) => (
    <SelectTrigger className="w-full text-sm md:text-base pl-3 pr-2 py-2 h-10 data-[placeholder]:text-muted-foreground">
       <div className="flex items-center gap-2">
        {React.createElement(icon, { className: "h-4 w-4 text-primary/80"})}
        <SelectValue placeholder={placeholder}>{value}</SelectValue>
      </div>
    </SelectTrigger>
  );

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
          <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
          <Settings2 className="mr-2 h-5 w-5" />
          Image &amp; Prompt Configuration
          </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Tabs value={activeImageInputTab} onValueChange={setActiveImageInputTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10">
              <TabsTrigger value="file" className="text-xs sm:text-sm data-[state=active]:shadow-sm">
                <FileUp className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs sm:text-sm data-[state=active]:shadow-sm">
                <LinkIcon className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> From URL
              </TabsTrigger>
            </TabsList>
            <TabsContent value="file" className="mt-3">
              <div
                className={`aspect-video w-full rounded-md border-2 border-dashed transition-all duration-300 ease-in-out
                  ${uploadedImage && activeImageInputTab === 'file' ? 'border-primary/50 hover:border-primary' : 'border-input hover:border-primary/70 bg-muted/50'}
                  flex items-center justify-center cursor-pointer group relative overflow-hidden`}
                onClick={() => fileInputRef.current?.click()}
                onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                tabIndex={0}
                role="button"
                aria-label="Upload image from file"
              >
                {uploadedImage && (imageFile || (!imageFile && !imageUrlInput)) ? (
                  <Image src={uploadedImage} alt="Uploaded preview" layout="fill" objectFit="contain" className="p-0.5" data-ai-hint="user uploaded"/>
                ) : (
                  <div className="text-center p-4">
                    <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary">Click or Drag &amp; Drop</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, GIF, WEBP (Max 50MB)</p>
                  </div>
                )}
              </div>
              <Input id="image-upload-file" type="file" accept="image/png, image/jpeg, image/gif, image/webp" onChange={onImageUpload} ref={fileInputRef} className="hidden" />
            </TabsContent>
            <TabsContent value="url" className="mt-3 space-y-2">
                {uploadedImage && !imageFile && imageUrlInput && activeImageInputTab === 'url' && (
                  <div className="aspect-video w-full rounded-md border-2 border-primary/50 flex items-center justify-center relative overflow-hidden mb-2">
                      <Image src={uploadedImage} alt="URL preview" layout="fill" objectFit="contain" className="p-0.5" data-ai-hint="url preview"/>
                  </div>
                )}
                {((!uploadedImage && activeImageInputTab === 'url') || (uploadedImage && imageFile && activeImageInputTab === 'url')) && (
                  <div className="aspect-video w-full rounded-md border-2 border-dashed border-input bg-muted/50 flex items-center justify-center">
                      <LinkIcon className="mx-auto h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              <Label htmlFor="image-url-input" className="text-xs font-medium">Image URL</Label>
              <Input
                id="image-url-input"
                type="url"
                placeholder="https://example.com/image.png"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                disabled={anyLoading}
                className="h-9 text-sm"
              />
              <Button onClick={onLoadImageFromUrl} disabled={anyLoading || !imageUrlInput.trim()} className="w-full text-sm py-2 h-9" variant="outline">
                {isUrlLoading ? <LoadingSpinner size="0.9rem" className="mr-2" /> : <DownloadCloud className="mr-2 h-4 w-4" />}
                Load Image from URL
              </Button>
            </TabsContent>
          </Tabs>
          {uploadedImage && (
              activeImageInputTab === 'file' && !imageFile && imageUrlInput ? null :
              (activeImageInputTab === 'url' && (imageFile || (!imageFile && !imageUrlInput))) ? null :
              <div className="mt-2 text-xs text-muted-foreground">
                {getPreviewText()}
              </div>
            )}
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="target-model-select" className="text-xs font-medium mb-1 block">Target AI Model</Label>
            <Select value={selectedTargetModel} onValueChange={(value: string) => setSelectedTargetModel(value as TargetModelType)} disabled={anyLoading || disabled}>
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
            <Label htmlFor="image-type-select" className="text-xs font-medium mb-1 block">Desired Image Type</Label>
            <Select value={selectedImageType} onValueChange={(value: string) => setSelectedImageType(value as ImageTypeType)} disabled={anyLoading || disabled}>
              {renderSelectTrigger(ImageIcon, "Select image type", imageTypeOptions.find(opt => opt.value === selectedImageType)?.label)}
              <SelectContent>
                {imageTypeOptions.map(opt => (
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
            <Label htmlFor="aspect-ratio-select" className="text-xs font-medium mb-1 block">Desired Aspect Ratio</Label>
            <Select value={selectedAspectRatio} onValueChange={(value: string) => setSelectedAspectRatio(value as AspectRatioType)} disabled={anyLoading || disabled}>
              {renderSelectTrigger(Square, "Select aspect ratio", aspectRatioOptions.find(opt => opt.value === selectedAspectRatio)?.label)}
              <SelectContent>
                {aspectRatioOptions.map(opt => (
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
            <Select value={selectedLanguage} onValueChange={(value: string) => setSelectedLanguage(value)} disabled={anyLoading || disabled}>
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
            <Select value={selectedPromptStyle} onValueChange={(value: string) => setSelectedPromptStyle(value as PromptStyleType)} disabled={anyLoading || disabled}>
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
                  value={[minWords, maxWords]} onValueChange={onWordCountChange}
                  disabled={anyLoading || disabled}
                  aria-label={`Word count range slider, current range ${minWords} to ${maxWords} words.`}
              />
                <p className="text-xs text-muted-foreground pt-0.5">Range: {OVERALL_MIN_WORDS}-{OVERALL_MAX_WORDS}.</p>
          </div>
          
          <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-nsfw-config-switch" className="flex flex-col space-y-0.5">
                <span className="font-medium text-sm">Relax Safety Filters</span>
              </Label>
              <Switch
                id="allow-nsfw-config-switch"
                checked={allowNsfw}
                onCheckedChange={setAllowNsfw}
                disabled={anyLoading || disabled}
                aria-label="Toggle to relax safety filters"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Helps avoid "No valid candidates" errors by disabling most content filters. Use with caution.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 md:p-6 border-t flex flex-col sm:flex-row gap-2">
        <Button
          onClick={onGeneratePrompt}
          disabled={anyLoading || !uploadedImage}
          className="w-full sm:flex-grow text-sm py-2.5 rounded-md font-semibold"
          size="lg"
          aria-label="Generate Prompt"
        >
          {anyLoading && !isUrlLoading ? <LoadingSpinner size="1rem" className="mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Generate Visionary Prompt
        </Button>
        <Button
            variant="outline"
            onClick={onClearAllInputs}
            disabled={anyLoading}
            className="w-full sm:w-auto text-sm py-2.5 rounded-md"
            size="lg"
            title="Clear all inputs and generated content"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear All
          </Button>
      </CardFooter>
    </Card>
  );
}
