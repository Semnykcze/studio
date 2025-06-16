
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { visionaryChatter, type VisionaryChatterInput, type Message as GenkitMessage } from '@/ai/flows/visionary-chatter-flow';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Bot, User, Send, MessageCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function VisionaryChatterPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Greet user on initial load
  useEffect(() => {
    setMessages([
      {
        id: 'initial-greeting',
        sender: 'ai',
        text: "Hello! I'm Visionary Chatter. How can I help you with your image generation prompts today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString() + '-user',
      sender: 'user',
      text: currentMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    // Prepare history for Genkit flow
    const genkitHistory: GenkitMessage[] = messages
      .filter(msg => msg.id !== 'initial-greeting') // Exclude initial greeting from history sent to AI
      .map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
    
    // Add the current user message to the history being sent
    genkitHistory.push({
        role: 'user',
        parts: [{text: userMessage.text}]
    });


    try {
      const input: VisionaryChatterInput = {
        message: userMessage.text,
        history: genkitHistory.slice(0, -1), // Send history *before* current user message
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
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 flex flex-col h-[calc(100vh-4rem)] print:p-0">
      <header className="w-full mb-6 md:mb-8 text-center">
        <div className="inline-flex items-center justify-center space-x-3 mb-3 bg-primary/10 px-4 py-2 rounded-full">
          <MessageCircle className="h-8 w-8 md:h-10 md:w-10 text-primary" />
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-bold text-primary tracking-tight">
            Visionary Chatter
          </h1>
        </div>
        <p className="text-md sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Your AI assistant for crafting perfect image generation prompts.
        </p>
      </header>

      <Card className="flex-grow flex flex-col shadow-lg rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border">
          <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
            <Bot className="mr-2 h-5 w-5" /> Chat with Visionary Chatter
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-grow p-4 space-y-4" ref={scrollAreaRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2.5 mb-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8 self-start border border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-xl shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card border border-border text-card-foreground rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1.5 ${msg.sender === 'user' ? 'text-primary-foreground/70 text-right' : 'text-muted-foreground/80 text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.sender === 'user' && (
                <Avatar className="h-8 w-8 self-start border border-input">
                   <AvatarFallback className="bg-muted">
                    <User size={18} />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start items-center gap-2.5 mb-4">
               <Avatar className="h-8 w-8 self-start border border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
              <div className="bg-card border border-border text-card-foreground rounded-xl rounded-bl-none p-3 shadow-md">
                <LoadingSpinner size="1rem" message="Thinking..." />
              </div>
            </div>
          )}
        </ScrollArea>

        <CardContent className="p-4 border-t border-border bg-muted/30">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <Input
              ref={inputRef}
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Ask about prompt techniques, parameters, or styles..."
              className="flex-grow text-sm h-10 focus-visible:ring-primary"
              disabled={isLoading}
              aria-label="Your message"
            />
            <Button type="submit" size="icon" disabled={isLoading || !currentMessage.trim()} className="h-10 w-10 shrink-0" aria-label="Send message">
              {isLoading ? <LoadingSpinner size="1rem" /> : <Send size={18} />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
