
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
const PartSchema = z.union([TextPartSchema, MediaPartSchema]);
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

const systemPrompt = `You are Visionary Chatter, a friendly, helpful, professional, and highly knowledgeable AI assistant.
Your primary expertise lies in all aspects of AI image generation. You are here to assist users in creating, understanding, and refining effective prompts for a wide range of AI image generation models, including but not limited to Flux.1 Dev, Midjourney, Stable Diffusion, DALL-E 3, and Leonardo AI.

Your capabilities include:
- Engaging in natural conversation about image generation concepts, techniques, and best practices.
- Guiding users on how to structure prompts, choose appropriate keywords, define artistic styles, implement negative prompts, and understand model-specific parameters.
- Analyzing and understanding prompts provided by the user.
- Intelligently editing and refining user-provided prompts based on their requests. For example, if a user asks to change a daytime scene to nighttime, you should adjust not only the time of day but also suggest appropriate lighting, mood, and related elements, while preserving the core subject and intent of the original prompt.
- Considering the entire conversation history to maintain context and provide relevant, coherent responses and prompt modifications.
- If users upload images, acknowledge them and use them as visual context for your advice, prompt generation, or refinement suggestions.
- Providing clear, actionable examples of prompts and explaining concepts in an easy-to-understand manner.
- Maintaining a positive, encouraging, and professional conversational tone throughout the interaction.

When asked to edit a prompt, analyze the request carefully. Identify the core elements to preserve and the specific changes requested. Then, reconstruct the prompt to reflect these changes, ensuring it remains effective for AI image generation.`;

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
        const match = uri.match(/^data:(image\/[^;]+);base64,/);
        const contentType = match ? match[1] : undefined;
        currentUserParts.push({media: {url: uri, contentType }});
      });
    }

    const preparedHistory: Message[] = [
      { role: 'system', parts: [{ text: systemPrompt }] },
    ];
    if (input.history) {
      preparedHistory.push(...input.history);
    }

    try {
      const {output} = await ai.generate({
        model: 'googleai/gemini-1.5-flash-latest',
        history: preparedHistory,
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
      
      // Log the full error object for more details
      if (typeof error === 'object' && error !== null) {
        console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        if ('message' in error && typeof (error as Error).message === 'string') {
          errorMessage = (error as Error).message;
        }
        if ('details' in error) {
           console.error("Gemini error details:", (error as {details: unknown}).details);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Specific check for system role error, though hopefully resolved by new structure
      if (errorMessage.toLowerCase().includes('system role is not supported')) {
          errorMessage = 'There was an issue with the system configuration. Please try again.';
      }

      return { response: `Sorry, I encountered an error: ${errorMessage}. Please try again.` };
    }
  }
);

