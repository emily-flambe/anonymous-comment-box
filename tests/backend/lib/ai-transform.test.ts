import { describe, it, expect, beforeEach, vi } from 'vitest';
import { transformMessage } from '../../../src/lib/ai-transform';
import type { Env } from '../../../src/types/env';

// Mock the AI Worker service
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AI Transform Service', () => {
  let mockEnv: Env;

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

    // Mock Math.random to ensure predictable persona selection
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Will select middle persona
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transformMessage', () => {
    it('should transform message successfully', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'This is a professionally transformed message.'
      })));

      const result = await transformMessage('Original message', mockEnv);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-ai-worker-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Original message'),
        })
      );

      expect(result).toBe('This is a professionally transformed message.');
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('API Error');
    });

    it('should handle empty API response', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: ''
      })));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('AI transformation returned empty or invalid response');
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        invalid: 'response'
      })));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('AI transformation returned empty or invalid response');
    });

    it('should use correct API parameters', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed message'
      })));

      await transformMessage('Test message', mockEnv);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-ai-worker-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should include random persona in prompt', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed message'
      })));

      await transformMessage('Test feedback', mockEnv);

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.body).toContain('Test feedback');
      expect(callArgs.body).toContain('Persona:');
      expect(callArgs.body).toContain('Style:');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(8000);
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed long message'
      })));

      const result = await transformMessage(longMessage, mockEnv);

      expect(result).toBe('Transformed long message');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(longMessage.substring(0, 100)),
        })
      );
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'Message with émojis 🎉 and spëcial chars: <>&"\'';
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed special message'
      })));

      const result = await transformMessage(specialMessage, mockEnv);

      expect(result).toBe('Transformed special message');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(specialMessage),
        })
      );
    });

    it('should trim whitespace from transformed messages', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: '  \n  Transformed message with whitespace  \n  '
      })));

      const result = await transformMessage('Test message', mockEnv);

      expect(result).toBe('Transformed message with whitespace');
    });

    it('should handle missing AI Worker API key', async () => {
      const envWithoutKey = {
        ...mockEnv,
        AI_WORKER_API_SECRET_KEY: '',
      };

      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Authentication required'
      }), { status: 401 }));

      await expect(transformMessage('Test message', envWithoutKey))
        .rejects.toThrow();
    });

    it('should use different personas randomly', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed message'
      })));

      // Test with different random values
      vi.spyOn(Math, 'random').mockReturnValueOnce(0.1); // First persona
      await transformMessage('Test message 1', mockEnv);
      const call1 = mockFetch.mock.calls[0][1];

      vi.spyOn(Math, 'random').mockReturnValueOnce(0.9); // Last persona
      await transformMessage('Test message 2', mockEnv);
      const call2 = mockFetch.mock.calls[1][1];

      // The prompts should be different due to different personas
      expect(call1.body).not.toBe(call2.body);
    });

    it('should handle rate limiting errors', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Rate limit exceeded'
      }), { status: 429 }));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Authentication failed'
      }), { status: 401 }));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Authentication failed');
    });

    it('should handle quota exceeded errors', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        error: 'Quota exceeded'
      }), { status: 402 }));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Quota exceeded');
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.name = 'TimeoutError';
      mockFetch.mockRejectedValue(timeoutError);

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow('Network timeout');
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValue(new Response('invalid json'));

      await expect(transformMessage('Test message', mockEnv))
        .rejects.toThrow();
    });
  });

  describe('Environment Configuration', () => {
    it('should use AI Worker API key from environment', async () => {
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed message'
      })));

      await transformMessage('Test message', mockEnv);

      // Verify AI Worker API was called with correct Authorization header
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/ai'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-ai-worker-key',
          }),
        })
      );
    });
  });
});