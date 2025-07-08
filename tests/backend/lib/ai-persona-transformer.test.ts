import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PersonaTransformer, AIPersonaTransformerError } from '../../../src/lib/ai-persona-transformer';
import type { Env } from '../../../src/types/env';

// Mock the AI Worker service
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PersonaTransformer', () => {
  let mockEnv: Env;
  let transformer: PersonaTransformer;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {} as any,
      AI_WORKER_API_SECRET_KEY: 'test-ai-worker-key',
      GMAIL_CLIENT_ID: 'test-client-id',
      GMAIL_CLIENT_SECRET: 'test-client-secret',
      GMAIL_REFRESH_TOKEN: 'test-refresh-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
      QUEUE_DELAY_SECONDS: undefined,
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } as any,
    };

    transformer = new PersonaTransformer(mockEnv);
  });

  describe('Constructor', () => {
    it('should initialize with environment', () => {
      expect(transformer).toBeInstanceOf(PersonaTransformer);
    });

    it('should throw error with missing AI Worker API key', () => {
      const envWithoutKey = {
        ...mockEnv,
        AI_WORKER_API_SECRET_KEY: '',
      };

      expect(() => new PersonaTransformer(envWithoutKey))
        .toThrow('AI Worker API secret key not configured');
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
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

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

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-ai-worker-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('professional'),
        })
      );
    });

    it('should transform message with custom persona', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

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

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toContain('Write like Shakespeare');
    });

    it('should transform message with both persona and custom persona', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

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

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toContain('casual');
      expect(callArgs.body).toContain('Add some humor');
    });

    it('should handle empty persona gracefully', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      const result = await transformer.transformMessage(
        'Original message',
        '',
        ''
      );

      expect(result.transformedMessage).toBe('This is a professionally transformed message.');
    });

    it('should throw AIPersonaTransformerError for API errors', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow(AIPersonaTransformerError);
    });

    it('should handle rate limiting errors', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Rate limit exceeded'
      }), { status: 429 }));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Authentication failed'
      }), { status: 401 }));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('AI service authentication failed');
    });

    it('should handle quota exceeded errors', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Quota exceeded'
      }), { status:402 }));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('AI service quota exceeded');
    });

    it('should handle empty response content', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: '',
        usage: {
          inputTokens: 50,
          outputTokens: 0,
        },
      })));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('No content received from AI service');
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        invalid: 'response'
      })));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('Invalid response format from AI service');
    });

    it('should handle successful transformation', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'First part Second part Third part',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      const result = await transformer.transformMessage('Test', 'professional', undefined);

      expect(result.transformedMessage).toBe('First part Second part Third part');
    });

    it('should trim whitespace from result', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: '  \n  Transformed message  \n  ',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      const result = await transformer.transformMessage('Test', 'professional', undefined);

      expect(result.transformedMessage).toBe('Transformed message');
    });

    it('should handle malformed API response', async () => {
      mockFetch.mockResolvedValue(new Response('invalid json'));

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('Invalid response format from AI service');
    });

    it('should use correct API parameters', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      await transformer.transformMessage('Test message', 'professional', undefined);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-ai-worker-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test message'),
        })
      );
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValue(timeoutError);

      await expect(transformer.transformMessage('Test', 'professional', undefined))
        .rejects.toThrow('AI service request timed out');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(8000);
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      const result = await transformer.transformMessage(longMessage, 'professional', undefined);

      expect(result.transformedMessage).toBe('This is a professionally transformed message.');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(longMessage.substring(0, 100)),
        })
      );
    });

    it('should handle special characters', async () => {
      const specialMessage = 'Message with émojis 🎉 and spëcial chars: <>&"\'';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      const result = await transformer.transformMessage(specialMessage, 'professional', undefined);

      expect(result.transformedMessage).toBe('This is a professionally transformed message.');
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toContain(specialMessage);
    });

    it('should validate persona names', async () => {
      const validPersonas = [
        'professional', 'casual', 'enthusiastic', 'constructive',
        'appreciative', 'analytical', 'empathetic', 'direct'
      ];

      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      for (const persona of validPersonas) {
        await transformer.transformMessage('Test', persona, undefined);
        
        const callArgs = mockFetch.mock.calls.pop()[1];
        expect(callArgs.body).toContain(persona);
      }
    });

    it('should handle custom persona with special instructions', async () => {
      const customPersona = 'Respond as if you are a medieval knight, using "thou" and "ye"';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.',
        usage: {
          inputTokens: 50,
          outputTokens: 25,
        },
      })));

      await transformer.transformMessage('Test message', '', customPersona);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toContain(customPersona);
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