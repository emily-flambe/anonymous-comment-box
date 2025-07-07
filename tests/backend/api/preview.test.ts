import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handlePreview } from '../../../src/api/preview';
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

import { RateLimiter } from '../../../src/lib/rate-limiter';
import { PersonaTransformer } from '../../../src/lib/ai-persona-transformer';

describe('handlePreview', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockRateLimiter: any;
  let mockPersonaTransformer: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {} as any,
      RATE_LIMITER: {} as any,
      ANTHROPIC_API_KEY: 'test-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'recipient@example.com',
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
        transformedMessage: 'Transformed with persona',
        originalMessage: 'Original message',
        persona: 'professional',
        fallbackUsed: false,
      }),
    };
    vi.mocked(PersonaTransformer).mockImplementation(() => mockPersonaTransformer);
  });

  describe('Request Validation', () => {
    it('should reject non-JSON requests', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: 'not json',
        headers: { 'Content-Type': 'text/plain' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Invalid JSON in request body',
      });
    });

    it('should reject requests without message', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ sessionId: 'test-session' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Message is required and must be a string',
      });
    });

    it('should reject requests without sessionId', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ message: 'Test message' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Session ID is required',
      });
    });

    it('should reject empty messages', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ message: '', sessionId: 'test-session' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Message cannot be empty',
      });
    });

    it('should reject messages exceeding 2000 characters', async () => {
      const longMessage = 'a'.repeat(2001);
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ message: longMessage, sessionId: 'test-session' }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Message too long (max 2000 characters)',
      });
    });

    it('should reject custom personas exceeding 500 characters', async () => {
      const longPersona = 'a'.repeat(501);
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          customPersona: longPersona,
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Custom persona too long (max 500 characters)',
      });
    });
  });

  describe('Transformation with Personas', () => {
    it('should transform message with predefined persona', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Original message',
          persona: 'professional',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(PersonaTransformer).toHaveBeenCalledWith(mockEnv);
      expect(mockPersonaTransformer.transformMessage).toHaveBeenCalledWith(
        'Original message',
        'professional',
        undefined
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        transformedMessage: 'Transformed with persona',
        originalMessage: 'Original message',
        persona: 'professional',
        rateLimitRemaining: 9,
        rateLimitReset: expect.any(Number),
        fallbackUsed: false,
      });
    });

    it('should transform message with custom persona', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Original message',
          customPersona: 'Write like a pirate',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(mockPersonaTransformer.transformMessage).toHaveBeenCalledWith(
        'Original message',
        '',
        'Write like a pirate'
      );
      
      expect(response.status).toBe(200);
    });

    it('should handle rate limiting', async () => {
      mockRateLimiter.checkLimit.mockRejectedValue(
        new RateLimitError(10, Date.now() + 30000)
      );

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(429);
      const data = await response.json() as any;
      expect(data.error).toBe('Rate limit exceeded. Please try again later.');
    });
  });

  describe('Error Handling', () => {
    it('should handle AI persona transformation errors', async () => {
      mockPersonaTransformer.transformMessage.mockRejectedValue(
        new AIPersonaTransformerError('AI quota exceeded')
      );

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          persona: 'professional',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'AI quota exceeded',
      });
    });

    it('should handle JSON parsing errors', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: '{"invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Invalid JSON in request body',
      });
    });

    it('should handle unexpected errors', async () => {
      mockPersonaTransformer.transformMessage.mockRejectedValue(new Error('Network timeout'));

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({
        error: 'Failed to process preview request',
      });
    });
  });

  describe('Response Format', () => {
    it('should return preview in correct format', async () => {
      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ 
          message: 'Test message',
          persona: 'professional',
          sessionId: 'test-session',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await handlePreview(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const data = await response.json() as any;
      expect(data).toHaveProperty('transformedMessage');
      expect(data).toHaveProperty('originalMessage');
      expect(data).toHaveProperty('persona');
      expect(data).toHaveProperty('rateLimitRemaining');
      expect(data).toHaveProperty('rateLimitReset');
      expect(typeof data.transformedMessage).toBe('string');
    });
  });
});