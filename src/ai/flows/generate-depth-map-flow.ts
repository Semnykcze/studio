
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
    
    const promptText = `Analyze the provided image. Generate a new grayscale image that represents a depth map of the original. In this depth map, lighter areas should correspond to parts of the scene closer to the viewer, and darker areas should correspond to parts further away. The output must be the depth map image itself, without any additional text, labels, watermarks, or annotations.`;

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
        if (text) { 
            const lowerText = text.toLowerCase();
            if (lowerText.includes('safety') || lowerText.includes('policy') || lowerText.includes('cannot generate') || lowerText.includes('unable to create')) {
                errorMessage = `The depth map could not be generated. Model response: "${text}". This may be due to safety policies or image content.`;
            } else {
                errorMessage = `Depth map generation failed. Model response: "${text}"`;
            }
        }
        throw new Error(errorMessage);
      }

      return { depthMapDataUri: media.url };
    } catch (error: any) {
      console.error('Error in generateDepthMapFlow:', error);
      let finalErrorMessage = `Depth map generation failed: ${error.message || 'Unknown error'}`;

      if (error.message) {
        const lowerMessage = error.message.toLowerCase();
        if (lowerMessage.includes('filter') || lowerMessage.includes('safety') || lowerMessage.includes('policy')) {
          finalErrorMessage = 'The depth map generation request was blocked by safety filters. Try a different image or adjust NSFW settings if applicable.';
        } else if (lowerMessage.includes('no valid candidates returned')) {
          finalErrorMessage = 'Depth map generation failed: The AI model did not produce a valid image, possibly due to safety policies or the nature of the input image. Try a different image or adjust NSFW settings.';
        } else if (lowerMessage.includes('deadline_exceeded')) {
          finalErrorMessage = 'Depth map generation failed: The request to the AI model timed out. Please try again later.';
        }
      }
      throw new Error(finalErrorMessage);
    }
  }
);

