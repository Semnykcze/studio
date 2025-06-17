
'use server';
/**
 * @fileOverview Analyzes an image and generates a prompt optimized for a selected model, language, and style, adhering to a word count range.
 *
 * - analyzeImageGeneratePrompt - A function that handles the image analysis and prompt generation process.
 * - AnalyzeImageGeneratePromptInput - The input type for the analyzeImageGeneratePrompt function.
 * - AnalyzeImageGeneratePromptOutput - The return type for the analyzeImageGeneratePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {ModelArgument, SafetySetting} from 'genkit/model';

const AnalyzeImageGeneratePromptInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  targetModel: z.string().default('Flux.1 Dev').describe('The target model for which the prompt should be optimized (e.g., Flux.1 Dev, Midjourney, Stable Diffusion, DALL-E 3, Leonardo AI, Imagen4, Imagen3, General Text).'),
  minWords: z.number().min(10).max(100).default(25).describe('The minimum number of words for the generated prompt (10-100).'),
  maxWords: z.number().min(30).max(300).default(150).describe('The maximum number of words for the generated prompt (30-300).'),
  promptStyle: z.enum(['detailed', 'creative', 'keywords', 'cinematic', 'photorealistic', 'abstract']).default('detailed').describe('The desired style of the generated prompt: detailed, creative, keywords, cinematic, photorealistic, or abstract.'),
  outputLanguage: z.string().default('en').describe("The desired language for the generated prompt (e.g., en, cs, es, fr). Use ISO 639-1 codes or full language names like 'Czech', 'Spanish'."),
  allowNsfw: z.boolean().default(false).describe('Whether to allow the generation of prompts that might lead to NSFW or sexually explicit content. If false, such content must be strictly avoided.'),
});
export type AnalyzeImageGeneratePromptInput = z.infer<typeof AnalyzeImageGeneratePromptInputSchema>;

const AnalyzeImageGeneratePromptOutputSchema = z.object({
  prompt: z.string().describe('An optimized prompt for the selected target model and language, within the specified word count range.'),
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
2.  Minimum Words for Output: {{{minWords}}}
3.  Maximum Words for Output: {{{maxWords}}}
4.  Output Prompt Style: "{{{promptStyle}}}"
5.  Output Language: "{{{outputLanguage}}}"
6.  Allow NSFW Content: {{{allowNsfw}}}

**Critical Instructions:**
-   **Word Count Range:** The generated output prompt (or descriptive text if Target Model is "General Text") **must strictly adhere** to the word count range: between {{{minWords}}} and {{{maxWords}}} words. Do NOT go below the minimum or exceed the maximum limit. Prioritize impactful details within this precise range.
-   **Output Language:** The entire generated output **must be in the specified 'Output Language': {{{outputLanguage}}}**.
-   **Analysis Depth:** Provide a thorough, insightful, and detailed analysis of the image content, including objects, their attributes, colors, textures, lighting, composition, artistic style, and overall mood.
-   **Content Safety:**
    {{#if allowNsfw}}
    - You are permitted to generate prompts that may lead to content of a sensual or artistic nude nature if directly implied by the image and other parameters. However, avoid gratuitously explicit, illegal, or harmful content. Adhere to responsible AI guidelines.
    {{else}}
    - **Strictly avoid any NSFW (Not Safe For Work) content.** This includes, but is not limited to, sexually explicit descriptions, inappropriate nudity, violence, or other adult themes. The generated prompt must be suitable for all general audiences. If the image contains elements that could lead to an NSFW interpretation, focus your description on neutral, safe-for-work aspects only. **Furthermore, the prompt must not contain words such as 'nude', 'naked', 'bare', 'nsfw', 'ass', 'breasts', 'pussy', 'sex', 'sexual', 'erotic', or other similar explicit terms.**
    {{/if}}
-   **Target Model Specifics:**
    -   If Target Model is "Flux.1 Dev": Focus on clear, descriptive language. Emphasize key subjects, actions, and the environment. Consider aspect ratio or specific camera angles if evident or important.
    -   If Target Model is "Midjourney": Use evocative and artistic phrases. Incorporate stylistic elements (e.g., "impressionistic painting", "sci-fi concept art"), mood descriptors, and details about lighting and color palettes. Consider adding parameters like \`--ar\` if the image aspect ratio is non-standard.
    -   If Target Model is "Stable Diffusion": Be precise with keywords. Use commas to separate distinct concepts. Consider adding (weights) if certain elements are more important. Mention specific artists or styles if discernible.
    -   If Target Model is "DALL-E 3": Emphasize natural language descriptions, detailed scenes, and specific artistic styles. DALL-E 3 generally performs well with longer, more descriptive prompts. Use clear, unambiguous language.
    -   If Target Model is "Leonardo AI": Use strong keywords, specify artistic styles (e.g., 'character design', 'photorealistic', 'isometric', 'concept art'), and highlight key visual elements and moods. Mention specific Leonardo.Ai models or features if known and relevant to the image.
    -   If Target Model is "Imagen4" or "Imagen3": These are advanced Google models. Generate highly descriptive prompts that detail the scene, subjects, actions, environment, artistic style, and mood. These models respond well to natural language and can interpret complex requests. Focus on vivid imagery and clear articulation of desired elements.
    -   If Target Model is "General Text": Provide a rich, descriptive text about the image, suitable for a general audience, adhering to the chosen Prompt Style and word count range.
-   **Prompt Style Specifics:**
    -   If Prompt Style is "detailed": Create a very detailed output in {{{outputLanguage}}}, capturing as much visual information as possible including specific objects, their attributes, colors, textures, lighting, composition, and any artistic style, all within the specified word count range. Structure it as a coherent paragraph or set of descriptive phrases.
    -   If Prompt Style is "creative": Create a creative and evocative output in {{{outputLanguage}}}, suggesting a story or a unique interpretation of the image, while still being grounded in its visual elements. Focus on mood, atmosphere, and imaginative descriptions, all within the specified word count range.
    -   If Prompt Style is "keywords": Generate a comma-separated list of keywords in {{{outputLanguage}}} describing the main elements, colors, style, and mood of the image. The total length of this keyword list must adhere to the specified word count range.
    -   If Prompt Style is "cinematic": Create a prompt in {{{outputLanguage}}} that evokes a cinematic feel. Focus on dramatic lighting (e.g., chiaroscuro, rim lighting), specific camera angles or shots (e.g., wide shot, close-up, dutch angle), strong compositional elements (e.g., leading lines, depth of field), and an overall mood or narrative suggestion. Use descriptive language that paints a vivid scene, all within the specified word count range.
    -   If Prompt Style is "photorealistic": Generate a prompt in {{{outputLanguage}}} aiming for a high degree of realism, as if capturing a photograph. Emphasize fine details, accurate textures, natural lighting (e.g., golden hour, overcast), and precise descriptions of objects, materials, and imperfections. Avoid overly artistic or fantastical terms unless present in the image. Adhere to the specified word count range.
    -   If Prompt Style is "abstract": Develop a prompt in {{{outputLanguage}}} that encourages an abstract interpretation of the image. Focus on core elements like form, color palettes, line work, texture, pattern, rhythm, and the overall emotional or conceptual feeling. The prompt should guide the AI towards non-literal, artistic expressions rather than direct depiction, all within the specified word count range.

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
    const model: ModelArgument = 'googleai/gemini-1.5-flash-latest'; 

    if (input.minWords > input.maxWords) {
      throw new Error('Minimum words cannot be greater than maximum words.');
    }

    let safetySettings: SafetySetting[] | undefined = undefined;

    if (input.allowNsfw) {
      // When NSFW is allowed, try to minimize safety filtering by setting thresholds to BLOCK_NONE.
      // Note: Some harmful content might still be blocked by non-configurable model safeguards.
      safetySettings = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      ];
    } else {
      // Stricter settings when NSFW is not allowed.
      safetySettings = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ];
    }

    const {output} = await analyzeImageGeneratePromptPrompt(input, {model, config: { safetySettings }});
    return output!;
  }
);

