import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../../../src/index';
import type { Env } from '../../../src/types/env';

// Mock external services
const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
};

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}));

global.fetch = vi.fn();

describe('Full Application Flow Integration Tests', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockKvStore: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockKvStore = {};
    
    mockEnv = {
      MESSAGE_QUEUE: {
        get: vi.fn((key) => Promise.resolve(mockKvStore[key] || null)),
        getWithMetadata: vi.fn((key) => Promise.resolve({
          value: mockKvStore[key] || null,
          metadata: mockKvStore[`${key}_metadata`] || null,
        })),
        put: vi.fn((key, value, options) => {
          mockKvStore[key] = value;
          if (options?.metadata) {
            mockKvStore[`${key}_metadata`] = options.metadata;
          }
          return Promise.resolve();
        }),
        delete: vi.fn((key) => {
          delete mockKvStore[key];
          delete mockKvStore[`${key}_metadata`];
          return Promise.resolve();
        }),
        list: vi.fn(),
      } as any,
      ANTHROPIC_API_KEY: 'test-api-key',
      GMAIL_ACCESS_TOKEN: 'test-gmail-token',
      RECIPIENT_EMAIL: 'recipient@example.com',
      ENVIRONMENT: 'test',
      RATE_LIMITER: {} as any,
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;

    // Mock successful AI transformation
    mockAnthropic.messages.create.mockResolvedValue({
      content: [{
        type: 'text',
        text: 'This is a professionally transformed message.',
      }],
      usage: {
        input_tokens: 50,
        output_tokens: 25,
      },
    });

    // Mock successful Gmail API
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      id: 'message-id-123',
      threadId: 'thread-id-456',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  describe('Complete Message Submission Flow', () => {
    it('should handle complete submission flow with persona transformation', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session-123',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({
          message: 'This app is terrible and confusing!',
          persona: 'constructive',
        }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      // Should succeed
      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data).toEqual({
        success: true,
        rateLimitRemaining: 9,
        rateLimitReset: expect.any(Number),
      });

      // Should have called AI transformation
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: expect.stringContaining('constructive'),
        }],
      });

      // Should have attempted to send email
      expect(global.fetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-gmail-token',
            'Content-Type': 'application/json',
          },
        })
      );

      // Should have updated rate limit
      expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalledWith(
        'rate_limit:192.168.1.1:test-session-123',
        '1',
        expect.objectContaining({
          expirationTtl: 60,
          metadata: expect.objectContaining({
            resetTime: expect.any(Number),
          }),
        })
      );
    });

    it('should handle complete submission flow without persona', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session-456',
          'CF-Connecting-IP': '10.0.0.1',
        },
        body: JSON.stringify({
          message: 'Great feedback system!',
        }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      
      // Should use legacy transformation
      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        temperature: 0,
        messages: [{
          role: 'user',
          content: expect.stringContaining('Great feedback system!'),
        }],
      });
    });

    it('should handle rate limiting across multiple requests', async () => {
      // Set up rate limit at 9/10
      mockKvStore['rate_limit:192.168.1.1:session'] = '9';
      mockKvStore['rate_limit:192.168.1.1:session_metadata'] = {
        resetTime: Date.now() + 60000,
      };

      // First request should succeed
      const request1 = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'session',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({ message: 'First message' }),
      });

      const response1 = await worker.fetch(request1, mockEnv, mockCtx);
      expect(response1.status).toBe(200);
      
      const data1 = await response1.json() as any;
      expect(data1.rateLimitRemaining).toBe(0);

      // Second request should be rate limited
      const request2 = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'session',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({ message: 'Second message' }),
      });

      const response2 = await worker.fetch(request2, mockEnv, mockCtx);
      expect(response2.status).toBe(429);
      
      const data2 = await response2.json() as any;
      expect(data2.error).toBe('Too many requests. Please try again later.');
      expect(data2.rateLimitRemaining).toBe(0);
    });

    it('should handle preview flow with persona', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'This feature needs improvement',
          persona: 'professional',
        }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data).toEqual({
        success: true,
        preview: 'This is a professionally transformed message.',
      });

      // Should not have sent email for preview
      expect(global.fetch).not.toHaveBeenCalled();
      
      // Should not have updated rate limit for preview
      expect(mockEnv.MESSAGE_QUEUE.put).not.toHaveBeenCalled();
    });

    it('should handle rate limit status check', async () => {
      // Set up existing rate limit
      mockKvStore['rate_limit:192.168.1.1:session'] = '3';
      mockKvStore['rate_limit:192.168.1.1:session_metadata'] = {
        resetTime: Date.now() + 30000,
      };

      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data).toEqual({
        success: true,
        rateLimitRemaining: 7,
        rateLimitReset: expect.any(Number),
        rateLimitLimit: 10,
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle AI service failure gracefully', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('AI service down'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session',
        },
        body: JSON.stringify({
          message: 'Test message',
          persona: 'professional',
        }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      
      const data = await response.json() as any;
      expect(data.error).toBe('AI transformation service unavailable');
    });

    it('should handle Gmail API failure gracefully', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
        error: {
          code: 500,
          message: 'Internal server error',
        },
      }), { status: 500 }));

      const request = new Request('http://localhost/api/test-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      // Should still return success for the API call, but email failure is logged
      expect(response.status).toBe(500);
      
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });

    it('should handle KV store failure gracefully', async () => {
      (mockEnv.MESSAGE_QUEUE.get as any).mockRejectedValue(new Error('KV store unavailable'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });
  });

  describe('CORS and Headers', () => {
    it('should add CORS headers to all API responses', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://example.com',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-Session-ID');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
    });
  });

  describe('Health Check', () => {
    it('should respond to health check', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      
      const data = await response.json() as any;
      expect(data).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Static Assets', () => {
    it('should serve static assets when no API route matches', async () => {
      const request = new Request('http://localhost/unknown-path', {
        method: 'GET',
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('text/html');
    });
  });

  describe('Environment Configuration', () => {
    it('should handle missing environment variables', async () => {
      const envMissingKey = {
        ...mockEnv,
        ANTHROPIC_API_KEY: '',
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envMissingKey, mockCtx);

      expect(response.status).toBe(500);
    });
  });
});