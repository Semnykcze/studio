
'use server';
/**
 * @fileOverview Generates a Canny edge map image from an input image.
 *
 * - generateCannyEdgeMap - A function that handles Canny edge map generation.
 * - GenerateCannyEdgeMapInput - The input type for the generateCannyEdgeMap function.
 * - GenerateCannyEdgeMapOutput - The return type for the generateCannyEdgeMap function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {SafetySetting} from 'genkit/model';

const GenerateCannyEdgeMapInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateCannyEdgeMapInput = z.infer<typeof GenerateCannyEdgeMapInputSchema>;

const GenerateCannyEdgeMapOutputSchema = z.object({
  cannyEdgeMapDataUri: z.string().describe("The generated Canny edge map image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateCannyEdgeMapOutput = z.infer<typeof GenerateCannyEdgeMapOutputSchema>;

export async function generateCannyEdgeMap(input: GenerateCannyEdgeMapInput): Promise<GenerateCannyEdgeMapOutput> {
  return generateCannyEdgeMapFlow(input);
}

const generateCannyEdgeMapFlow = ai.defineFlow(
  {
    name: 'generateCannyEdgeMapFlow',
    inputSchema: GenerateCannyEdgeMapInputSchema,
    outputSchema: GenerateCannyEdgeMapOutputSchema,
  },
  async (input) => {
    const safetySettings: SafetySetting[] = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ];
    
    const promptText = `Generate a Canny edge detection map from the provided image.
The output image characteristics MUST be:
- Purely binary: strictly black background (pixels with value 0) and white edges (pixels with value 255). No shades of gray.
- Edges should be thin, 1-pixel wide lines that accurately trace the significant contours and boundaries of objects in the original image.
- The visual style should precisely emulate the output of a standard Canny edge detection algorithm (e.g., as seen in OpenCV or scikit-image).
- The output MUST be ONLY the generated Canny edge map image itself, in a standard image format (e.g., PNG).
- Do NOT include any additional text, labels, watermarks, colors, or annotations around or on the image. The image should be purely the Canny edge data visualization.`;

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
        let errorMessage = 'Canny edge map generation failed to produce an image.';
         if (text) { 
            const lowerText = text.toLowerCase();
            if (lowerText.includes('safety') || lowerText.includes('policy') || lowerText.includes('cannot generate') || lowerText.includes('unable to create') || lowerText.includes('no valid candidates')) {
                errorMessage = `The Canny edge map could not be generated. Model response: "${text}". This may be due to safety policies, image content, or other restrictions.`;
            } else {
                errorMessage = `Canny edge map generation failed. Model response: "${text}"`;
            }
        }
        throw new Error(errorMessage);
      }

      return { cannyEdgeMapDataUri: media.url };
    } catch (error: any) {
      console.error('Error in generateCannyEdgeMapFlow:', error);
      let finalErrorMessage = `Canny edge map generation failed: ${error.message || 'Unknown error'}`;
       if (error.message) {
        const lowerMessage = error.message.toLowerCase();
        if (lowerMessage.includes('filter') || lowerMessage.includes('safety') || lowerMessage.includes('policy')) {
          finalErrorMessage = 'The Canny edge map generation request was possibly affected by safety filters or content policies. Try a different image.';
        } else if (lowerMessage.includes('no valid candidates returned')) {
          finalErrorMessage = 'Canny edge map generation failed: The AI model did not produce a valid image, possibly due to the nature of the input image or internal model policies. Try a different image.';
        } else if (lowerMessage.includes('deadline_exceeded')) {
          finalErrorMessage = 'Canny edge map generation failed: The request to the AI model timed out. Please try again later.';
        }
      }
      throw new Error(finalErrorMessage);
    }
  }
);

