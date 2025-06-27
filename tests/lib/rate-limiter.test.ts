import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter, RateLimitError, RateLimitResult } from '../../src/lib/rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  let mockKV: KVNamespace;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ windowMs: 60000, maxRequests: 10 });
    
    // Mock KV namespace
    mockKV = {
      get: vi.fn(),
      getWithMetadata: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as any;
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

    it('should handle missing session ID', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'CF-Connecting-IP': '192.168.1.1'
        }
      });

      const key = rateLimiter.generateKey(request);
      expect(key).toBe('rate_limit:192.168.1.1:');
    });
  });

  describe('checkLimit', () => {
    const testKey = 'rate_limit:test:session';

    it('should allow first request', async () => {
      mockKV.get = vi.fn().mockResolvedValue(null);
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(mockKV, testKey);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.reset).toBeGreaterThan(Date.now());
      expect(mockKV.put).toHaveBeenCalledWith(
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
      mockKV.get = vi.fn().mockResolvedValue('5');
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(mockKV, testKey);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(mockKV.put).toHaveBeenCalledWith(testKey, '6', expect.any(Object));
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      const resetTime = Date.now() + 30000;
      mockKV.get = vi.fn().mockResolvedValue('10');
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({
        value: '10',
        metadata: { resetTime }
      });

      await expect(rateLimiter.checkLimit(mockKV, testKey))
        .rejects.toThrow(RateLimitError);
      
      try {
        await rateLimiter.checkLimit(mockKV, testKey);
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).count).toBe(10);
        expect((error as RateLimitError).resetTime).toBe(resetTime);
      }
    });

    it('should handle KV storage errors gracefully', async () => {
      mockKV.get = vi.fn().mockRejectedValue(new Error('KV unavailable'));

      await expect(rateLimiter.checkLimit(mockKV, testKey))
        .rejects.toThrow('KV unavailable');
    });

    it('should handle invalid stored values', async () => {
      mockKV.get = vi.fn().mockResolvedValue('invalid_number');
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(mockKV, testKey);

      // Should treat invalid value as 0
      expect(result.remaining).toBe(9);
      expect(mockKV.put).toHaveBeenCalledWith(testKey, '1', expect.any(Object));
    });
  });

  describe('getStatus', () => {
    const testKey = 'rate_limit:test:session';

    it('should return status without incrementing counter', async () => {
      const resetTime = Date.now() + 30000;
      mockKV.get = vi.fn().mockResolvedValue('5');
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({
        value: '5',
        metadata: { resetTime }
      });

      const result = await rateLimiter.getStatus(mockKV, testKey);

      expect(result.remaining).toBe(5);
      expect(result.reset).toBe(resetTime);
      expect(result.allowed).toBe(true);
      expect(mockKV.put).not.toHaveBeenCalled();
    });

    it('should show not allowed when limit reached', async () => {
      const resetTime = Date.now() + 30000;
      mockKV.get = vi.fn().mockResolvedValue('10');
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({
        value: '10',
        metadata: { resetTime }
      });

      const result = await rateLimiter.getStatus(mockKV, testKey);

      expect(result.remaining).toBe(0);
      expect(result.allowed).toBe(false);
    });

    it('should handle missing metadata gracefully', async () => {
      mockKV.get = vi.fn().mockResolvedValue('3');
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({
        value: '3',
        metadata: null
      });

      const result = await rateLimiter.getStatus(mockKV, testKey);

      expect(result.remaining).toBe(7);
      expect(result.reset).toBeGreaterThan(Date.now());
    });
  });

  describe('reset', () => {
    it('should delete rate limit key', async () => {
      const testKey = 'rate_limit:test:session';
      mockKV.delete = vi.fn().mockResolvedValue(undefined);

      await rateLimiter.reset(mockKV, testKey);

      expect(mockKV.delete).toHaveBeenCalledWith(testKey);
    });

    it('should handle delete errors', async () => {
      const testKey = 'rate_limit:test:session';
      mockKV.delete = vi.fn().mockRejectedValue(new Error('Delete failed'));

      await expect(rateLimiter.reset(mockKV, testKey))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('concurrent requests simulation', () => {
    it('should handle concurrent requests correctly', async () => {
      const testKey = 'rate_limit:concurrent:test';
      let currentCount = 0;

      // Simulate concurrent behavior
      mockKV.get = vi.fn().mockImplementation(() => {
        return Promise.resolve(currentCount > 0 ? currentCount.toString() : null);
      });

      mockKV.put = vi.fn().mockImplementation((key, value) => {
        currentCount = parseInt(value);
        return Promise.resolve();
      });

      // Simulate 5 concurrent requests
      const promises = Array.from({ length: 5 }, () => 
        rateLimiter.checkLimit(mockKV, testKey)
      );

      const results = await Promise.all(promises);

      // All should succeed since we're under the limit
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });

      expect(mockKV.put).toHaveBeenCalledTimes(5);
    });
  });

  describe('TTL expiry behavior', () => {
    it('should set correct TTL on first request', async () => {
      const testKey = 'rate_limit:ttl:test';
      mockKV.get = vi.fn().mockResolvedValue(null);
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      await rateLimiter.checkLimit(mockKV, testKey);

      expect(mockKV.put).toHaveBeenCalledWith(
        testKey,
        '1',
        expect.objectContaining({
          expirationTtl: 60 // 60 seconds for 60000ms window
        })
      );
    });

    it('should handle different window sizes', async () => {
      const customRateLimiter = new RateLimiter({ 
        windowMs: 300000, // 5 minutes
        maxRequests: 5 
      });
      const testKey = 'rate_limit:custom:test';
      
      mockKV.get = vi.fn().mockResolvedValue(null);
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      await customRateLimiter.checkLimit(mockKV, testKey);

      expect(mockKV.put).toHaveBeenCalledWith(
        testKey,
        '1',
        expect.objectContaining({
          expirationTtl: 300 // 300 seconds for 300000ms window
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle very large counter values', async () => {
      const testKey = 'rate_limit:edge:test';
      mockKV.get = vi.fn().mockResolvedValue('999999');
      mockKV.getWithMetadata = vi.fn().mockResolvedValue({
        value: '999999',
        metadata: { resetTime: Date.now() + 30000 }
      });

      await expect(rateLimiter.checkLimit(mockKV, testKey))
        .rejects.toThrow(RateLimitError);
    });

    it('should handle negative values in storage', async () => {
      const testKey = 'rate_limit:negative:test';
      mockKV.get = vi.fn().mockResolvedValue('-5');
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(mockKV, testKey);

      // Should treat negative as 0 and increment to 1
      expect(result.remaining).toBe(9);
      expect(mockKV.put).toHaveBeenCalledWith(testKey, '1', expect.any(Object));
    });

    it('should handle empty string values', async () => {
      const testKey = 'rate_limit:empty:test';
      mockKV.get = vi.fn().mockResolvedValue('');
      mockKV.put = vi.fn().mockResolvedValue(undefined);

      const result = await rateLimiter.checkLimit(mockKV, testKey);

      // Should treat empty string as 0
      expect(result.remaining).toBe(9);
      expect(mockKV.put).toHaveBeenCalledWith(testKey, '1', expect.any(Object));
    });

    it('should handle null values from getWithMetadata', async () => {
      const testKey = 'rate_limit:null:test';
      mockKV.get = vi.fn().mockResolvedValue('5');
      mockKV.getWithMetadata = vi.fn().mockResolvedValue(null);

      const result = await rateLimiter.getStatus(mockKV, testKey);

      expect(result.remaining).toBe(5);
      expect(result.reset).toBeGreaterThan(Date.now());
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