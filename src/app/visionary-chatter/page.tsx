
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { visionaryChatter, type VisionaryChatterInput, type Message as GenkitMessage, PartType } from '@/ai/flows/visionary-chatter-flow';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Bot, User, Send, MessageCircle, Paperclip, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imagePreviews?: string[]; // For displaying user-uploaded images in the chat
  timestamp: Date;
}

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGES_COUNT = 5;

export default function VisionaryChatterPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setMessages([
      {
        id: 'initial-greeting',
        sender: 'ai',
        text: "Hello! I'm Visionary Chatter. How can I help you with your image generation prompts today? Feel free to upload images for context!",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const totalImages = uploadedImages.length + newFiles.length;

      if (totalImages > MAX_IMAGES_COUNT) {
        toast({ variant: 'destructive', title: 'Too many images', description: `You can upload a maximum of ${MAX_IMAGES_COUNT} images.` });
        return;
      }

      const validFiles: File[] = [];
      const newPreviewsToAdd: string[] = [];

      newFiles.forEach(file => {
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast({ variant: 'destructive', title: 'Image too large', description: `${file.name} exceeds ${MAX_IMAGE_SIZE_MB}MB.` });
          return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
          toast({ variant: 'destructive', title: 'Invalid file type', description: `${file.name} is not a supported image type.` });
          return;
        }
        validFiles.push(file);
        newPreviewsToAdd.push(URL.createObjectURL(file));
      });

      setUploadedImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...newPreviewsToAdd]);
    }
    if (event.target) { 
        event.target.value = "";
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImagePreviews(prev => {
      const urlToRemove = prev[indexToRemove];
      if (urlToRemove) URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== indexToRemove);
    });
    setUploadedImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const convertFilesToDataUris = async (files: File[]): Promise<string[]> => {
    const dataUris: string[] = [];
    for (const file of files) {
      const reader = new FileReader();
      dataUris.push(await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      }));
    }
    return dataUris;
  };

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if ((!currentMessage.trim() && uploadedImages.length === 0) || isLoading) return;

    const userMessageText = currentMessage.trim();
    
    const userMessageEntry: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: userMessageText,
      imagePreviews: [...imagePreviews], 
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessageEntry]);
    
    setCurrentMessage('');
    // Keep imagePreviews for the user message display, they will be cleared after successful processing.
    
    setIsLoading(true);

    let photoDataUris: string[] = [];
    try {
      photoDataUris = await convertFilesToDataUris(uploadedImages);
    } catch (error) {
      console.error("Error converting images to data URIs:", error);
      toast({ variant: "destructive", title: "Image Processing Error", description: "Could not process uploaded images." });
      setIsLoading(false);
      return;
    }
    
    // Clean up local previews and files for the input area after they are included in the message
    imagePreviews.forEach(preview => URL.revokeObjectURL(preview));
    setImagePreviews([]);
    setUploadedImages([]);


    const genkitHistory: GenkitMessage[] = messages
      .filter(msg => msg.id !== 'initial-greeting') // Exclude initial greeting
      .map((msg): GenkitMessage => {
        const parts: PartType[] = [];
        if (msg.text) parts.push({ text: msg.text });
        // If history images need to be resent, they would need to be stored as dataURIs in ChatMessage.
        // For this version, we are only sending current turn's images.
        return {
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: parts,
        };
      });
    
    try {
      const input: VisionaryChatterInput = {
        message: userMessageText,
        photoDataUris: photoDataUris.length > 0 ? photoDataUris : undefined,
        history: genkitHistory,
      };
      const result = await visionaryChatter(input);

      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        sender: 'ai',
        text: result.response,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error calling Visionary Chatter flow:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        sender: 'ai',
        text: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col h-[calc(100vh-var(--header-height,4rem)-var(--footer-height,4rem))] print:p-0">
      <style jsx global>{`
        :root {
          --header-height: 4rem; /* Adjust if your header height changes */
          --footer-height: 4.5rem; /* Adjust if your footer height changes */
        }
        body {
          overflow: hidden; /* Prevent body scroll when chat is full height */
        }
      `}</style>
      <header className="w-full mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center space-x-3 mb-3 bg-primary/10 px-4 py-2 rounded-full">
          <MessageCircle className="h-8 w-8 md:h-10 md:w-10 text-primary" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
            Visionary Chatter
          </h1>
        </div>
        <p className="text-md sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your AI assistant for crafting image generation prompts. Now with image understanding!
        </p>
      </header>

      <Card className="flex-grow flex flex-col shadow-lg rounded-xl overflow-hidden border border-border">
        <CardHeader className="bg-muted/30 border-b border-border py-3 px-4">
          <CardTitle className="text-lg font-headline flex items-center text-primary">
            <Bot className="mr-2 h-5 w-5" /> Chat Session
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-grow" viewportRef={viewportRef}>
          <div className="p-4 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <Avatar className="h-8 w-8 border border-primary/30 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary rounded-full">
                      <Bot size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] p-3 rounded-xl shadow-sm text-sm ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-card border border-border text-card-foreground rounded-bl-none'
                  }`}
                >
                  {msg.imagePreviews && msg.imagePreviews.length > 0 && (
                    <div className={`mb-2 flex flex-wrap gap-2 ${msg.imagePreviews.length > 1 ? 'grid grid-cols-2' : ''}`}>
                      {msg.imagePreviews.map((previewUrl, index) => (
                        <div key={index} className="relative aspect-square w-32 rounded-md overflow-hidden border border-input group">
                          <Image src={previewUrl} alt={`Uploaded preview ${index + 1}`} layout="fill" objectFit="cover" data-ai-hint="chat image preview"/>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.text && <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
                  <p className={`text-xs mt-2 opacity-70 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender === 'user' && (
                  <Avatar className="h-8 w-8 border border-input shrink-0">
                    <AvatarFallback className="bg-muted rounded-full">
                      <User size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length -1]?.sender === 'user' && (
              <div className="flex justify-start items-start gap-3 mb-4">
                 <Avatar className="h-8 w-8 border border-primary/30 shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary rounded-full">
                      <Bot size={18} />
                    </AvatarFallback>
                  </Avatar>
                <div className="bg-card border border-border text-card-foreground rounded-xl rounded-bl-none p-3 shadow-sm">
                  <LoadingSpinner size="1rem" message="Thinking..." />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <CardFooter className="p-3 border-t border-border bg-muted/30">
          {imagePreviews.length > 0 && (
            <div className="mb-2 p-3 border border-input rounded-lg bg-background w-full">
              <p className="text-xs font-medium text-muted-foreground mb-2">Selected Images ({imagePreviews.length}/{MAX_IMAGES_COUNT}):</p>
              <div className="flex flex-wrap gap-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative w-16 h-16 animate-fade-in-fast">
                    <Image src={preview} alt={`Preview ${index}`} layout="fill" objectFit="cover" className="rounded-md border border-input" data-ai-hint="image preview"/>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full shadow-md"
                      onClick={() => removeImage(index)}
                      aria-label="Remove image"
                    >
                      <XCircle size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
            <Button 
              type="button" 
              variant="outline" 
              size="icon" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || uploadedImages.length >= MAX_IMAGES_COUNT}
              className="h-10 w-10 shrink-0 rounded-full"
              title={`Attach images (up to ${MAX_IMAGES_COUNT})`}
              aria-label="Attach images"
            >
              <Paperclip size={18} />
            </Button>
            <Input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/png, image/jpeg, image/gif, image/webp"
              className="hidden"
              aria-hidden="true"
            />
            <Input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask about prompt techniques, or describe an image..."
              className="flex-grow text-sm h-10 rounded-full px-4 focus-visible:ring-primary"
              disabled={isLoading}
              aria-label="Your message"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isLoading || (!currentMessage.trim() && uploadedImages.length === 0)} 
              className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90" 
              aria-label="Send message"
            >
              {isLoading ? <LoadingSpinner size="1rem" /> : <Send size={18} className="text-primary-foreground"/>}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
