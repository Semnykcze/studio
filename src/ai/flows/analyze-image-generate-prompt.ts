
'use server';
/**
 * @fileOverview Analyzes an image and generates a prompt optimized for a selected model, language, and style.
 *
 * - analyzeImageGeneratePrompt - A function that handles the image analysis and prompt generation process.
 * - AnalyzeImageGeneratePromptInput - The input type for the analyzeImageGeneratePrompt function.
 * - AnalyzeImageGeneratePromptOutput - The return type for the analyzeImageGeneratePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {ModelArgument} from 'genkit/model';

const AnalyzeImageGeneratePromptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  targetModel: z.string().default('Flux.1 Dev').describe('The target model for which the prompt should be optimized (e.g., Flux.1 Dev, Midjourney, Stable Diffusion, General Text).'),
  maxWords: z.number().min(50).max(250).default(150).describe('The maximum number of words for the generated prompt (50-250).'),
  promptStyle: z.enum(['detailed', 'creative', 'keywords']).default('detailed').describe('The desired style of the generated prompt: detailed, creative, or keywords.'),
  outputLanguage: z.string().default('en').describe("The desired language for the generated prompt (e.g., en, cs, es, fr). Use ISO 639-1 codes or full language names like 'Czech', 'Spanish'."),
});
export type AnalyzeImageGeneratePromptInput = z.infer<typeof AnalyzeImageGeneratePromptInputSchema>;

const AnalyzeImageGeneratePromptOutputSchema = z.object({
  prompt: z.string().describe('An optimized prompt for the selected target model and language.'),
});
export type AnalyzeImageGeneratePromptOutput = z.infer<typeof AnalyzeImageGeneratePromptOutputSchema>;

export async function analyzeImageGeneratePrompt(input: AnalyzeImageGeneratePromptInput): Promise<AnalyzeImageGeneratePromptOutput> {
  return analyzeImageGeneratePromptFlow(input);
}

const analyzeImageGeneratePromptPrompt = ai.definePrompt({
  name: 'analyzeImageGeneratePromptPrompt',
  input: {schema: AnalyzeImageGeneratePromptInputSchema},
  output: {schema: AnalyzeImageGeneratePromptOutputSchema},
  prompt: `You are an expert in analyzing images and generating highly effective prompts for AI image generation models.

Your task is to analyze the provided image using a powerful vision model and generate an output optimized for the following parameters:
1.  Target Model for Output: "{{{targetModel}}}"
2.  Maximum Words for Output: {{{maxWords}}}
3.  Output Prompt Style: "{{{promptStyle}}}"
4.  Output Language: "{{{outputLanguage}}}"

**Critical Instructions:**
-   **Word Count:** The generated output prompt (or descriptive text if Target Model is "General Text") **must strictly adhere** to the 'Maximum Words' limit of {{{maxWords}}} words. Do NOT exceed this limit. Prioritize impactful details.
-   **Output Language:** The entire generated output **must be in the specified 'Output Language': {{{outputLanguage}}}**.
-   **Analysis Depth:** Provide a thorough, insightful, and detailed analysis of the image content, including objects, their attributes, colors, textures, lighting, composition, artistic style, and overall mood.
-   **Target Model Specifics:**
    -   If Target Model is "Flux.1 Dev": Focus on clear, descriptive language. Emphasize key subjects, actions, and the environment. Consider aspect ratio or specific camera angles if evident or important.
    -   If Target Model is "Midjourney": Use evocative and artistic phrases. Incorporate stylistic elements (e.g., "impressionistic painting", "sci-fi concept art"), mood descriptors, and details about lighting and color palettes. Consider adding parameters like \`--ar\` if the image aspect ratio is non-standard.
    -   If Target Model is "Stable Diffusion": Be precise with keywords. Use commas to separate distinct concepts. Consider adding (weights) if certain elements are more important. Mention specific artists or styles if discernible.
    -   If Target Model is "General Text": Provide a rich, descriptive text about the image, suitable for a general audience, adhering to the chosen Prompt Style and word limit.
-   **Prompt Style Specifics:**
    -   If Prompt Style is "detailed": Create a very detailed output in {{{outputLanguage}}}, capturing as much visual information as possible including specific objects, their attributes, colors, textures, lighting, composition, and any artistic style, all within the {{{maxWords}}} limit. Structure it as a coherent paragraph or set of descriptive phrases.
    -   If Prompt Style is "creative": Create a creative and evocative output in {{{outputLanguage}}}, suggesting a story or a unique interpretation of the image, while still being grounded in its visual elements. Focus on mood, atmosphere, and imaginative descriptions, all within the {{{maxWords}}} limit.
    -   If Prompt Style is "keywords": Generate a comma-separated list of keywords in {{{outputLanguage}}} describing the main elements, colors, style, and mood of the image. The total length of this keyword list must not exceed the {{{maxWords}}} limit.

Analyze the following image and generate the prompt:
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
  async (input) => {
    const model: ModelArgument = 'googleai/gemini-1.5-flash-latest'; // Always use Gemini for analysis

    const {output} = await analyzeImageGeneratePromptPrompt(input, {model});
    return output!;
  }
);
