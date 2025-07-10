import { Env } from '../types/env';
import { createAIClient, AIClientError } from './ai-client';

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
  // Initialize AI client
  const aiClient = createAIClient(env || {} as Env);

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

  const systemMessage = `Transform messages according to specified style instructions. Output only the transformed message with no additional text, explanations, or commentary.

Rules:
1. Preserve core message and intent completely
2. Apply the specified style transformation
3. Do not add or remove significant information
4. Maintain appropriate emotional tone
5. Keep message length reasonably similar
6. Ensure natural and authentic result

Style: ${systemPrompt}`;

  const userMessage = `Transform: ${originalMessage}`;

  try {
    const response = await aiClient.chatCompletion({
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 1000,
      temperature: temperature,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('AI transformation returned no choices');
    }

    const transformedMessage = response.choices[0].message.content;
    if (!transformedMessage || !transformedMessage.trim()) {
      throw new Error('AI transformation returned empty or invalid response');
    }

    return transformedMessage.trim();
  } catch (error) {
    if (error instanceof AIClientError) {
      // Re-throw AIClientError with more context
      throw new Error(`AI transformation failed: ${error.message}`);
    }
    throw error;
  }
}

// Legacy function for backward compatibility (random persona selection)
export async function transformMessage(originalMessage: string, env: Env): Promise<string> {
  // Select random legacy persona for backward compatibility
  const persona = legacyPersonas[Math.floor(Math.random() * legacyPersonas.length)];
  
  // Initialize AI client
  const aiClient = createAIClient(env);

  const systemMessage = `Transform messages according to persona style. Output only the transformed message with no additional text, explanations, or commentary.

Persona: ${persona.name}
Style: ${persona.style}

Rules:
1. Preserve core message and intent
2. Apply persona style completely
3. Do not add or remove significant information
4. Maintain appropriate tone
5. Keep message length similar`;

  const userMessage = `Transform: ${originalMessage}`;

  try {
    const response = await aiClient.chatCompletion({
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error('AI transformation returned no choices');
    }

    const transformedMessage = response.choices[0].message.content;
    if (!transformedMessage || !transformedMessage.trim()) {
      throw new Error('AI transformation returned empty or invalid response');
    }

    return transformedMessage.trim();
  } catch (error) {
    if (error instanceof AIClientError) {
      // Re-throw AIClientError with more context
      throw new Error(`AI transformation failed: ${error.message}`);
    }
    throw error;
  }
}