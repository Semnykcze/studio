
'use server';
/**
 * @fileOverview Extends a given prompt to be more detailed and descriptive, respecting a maximum word count.
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
  maxWords: z.number().min(10).max(500).describe('The maximum number of words for the extended prompt.'),
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
The user will provide an 'originalPrompt', its 'promptLanguage', and a 'maxWords' limit.

Your task is to transform the 'originalPrompt'.
1.  First, analyze the 'originalPrompt'. If it appears to be primarily a comma-separated list of keywords (e.g., "cat, fluffy, white, sitting, sunny window, detailed, 4k"), then your task is to append additional relevant keywords to this list. Maintain the comma-separated format and the original 'promptLanguage' ('{{{promptLanguage}}}'). The goal is to enrich the keyword list without fundamentally changing its style to a descriptive paragraph.
2.  If the 'originalPrompt' is descriptive text (not a keyword list), then your task is to transform it into a significantly more detailed and descriptive version in the 'promptLanguage' ('{{{promptLanguage}}}'). Preserve the core subject, elements, and overall style of the original prompt. Focus on adding more descriptive adjectives, elaborating on existing elements, introducing complementary details, and enriching the scene or concept.

In both cases, the output 'extendedPrompt' MUST be in the same language as the 'promptLanguage' ('{{{promptLanguage}}}').
The extended prompt should be noticeably longer and richer than the original, BUT IT MUST NOT EXCEED the 'maxWords' limit of {{{maxWords}}} words. Be concise if necessary to stay within this limit.

Original Prompt:
{{{originalPrompt}}}

Extended and More Detailed Prompt (in {{{promptLanguage}}}, max {{{maxWords}}} words):
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

