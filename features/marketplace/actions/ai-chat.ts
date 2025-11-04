'use server';

import { getBaseUrl } from '@/features/marketplace/lib/getBaseUrl';

interface LocalKeys {
  apiKey: string;
  model: string;
  maxTokens: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Check if shared keys ENV variables are configured
export async function checkSharedKeysAvailable() {
  return {
    available: !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL),
    missing: {
      apiKey: !process.env.OPENROUTER_API_KEY,
      model: !process.env.OPENROUTER_MODEL,
      maxTokens: !process.env.OPENROUTER_MAX_TOKENS,
    }
  };
}

