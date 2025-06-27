import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleSubmission } from '../../src/api/submit';
import type { Env } from '../../src/types/env';

// Mock the dependencies
vi.mock('../../src/lib/ai-transform', () => ({
  transformMessage: vi.fn()
}));

vi.mock('../../src/lib/queue', () => ({
  queueMessage: vi.fn()
}));

vi.mock('../../src/lib/rate-limiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    generateKey: vi.fn(),
    checkLimit: vi.fn()
  }))
}));

vi.mock('../../src/lib/ai-persona-transformer', () => ({
  PersonaTransformer: vi.fn().mockImplementation(() => ({
    transformMessage: vi.fn()
  }))
}));

describe('Enhanced Submit API Handler with Persona Support', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockTransformMessage: any;
  let mockQueueMessage: any;
  let mockRateLimiter: any;
  let mockPersonaTransformer: any;

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
    const { transformMessage } = require('../../src/lib/ai-transform');
    const { queueMessage } = require('../../src/lib/queue');
    const { RateLimiter } = require('../../src/lib/rate-limiter');
    const { PersonaTransformer } = require('../../src/lib/ai-persona-transformer');

    mockTransformMessage = transformMessage;
    mockQueueMessage = queueMessage;
    mockRateLimiter = new RateLimiter();
    mockPersonaTransformer = new PersonaTransformer();

    // Default mock implementations
    mockTransformMessage.mockResolvedValue('Transformed message with original AI');
    mockQueueMessage.mockResolvedValue(undefined);
    mockRateLimiter.generateKey.mockReturnValue('rate_limit:test:session');
    mockRateLimiter.checkLimit.mockResolvedValue({
      remaining: 9,
      reset: Date.now() + 60000,
      allowed: true
    });
    mockPersonaTransformer.transformMessage.mockResolvedValue({
      transformedMessage: 'yo this is a test msg',
      originalMessage: 'This is a test message',
      persona: 'internet-random'
    });

    // Mock KV operations
    mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue(null); // No existing rate limit
    mockEnv.MESSAGE_QUEUE.put = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic submission functionality', () => {
    it('should handle submission without persona (original behavior)', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'This is a test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockTransformMessage).toHaveBeenCalledWith('This is a test message', mockEnv);
      expect(mockQueueMessage).toHaveBeenCalledWith(
        'Transformed message with original AI',
        mockEnv,
        mockCtx,
        false
      );
    });

    it('should handle submission with preset persona', async () => {
      // Mock the enhanced submit handler that would use persona transformer
      // For now, testing current behavior with plans for enhancement
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ 
          message: 'This is a test message',
          persona: 'internet-random'
        }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Current implementation still uses original transformer
      expect(mockTransformMessage).toHaveBeenCalled();
    });

    it('should handle submission with custom persona', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ 
          message: 'This is a test message',
          customPersona: 'Write like a pirate'
        }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Current implementation still uses original transformer
      expect(mockTransformMessage).toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('should reject empty message', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message cannot be empty');
    });

    it('should reject message over 5000 characters', async () => {
      const longMessage = 'a'.repeat(5001);
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: longMessage }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message too long (max 5000 characters)');
    });

    it('should reject malformed JSON', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process message');
    });

    it('should require message field', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });

    it('should handle non-string message', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 123 }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message is required');
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      // Mock existing rate limit count
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue('10');

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should increment rate limit counter on successful submission', async () => {
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue('5');

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalledWith(
        'rate_limit_192.168.1.1',
        '6',
        { expirationTtl: 3600 }
      );
    });

    it('should handle unknown IP addresses', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockEnv.MESSAGE_QUEUE.get).toHaveBeenCalledWith('rate_limit_unknown');
    });

    it('should start counter at 1 for new IPs', async () => {
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue(null);

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.100',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalledWith(
        'rate_limit_192.168.1.100',
        '1',
        { expirationTtl: 3600 }
      );
    });
  });

  describe('AI transformation', () => {
    it('should handle AI transformation success', async () => {
      mockTransformMessage.mockResolvedValue('Successfully transformed message');

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Original message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformMessage).toHaveBeenCalledWith('Original message', mockEnv);
      expect(mockQueueMessage).toHaveBeenCalledWith(
        'Successfully transformed message',
        mockEnv,
        mockCtx,
        false
      );
    });

    it('should handle AI transformation failure', async () => {
      mockTransformMessage.mockRejectedValue(new Error('AI service unavailable'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI transformation service unavailable');
      expect(mockQueueMessage).not.toHaveBeenCalled();
    });

    it('should handle AI transformation timeout', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      mockTransformMessage.mockRejectedValue(timeoutError);

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('AI transformation service unavailable');
    });
  });

  describe('test mode functionality', () => {
    it('should use test mode when specified', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx, true);
      
      expect(response.status).toBe(200);
      expect(mockQueueMessage).toHaveBeenCalledWith(
        'Transformed message with original AI',
        mockEnv,
        mockCtx,
        true // testMode = true
      );
    });

    it('should use normal mode by default', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockQueueMessage).toHaveBeenCalledWith(
        'Transformed message with original AI',
        mockEnv,
        mockCtx,
        false // testMode = false
      );
    });
  });

  describe('edge cases and special scenarios', () => {
    it('should handle Unicode characters', async () => {
      const unicodeMessage = 'Hello 👋 world 🌍 with émojis';
      
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: unicodeMessage }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformMessage).toHaveBeenCalledWith(unicodeMessage, mockEnv);
    });

    it('should handle maximum length messages', async () => {
      const maxMessage = 'a'.repeat(5000);
      
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: maxMessage }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformMessage).toHaveBeenCalledWith(maxMessage, mockEnv);
    });

    it('should trim whitespace from messages', async () => {
      const messageWithWhitespace = '  \n  Test message  \t  ';
      
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: messageWithWhitespace }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      
      expect(response.status).toBe(200);
      expect(mockTransformMessage).toHaveBeenCalledWith('Test message', mockEnv);
    });

    it('should handle queue message failures', async () => {
      mockQueueMessage.mockRejectedValue(new Error('Queue service unavailable'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process message');
    });
  });

  describe('concurrent submissions', () => {
    it('should handle multiple concurrent submissions', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        new Request('http://localhost/api/submit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': `192.168.1.${i + 1}`
          },
          body: JSON.stringify({ message: `Test message ${i + 1}` }),
        })
      );

      const promises = requests.map(request => 
        handleSubmission(request, mockEnv, mockCtx)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(mockTransformMessage).toHaveBeenCalledTimes(3);
      expect(mockQueueMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('error recovery', () => {
    it('should handle KV service failures gracefully', async () => {
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockRejectedValue(new Error('KV service down'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process message');
    });

    it('should handle KV put failures gracefully', async () => {
      mockEnv.MESSAGE_QUEUE.put = vi.fn().mockRejectedValue(new Error('KV put failed'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1'
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await handleSubmission(request, mockEnv, mockCtx);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process message');
    });
  });
});