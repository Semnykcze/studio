
'use server';
/**
 * @fileOverview Generates an image from a text prompt, or edits an existing image based on a prompt.
 *
 * - generateImageFromPrompt - A function that handles image generation/editing.
 * - GenerateImageFromPromptInput - The input type.
 * - GenerateImageFromPromptOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SafetySetting, Part} from 'genkit/model';

const GenerateImageFromPromptInputSchema = z.object({
  prompt: z.string().describe('The text prompt to generate an image from, or to guide editing if baseImageDataUri is provided.'),
  baseImageDataUri: z.string().optional().describe("Optional base image (as data URI) to be edited using the prompt. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  allowNsfw: z.boolean().optional().default(false).describe('Whether to relax safety settings for potentially NSFW content.'),
});
export type GenerateImageFromPromptInput = z.infer<typeof GenerateImageFromPromptInputSchema>;

const GenerateImageFromPromptOutputSchema = z.object({
  imageDataUri: z.string().describe("The generated or edited image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
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

    let promptPayload: string | Part[];
    if (input.baseImageDataUri) {
      // Image editing scenario
      const match = input.baseImageDataUri.match(/^data:(image\/[^;]+);base64,/);
      const contentType = match ? match[1] : 'image/png'; // Default to png if not derivable
      promptPayload = [
        { media: { url: input.baseImageDataUri, contentType } },
        { text: input.prompt }
      ];
    } else {
      // Text-to-image scenario
      promptPayload = input.prompt;
    }

    const operationType = input.baseImageDataUri ? "editing" : "generation";

    try {
      const {media, text} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp', 
        prompt: promptPayload,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: safetySettings,
        },
      });

      if (!media || !media.url) {
        let errorMessage = `Image ${operationType} failed to produce an image.`;
        if (text) {
            const lowerText = text.toLowerCase();
            if (lowerText.includes('safety') || lowerText.includes('policy') || lowerText.includes('cannot generate') || lowerText.includes('unable to create')) {
                errorMessage = `The image could not be ${operationType === "editing" ? "edited" : "generated"}. Model response: "${text}". This may be due to safety policies, image content, or other restrictions. Try adjusting your prompt or enabling NSFW if appropriate.`;
            } else {
                errorMessage = `Image ${operationType} failed. Model response: "${text}"`;
            }
        } else if (!text && (error as any)?.message?.includes('No valid candidates returned')) {
            errorMessage = `Image ${operationType} failed: No valid candidates returned from the model. This can be due to image content, prompt complexity, or internal model policies. Consider simplifying your prompt or trying a different base image if editing.`;
        }
        console.warn(`Image ${operationType} did not return media. Text response from model (if any):`, text);
        throw new Error(errorMessage);
      }

      return { imageDataUri: media.url };
    } catch (error: any) {
      console.error(`Error in generateImageFromPromptFlow during ${operationType}:`, error);
      let finalErrorMessage = `Image ${operationType} failed: ${error.message || 'Unknown error'}`;
      if (error.message) {
        const lowerMessage = error.message.toLowerCase();
        if (lowerMessage.includes('filter') || lowerMessage.includes('safety') || lowerMessage.includes('policy')) {
          finalErrorMessage = `The image ${operationType} request was possibly affected by safety filters or content policies. Try adjusting your prompt or enabling NSFW if appropriate.`;
        } else if (lowerMessage.includes('no valid candidates returned')) {
           finalErrorMessage = `Image ${operationType} failed: The AI model did not produce a valid image, possibly due to the nature of the input image, prompt complexity, or internal model policies. Try a different image or simplify your prompt.`;
        } else if (lowerMessage.includes('deadline_exceeded')) {
           finalErrorMessage = `Image ${operationType} failed: The request to the AI model timed out. Please try again later.`;
        }
      }
      throw new Error(finalErrorMessage);
    }
  }
);

