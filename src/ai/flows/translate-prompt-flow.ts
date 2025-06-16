'use server';
/**
 * @fileOverview Translates a given prompt into a target language.
 *
 * - translatePrompt - A function that translates a prompt.
 * - TranslatePromptInput - The input type for the translatePrompt function.
 * - TranslatePromptOutput - The return type for the translatePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslatePromptInputSchema = z.object({
  originalPrompt: z.string().describe('The prompt to be translated.'),
  targetLanguage: z.string().describe("The target language for the translation (e.g., English, Czech, Spanish). Use full language names."),
});
export type TranslatePromptInput = z.infer<typeof TranslatePromptInputSchema>;

const TranslatePromptOutputSchema = z.object({
  translatedPrompt: z.string().describe('The prompt translated into the target language.'),
});
export type TranslatePromptOutput = z.infer<typeof TranslatePromptOutputSchema>;

export async function translatePrompt(input: TranslatePromptInput): Promise<TranslatePromptOutput> {
  return translatePromptGenkitFlow(input);
}

const translatePromptSystem = ai.definePrompt({
  name: 'translatePromptSystemPrompt',
  input: {schema: TranslatePromptInputSchema},
  output: {schema: TranslatePromptOutputSchema},
  prompt: `You are an AI assistant specialized in translation.
Translate the following 'originalPrompt' into the 'targetLanguage' specified ({{{targetLanguage}}}).
Ensure the translation is accurate and natural-sounding in the target language.

Original Prompt:
{{{originalPrompt}}}

Translated Prompt (in {{{targetLanguage}}}):
`,
});

const translatePromptGenkitFlow = ai.defineFlow(
  {
    name: 'translatePromptFlow',
    inputSchema: TranslatePromptInputSchema,
    outputSchema: TranslatePromptOutputSchema,
  },
  async (input) => {
    const {output} = await translatePromptSystem(input);
    return output!;
  }
);
