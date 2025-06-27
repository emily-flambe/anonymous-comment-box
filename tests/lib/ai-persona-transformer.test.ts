import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PersonaTransformer, PersonaTransformationError, PRESET_PERSONAS } from '../../src/lib/ai-persona-transformer';
import type { Env } from '../../src/types/env';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate
    }
  }));
  MockAnthropic.mockCreate = mockCreate;
  return { default: MockAnthropic };
});

describe('PersonaTransformer', () => {
  let transformer: PersonaTransformer;
  let mockEnv: Env;
  let mockAnthropic: any;

  beforeEach(() => {
    mockEnv = {
      ANTHROPIC_API_KEY: 'test-api-key',
      MESSAGE_QUEUE: {} as any,
      RATE_LIMITER: {} as any,
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test'
    };

    mockAnthropic = (Anthropic as any).mockCreate;
    transformer = new PersonaTransformer(mockEnv);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('transformMessage', () => {
    const sampleMessage = 'This is a test message for transformation.';

    it('should transform message with preset persona', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'yo this is a test msg for transformation lol'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const result = await transformer.transformMessage(sampleMessage, 'internet-random');

      expect(result.transformedMessage).toBe('yo this is a test msg for transformation lol');
      expect(result.originalMessage).toBe(sampleMessage);
      expect(result.persona).toBe('internet-random');
      expect(mockAnthropic).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.8,
        messages: [{
          role: 'user',
          content: expect.stringContaining('Transform the message to sound like casual internet slang')
        }]
      });
    });

    it('should transform message with custom persona', async () => {
      const customPersona = 'Write like a pirate';
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Arrr, this be a test message for transformation, matey!'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const result = await transformer.transformMessage(sampleMessage, undefined, customPersona);

      expect(result.transformedMessage).toBe('Arrr, this be a test message for transformation, matey!');
      expect(result.persona).toBe('custom');
      expect(result.customPersona).toBe(customPersona);
      expect(mockAnthropic).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: expect.stringContaining('Write like a pirate')
        }]
      });
    });

    it('should return original message when no persona specified', async () => {
      const result = await transformer.transformMessage(sampleMessage);

      expect(result.transformedMessage).toBe(sampleMessage);
      expect(result.originalMessage).toBe(sampleMessage);
      expect(result.persona).toBe('none');
      expect(mockAnthropic).not.toHaveBeenCalled();
    });

    it('should handle each preset persona correctly', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      for (const [personaKey, config] of Object.entries(PRESET_PERSONAS)) {
        await transformer.transformMessage(sampleMessage, personaKey);
        
        expect(mockAnthropic).toHaveBeenCalledWith({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          temperature: config.temperature,
          messages: [{
            role: 'user',
            content: expect.stringContaining(config.systemPrompt)
          }]
        });
      }
    });

    it('should throw error for empty message', async () => {
      await expect(transformer.transformMessage(''))
        .rejects.toThrow(PersonaTransformationError);
      
      await expect(transformer.transformMessage('   '))
        .rejects.toThrow('Message cannot be empty');
    });

    it('should throw error for message too long', async () => {
      const longMessage = 'a'.repeat(2001);
      
      await expect(transformer.transformMessage(longMessage, 'internet-random'))
        .rejects.toThrow('Message too long (max 2000 characters)');
    });

    it('should throw error for custom persona too long', async () => {
      const longCustomPersona = 'a'.repeat(501);
      
      await expect(transformer.transformMessage(sampleMessage, undefined, longCustomPersona))
        .rejects.toThrow('Custom persona too long (max 500 characters)');
    });

    it('should handle AI service errors with fallback', async () => {
      mockAnthropic.mockRejectedValue(new Error('API timeout'));

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow(PersonaTransformationError);

      try {
        await transformer.transformMessage(sampleMessage, 'internet-random');
      } catch (error) {
        expect(error).toBeInstanceOf(PersonaTransformationError);
        expect((error as PersonaTransformationError).fallbackUsed).toBe(true);
        expect((error as PersonaTransformationError).cause).toBeInstanceOf(Error);
      }
    });

    it('should handle empty AI response', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: ''
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow('AI transformation returned empty response');
    });

    it('should handle non-text AI response', async () => {
      const mockResponse = {
        content: [{
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: 'abc123' }
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow('AI transformation returned empty response');
    });

    it('should handle malformed AI response', async () => {
      const mockResponse = {
        content: []
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow();
    });

    it('should reject transformed message that is too long', async () => {
      const shortMessage = 'Short message';
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'a'.repeat(shortMessage.length * 3) // More than 2x original length
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      await expect(transformer.transformMessage(shortMessage, 'internet-random'))
        .rejects.toThrow('Transformed message too long');
    });

    it('should filter problematic content in input', async () => {
      const problematicMessage = 'This message contains hate speech';
      
      await expect(transformer.transformMessage(problematicMessage, 'internet-random'))
        .rejects.toThrow('Message contains inappropriate content');
    });

    it('should sanitize problematic content in transformation', async () => {
      const cleanMessage = 'This is a clean message';
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'This transformed message contains hate speech'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const result = await transformer.transformMessage(cleanMessage, 'internet-random');

      // Should return original message due to problematic transformation
      expect(result.transformedMessage).toBe(cleanMessage);
    });
  });

  describe('getPresetPersonas', () => {
    it('should return all preset personas with formatted names', () => {
      const personas = transformer.getPresetPersonas();

      expect(personas).toHaveLength(4);
      
      const internetRandom = personas.find(p => p.key === 'internet-random');
      expect(internetRandom).toBeDefined();
      expect(internetRandom?.name).toBe('Internet Random');
      expect(internetRandom?.description).toBe(PRESET_PERSONAS['internet-random'].systemPrompt);
      expect(internetRandom?.example).toBe(PRESET_PERSONAS['internet-random'].examples[0].output);

      const extremelySerious = personas.find(p => p.key === 'extremely-serious');
      expect(extremelySerious?.name).toBe('Extremely Serious');

      const superNice = personas.find(p => p.key === 'super-nice');
      expect(superNice?.name).toBe('Super Nice');

      const barelyLiterate = personas.find(p => p.key === 'barely-literate');
      expect(barelyLiterate?.name).toBe('Barely Literate');
    });

    it('should include all required fields', () => {
      const personas = transformer.getPresetPersonas();

      personas.forEach(persona => {
        expect(persona).toHaveProperty('key');
        expect(persona).toHaveProperty('name');
        expect(persona).toHaveProperty('description');
        expect(persona).toHaveProperty('example');
        expect(typeof persona.key).toBe('string');
        expect(typeof persona.name).toBe('string');
        expect(typeof persona.description).toBe('string');
        expect(typeof persona.example).toBe('string');
      });
    });
  });

  describe('content filtering', () => {
    it('should detect various problematic patterns', () => {
      const problematicMessages = [
        'This contains hate speech',
        'This is violence promotion',
        'This is harassment content',
        'This is spam content',
        'This is phishing attempt',
        'This is a scam message'
      ];

      for (const message of problematicMessages) {
        expect(() => transformer.transformMessage(message, 'internet-random'))
          .rejects.toThrow('Message contains inappropriate content');
      }
    });

    it('should allow clean content', async () => {
      const cleanMessages = [
        'This is a normal message',
        'I love this feature',
        'Great work on the project',
        'Thanks for the update'
      ];

      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Clean transformed message'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      for (const message of cleanMessages) {
        const result = await transformer.transformMessage(message, 'internet-random');
        expect(result.transformedMessage).toBe('Clean transformed message');
      }
    });
  });

  describe('error handling scenarios', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockAnthropic.mockRejectedValue(timeoutError);

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow(PersonaTransformationError);
    });

    it('should handle API rate limiting', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockAnthropic.mockRejectedValue(rateLimitError);

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow(PersonaTransformationError);
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';
      mockAnthropic.mockRejectedValue(authError);

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow(PersonaTransformationError);
    });

    it('should handle malformed JSON responses', async () => {
      mockAnthropic.mockRejectedValue(new SyntaxError('Unexpected token'));

      await expect(transformer.transformMessage(sampleMessage, 'internet-random'))
        .rejects.toThrow(PersonaTransformationError);
    });
  });

  describe('performance considerations', () => {
    it('should handle large valid messages efficiently', async () => {
      const largeMessage = 'a'.repeat(1900); // Just under 2000 limit
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'b'.repeat(1900)
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const startTime = Date.now();
      const result = await transformer.transformMessage(largeMessage, 'internet-random');
      const endTime = Date.now();

      expect(result.transformedMessage).toBe('b'.repeat(1900));
      // Should complete within reasonable time (this is a unit test, so no actual API call)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle concurrent transformation requests', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const messages = Array.from({ length: 5 }, (_, i) => `Message ${i + 1}`);
      const promises = messages.map(msg => 
        transformer.transformMessage(msg, 'internet-random')
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.originalMessage).toBe(`Message ${index + 1}`);
        expect(result.transformedMessage).toBe('Transformed message');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle Unicode characters', async () => {
      const unicodeMessage = 'Hello 👋 world 🌍 with émojis and ñ characters';
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'yo hello 👋 world 🌍 with emojis and ñ characters lol'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const result = await transformer.transformMessage(unicodeMessage, 'internet-random');

      expect(result.transformedMessage).toBe('yo hello 👋 world 🌍 with emojis and ñ characters lol');
    });

    it('should handle whitespace-only messages', async () => {
      const whitespaceMessage = '   \n\t  ';
      
      await expect(transformer.transformMessage(whitespaceMessage, 'internet-random'))
        .rejects.toThrow('Message cannot be empty');
    });

    it('should handle special characters in custom persona', async () => {
      const specialCharPersona = 'Write like a robot: beep-boop [ERROR] {{system}}';
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'BEEP-BOOP: This is a test message for transformation [PROCESSING]'
        }]
      };

      mockAnthropic.mockResolvedValue(mockResponse);

      const result = await transformer.transformMessage(sampleMessage, undefined, specialCharPersona);

      expect(result.transformedMessage).toBe('BEEP-BOOP: This is a test message for transformation [PROCESSING]');
      expect(result.customPersona).toBe(specialCharPersona);
    });
  });
});

describe('PersonaTransformationError', () => {
  it('should create error with correct properties', () => {
    const cause = new Error('Original error');
    const error = new PersonaTransformationError('Test error', cause, true);

    expect(error.name).toBe('PersonaTransformationError');
    expect(error.message).toBe('Test error');
    expect(error.cause).toBe(cause);
    expect(error.fallbackUsed).toBe(true);
  });

  it('should create error with default values', () => {
    const error = new PersonaTransformationError('Test error');

    expect(error.cause).toBeUndefined();
    expect(error.fallbackUsed).toBe(false);
  });
});

describe('PRESET_PERSONAS', () => {
  it('should have all required personas', () => {
    const requiredPersonas = ['internet-random', 'barely-literate', 'extremely-serious', 'super-nice'];
    
    requiredPersonas.forEach(persona => {
      expect(PRESET_PERSONAS).toHaveProperty(persona);
    });
  });

  it('should have valid configuration for each persona', () => {
    Object.entries(PRESET_PERSONAS).forEach(([key, config]) => {
      expect(config).toHaveProperty('systemPrompt');
      expect(config).toHaveProperty('examples');
      expect(config).toHaveProperty('temperature');
      
      expect(typeof config.systemPrompt).toBe('string');
      expect(config.systemPrompt.length).toBeGreaterThan(0);
      expect(Array.isArray(config.examples)).toBe(true);
      expect(config.examples.length).toBeGreaterThan(0);
      expect(typeof config.temperature).toBe('number');
      expect(config.temperature).toBeGreaterThanOrEqual(0);
      expect(config.temperature).toBeLessThanOrEqual(1);

      // Check example structure
      config.examples.forEach(example => {
        expect(example).toHaveProperty('input');
        expect(example).toHaveProperty('output');
        expect(typeof example.input).toBe('string');
        expect(typeof example.output).toBe('string');
      });
    });
  });
});