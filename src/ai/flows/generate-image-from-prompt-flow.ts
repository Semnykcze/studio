
'use server';
/**
 * @fileOverview Generates an image from a text prompt.
 *
 * - generateImageFromPrompt - A function that handles image generation.
 * - GenerateImageFromPromptInput - The input type.
 * - GenerateImageFromPromptOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SafetySetting} from 'genkit/model';

const GenerateImageFromPromptInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from.'),
  allowNsfw: z.boolean().optional().default(false).describe('Whether to relax safety settings for potentially NSFW content.'),
});
export type GenerateImageFromPromptInput = z.infer<typeof GenerateImageFromPromptInputSchema>;

const GenerateImageFromPromptOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateImageFromPromptOutput = z.infer<typeof GenerateImageFromPromptOutputSchema>;

export async function generateImageFromPrompt(input: GenerateImageFromPromptInput): Promise<GenerateImageFromPromptOutput> {
  return generateImageFromPromptFlow(input);
}

const generateImageFromPromptFlow = ai.defineFlow(
  {
    name: 'generateImageFromPromptFlow',
    inputSchema: GenerateImageFromPromptInputSchema,
    outputSchema: GenerateImageFromPromptOutputSchema,
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


    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', 
        prompt: input.prompt,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: safetySettings,
        },
      });

      if (!media || !media.url) {
        console.warn('Image generation did not return media. Text response from model (if any):', text);
        let errorMessage = 'Image generation failed to produce an image.';
        if (text && text.toLowerCase().includes('safety policies')) {
            errorMessage = 'The image could not be generated due to safety policies. Try adjusting your prompt or enabling NSFW if appropriate.';
        } else if (text) {
            errorMessage = `Model response: ${text}`;
        }
        throw new Error(errorMessage);
      }

      return { imageDataUri: media.url };
    } catch (error: any) {
      console.error('Error in generateImageFromPromptFlow:', error);
      // Check for specific error messages from the model if possible
      if (error.message && error.message.toLowerCase().includes('filter')) {
        throw new Error('The image generation request was blocked by safety filters. Try adjusting your prompt or enabling NSFW if appropriate.');
      }
      throw new Error(`Image generation failed: ${error.message || 'Unknown error'}`);
    }
  }
);
