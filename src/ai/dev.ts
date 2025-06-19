
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-image-generate-prompt.ts';
import '@/ai/flows/magic-prompt-flow.ts';
import '@/ai/flows/translate-prompt-flow.ts';
import '@/ai/flows/extend-prompt-flow.ts';
import '@/ai/flows/generate-depth-map-flow.ts';
import '@/ai/flows/analyze-image-style-flow.ts';
import '@/ai/flows/visionary-chatter-flow.ts';
import '@/ai/flows/generate-image-from-prompt-flow.ts';
import '@/ai/flows/generate-related-tags-flow.ts';
import '@/ai/flows/transform-prompt-flow.ts'; // Added new flow

