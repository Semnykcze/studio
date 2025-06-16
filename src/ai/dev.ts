import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-image-generate-prompt.ts';
import '@/ai/flows/magic-prompt-flow.ts';
import '@/ai/flows/translate-prompt-flow.ts';
import '@/ai/flows/extend-prompt-flow.ts';
import '@/ai/flows/generate-depth-map-flow.ts'; // Re-enabled this import
import '@/ai/flows/analyze-image-style-flow.ts';
