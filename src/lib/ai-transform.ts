import { Env } from '../types/env';
import Anthropic from '@anthropic-ai/sdk';

// AI personas for message transformation (PRD-specified personas)
const PRESET_PERSONAS: Record<string, {
  name: string;
  style: string;
  temperature: number;
  examples: Array<{ input: string; output: string }>;
}> = {
  'internet-random': {
    name: 'Internet Random',
    style: 'Transform the message to sound like casual internet slang with abbreviations, mild typos, and meme references. Keep the core message intact.',
    temperature: 0.8,
    examples: [
      {
        input: 'I think this is a great idea and we should implement it.',
        output: 'ngl this idea slaps 💯 we should def implement this fr fr'
      }
    ]
  },
  'barely-literate': {
    name: 'Barely Literate',
    style: 'Rewrite with poor grammar, simple vocabulary, and informal structure while preserving the original meaning.',
    temperature: 0.7,
    examples: [
      {
        input: 'I disagree with this decision because it seems poorly thought out.',
        output: 'i dont like this thing cuz it dont make sense to me and stuff'
      }
    ]
  },
  'extremely-serious': {
    name: 'Extremely Serious',
    style: 'Transform to formal, academic language with professional vocabulary and structure.',
    temperature: 0.3,
    examples: [
      {
        input: 'This is really bad and needs to be fixed.',
        output: 'This matter requires immediate attention and systematic remediation to address the identified deficiencies.'
      }
    ]
  },
  'super-nice': {
    name: 'Super Nice',
    style: 'Rewrite with overly polite, encouraging, and positive language while maintaining the core message.',
    temperature: 0.6,
    examples: [
      {
        input: 'This feature is broken and frustrating.',
        output: 'I hope this feedback is helpful! The feature might benefit from some adjustments as it seems to present challenges for users. Thank you for considering improvements! 😊'
      }
    ]
  }
};

// Legacy random personas for backward compatibility
const legacyPersonas = [
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

// New function for persona-based transformations
export async function transformMessageWithPersona(
  originalMessage: string, 
  persona?: string | null,
  customPersona?: string | null,
  env?: Env
): Promise<string> {
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: env?.ANTHROPIC_API_KEY || '',
  });

  let systemPrompt: string;
  let temperature: number;

  if (customPersona) {
    // Use custom persona description
    systemPrompt = customPersona;
    temperature = 0.7;
  } else if (persona && PRESET_PERSONAS[persona]) {
    // Use preset persona
    const presetPersona = PRESET_PERSONAS[persona];
    systemPrompt = presetPersona.style;
    temperature = presetPersona.temperature;
  } else {
    // No transformation - return original message
    return originalMessage;
  }

  const prompt = `You are a message transformation assistant. Your task is to rewrite the following message according to the specified style while preserving anonymity and maintaining the core meaning and intent.

Transformation Instructions: ${systemPrompt}

Important rules:
1. Preserve the core message and intent completely
2. Change the writing style according to the instructions
3. Do not add or remove significant information
4. Maintain the appropriate emotional tone (positive/negative/neutral)
5. Keep the message length reasonably similar
6. Ensure the transformed message sounds natural and authentic

Original message:
"${originalMessage}"

Rewrite the message according to the transformation instructions:`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 1000,
    temperature: temperature,
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

// Legacy function for backward compatibility (random persona selection)
export async function transformMessage(originalMessage: string, env: Env): Promise<string> {
  // Select random legacy persona for backward compatibility
  const persona = legacyPersonas[Math.floor(Math.random() * legacyPersonas.length)];
  
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