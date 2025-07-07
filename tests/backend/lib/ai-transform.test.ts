import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformMessage } from '../../../src/lib/ai-transform';
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

describe('AI Transform Service', () => {
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {} as any,
      ANTHROPIC_API_KEY: 'test-api-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
      RATE_LIMITER: {} as any,
    };

    // Mock Math.random to ensure predictable persona selection
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Will select middle persona
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transformMessage', () => {
    it('should transform message successfully', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'This is a professionally transformed message.',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await transformMessage('Original message', mockEnv);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: expect.stringContaining('Original message'),
        }],
      });

      expect(result).toBe('This is a professionally transformed message.');
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('API Error'));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('API Error');
    });

    it('should handle empty API response', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: '',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 0,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('AI transformation returned empty or invalid response');
    });

    it('should handle non-text content', async () => {
      const mockResponse = {
        content: [{
          type: 'image',
          source: { type: 'base64', data: 'base64data' },
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('AI transformation returned empty or invalid response');
    });

    it('should use correct model parameters', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await transformMessage('Test message', mockEnv);

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: expect.any(String),
        }],
      });
    });

    it('should include random persona in prompt', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await transformMessage('Test feedback', mockEnv);

      const callArgs = mockAnthropic.messages.create.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('Test feedback');
      expect(callArgs.messages[0].content).toContain('Persona:');
      expect(callArgs.messages[0].content).toContain('Style:');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(8000);
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed long message',
        }],
        usage: {
          input_tokens: 2000,
          output_tokens: 100,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await transformMessage(longMessage, mockEnv);

      expect(result).toBe('Transformed long message');
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 1000,
        })
      );
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Message with émojis 🎉 and spëcial chars: <>&"\'';
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed special message',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await transformMessage(specialMessage, mockEnv);

      expect(result).toBe('Transformed special message');
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{
            role: 'user',
            content: expect.stringContaining(specialMessage),
          }],
        })
      );
    });

    it('should trim whitespace from transformed messages', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: '  \n  Transformed message with whitespace  \n  ',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await transformMessage('Test message', mockEnv);

      expect(result).toBe('Transformed message with whitespace');
    });

    it('should handle missing API key', async () => {
      const envWithoutKey = {
        ...mockEnv,
        ANTHROPIC_API_KEY: '',
      };

      // This should work but will likely fail at the API call
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      const result = await transformMessage('Test message', envWithoutKey);
      expect(result).toBe('Transformed message');
    });

    it('should use different personas randomly', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      // Test with different random values
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.1); // First persona
      await transformMessage('Test message 1', mockEnv);
      const call1 = mockAnthropic.messages.create.mock.calls[0][0];

      vi.spyOn(Math, 'random').mockReturnValueOnce(0.9); // Last persona
      await transformMessage('Test message 2', mockEnv);
      const call2 = mockAnthropic.messages.create.mock.calls[1][0];

      // The prompts should be different due to different personas
      expect(call1.messages[0].content).not.toBe(call2.messages[0].content);
    });

    it('should handle rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      mockAnthropic.messages.create.mockRejectedValue(rateLimitError);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      authError.name = 'AuthenticationError';
      mockAnthropic.messages.create.mockRejectedValue(authError);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Authentication failed');
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockAnthropic.messages.create.mockRejectedValue(quotaError);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Quota exceeded');
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockAnthropic.messages.create.mockRejectedValue(timeoutError);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Network timeout');
    });

    it('should handle malformed API responses', async () => {
      const malformedResponse = {
        content: null,
        usage: null,
      };

      mockAnthropic.messages.create.mockResolvedValue(malformedResponse);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow();
    });
  });

  describe('Environment Configuration', () => {
    it('should use API key from environment', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Transformed message',
        }],
        usage: {
          input_tokens: 50,
          output_tokens: 25,
        },
      };

      mockAnthropic.messages.create.mockResolvedValue(mockResponse);

      await transformMessage('Test message', mockEnv);

      // Verify Anthropic was initialized with the correct API key
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
      });
    });
  });
});