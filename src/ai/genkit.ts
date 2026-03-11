
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit lazily or ensure it doesn't crash on boot if environment variables are missing
const getAi = () => {
  try {
    return genkit({
      plugins: [googleAI()],
      model: 'googleai/gemini-2.0-flash',
    });
  } catch (error) {
    console.error('Failed to initialize Genkit:', error);
    // Return a dummy object that fails gracefully when called instead of crashing the whole app
    return {
      definePrompt: () => () => { throw new Error('AI Provider not initialized'); },
      defineFlow: () => () => { throw new Error('AI Provider not initialized'); },
    } as any;
  }
};

export const ai = getAi();
