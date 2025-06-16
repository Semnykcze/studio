
'use server';
/**
 * @fileOverview Generates a visual depth map representation of an image using the Depth-Anything model
 * via a Hugging Face Space API.
 *
 * - generateDepthMap - A function that handles the depth map generation process.
 * - GenerateDepthMapInput - The input type for the generateDepthMap function.
 * - GenerateDepthMapOutput - The return type for the generateDepthMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDepthMapInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateDepthMapInput = z.infer<typeof GenerateDepthMapInputSchema>;

const GenerateDepthMapOutputSchema = z.object({
  depthMapDataUri: z.string().describe('A data URI of the generated depth map image from Hugging Face Space.'),
});
export type GenerateDepthMapOutput = z.infer<typeof GenerateDepthMapOutputSchema>;

export async function generateDepthMap(input: GenerateDepthMapInput): Promise<GenerateDepthMapOutput> {
  return generateDepthMapFlow(input);
}

const HUGGING_FACE_API_ENDPOINT = 'https://liheyoung-depth-anything.hf.space/run/predict';

const generateDepthMapFlow = ai.defineFlow(
  {
    name: 'generateDepthMapViaHuggingFaceFlow',
    inputSchema: GenerateDepthMapInputSchema,
    outputSchema: GenerateDepthMapOutputSchema,
  },
  async (input: GenerateDepthMapInput): Promise<GenerateDepthMapOutput> => {
    const payload = {
      // fn_index is specific to the Gradio app structure on Hugging Face.
      // For LiheYoung/Depth-Anything, the main prediction function is usually at fn_index 0.
      // You might need to inspect the specific Space's API page (usually /api) if this changes.
      fn_index: 0, 
      data: [
        input.photoDataUri,
        "Depth Anything V2 - ViT-L (Base)", // Model type, using a common default
        false  // Boosting disabled
      ],
      // session_hash can often be omitted or a random string.
      // session_hash: Math.random().toString(36).substring(7) 
    };

    try {
      const response = await fetch(HUGGING_FACE_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Hugging Face API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`
        );
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`Hugging Face API returned an error: ${result.error}`);
      }
      
      if (Array.isArray(result.data) && result.data.length > 0 && typeof result.data[0] === 'string' && result.data[0].startsWith('data:image')) {
        return { depthMapDataUri: result.data[0] };
      } else {
        console.error('Unexpected response structure from Hugging Face API:', result);
        throw new Error('Failed to parse depth map image from Hugging Face API response or data is not an image URI.');
      }

    } catch (error) {
      console.error('Error calling Hugging Face Depth-Anything API:', error);
      let errorMessage = 'Failed to generate depth map using Hugging Face service.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Re-throw with a more user-friendly message or the original one
      throw new Error(errorMessage);
    }
  }
);

