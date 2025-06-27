import { Env } from '../types/env';
import Anthropic from '@anthropic-ai/sdk';

// AI personas for message transformation
const personas = [
  {
    name: 'Professional',
    style: 'Clear, direct, formal business communication. Uses proper grammar and professional vocabulary.',
  },
  {
    name: 'Casual',
    style: 'Relaxed, conversational tone. Natural flow with common expressions and informal language.',
  },
  {
    name: 'Academic',
    style: 'Scholarly tone with precise language. Structured arguments and analytical approach.',
  },
  {
    name: 'Minimalist',
    style: 'Concise and to the point. Short sentences. Essential information only.',
  },
  {
    name: 'Storyteller',
    style: 'Narrative approach with descriptive language. Builds context and uses examples.',
  },
  {
    name: 'Technical',
    style: 'Precise technical language. Logical structure with clear cause-and-effect relationships.',
  },
  {
    name: 'Empathetic',
    style: 'Warm and understanding tone. Acknowledges feelings and shows consideration.',
  },
  {
    name: 'Analytical',
    style: 'Data-driven approach. Breaking down issues into components with systematic analysis.',
  },
];

export async function transformMessage(originalMessage: string, env: Env): Promise<string> {
  // Select random persona
  const persona = personas[Math.floor(Math.random() * personas.length)];
  
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

  const prompt = `You are a message transformation assistant. Your task is to rewrite the following message in a different style to preserve anonymity while maintaining the core meaning and intent.

Persona: ${persona.name}
Style: ${persona.style}

Important rules:
1. Preserve the core message and intent
2. Change the writing style completely
3. Do not add or remove significant information
4. Maintain appropriate tone (positive/negative/neutral)
5. Keep the message length similar (within 20% of original)

Original message:
"${originalMessage}"

Rewrite the message in the specified style:`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  if (response.content[0].type !== 'text' || !response.content[0].text.trim()) {
    throw new Error('AI transformation returned empty or invalid response');
  }

  return response.content[0].text.trim();
}