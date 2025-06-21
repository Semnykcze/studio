
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from '@/components/loading-spinner';
import { Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Use a singleton pattern to create the pipeline so it's only loaded once.
class DepthEstimationPipeline {
    static task = 'depth-estimation';
    static model = 'Xenova/depth-anything-small-hf';
    static instance: any = null;

    static async getInstance(progress_callback?: (progress: any) => void) {
        if (this.instance === null) {
            // Dynamically import the pipeline function. This is crucial for Next.js.
            const { pipeline } = await import('@xenova/transformers');
            this.instance = await pipeline(this.task, this.model, { 
                progress_callback,
                quantized: true,
             });
        }
        return this.instance;
    }
}


interface DepthMapCardProps {
    uploadedImage: string | null;
    anyLoading: boolean; // To disable button if other operations are in progress
}

export default function DepthMapCard({ uploadedImage, anyLoading }: DepthMapCardProps) {
    const [generatedDepthMap, setGeneratedDepthMap] = useState<string | null>(null);
    const [isDepthMapLoading, setIsDepthMapLoading] = useState<boolean>(false);
    const [depthModelLoadProgress, setDepthModelLoadProgress] = useState<number | null>(null);
    
    const { toast } = useToast();

    const handleDepthModelProgress = (progress: any) => {
        if (progress.status === 'progress') {
            const percentage = (progress.loaded / progress.total) * 100;
            setDepthModelLoadProgress(percentage);
        } else if (progress.status === 'done') {
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
            const estimator = await DepthEstimationPipeline.getInstance(handleDepthModelProgress);
            
            // The pipeline can directly take a URL or data URI
            const output = await estimator(uploadedImage);
            // output is { predicted_depth: RawImage }

            // The RawImage object has a handy toCanvas method
            const canvas = output.predicted_depth.toCanvas();
            const resultDataUri = canvas.toDataURL('image/png');

            setGeneratedDepthMap(resultDataUri);
            toast({ title: "Depth map generated successfully!" });

        } catch (error) {
            let desc = "Unknown error during depth map generation.";
             if (error instanceof Error) {
                desc = error.message;
                 if (error.message.includes('deadlock')) {
                    desc = 'Depth estimation model failed to load. Please refresh the page and try again.';
                }
            } else if (typeof error === 'object' && error && 'message' in error) {
                desc = String((error as {message:string}).message);
            }
            toast({ variant: "destructive", title: "Depth map generation failed", description: desc });
        } finally {
            setIsDepthMapLoading(false);
            setDepthModelLoadProgress(null); // Ensure progress bar is hidden after completion/error
        }
    };

    return (
        <Card className="shadow-md">
            <CardHeader className="border-b">
                <CardTitle className="text-lg md:text-xl font-headline flex items-center text-primary">
                    <Layers className="mr-2 h-5 w-5" /> Depth Map (Client-Side)
                </CardTitle>
                <CardDescription className="text-sm">Generate a depth map using a local model. No credit cost.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6 relative">
                <Button onClick={handleGenerateDepthMap} disabled={anyLoading || isDepthMapLoading || !uploadedImage} className="w-full mb-4 text-sm py-2" variant="outline">
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
    );
}
