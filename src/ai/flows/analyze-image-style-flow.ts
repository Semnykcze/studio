
'use server';
/**
 * @fileOverview Analyzes an image to determine its artistic style, dominant colors, composition, mood, and relevant keywords.
 *
 * - analyzeImageStyle - A function that handles the image style analysis.
 * - AnalyzeImageStyleInput - The input type for the analyzeImageStyle function.
 * - AnalyzeImageStyleOutput - The return type for the analyzeImageStyle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {ModelArgument} from 'genkit/model';

const AnalyzeImageStyleInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeImageStyleInput = z.infer<typeof AnalyzeImageStyleInputSchema>;

const AnalyzeImageStyleOutputSchema = z.object({
  identifiedStyle: z.string().describe('The primary artistic style identified in the image (e.g., "Impressionistic", "Photorealistic", "Abstract", "Art Deco", "Minimalist"). Provide "N/A" if no distinct style is discernible or applicable.'),
  dominantColors: z.array(z.string()).describe('An array of 3-5 dominant colors found in the image, described in plain English (e.g., "Deep Blue", "Warm Orange", "Forest Green").'),
  compositionNotes: z.string().describe('Brief notes on key compositional elements or techniques observed (e.g., "Rule of thirds, leading lines", "Symmetrical balance", "Dynamic asymmetry"). Provide "N/A" if not clearly applicable.'),
  styleKeywords: z.array(z.string()).describe('A list of 5-7 keywords that capture the essence of the image\'s style, mood, and subject matter (e.g., ["ethereal", "dreamlike", "nature", "soft light", "fantasy"]).'),
  overallMood: z.string().describe('The overall mood or atmosphere conveyed by the image (e.g., "Serene", "Energetic", "Mysterious", "Joyful").'),
});
export type AnalyzeImageStyleOutput = z.infer<typeof AnalyzeImageStyleOutputSchema>;

export async function analyzeImageStyle(input: AnalyzeImageStyleInput): Promise<AnalyzeImageStyleOutput> {
  return analyzeImageStyleFlow(input);
}

const analyzeImageStylePrompt = ai.definePrompt({
  name: 'analyzeImageStylePrompt',
  input: {schema: AnalyzeImageStyleInputSchema},
  output: {schema: AnalyzeImageStyleOutputSchema},
  prompt: `You are an expert art critic and image analyst. Analyze the provided image and provide the following details:

1.  **Identified Style**: Determine the primary artistic style of the image (e.g., "Impressionistic", "Photorealistic", "Abstract", "Art Deco", "Minimalist", "Cartoonish", "Watercolor", "Oil Painting", "Pixel Art", "Line Art", "Gothic", "Cyberpunk", "Steampunk", "Vintage Photography"). If no distinct artistic style is clearly discernible or if it's a standard photograph without a strong stylistic filter, state "N/A" or "Photorealistic" as appropriate.
2.  **Dominant Colors**: List 3 to 5 dominant colors present in the image. Describe them in plain English (e.g., "Vibrant Red", "Pastel Blue", "Earthy Brown", "Neon Green").
3.  **Composition Notes**: Briefly describe any notable compositional techniques or elements (e.g., "Rule of thirds applied to subject", "Strong leading lines towards the horizon", "Symmetrical framing", "Use of negative space", "Shallow depth of field"). If not clearly applicable, state "N/A".
4.  **Style Keywords**: Generate a list of 5 to 7 keywords that encapsulate the image's style, subject, mood, and any relevant artistic terms. These should be concise and descriptive.
5.  **Overall Mood**: Describe the overall mood or atmosphere the image conveys (e.g., "Peaceful and serene", "Dynamic and energetic", "Dark and mysterious", "Lighthearted and joyful", "Nostalgic").

Analyze the following image:
{{media url=photoDataUri}}
`,
});

const analyzeImageStyleFlow = ai.defineFlow(
  {
    name: 'analyzeImageStyleFlow',
    inputSchema: AnalyzeImageStyleInputSchema,
    outputSchema: AnalyzeImageStyleOutputSchema,
  },
  async (input) => {
    const model: ModelArgument = 'googleai/gemini-1.5-flash-latest'; // Using Gemini for its vision capabilities

    const {output} = await analyzeImageStylePrompt(input, {model});
    if (!output) {
      throw new Error('Image style analysis failed to produce an output.');
    }
    return output;
  }
);
