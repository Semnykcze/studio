
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LoadingSpinner } from '@/components/loading-spinner';
import { 
    ListTodo, 
    Mail, 
    FileText, 
    Cpu, 
    RefreshCw, 
    Paperclip, 
    Image as ImageIcon,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const suggestionPrompts = [
    {
        text: 'Write a to-do list for a personal project or task',
        icon: ListTodo,
    },
    {
        text: 'Generate an email to reply to a job offer',
        icon: Mail,
    },
    {
        text: 'Summarise this article or text for me in one paragraph',
        icon: FileText,
    },
    {
        text: 'How does AI work in a technical capacity',
        icon: Cpu,
    },
];


export default function VisionaryChatterPage() {
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);

    // In a real implementation, you would call the AI flow here.
    // For now, this is a placeholder to show UI feedback.
    toast({
      title: "Message Sent (UI Demo)",
      description: "In a full app, the AI's response would appear in a chat view.",
    });

    setTimeout(() => {
      setIsLoading(false);
      setCurrentMessage('');
    }, 1500);
  };
  
  const handleSuggestionClick = (promptText: string) => {
      setCurrentMessage(promptText);
  };

  return (
    <div className="flex flex-col h-full">
       <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-4xl px-6 text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                    Hi there, John
                    <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                       What would you like to know?
                    </span>
                </h1>
                <p className="mt-4 text-muted-foreground">
                    Use one of the most common prompts below or use your own to begin.
                </p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
                    {suggestionPrompts.map((prompt, index) => (
                       <Card 
                            key={index} 
                            className="p-4 hover:bg-accent/50 transition-colors cursor-pointer flex flex-col justify-between min-h-[120px]"
                            onClick={() => handleSuggestionClick(prompt.text)}
                        >
                            <p className="text-sm font-medium">{prompt.text}</p>
                            <div className="flex justify-end mt-2">
                                <prompt.icon className="h-5 w-5 text-muted-foreground"/>
                            </div>
                       </Card>
                    ))}
                </div>

                <div className="mt-6">
                    <Button variant="ghost" className="text-muted-foreground">
                        <RefreshCw size={14} className="mr-2"/>
                        Refresh Prompts
                    </Button>
                </div>
            </div>
       </div>

        {/* Input Form Area */}
        <div className="p-4 md:p-6 w-full max-w-4xl mx-auto">
            <Card className="p-2.5 shadow-lg rounded-xl">
                <form onSubmit={handleSendMessage} className="flex flex-col">
                    <Textarea
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder="Ask whatever you want...."
                        className="w-full border-none focus-visible:ring-0 shadow-none resize-none text-base min-h-[60px] p-2"
                    />
                    <div className="flex justify-between items-center mt-2 p-2">
                         <div className="flex items-center gap-2">
                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                                <Paperclip size={18} />
                                <span className="sr-only">Add Attachment</span>
                            </Button>
                             <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                            />
                            <Button type="button" variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
                                <ImageIcon size={18} />
                                <span className="sr-only">Use Image</span>
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                           <p className="text-sm text-muted-foreground">
                             {currentMessage.length}/1000
                           </p>
                           <Button 
                            type="submit" 
                            size="icon" 
                            disabled={isLoading || !currentMessage.trim()}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 w-9"
                            >
                                {isLoading ? <LoadingSpinner size="1rem"/> : <ArrowRight size={18} />}
                                <span className="sr-only">Send</span>
                            </Button>
                        </div>
                    </div>
                </form>
            </Card>
        </div>
    </div>
  );
}
