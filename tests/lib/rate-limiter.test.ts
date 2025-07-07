import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter, RateLimitError } from '../../src/lib/rate-limiter';
import type { Env } from '../../src/types/env';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockEnv: Env;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });
    
    // Mock environment with KV namespace
    mockEnv = {
      MESSAGE_QUEUE: {
        get: vi.fn(),
        getWithMetadata: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as any,
      RATE_LIMITER: {},
      ANTHROPIC_API_KEY: 'test-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateKey', () => {
    it('should generate key from CF-Connecting-IP and session ID', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
          'X-Session-ID': 'session123'
        }
      });

      const key = rateLimiter.generateKey(request);
      expect(key).toBe('rate_limit:192.168.1.1:session123');
    });

    it('should use X-Forwarded-For as fallback', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'X-Forwarded-For': '10.0.0.1',
          'X-Session-ID': 'session456'
        }
      });

      const key = rateLimiter.generateKey(request);
      expect(key).toBe('rate_limit:10.0.0.1:session456');
    });

    it('should use "unknown" for missing IP', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'X-Session-ID': 'session789'
        }
      });

      const key = rateLimiter.generateKey(request);
      expect(key).toBe('rate_limit:unknown:session789');
    });
  });

  describe('checkLimit', () => {
    const testKey = 'rate_limit:test:session';

    it('should allow first request', async () => {
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue(null);
      mockEnv.MESSAGE_QUEUE.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(testKey, mockEnv);

      expect(result.remaining).toBe(9);
      expect(result.reset).toBeGreaterThan(Date.now());
      expect(result.limit).toBe(10);
      expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalledWith(
        testKey,
        '1',
        expect.objectContaining({
          expirationTtl: 60,
          metadata: expect.objectContaining({
            resetTime: expect.any(Number)
          })
        })
      );
    });

    it('should increment counter for subsequent requests', async () => {
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue('5');
      mockEnv.MESSAGE_QUEUE.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(testKey, mockEnv);

      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(10);
      expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalledWith(testKey, '6', expect.any(Object));
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      const resetTime = Date.now() + 30000;
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue('10');
      mockEnv.MESSAGE_QUEUE.getWithMetadata = vi.fn().mockResolvedValue({
        value: '10',
        metadata: { resetTime }
      });

      await expect(rateLimiter.checkLimit(testKey, mockEnv))
        .rejects.toThrow(RateLimitError);
    });

    it('should handle invalid stored values', async () => {
      mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue('invalid_number');
      mockEnv.MESSAGE_QUEUE.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(testKey, mockEnv);

      // Should treat invalid value as 0
      expect(result.remaining).toBe(9);
      expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalledWith(testKey, '1', expect.any(Object));
    });
  });

  describe('getStatus', () => {
    const testKey = 'rate_limit:test:session';

    it('should return status without incrementing counter', async () => {
      const resetTime = Date.now() + 30000;
      mockEnv.MESSAGE_QUEUE.getWithMetadata = vi.fn().mockResolvedValue({
        value: '5',
        metadata: { resetTime }
      });

      const result = await rateLimiter.getStatus(testKey, mockEnv);

      expect(result.remaining).toBe(5);
      expect(result.reset).toBe(resetTime);
      expect(result.limit).toBe(10);
      expect(mockEnv.MESSAGE_QUEUE.put).not.toHaveBeenCalled();
    });

    it('should show correct remaining when limit reached', async () => {
      const resetTime = Date.now() + 30000;
      mockEnv.MESSAGE_QUEUE.getWithMetadata = vi.fn().mockResolvedValue({
        value: '10',
        metadata: { resetTime }
      });

      const result = await rateLimiter.getStatus(testKey, mockEnv);

      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(10);
    });
  });

  describe('resetLimit', () => {
    it('should delete rate limit key', async () => {
      const testKey = 'rate_limit:test:session';
      mockEnv.MESSAGE_QUEUE.delete = vi.fn().mockResolvedValue(undefined);

      await rateLimiter.resetLimit(testKey, mockEnv);

      expect(mockEnv.MESSAGE_QUEUE.delete).toHaveBeenCalledWith(testKey);
    });
  });
});

describe('RateLimitError', () => {
  it('should create error with correct properties', () => {
    const error = new RateLimitError(10, 1640995200000, 'Custom message');

    expect(error.name).toBe('RateLimitError');
    expect(error.message).toBe('Custom message');
    expect(error.count).toBe(10);
    expect(error.resetTime).toBe(1640995200000);
  });

  it('should use default message', () => {
    const error = new RateLimitError(5, Date.now());

    expect(error.message).toBe('Rate limit exceeded');
  });
});