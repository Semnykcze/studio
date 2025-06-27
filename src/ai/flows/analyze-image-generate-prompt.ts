
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
  imageType: z.enum(['image', 'photography', 'icon', 'logo']).optional().default('image').describe('The desired type of the output image (e.g., general image, photography, icon/graphic, logo/symbol).'),
  aspectRatio: z.enum(['1:1', 'portrait', 'landscape']).optional().default('1:1').describe('The desired aspect ratio for the output image (e.g., 1:1 Square, Portrait, Landscape).'),
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
7.  Desired Output Image Type: "{{{imageType}}}"
8.  Desired Output Aspect Ratio: "{{{aspectRatio}}}"

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
-   **Desired Output Image Type & Aspect Ratio Guidance:**
    -   If 'Desired Output Image Type' is 'photography': Aim for realism. Consider camera angles (e.g., low angle, high angle, eye-level), lens effects (e.g., wide-angle, telephoto, fisheye, bokeh, depth of field), lighting (e.g., golden hour, studio lighting, natural light, dramatic shadows), and specific photographic styles (e.g., portrait photography, landscape photography, street photography, macro photography, black and white).
    -   If 'Desired Output Image Type' is 'icon': Focus on simplicity, clear and recognizable shapes, and scalability. Suggest styles like flat design, glyph icons, line art icons, or material design icons. Consider a limited color palette and a design suitable for small display sizes.
    -   If 'Desired Output Image Type' is 'image' (General Image): The style should be primarily derived from the uploaded image and the 'Prompt Style' setting (detailed, creative, etc.). This is a flexible category.
    -   If 'Desired Output Image Type' is 'logo': Emphasize concepts like brand identity, symbolic representation, memorability, and simplicity. Suggest vector art style, minimalism, geometric shapes, or abstract forms. If text is part of the original image and relevant, consider how it might be stylized or incorporated as a typographic element in a logo.
    -   If 'Desired Output Aspect Ratio' is '1:1' (Square): Suggest compositions that fit well within a square frame, such as centered subjects, symmetrical designs, or patterns.
    -   If 'Desired Output Aspect Ratio' is 'portrait': Suggest vertical compositions. This is suitable for full-body shots of characters, tall objects, or compositions where verticality is emphasized. For models like Midjourney, you might include a phrase like "portrait orientation" or "vertical aspect ratio" or hint at parameters like \`--ar 2:3\` or \`--ar 9:16\`.
    -   If 'Desired Output Aspect Ratio' is 'landscape': Suggest horizontal compositions, suitable for wide scenes, panoramic views, or groups of subjects. For models like Midjourney, you might include a phrase like "landscape orientation" or "wide aspect ratio" or hint at parameters like \`--ar 3:2\` or \`--ar 16:9\`.
    -   If image type or aspect ratio are not specified or are general, the AI should infer the most appropriate style from the input image or default to a versatile approach based on other parameters.
-   **Target Model Specifics:**
    -   If Target Model is "Flux.1 Dev": Focus on clear, descriptive language. Emphasize key subjects, actions, and the environment. Incorporate image type and aspect ratio guidance.
    -   If Target Model is "Midjourney": Use evocative and artistic phrases. Incorporate stylistic elements, mood descriptors, and details about lighting and color palettes. If 'Desired Output Aspect Ratio' is specified, consider adding the corresponding \`--ar\` parameter (e.g., \`--ar 1:1\`, \`--ar 2:3\`, \`--ar 16:9\`).
    -   If Target Model is "Stable Diffusion": Be precise with keywords. Use commas to separate distinct concepts. Consider adding (weights) if certain elements are more important. Mention specific artists or styles if discernible. Incorporate image type and aspect ratio guidance.
    -   If Target Model is "DALL-E 3": Emphasize natural language descriptions, detailed scenes, and specific artistic styles. DALL-E 3 generally performs well with longer, more descriptive prompts. Use clear, unambiguous language. Incorporate image type and aspect ratio guidance.
    -   If Target Model is "Leonardo AI": Use strong keywords, specify artistic styles, and highlight key visual elements and moods. Mention specific Leonardo.Ai models or features if known and relevant to the image. Incorporate image type and aspect ratio guidance.
    -   If Target Model is "Imagen4" or "Imagen3": These are advanced Google models. Generate highly descriptive prompts that detail the scene, subjects, actions, environment, artistic style, and mood. These models respond well to natural language and can interpret complex requests. Focus on vivid imagery and clear articulation of desired elements. Incorporate image type and aspect ratio guidance.
    -   If Target Model is "General Text": Provide a rich, descriptive text about the image, suitable for a general audience, adhering to the chosen Prompt Style, Image Type, Aspect Ratio, and word count range.
-   **Prompt Style Specifics:**
    -   If Prompt Style is "detailed": Create a very detailed output in {{{outputLanguage}}}, capturing as much visual information as possible including specific objects, their attributes, colors, textures, lighting, composition, and any artistic style, all within the specified word count range and considering the 'Desired Image Type' and 'Desired Aspect Ratio'. Structure it as a coherent paragraph or set of descriptive phrases.
    -   If Prompt Style is "creative": Create a creative and evocative output in {{{outputLanguage}}}, suggesting a story or a unique interpretation of the image, while still being grounded in its visual elements. Focus on mood, atmosphere, and imaginative descriptions, all within the specified word count range and considering the 'Desired Image Type' and 'Desired Aspect Ratio'.
    -   If Prompt Style is "keywords": Generate a comma-separated list of keywords in {{{outputLanguage}}} describing the main elements, colors, style, mood, image type, and aspect ratio of the image. The total length of this keyword list must adhere to the specified word count range.
    -   If Prompt Style is "cinematic": Create a prompt in {{{outputLanguage}}} that evokes a cinematic feel. Focus on dramatic lighting, specific camera angles or shots, strong compositional elements, and an overall mood or narrative suggestion, all within the specified word count range and considering the 'Desired Image Type' and 'Desired Aspect Ratio'.
    -   If Prompt Style is "photorealistic": Generate a prompt in {{{outputLanguage}}} aiming for a high degree of realism, as if capturing a photograph. Emphasize fine details, accurate textures, natural lighting, and precise descriptions of objects, materials, and imperfections. Avoid overly artistic or fantastical terms unless present in the image. Adhere to the specified word count range and consider the 'Desired Image Type' and 'Desired Aspect Ratio'.
    -   If Prompt Style is "abstract": Develop a prompt in {{{outputLanguage}}} that encourages an abstract interpretation of the image. Focus on core elements like form, color palettes, line work, texture, pattern, rhythm, and the overall emotional or conceptual feeling. The prompt should guide the AI towards non-literal, artistic expressions rather than direct depiction, all within the specified word count range and considering the 'Desired Image Type' and 'Desired Aspect Ratio'.

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
      safetySettings = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      ];
    } else {
      safetySettings = [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ];
    }

    try {
      const {output} = await analyzeImageGeneratePromptPrompt(input, {model, config: { safetySettings }});
      if (!output?.prompt) {
          throw new Error("The AI failed to generate a valid prompt. Try adjusting the parameters or relaxing the safety filters.");
      }
      return output;
    } catch (error: any) {
        console.error("Error in analyzeImageGeneratePromptFlow:", error);
        let finalErrorMessage = `Error generating prompt: ${error.message || 'Unknown error'}`;
        if (error?.message) {
            const lowerMessage = error.message.toLowerCase();
            if (lowerMessage.includes('filter') || lowerMessage.includes('safety') || lowerMessage.includes('policy') || lowerMessage.includes('no valid candidates returned')) {
                finalErrorMessage = `Prompt generation was blocked, likely by safety filters. Try a different image or relax the safety filters.`;
            } else if (lowerMessage.includes('deadline_exceeded')) {
                finalErrorMessage = `Prompt generation failed: The request to the AI model timed out. Please try again later.`;
            }
        }
        throw new Error(finalErrorMessage);
    }
  }
);
