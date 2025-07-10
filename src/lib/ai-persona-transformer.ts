import { Env } from '../types/env';
import { ValidationLimits } from '../types/api';
import { createAIClient, AIClient, AIClientError } from './ai-client';
import { truncateToWords, exceedsWordLimit } from './text-utils';

export interface PersonaConfig {
  systemPrompt: string;
  examples: Array<{input: string; output: string}>;
  temperature: number;
}

export interface TransformationResult {
  transformedMessage: string;
  originalMessage: string;
  persona: string;
  fallbackUsed?: boolean;
  error?: string;
}

// Preset personas as specified in the PRD
export const PRESET_PERSONAS: Record<string, PersonaConfig> = {
  'internet-random': {
    systemPrompt: 'Transform to casual internet slang with abbreviations, mild typos, and meme references. Output only the transformed message with no additional text or commentary.',
    temperature: 0.8,
    examples: [
      {
        input: 'I think this is a great idea and we should implement it.',
        output: 'ngl this idea slaps 💯 we should def implement this fr fr'
      },
      {
        input: 'This feature is broken and needs to be fixed.',
        output: 'yo this feature is busted rn, needs fixing asap ngl'
      }
    ]
  },
  'barely-literate': {
    systemPrompt: 'Transform to poor grammar, simple vocabulary, and informal structure. Use run-on sentences, missing punctuation, and basic words. Output only the transformed message with no additional text or commentary.',
    temperature: 0.7,
    examples: [
      {
        input: 'I disagree with this decision because it seems poorly thought out.',
        output: 'i dont like this thing cuz it dont make sense to me and stuff'
      },
      {
        input: 'The application performance is significantly degraded.',
        output: 'the app is really slow and not working good at all'
      }
    ]
  },
  'extremely-serious': {
    systemPrompt: 'Transform to formal, academic language with professional vocabulary and structure. Use complex sentence structures, formal tone, and precise terminology. Output only the transformed message with no additional text or commentary.',
    temperature: 0.3,
    examples: [
      {
        input: 'This is really bad and needs to be fixed.',
        output: 'This matter requires immediate attention and systematic remediation to address the identified deficiencies.'
      },
      {
        input: 'I like this idea a lot.',
        output: 'I find this proposal to be exceptionally meritorious and worthy of serious consideration for implementation.'
      }
    ]
  },
  'super-nice': {
    systemPrompt: 'Transform to overly polite, encouraging, and positive language. Add pleasantries, expressions of gratitude, and positive framing. Output only the transformed message with no additional text or commentary.',
    temperature: 0.6,
    examples: [
      {
        input: 'This feature is broken and frustrating.',
        output: 'I hope this feedback is helpful! The feature might benefit from some adjustments as it seems to present challenges for users. Thank you for considering improvements! 😊'
      },
      {
        input: 'I disagree with this approach.',
        output: 'Thank you for sharing this approach! I was wondering if we might consider some alternative perspectives that could be equally valuable. I really appreciate the opportunity to discuss this! 💕'
      }
    ]
  }
};

export class AIPersonaTransformerError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'AIPersonaTransformerError';
  }
}

export class PersonaTransformer {
  private aiClient: AIClient;

  constructor(env: Env) {
    if (!env.AI_WORKER_API_SECRET_KEY) {
      throw new AIPersonaTransformerError('AI_WORKER_API_SECRET_KEY not configured. In development, create a .dev.vars file with your API key.');
    }
    
    this.aiClient = createAIClient(env);
  }

  /**
   * Transform message with selected persona
   */
  async transformMessage(
    message: string,
    persona: string,
    customPersona?: string
  ): Promise<TransformationResult> {
    try {
      // Validate input
      if (!message || typeof message !== 'string') {
        throw new AIPersonaTransformerError('Invalid message provided');
      }

      if (exceedsWordLimit(message, ValidationLimits.MESSAGE_MAX_WORDS)) {
        throw new AIPersonaTransformerError(`Message too long (max ${ValidationLimits.MESSAGE_MAX_WORDS} words)`);
      }

      // Apply content filtering
      if (this.containsProblematicContent(message)) {
        throw new AIPersonaTransformerError('Message contains inappropriate content');
      }

      // If no persona is specified, return original message
      if (!persona && !customPersona) {
        return {
          transformedMessage: message,
          originalMessage: message,
          persona: 'none'
        };
      }

      const transformedMessage = await this.performTransformation(message, persona, customPersona);
      
      // Validate and sanitize transformation result
      const sanitizedResult = this.sanitizeTransformation(message, transformedMessage);

      return {
        transformedMessage: sanitizedResult,
        originalMessage: message,
        persona: customPersona ? 'custom' : persona
      };

    } catch (error) {
      if (error instanceof AIPersonaTransformerError) {
        throw error;
      }

      // Handle AI service errors with fallback
      console.error('AI transformation failed:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      return {
        transformedMessage: message,
        originalMessage: message,
        persona: customPersona ? 'custom' : persona,
        fallbackUsed: true,
        error: 'AI transformation temporarily unavailable'
      };
    }
  }

  /**
   * Perform the actual AI transformation
   */
  private async performTransformation(
    message: string,
    persona: string,
    customPersona?: string
  ): Promise<string> {
    let systemPrompt: string;
    let temperature: number;

    if (customPersona) {
      systemPrompt = this.buildCustomPersonaPrompt(customPersona);
      temperature = 0.7;
    } else if (PRESET_PERSONAS[persona]) {
      systemPrompt = PRESET_PERSONAS[persona].systemPrompt;
      temperature = PRESET_PERSONAS[persona].temperature;
    } else {
      throw new AIPersonaTransformerError(`Unknown persona: ${persona}`);
    }

    try {
      const transformedMessage = await this.aiClient.complete(message, {
        systemPrompt,
        temperature,
        max_tokens: 500,
        model: '@cf/meta/llama-3.1-8b-instruct'
      });

      if (!transformedMessage || !transformedMessage.trim()) {
        throw new AIPersonaTransformerError('AI service returned empty response');
      }

      return transformedMessage.trim();
    } catch (error) {
      if (error instanceof AIClientError) {
        throw new AIPersonaTransformerError(`AI transformation failed: ${error.message}`, error);
      }
      throw error;
    }
  }

  /**
   * Build system prompt for custom persona
   */
  private buildCustomPersonaPrompt(customPersona: string): string {
    // Validate custom persona input
    if (customPersona.length > 500) {
      throw new AIPersonaTransformerError('Custom persona description too long (max 500 characters)');
    }

    if (this.containsProblematicContent(customPersona)) {
      throw new AIPersonaTransformerError('Custom persona contains inappropriate content');
    }

    return `Transform messages using this persona: "${customPersona}". Output only the transformed message with no additional text, explanations, or commentary.

Rules:
1. Preserve core message and intent
2. Apply persona style consistently
3. Do not add or remove significant information
4. Maintain appropriate tone
5. Keep message length reasonable`;
  }

  /**
   * Check for problematic content (basic implementation)
   */
  private containsProblematicContent(text: string): boolean {
    const problematicPatterns = [
      /\b(hate|kill|die|murder)\b/i,
      /\b(nazi|hitler|genocide)\b/i,
      /\b(bomb|explosion|terrorist)\b/i,
      // Add more patterns as needed
    ];

    return problematicPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Sanitize transformation result
   */
  private sanitizeTransformation(original: string, transformed: string): string {
    // If transformation is problematic, return original
    if (this.containsProblematicContent(transformed)) {
      console.warn('Transformation contained problematic content, returning original');
      return original;
    }

    // Ensure transformation isn't too long
    if (exceedsWordLimit(transformed, ValidationLimits.MESSAGE_MAX_WORDS)) {
      console.warn(`Transformation exceeds ${ValidationLimits.MESSAGE_MAX_WORDS} words, truncating`);
      return truncateToWords(transformed, ValidationLimits.MESSAGE_MAX_WORDS);
    }

    return transformed;
  }

  /**
   * Get available preset personas
   */
  static getPresetPersonas(): Array<{key: string; name: string; description: string}> {
    return [
      {
        key: 'internet-random',
        name: 'Internet Random',
        description: 'Casual internet slang with abbreviations, mild typos, and meme references'
      },
      {
        key: 'barely-literate',
        name: 'Barely Literate',
        description: 'Poor grammar, simple vocabulary, and informal structure'
      },
      {
        key: 'extremely-serious',
        name: 'Extremely Serious',
        description: 'Formal, academic language with professional vocabulary'
      },
      {
        key: 'super-nice',
        name: 'Super Nice',
        description: 'Overly polite, encouraging, and positive language'
      }
    ];
  }
}