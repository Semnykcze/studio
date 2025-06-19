
'use server';
/**
 * @fileOverview Generates a depth map image from an input image.
 *
 * - generateDepthMap - A function that handles depth map generation.
 * - GenerateDepthMapInput - The input type for the generateDepthMap function.
 * - GenerateDepthMapOutput - The return type for the generateDepthMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SafetySetting} from 'genkit/model';

const GenerateDepthMapInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  allowNsfw: z.boolean().optional().default(false).describe('Whether to relax safety settings if the input image might be sensitive, though less relevant for depth maps.'),
});
export type GenerateDepthMapInput = z.infer<typeof GenerateDepthMapInputSchema>;

const GenerateDepthMapOutputSchema = z.object({
  depthMapDataUri: z.string().describe("The generated depth map image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
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
    let safetySettings: SafetySetting[] | undefined = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ];

    if (input.allowNsfw) {
      safetySettings = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      ];
    }
    
    const promptText = `Based on the input image, generate a high-quality grayscale depth map that estimates the 3D scene structure. 
The output image should visually represent the relative distances of surfaces from the camera: lighter pixels indicate surfaces closer to the camera, and darker pixels indicate surfaces further away. 
Strive for a result that is a plausible interpretation of depth, similar in convention to outputs from specialized depth estimation models (e.g., Midas, Depth Anything). 
The output must be purely the visual depth map image (single channel grayscale ideally, or a grayscale representation if multi-channel), without any additional text, labels, watermarks, or annotations. Focus on capturing geometric details and relative depth variations.`;

    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', 
        prompt: [
          { media: { url: input.photoDataUri} },
          { text: promptText }
        ],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: safetySettings,
        },
      });

      if (!media || !media.url) {
        console.warn('Depth map generation did not return media. Text response from model (if any):', text);
        let errorMessage = 'Depth map generation failed to produce an image.';
        if (text && text.toLowerCase().includes('safety policies')) {
            errorMessage = 'The depth map could not be generated due to safety policies.';
        } else if (text) {
            errorMessage = `Model response: ${text}`;
        }
        throw new Error(errorMessage);
      }

      return { depthMapDataUri: media.url };
    } catch (error: any) {
      console.error('Error in generateDepthMapFlow:', error);
      if (error.message && error.message.toLowerCase().includes('filter')) {
        throw new Error('The depth map generation request was blocked by safety filters.');
      }
      throw new Error(`Depth map generation failed: ${error.message || 'Unknown error'}`);
    }
  }
);
