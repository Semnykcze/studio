'use server';
/**
 * @fileOverview Extends a given prompt to be more detailed and descriptive.
 *
 * - extendPrompt - A function that extends a prompt.
 * - ExtendPromptInput - The input type for the extendPrompt function.
 * - ExtendPromptOutput - The return type for the extendPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtendPromptInputSchema = z.object({
  originalPrompt: z.string().describe('The prompt to be extended.'),
  promptLanguage: z.string().describe('The language of the original prompt (e.g., English, Czech, Spanish). This helps maintain consistency.'),
});
export type ExtendPromptInput = z.infer<typeof ExtendPromptInputSchema>;

const ExtendPromptOutputSchema = z.object({
  extendedPrompt: z.string().describe('The extended, more detailed prompt.'),
});
export type ExtendPromptOutput = z.infer<typeof ExtendPromptOutputSchema>;

export async function extendPrompt(input: ExtendPromptInput): Promise<ExtendPromptOutput> {
  return extendPromptFlow(input);
}

const extendPromptEnhancement = ai.definePrompt({
  name: 'extendPromptEnhancementPrompt',
  input: {schema: ExtendPromptInputSchema},
  output: {schema: ExtendPromptOutputSchema},
  prompt: `You are an AI assistant that enhances and extends user-provided prompts for image generation models.
The user will provide an 'originalPrompt' and its 'promptLanguage'.
Your task is to transform the 'originalPrompt' into a significantly more detailed and descriptive version.
Preserve the core subject, elements, and overall style of the original prompt.
Focus on adding more descriptive adjectives, elaborating on existing elements, introducing complementary details, and enriching the scene or concept.
The output 'extendedPrompt' MUST be in the same language as the 'promptLanguage' ('{{{promptLanguage}}}').
The extended prompt should be noticeably longer and richer than the original.

Original Prompt:
{{{originalPrompt}}}

Extended and More Detailed Prompt (in {{{promptLanguage}}}):
`,
});

const extendPromptFlow = ai.defineFlow(
  {
    name: 'extendPromptFlow',
    inputSchema: ExtendPromptInputSchema,
    outputSchema: ExtendPromptOutputSchema,
  },
  async (input) => {
    const {output} = await extendPromptEnhancement(input);
    return output!;
  }
);
