
'use server';
/**
 * @fileOverview Transforms an existing prompt based on user instructions.
 *
 * - transformPrompt - A function to apply transformations to a prompt.
 * - TransformPromptInput - The input type for the transformPrompt function.
 * - TransformPromptOutput - The return type for the transformPrompt function.
 */

import {ai} from '@/ai/genkit';
import {z}from 'genkit';

const TransformPromptInputSchema = z.object({
  originalPrompt: z.string().describe('The current prompt to be transformed.'),
  transformationInstruction: z.string().describe('The user\'s instruction on how to change the prompt (e.g., "make it nighttime", "add a cyberpunk style", "rewrite focusing on the cat").'),
  promptLanguage: z.string().optional().default('English').describe('The language of the original prompt and the desired language for the transformed prompt.'),
});
export type TransformPromptInput = z.infer<typeof TransformPromptInputSchema>;

const TransformPromptOutputSchema = z.object({
  transformedPrompt: z.string().describe('The prompt after applying the transformation instruction.'),
});
export type TransformPromptOutput = z.infer<typeof TransformPromptOutputSchema>;

export async function transformPrompt(input: TransformPromptInput): Promise<TransformPromptOutput> {
  return transformPromptGenkitFlow(input);
}

const transformPromptSystem = ai.definePrompt({
  name: 'transformPromptSystemPrompt',
  input: {schema: TransformPromptInputSchema},
  output: {schema: TransformPromptOutputSchema},
  prompt: `You are an AI assistant specialized in refining and transforming text prompts for image generation.
The user will provide an 'originalPrompt', a 'transformationInstruction', and the 'promptLanguage'.

Your task is to carefully analyze the 'originalPrompt' and the 'transformationInstruction'.
Apply the instruction to the original prompt to create a 'transformedPrompt'.
The 'transformedPrompt' should:
1.  Incorporate the requested changes accurately.
2.  Preserve the core subject, elements, and overall intent of the 'originalPrompt' as much as possible, unless the instruction explicitly asks to change them.
3.  Be in the specified 'promptLanguage' ('{{{promptLanguage}}}').
4.  Be well-structured and effective for an AI image generation model.

Examples of transformation instructions:
- "Change the setting to a futuristic city."
- "Make the mood more melancholic."
- "Add a detailed description of the character's clothing."
- "Rewrite this to be more concise but keep all key elements."
- "Shift the time of day to golden hour."

Original Prompt:
{{{originalPrompt}}}

Transformation Instruction:
{{{transformationInstruction}}}

Transformed Prompt (in {{{promptLanguage}}}):
`,
});

const transformPromptGenkitFlow = ai.defineFlow(
  {
    name: 'transformPromptFlow',
    inputSchema: TransformPromptInputSchema,
    outputSchema: TransformPromptOutputSchema,
  },
  async (input) => {
    const {output} = await transformPromptSystem(input);
    if (!output) {
      throw new Error('Prompt transformation failed to produce an output.');
    }
    return output;
  }
);
