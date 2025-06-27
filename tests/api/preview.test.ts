import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handlePreview } from '../../src/api/preview';
import type { Env } from '../../src/types/env';

// Mock the dependencies
vi.mock('../../src/lib/ai-persona-transformer', () => ({
  PersonaTransformer: vi.fn().mockImplementation(() => ({
    transformMessage: vi.fn()
  }))
}));

vi.mock('../../src/lib/rate-limiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    generateKey: vi.fn(),
    checkLimit: vi.fn()
  }))
}));

describe('Preview API Handler', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockTransformer: any;
  let mockRateLimiter: any;

  beforeEach(() => {
    mockEnv = {
      MESSAGE_QUEUE: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        getWithMetadata: vi.fn(),
      } as any,
      RATE_LIMITER: {},
      ANTHROPIC_API_KEY: 'test-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      props: {} as any,
    } as ExecutionContext;

    // Reset mocks
    const { PersonaTransformer } = require('../../src/lib/ai-persona-transformer');
    const { RateLimiter } = require('../../src/lib/rate-limiter');
    
    mockTransformer = new PersonaTransformer();
    mockRateLimiter = new RateLimiter();
    
    mockRateLimiter.generateKey.mockReturnValue('rate_limit:test:session');
    mockRateLimiter.checkLimit.mockResolvedValue({
      remaining: 9,
      reset: Date.now() + 60000,
      allowed: true
    });

    mockTransformer.transformMessage.mockResolvedValue({
      transformedMessage: 'yo this is a test msg',
      originalMessage: 'This is a test message',
      persona: 'internet-random'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('successful preview requests', () => {
    it('should handle basic preview request', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test message',
          persona: 'internet-random',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        transformedMessage: 'yo this is a test msg',
        originalMessage: 'This is a test message',
        persona: 'internet-random',
        rateLimitRemaining: 9,
        rateLimitReset: expect.any(Number)
      });

      expect(mockTransformer.transformMessage).toHaveBeenCalledWith(
        'This is a test message',
        'internet-random',
        undefined
      );
    });

    it('should handle custom persona request', async () => {
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'Arrr, this be a test message, matey!',
        originalMessage: 'This is a test message',
        persona: 'custom',
        customPersona: 'Write like a pirate'
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test message',
          customPersona: 'Write like a pirate',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transformedMessage).toBe('Arrr, this be a test message, matey!');
      expect(data.persona).toBe('custom');

      expect(mockTransformer.transformMessage).toHaveBeenCalledWith(
        'This is a test message',
        undefined,
        'Write like a pirate'
      );
    });

    it('should handle request with both preset and custom persona (custom should win)', async () => {
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'Robot says: This is a test message',
        originalMessage: 'This is a test message',
        persona: 'custom',
        customPersona: 'Write like a robot'
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test message',
          persona: 'internet-random',
          customPersona: 'Write like a robot',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockTransformer.transformMessage).toHaveBeenCalledWith(
        'This is a test message',
        'internet-random',
        'Write like a robot'
      );
    });

    it('should handle request with no persona (no transformation)', async () => {
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'This is a test message',
        originalMessage: 'This is a test message',
        persona: 'none'
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This is a test message',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transformedMessage).toBe('This is a test message');
      expect(data.persona).toBe('none');
    });
  });

  describe('input validation', () => {
    it('should reject request without message', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });

    it('should reject request without session ID', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });

    it('should reject empty message', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '   ',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message cannot be empty');
    });

    it('should reject message over 2000 characters', async () => {
      const longMessage = 'a'.repeat(2001);
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: longMessage,
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message too long (max 2000 characters)');
    });

    it('should reject custom persona over 500 characters', async () => {
      const longCustomPersona = 'a'.repeat(501);
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          customPersona: longCustomPersona,
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Custom persona too long (max 500 characters)');
    });

    it('should handle malformed JSON', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process preview request');
    });

    it('should handle non-string message', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 123,
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });

    it('should handle non-string session ID', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          sessionId: 123
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Session ID is required');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      (rateLimitError as any).resetTime = Date.now() + 30000;
      
      mockRateLimiter.checkLimit.mockRejectedValue(rateLimitError);

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Rate limit exceeded. Please try again later.');
      expect(data.retryAfter).toBeDefined();
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('should include rate limit information in successful responses', async () => {
      mockRateLimiter.checkLimit.mockResolvedValue({
        remaining: 5,
        reset: Date.now() + 45000,
        allowed: true
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.rateLimitRemaining).toBe(5);
      expect(data.rateLimitReset).toBeDefined();
    });

    it('should generate correct rate limit key', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
          'X-Session-ID': 'test-session'
        },
        body: JSON.stringify({
          message: 'Test message',
          sessionId: 'test-session'
        }),
      });

      await handlePreview(request, mockEnv, mockCtx);

      expect(mockRateLimiter.generateKey).toHaveBeenCalledWith(request);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith(
        mockEnv.MESSAGE_QUEUE,
        'rate_limit:test:session'
      );
    });
  });

  describe('transformation error handling', () => {
    it('should handle persona transformation errors', async () => {
      const transformError = new Error('AI service unavailable');
      transformError.name = 'PersonaTransformationError';
      mockTransformer.transformMessage.mockRejectedValue(transformError);

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          persona: 'internet-random',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Message transformation failed');
      expect(data.details).toBe('AI service unavailable');
    });

    it('should handle unexpected transformation errors', async () => {
      mockTransformer.transformMessage.mockRejectedValue(new Error('Unexpected error'));

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          persona: 'internet-random',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process preview request');
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle Unicode characters in message', async () => {
      const unicodeMessage = 'Hello 👋 world 🌍 with émojis';
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'yo hello 👋 world 🌍 with emojis lol',
        originalMessage: unicodeMessage,
        persona: 'internet-random'
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: unicodeMessage,
          persona: 'internet-random',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transformedMessage).toBe('yo hello 👋 world 🌍 with emojis lol');
    });

    it('should handle maximum length messages', async () => {
      const maxMessage = 'a'.repeat(2000);
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'b'.repeat(2000),
        originalMessage: maxMessage,
        persona: 'internet-random'
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: maxMessage,
          persona: 'internet-random',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformer.transformMessage).toHaveBeenCalledWith(
        maxMessage,
        'internet-random',
        undefined
      );
    });

    it('should handle maximum length custom persona', async () => {
      const maxCustomPersona = 'a'.repeat(500);
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'Transformed message',
        originalMessage: 'Test message',
        persona: 'custom',
        customPersona: maxCustomPersona
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          customPersona: maxCustomPersona,
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformer.transformMessage).toHaveBeenCalledWith(
        'Test message',
        undefined,
        maxCustomPersona
      );
    });

    it('should trim whitespace from message', async () => {
      const messageWithWhitespace = '  \n  Test message  \t  ';
      mockTransformer.transformMessage.mockResolvedValue({
        transformedMessage: 'test msg yo',
        originalMessage: 'Test message',
        persona: 'internet-random'
      });

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageWithWhitespace,
          persona: 'internet-random',
          sessionId: 'test-session'
        }),
      });

      const response = await handlePreview(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformer.transformMessage).toHaveBeenCalledWith(
        'Test message',
        'internet-random',
        undefined
      );
    });
  });

  describe('performance and concurrency', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Test message ${i + 1}`,
            persona: 'internet-random',
            sessionId: `test-session-${i + 1}`
          }),
        })
      );

      const promises = requests.map(request => 
        handlePreview(request, mockEnv, mockCtx)
      );

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
      });

      expect(mockTransformer.transformMessage).toHaveBeenCalledTimes(3);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledTimes(3);
    });
  });
});