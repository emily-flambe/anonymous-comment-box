import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleSubmission } from '../../../src/api/submit';
import type { Env } from '../../../src/types/env';
import { RateLimitError } from '../../../src/lib/rate-limiter';
import { AIPersonaTransformerError } from '../../../src/lib/ai-persona-transformer';

// Mock dependencies
vi.mock('../../../src/lib/rate-limiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    checkLimit: vi.fn(),
    generateKey: vi.fn(),
  })),
  RateLimitError: class RateLimitError extends Error {
    constructor(public count: number, public resetTime: number, message?: string) {
      super(message || 'Rate limit exceeded');
      this.name = 'RateLimitError';
    }
  },
}));

vi.mock('../../../src/lib/ai-transform', () => ({
  transformMessage: vi.fn(),
}));

vi.mock('../../../src/lib/ai-persona-transformer', () => ({
  PersonaTransformer: vi.fn().mockImplementation(() => ({
    transformMessage: vi.fn(),
  })),
  AIPersonaTransformerError: class AIPersonaTransformerError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AIPersonaTransformerError';
    }
  },
}));

vi.mock('../../../src/lib/queue', () => ({
  queueMessage: vi.fn(),
}));

import { RateLimiter } from '../../../src/lib/rate-limiter';
import { transformMessage } from '../../../src/lib/ai-transform';
import { PersonaTransformer } from '../../../src/lib/ai-persona-transformer';
import { queueMessage } from '../../../src/lib/queue';

describe('handleSubmission', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockRateLimiter: any;
  let mockPersonaTransformer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {} as any,
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } as any,
      ANTHROPIC_API_KEY: 'test-key',
      AI_WORKER_API_SECRET_KEY: 'test-ai-worker-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;

    // Setup rate limiter mock
    mockRateLimiter = {
      checkLimit: vi.fn().mockResolvedValue({
        remaining: 9,
        reset: Date.now() + 60000,
        limit: 10,
      }),
      generateKey: vi.fn().mockReturnValue('rate_limit:test:session'),
    };
    vi.mocked(RateLimiter).mockImplementation(() => mockRateLimiter);

    // Setup persona transformer mock
    mockPersonaTransformer = {
      transformMessage: vi.fn().mockResolvedValue({
        transformedMessage: 'Transformed message',
        usage: { inputTokens: 10, outputTokens: 20 },
      }),
    };
    vi.mocked(PersonaTransformer).mockImplementation(() => mockPersonaTransformer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Validation', () => {
    it('should reject non-JSON requests', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'text/plain' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Invalid JSON payload',
      });
    });

    it('should reject requests without message', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Message is required',
      });
    });

    it('should reject empty messages', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: '   ' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Message is required',
      });
    });

    it('should reject messages exceeding 10000 characters', async () => {
      const longMessage = 'a'.repeat(10001);
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: longMessage }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Message exceeds maximum length of 10000 characters',
      });
    });

    it('should reject custom personas exceeding 200 characters', async () => {
      const longPersona = 'a'.repeat(201);
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          customPersona: longPersona,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Custom persona exceeds maximum length of 200 characters',
      });
    });

    it('should reject invalid persona values', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          persona: 'invalid-persona',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Invalid persona value',
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should check rate limit and include info in response', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session',
        },
      });

      vi.mocked(transformMessage).mockResolvedValue('Transformed message');
      vi.mocked(queueMessage).mockResolvedValue(undefined);

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(mockRateLimiter.generateKey).toHaveBeenCalledWith(request);
      expect(mockRateLimiter.checkLimit).toHaveBeenCalledWith('rate_limit:test:session', mockEnv);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        rateLimitRemaining: 9,
        rateLimitReset: expect.any(Number),
      });
    });

    it('should handle rate limit exceeded', async () => {
      mockRateLimiter.checkLimit.mockRejectedValue(
        new RateLimitError(10, Date.now() + 30000)
      );

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(429);
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
      expect(response.headers.get('Retry-After')).toBeTruthy();

      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Too many requests. Please try again later.',
        rateLimitRemaining: 0,
        rateLimitReset: expect.any(Number),
      });
    });
  });

  describe('Message Transformation', () => {
    it('should use PersonaTransformer when persona is specified', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          persona: 'professional',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      vi.mocked(queueMessage).mockResolvedValue(undefined);

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(PersonaTransformer).toHaveBeenCalledWith(mockEnv);
      expect(mockPersonaTransformer.transformMessage).toHaveBeenCalledWith(
        'Test message',
        'professional',
        undefined
      );
      expect(transformMessage).not.toHaveBeenCalled();
      
      expect(response.status).toBe(200);
    });

    it('should use PersonaTransformer with custom persona', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          customPersona: 'Write like Shakespeare',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      vi.mocked(queueMessage).mockResolvedValue(undefined);

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(mockPersonaTransformer.transformMessage).toHaveBeenCalledWith(
        'Test message',
        '',
        'Write like Shakespeare'
      );
      
      expect(response.status).toBe(200);
    });

    it('should fallback to transformMessage when no persona specified', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 'Content-Type': 'application/json' },
      });

      vi.mocked(transformMessage).mockResolvedValue('Transformed message');
      vi.mocked(queueMessage).mockResolvedValue(undefined);

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(transformMessage).toHaveBeenCalledWith('Test message', mockEnv);
      expect(PersonaTransformer).not.toHaveBeenCalled();
      
      expect(response.status).toBe(200);
    });

    it('should handle AI transformation errors', async () => {
      mockPersonaTransformer.transformMessage.mockRejectedValue(
        new AIPersonaTransformerError('AI service error')
      );

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          persona: 'professional',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'AI service error',
      });
    });

    it('should handle generic transformation errors', async () => {
      vi.mocked(transformMessage).mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'AI transformation service unavailable',
      });
    });
  });

  describe('Message Queueing', () => {
    it('should queue message with random delay in normal mode', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 'Content-Type': 'application/json' },
      });

      vi.mocked(transformMessage).mockResolvedValue('Transformed message');
      vi.mocked(queueMessage).mockResolvedValue(undefined);

      await handleSubmission(request, mockEnv, mockCtx);

      expect(queueMessage).toHaveBeenCalledWith(
        'Transformed message',
        mockEnv,
        mockCtx,
        false
      );
    });

    it('should queue message immediately in test mode', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 'Content-Type': 'application/json' },
      });

      vi.mocked(transformMessage).mockResolvedValue('Transformed message');
      vi.mocked(queueMessage).mockResolvedValue(undefined);

      await handleSubmission(request, mockEnv, mockCtx, true);

      expect(queueMessage).toHaveBeenCalledWith(
        'Transformed message',
        mockEnv,
        mockCtx,
        true
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: '{"invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Invalid JSON payload',
      });
    });

    it('should handle unexpected errors', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: null as any, // Force an error
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Failed to process message',
      });
    });
  });

  describe('Valid Personas', () => {
    const validPersonas = [
      'professional', 'casual', 'enthusiastic', 'constructive',
      'appreciative', 'analytical', 'empathetic', 'direct',
    ];

    validPersonas.forEach(persona => {
      it(`should accept valid persona: ${persona}`, async () => {
        const request = new Request('http://localhost/api/submit', {
          method: 'POST',
          body: JSON.stringify({ 
            message: 'Test message',
            persona,
          }),
          headers: { 'Content-Type': 'application/json' },
        });

        vi.mocked(queueMessage).mockResolvedValue(undefined);

        const response = await handleSubmission(request, mockEnv, mockCtx);

        expect(response.status).toBe(200);
        expect(mockPersonaTransformer.transformMessage).toHaveBeenCalled();
      });
    });
  });
});