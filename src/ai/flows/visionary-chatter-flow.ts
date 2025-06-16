
'use server';
/**
 * @fileOverview A chatbot flow for "Visionary Chatter" to assist with image generation prompts.
 *
 * - visionaryChatter - A function to handle chat interactions.
 * - VisionaryChatterInput - The input type for the visionaryChatter function.
 * - VisionaryChatterOutput - The return type for the visionaryChatter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the structure for a single message in the history
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({text: z.string()})),
});
export type Message = z.infer<typeof MessageSchema>;

const VisionaryChatterInputSchema = z.object({
  message: z.string().describe('The current message from the user.'),
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

const visionaryChatterPrompt = ai.definePrompt({
  name: 'visionaryChatterPrompt',
  input: {schema: VisionaryChatterInputSchema},
  output: {schema: VisionaryChatterOutputSchema},
  prompt: `You are Visionary Chatter, a friendly, helpful, and knowledgeable AI assistant.
Your expertise is in guiding users to create effective prompts for AI image generation models such as Flux.1 Dev, Midjourney, Stable Diffusion, DALL-E 3, and Leonardo AI.
Your goal is to help users understand parameters, prompt structures, artistic styles, keywords, negative prompts, and other techniques to achieve their desired image results.
Be specific in your advice, provide clear examples, and explain concepts in an easy-to-understand manner.
If a user mentions a specific image generation model, tailor your advice to its known strengths, weaknesses, and prompting style.
Maintain a positive and encouraging conversational tone.
When providing examples of prompts, make them easy to copy, perhaps by using code blocks or clear formatting.

Conversation History:
{{#if history}}
{{#each history}}
{{#if (eq role "user")}}User: {{parts.[0].text}}{{/if}}
{{#if (eq role "model")}}AI: {{parts.[0].text}}{{/if}}
{{/each}}
{{else}}
(No previous messages)
{{/if}}

Current User Message:
User: {{{message}}}

Your Response (as Visionary Chatter):
AI:`,
});

const visionaryChatterFlow = ai.defineFlow(
  {
    name: 'visionaryChatterFlow',
    inputSchema: VisionaryChatterInputSchema,
    outputSchema: VisionaryChatterOutputSchema,
  },
  async (input) => {
    const {output} = await visionaryChatterPrompt(input);
    if (!output?.response) {
      // Fallback response if the model returns an empty or malformed output
      return { response: "I'm sorry, I couldn't process that. Could you try rephrasing?" };
    }
    return output;
  }
);
