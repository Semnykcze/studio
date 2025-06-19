
'use server';
/**
 * @fileOverview Generates related keywords or tags for a given target tag, optionally using full prompt context.
 *
 * - generateRelatedTags - A function to get keyword suggestions.
 * - GenerateRelatedTagsInput - Input type.
 * - GenerateRelatedTagsOutput - Output type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRelatedTagsInputSchema = z.object({
  targetTag: z.string().describe('The specific keyword or phrase to generate suggestions for.'),
  fullPromptContext: z.string().optional().describe('The full prompt context, if available, to provide better suggestions.'),
});
export type GenerateRelatedTagsInput = z.infer<typeof GenerateRelatedTagsInputSchema>;

const GenerateRelatedTagsOutputSchema = z.object({
  suggestedKeywords: z.array(z.string()).describe('An array of suggested keywords or short phrases.'),
});
export type GenerateRelatedTagsOutput = z.infer<typeof GenerateRelatedTagsOutputSchema>;

export async function generateRelatedTags(input: GenerateRelatedTagsInput): Promise<GenerateRelatedTagsOutput> {
  return generateRelatedTagsFlow(input);
}

const generateTagsPrompt = ai.definePrompt({
  name: 'generateRelatedTagsPrompt',
  input: {schema: GenerateRelatedTagsInputSchema},
  output: {schema: GenerateRelatedTagsOutputSchema},
  prompt: `You are an AI expert in prompt engineering for image generation models.
Your task is to analyze a 'targetTag' (a keyword or phrase) and, if provided, its 'fullPromptContext'.
Based on this, generate a list of 5 to 7 distinct and creative keywords or short descriptive phrases that are semantically related to the 'targetTag' and could be used to enhance or elaborate on it within an image generation prompt.
The suggestions should aim to add detail, specify style, introduce related concepts, or offer alternative phrasings.
Avoid suggesting keywords that are too generic unless the target tag itself is very generic.
Prioritize suggestions that would be impactful for AI image generation.

Target Tag: "{{targetTag}}"
Full Prompt Context (if any): "{{#if fullPromptContext}}{{{fullPromptContext}}}{{else}}N/A{{/if}}"

Return your suggestions as a JSON array of strings. For example: ["suggestion1", "suggestion2", "suggestion3"]
Ensure the output is ONLY the JSON array of strings.
`,
});

const generateRelatedTagsFlow = ai.defineFlow(
  {
    name: 'generateRelatedTagsFlow',
    inputSchema: GenerateRelatedTagsInputSchema,
    outputSchema: GenerateRelatedTagsOutputSchema,
  },
  async (input) => {
    // Using a model that is good with instruction following and JSON output.
    const {output} = await generateTagsPrompt(input, {model: 'googleai/gemini-1.5-flash-latest'});
    if (!output) {
      return { suggestedKeywords: [] };
    }
    // The output schema will validate this.
    return output;
  }
);

