
'use server';
/**
 * @fileOverview Generates a depth map from an image using fal.ai's Depth Anything V2 model.
 *
 * - generateDepthMap - A function that handles the depth map generation process.
 * - GenerateDepthMapInput - The input type for the generateDepthMap function.
 * - GenerateDepthMapOutput - The return type for the generateDepthMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import * as fal from '@fal-ai/client';

// Ensure FAL_KEY_ID and FAL_KEY_SECRET are set in your .env file for fal.ai authentication
// e.g., FAL_KEY="your_fal_key_id:your_fal_key_secret" or
// FAL_KEY_ID="your_fal_key_id"
// FAL_KEY_SECRET="your_fal_key_secret"

const GenerateDepthMapInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateDepthMapInput = z.infer<typeof GenerateDepthMapInputSchema>;

const GenerateDepthMapOutputSchema = z.object({
  depthMapDataUri: z.string().describe('The generated depth map image as a data URI.'),
});
export type GenerateDepthMapOutput = z.infer<typeof GenerateDepthMapOutputSchema>;

export async function generateDepthMap(input: GenerateDepthMapInput): Promise<GenerateDepthMapOutput> {
  return generateDepthMapFlow(input);
}

const generateDepthMapFlow = ai.defineFlow(
  {
    name: 'generateDepthMapFlow',
    inputSchema: GenerateDepthMapInputSchema,
    outputSchema: GenerateDepthMapOutputSchema,
  },
  async (input) => {
    if (!process.env.FAL_KEY_ID || !process.env.FAL_KEY_SECRET) {
      if (!process.env.FAL_KEY) {
        console.error('FAL_KEY_ID and FAL_KEY_SECRET, or FAL_KEY must be set in environment variables for fal.ai authentication.');
        throw new Error('fal.ai API key not configured. Please set FAL_KEY_ID and FAL_KEY_SECRET or FAL_KEY in your .env file.');
      }
    }

    try {
      // Convert data URI to Uint8Array
      const base64Data = input.photoDataUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid data URI format. Could not extract base64 data.');
      }
      const buffer = Buffer.from(base64Data, 'base64');
      const imageBytes = new Uint8Array(buffer);

      const result: any = await fal.run('fal-ai/image-preprocessors/depth-anything/v2', {
        input: {
          image_bytes: imageBytes,
        },
        // It's good practice to explicitly pass credentials if the client library supports it,
        // or ensure they are picked up from environment variables by the library.
        // For @fal-ai/client, it typically picks up FAL_KEY or FAL_KEY_ID/FAL_KEY_SECRET from process.env.
      });

      if (result && result.image && result.image.url) {
        return { depthMapDataUri: result.image.url };
      } else {
        console.error('Unexpected response structure from fal.ai:', result);
        throw new Error('Failed to parse depth map from fal.ai response.');
      }
    } catch (error) {
      console.error('Error calling fal.ai API:', error);
      let errorMessage = 'An unknown error occurred while generating depth map with fal.ai.';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error && 'message' in error) {
        errorMessage = String((error as {message: string}).message);
      }
      throw new Error(`Depth map generation failed: ${errorMessage}`);
    }
  }
);
