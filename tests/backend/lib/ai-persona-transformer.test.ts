import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersonaTransformer, AIPersonaTransformerError } from '../../../src/lib/ai-persona-transformer';
import type { Env } from '../../../src/types/env';

// Mock Anthropic SDK
const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}));

describe('PersonaTransformer', () => {
  let mockEnv: Env;
  let transformer: PersonaTransformer;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {} as any,
      ANTHROPIC_API_KEY: 'test-api-key',
      AI_WORKER_API_SECRET_KEY: 'test-ai-worker-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } as any,
    };

    transformer = new PersonaTransformer(mockEnv);
  });

  describe('Constructor', () => {
    it('should initialize with environment', () => {
      expect(transformer).toBeInstanceOf(PersonaTransformer);
    });

    it('should throw error with missing API key', () => {
      const envWithoutKey = {
        ...mockEnv,
        ANTHROPIC_API_KEY: '',
      };

      expect(() => new PersonaTransformer(envWithoutKey))
        .toThrow('Anthropic API key not configured');
    });
  });

  describe('transformMessage', () => {
    const mockSuccessResponse = {
      content: [{
        type: 'text',
        text: 'This is a professionally transformed message.',
      }],
      usage: {
        input_tokens: 50,
        output_tokens: 25,
      },
    };

    it('should transform message with predefined persona', async () => {
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      const result = await transformer.transformMessage(
        'Original harsh message',
        'professional',
        undefined
      );

      expect(result).toEqual({
        transformedMessage: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      });

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: expect.stringContaining('professional'),
        }],
      });
    });

    it('should transform message with custom persona', async () => {
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      const result = await transformer.transformMessage(
        'Original message',
        '',
        'Write like Shakespeare'
      );

      expect(result).toEqual({
        transformedMessage: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      });

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Write like Shakespeare');
    });

    it('should transform message with both persona and custom persona', async () => {
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      const result = await transformer.transformMessage(
        'Original message',
        'casual',
        'Add some humor'
      );

      expect(result).toEqual({
        transformedMessage: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      });

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('casual');
      expect(callArgs.messages[0].content).toContain('Add some humor');
    });

    it('should handle empty persona gracefully', async () => {
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      const result = await transformer.transformMessage(
        'Original message',
        '',
        ''
      );

      expect(result.transformedMessage).toBe('This is a professionally transformed message.');
    });

    it('should throw AIPersonaTransformerError for API errors', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('API Error'));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow(AIPersonaTransformerError);
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockAnthropic.messages.create.mockRejectedValue(rateLimitError);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      authError.name = 'AuthenticationError';
      mockAnthropic.messages.create.mockRejectedValue(authError);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('AI service authentication failed');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockAnthropic.messages.create.mockRejectedValue(quotaError);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('AI service quota exceeded');
    });

    it('should handle empty response content', async () => {
      const emptyResponse = {
        content: [],
        usage: {
          input_tokens: 50,
          output_tokens: 0,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(emptyResponse);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('No content received from AI service');
    });

    it('should handle non-text content', async () => {
      const nonTextResponse = {
        content: [{
          type: 'image',
          source: { type: 'base64', data: 'base64data' },
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(nonTextResponse);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('No text content received from AI service');
    });

    it('should concatenate multiple text blocks', async () => {
      const multiTextResponse = {
        content: [
          { type: 'text', text: 'First part' },
          { type: 'text', text: ' Second part' },
          { type: 'text', text: ' Third part' },
        ],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(multiTextResponse);

      const result = await transformer.transformMessage('Test', 'professional', undefined);

      expect(result.transformedMessage).toBe('First part Second part Third part');
    });

    it('should trim whitespace from result', async () => {
      const whitespaceResponse = {
        content: [{
          type: 'text',
          text: '  \n  Transformed message  \n  ',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(whitespaceResponse);

      const result = await transformer.transformMessage('Test', 'professional', undefined);

      expect(result.transformedMessage).toBe('Transformed message');
    });

    it('should handle malformed API response', async () => {
      const malformedResponse = {
        content: null,
        usage: null,
      };

      mockAnthropic.messages.create.mockResolvedValue(malformedResponse);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('Invalid response format from AI service');
    });

    it('should use correct model parameters', async () => {
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      await transformer.transformMessage('Test message', 'professional', undefined);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: expect.any(String),
        }],
      });
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockAnthropic.messages.create.mockRejectedValue(timeoutError);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('AI service request timed out');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(8000);
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      const result = await transformer.transformMessage(longMessage, 'professional', undefined);

      expect(result.transformedMessage).toBe('This is a professionally transformed message.');
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
        })
      );
    });

    it('should handle special characters', async () => {
      const specialMessage = 'Message with émojis 🎉 and spëcial chars: <>&"\'';
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      const result = await transformer.transformMessage(specialMessage, 'professional', undefined);

      expect(result.transformedMessage).toBe('This is a professionally transformed message.');
      const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(specialMessage);
    });

    it('should validate persona names', async () => {
      const validPersonas = [
        'professional', 'casual', 'enthusiastic', 'constructive',
        'appreciative', 'analytical', 'empathetic', 'direct'
      ];

      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      for (const persona of validPersonas) {
        await transformer.transformMessage('Test', persona, undefined);
        
        const callArgs = mockAnthropic.messages.create.mock.calls.pop()[0];
        expect(callArgs.messages[0].content).toContain(persona);
      }
    });

    it('should handle custom persona with special instructions', async () => {
      const customPersona = 'Respond as if you are a medieval knight, using "thou" and "ye"';
      mockAnthropic.messages.create.mockResolvedValue(mockSuccessResponse);

      await transformer.transformMessage('Test message', '', customPersona);

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(customPersona);
    });
  });

  describe('Error Types', () => {
    it('should create AIPersonaTransformerError correctly', () => {
      const error = new AIPersonaTransformerError('Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AIPersonaTransformerError);
      expect(error.name).toBe('AIPersonaTransformerError');
      expect(error.message).toBe('Test error message');
    });
  });
});