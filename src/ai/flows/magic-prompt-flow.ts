'use server';
/**
 * @fileOverview Enhances a given prompt to be more "magical" or creative.
 *
 * - magicPrompt - A function that enhances a prompt.
 * - MagicPromptInput - The input type for the magicPrompt function.
 * - MagicPromptOutput - The return type for the magicPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MagicPromptInputSchema = z.object({
  originalPrompt: z.string().describe('The prompt to be enhanced.'),
  promptLanguage: z.string().describe('The language of the original prompt (e.g., English, Czech, Spanish). This helps maintain consistency.'),
});
export type MagicPromptInput = z.infer<typeof MagicPromptInputSchema>;

const MagicPromptOutputSchema = z.object({
  magicPrompt: z.string().describe('The enhanced, more "magical" prompt.'),
});
export type MagicPromptOutput = z.infer<typeof MagicPromptOutputSchema>;

export async function magicPrompt(input: MagicPromptInput): Promise<MagicPromptOutput> {
  return magicPromptFlow(input);
}

const magicPromptEnhancement = ai.definePrompt({
  name: 'magicPromptEnhancementPrompt',
  input: {schema: MagicPromptInputSchema},
  output: {schema: MagicPromptOutputSchema},
  prompt: `You are an AI assistant that enhances user-provided prompts for image generation models.
The user will provide an 'originalPrompt' and its 'promptLanguage'.
Your task is to transform the 'originalPrompt' into a more "magical", "creative", "vivid", or "stylistically interesting" version.
Preserve the core subject and elements of the original prompt.
Focus on adding descriptive adjectives, evocative imagery, and perhaps a touch of fantasy or artistic flair, depending on the context of the original prompt.
The output 'magicPrompt' MUST be in the same language as the 'promptLanguage' ('{{{promptLanguage}}}').
Do not simply repeat the original prompt; make tangible enhancements.

Original Prompt:
{{{originalPrompt}}}

Enhanced "Magic" Prompt (in {{{promptLanguage}}}):
`,
});

const magicPromptFlow = ai.defineFlow(
  {
    name: 'magicPromptFlow',
    inputSchema: MagicPromptInputSchema,
    outputSchema: MagicPromptOutputSchema,
  },
  async (input) => {
    const {output} = await magicPromptEnhancement(input);
    return output!;
  }
);
