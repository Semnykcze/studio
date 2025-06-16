
'use server';
/**
 * @fileOverview Analyzes an image and generates a prompt optimized for a selected model.
 *
 * - analyzeImageGeneratePrompt - A function that handles the image analysis and prompt generation process.
 * - AnalyzeImageGeneratePromptInput - The input type for the analyzeImageGeneratePrompt function.
 * - AnalyzeImageGeneratePromptOutput - The return type for the analyzeImageGeneratePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeImageGeneratePromptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  modelType: z.enum(['gemini', 'gemma']).default('gemini').describe('The type of AI model to use for analysis: gemini or gemma.'),
  targetModel: z.string().default('Flux.1 Dev').describe('The target model for which the prompt should be optimized (e.g., Flux.1 Dev, Midjourney, Stable Diffusion, General Text).'),
  maxWords: z.number().min(50).max(250).default(150).describe('The maximum number of words for the generated prompt (50-250).'),
});
export type AnalyzeImageGeneratePromptInput = z.infer<typeof AnalyzeImageGeneratePromptInputSchema>;

const AnalyzeImageGeneratePromptOutputSchema = z.object({
  prompt: z.string().describe('An optimized prompt for the selected target model.'),
});
export type AnalyzeImageGeneratePromptOutput = z.infer<typeof AnalyzeImageGeneratePromptOutputSchema>;

export async function analyzeImageGeneratePrompt(input: AnalyzeImageGeneratePromptInput): Promise<AnalyzeImageGeneratePromptOutput> {
  return analyzeImageGeneratePromptFlow(input);
}

const analyzeImageGeneratePromptPrompt = ai.definePrompt({
  name: 'analyzeImageGeneratePromptPrompt',
  input: {schema: AnalyzeImageGeneratePromptInputSchema},
  output: {schema: AnalyzeImageGeneratePromptOutputSchema},
  prompt: `You are an expert in analyzing images and generating prompts for AI image generation models.

Based on the image provided, generate a prompt optimized for the "{{{targetModel}}}" model that would allow a user to recreate the image.
The prompt must be a maximum of {{{maxWords}}} words.
If the user selected "General Text" as the target model, create a descriptive text about the image instead of a model-specific prompt.

Consider details like objects present, colors, styles, and overall composition.

Image for analysis:
{{media url=photoDataUri}}
`,
});

const analyzeImageGeneratePromptFlow = ai.defineFlow(
  {
    name: 'analyzeImageGeneratePromptFlow',
    inputSchema: AnalyzeImageGeneratePromptInputSchema,
    outputSchema: AnalyzeImageGeneratePromptOutputSchema,
  },
  async input => {
    const {output} = await analyzeImageGeneratePromptPrompt(input);
    return output!;
  }
);
