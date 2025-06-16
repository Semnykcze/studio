
'use server';
/**
 * @fileOverview A chatbot flow for "Visionary Chatter" to assist with image generation prompts,
 * now with multimodal capabilities (text and images).
 *
 * - visionaryChatter - A function to handle chat interactions.
 * - VisionaryChatterInput - The input type for the visionaryChatter function.
 * - VisionaryChatterOutput - The return type for the visionaryChatter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {Part} from 'genkit/model';


// Define the structure for parts of a message (text or image)
const TextPartSchema = z.object({
  text: z.string(),
});
const MediaPartSchema = z.object({
  media: z.object({
    url: z.string().describe("A media file, typically an image, as a data URI."),
    contentType: z.string().optional().describe("The MIME type of the media, e.g., 'image/png'.")
  }),
});
export const PartSchema = z.union([TextPartSchema, MediaPartSchema]);
export type PartType = z.infer<typeof PartSchema>;


// Define the structure for a single message in the history
const MessageSchema = z.object({
  role: z.enum(['user', 'model', 'system', 'tool']),
  parts: z.array(PartSchema),
});
export type Message = z.infer<typeof MessageSchema>;


const VisionaryChatterInputSchema = z.object({
  message: z.string().describe('The current text message from the user.'),
  photoDataUris: z.array(z.string()).optional().describe("Optional array of image data URIs uploaded by the user for the current message. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  history: z.array(MessageSchema).optional().describe('The conversation history.'),
});
export type VisionaryChatterInput = z.infer<typeof VisionaryChatterInputSchema>;

const VisionaryChatterOutputSchema = z.object({
  response: z.string().describe("The chatbot's response."),
});
export type VisionaryChatterOutput = z.infer<typeof VisionaryChatterOutputSchema>;

export async function visionaryChatter(input: VisionaryChatterInput): Promise<VisionaryChatterOutput> {
  return visionaryChatterFlow(input);
}

const systemPrompt = `You are Visionary Chatter, a friendly, helpful, and knowledgeable AI assistant.
Your expertise is in guiding users to create effective prompts for AI image generation models such as Flux.1 Dev, Midjourney, Stable Diffusion, DALL-E 3, and Leonardo AI.
Your goal is to help users understand parameters, prompt structures, artistic styles, keywords, negative prompts, and other techniques to achieve their desired image results.
Be specific in your advice, provide clear examples, and explain concepts in an easy-to-understand manner.
If a user mentions a specific image generation model, tailor your advice to its known strengths, weaknesses, and prompting style.
Maintain a positive and encouraging conversational tone.
When providing examples of prompts, make them easy to copy, perhaps by using code blocks or clear formatting.
If the user provides images, consider them as visual context for your advice. You can describe what you see if relevant, or use the image content to inform your suggestions for prompts related to or inspired by those images. Acknowledge the images if they are present.`;

const visionaryChatterFlow = ai.defineFlow(
  {
    name: 'visionaryChatterFlow',
    inputSchema: VisionaryChatterInputSchema,
    outputSchema: VisionaryChatterOutputSchema,
  },
  async (input) => {
    const currentUserParts: Part[] = [{text: input.message}];
    if (input.photoDataUris && input.photoDataUris.length > 0) {
      input.photoDataUris.forEach(uri => {
        // Basic extraction of MIME type, defaults if not found
        const match = uri.match(/^data:(image\/[^;]+);base64,/);
        const contentType = match ? match[1] : undefined;
        currentUserParts.push({media: {url: uri, contentType }});
      });
    }

    try {
      const {output} = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest', // Ensure this model is vision-capable
        system: systemPrompt,
        history: input.history || [],
        prompt: currentUserParts,
        output: {schema: VisionaryChatterOutputSchema},
        config: {
          // Adjust safety settings if needed, e.g., for analyzing diverse images
          // safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' }],
        }
      });

      if (!output?.response) {
        return { response: "I'm sorry, I couldn't process that. Could you try rephrasing?" };
      }
      return output;

    } catch (error) {
      console.error("Error in visionaryChatterFlow:", error);
      let errorMessage = "An unexpected error occurred while generating a response.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Consider if the error contains structured information, e.g. from Gemini API directly
      // if (typeof error === 'object' && error && (error as any).message) {
      //   errorMessage = (error as any).message;
      // }
      return { response: `Sorry, I encountered an error: ${errorMessage}. Please try again.` };
    }
  }
);
