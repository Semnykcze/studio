
'use server';
/**
 * @fileOverview Generates a visual depth map representation of an image using an AI model.
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
  depthMapDataUri: z.string().describe('A data URI of the generated depth map image.'),
});
export type GenerateDepthMapOutput = z.infer<typeof GenerateDepthMapOutputSchema>;

export async function generateDepthMap(input: GenerateDepthMapInput): Promise<GenerateDepthMapOutput> {
  return generateDepthMapFlow(input);
}

const depthMapInstructions = `Generate a new grayscale image that visually represents the depth map of the provided original image.
In the generated depth map image:
- Brighter areas (closer to white) should indicate parts of the scene that are closer to the viewer.
- Darker areas (closer to black) should indicate parts of the scene that are further away.
The output must be only the generated image, with no surrounding text or explanations. The image should clearly depict depth variations.`;

const generateDepthMapFlow = ai.defineFlow(
  {
    name: 'generateDepthMapFlow',
    inputSchema: GenerateDepthMapInputSchema,
    outputSchema: GenerateDepthMapOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Model for image generation
      prompt: [
        {media: {url: input.photoDataUri}}, // The original image
        {text: depthMapInstructions},       // Instructions for the depth map
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // MUST provide both TEXT and IMAGE
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    });

    if (!result.media || !result.media.url) {
      let errorMessage = 'Failed to generate depth map image or received an empty image response.';
      if (result.text) {
        errorMessage += ` Model response: ${result.text}`;
      }
      throw new Error(errorMessage);
    }
    return { depthMapDataUri: result.media.url };
  }
);
