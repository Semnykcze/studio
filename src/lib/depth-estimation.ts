'use client';

// We will import pipeline dynamically to avoid module initialization issues.
// import { pipeline, RawImage } from '@xenova/transformers';

// Use a singleton pattern to create the pipeline so it's only loaded once.
class DepthEstimationPipeline {
    static task = 'depth-estimation';
    static model = 'Xenova/depth-anything-small-hf';
    static instance: any = null;

    static async getInstance(progress_callback?: (progress: any) => void) {
        if (this.instance === null) {
            // Dynamically import the pipeline function. This can help with issues
            // related to module initialization in some environments like Next.js.
            const { pipeline } = await import('@xenova/transformers');
            this.instance = await pipeline(this.task, this.model, { 
                progress_callback,
                // To save memory and speed up inference, we can quantize the model
                quantized: true,
             });
        }
        return this.instance;
    }
}

/**
 * Generates a depth map from an image using a client-side model.
 * @param imageUrl The URL or data URI of the image to process.
 * @param progressCallback An optional callback to report model loading progress.
 * @returns A promise that resolves to a data URI of the generated depth map image.
 */
export const generateDepthMapFromImage = async (
    imageUrl: string, 
    progressCallback?: (progress: any) => void
): Promise<string> => {
    try {
        const estimator = await DepthEstimationPipeline.getInstance(progressCallback);
        
        // The pipeline can directly take a URL or data URI
        const output = await estimator(imageUrl);
        // output is { predicted_depth: RawImage }

        // The RawImage object has a handy toCanvas method
        const canvas = output.predicted_depth.toCanvas();

        return canvas.toDataURL('image/png');

    } catch (error) {
        console.error('Error during depth estimation:', error);
        // Catch a common deadlock error that can happen in some browser environments with wasm
        if (error instanceof Error && error.message.includes('deadlock')) {
             throw new Error('Depth estimation model failed to load. Please refresh the page and try again.');
        }
        throw new Error('Failed to generate depth map. See console for details.');
    }
};
