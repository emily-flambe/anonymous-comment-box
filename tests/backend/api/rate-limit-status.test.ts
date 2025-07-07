import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleRateLimitStatus } from '../../../src/api/rate-limit-status';
import type { Env } from '../../../src/types/env';

// Mock rate limiter
vi.mock('../../../src/lib/rate-limiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    getStatus: vi.fn(),
    generateKey: vi.fn(),
  })),
}));

import { RateLimiter } from '../../../src/lib/rate-limiter';

describe('handleRateLimitStatus', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;
  let mockRateLimiter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {} as any,
      RATE_LIMITER: {} as any,
      ANTHROPIC_API_KEY: 'test-key',
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
      getStatus: vi.fn().mockResolvedValue({
        remaining: 5,
        reset: Date.now() + 30000,
        limit: 10,
      }),
      generateKey: vi.fn().mockReturnValue('rate_limit:192.168.1.1:session123'),
    };
    vi.mocked(RateLimiter).mockImplementation(() => mockRateLimiter);
  });

  describe('Rate Limit Status', () => {
    it('should return rate limit status for valid session', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session123',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(mockRateLimiter.generateKey).toHaveBeenCalledWith(request);
      expect(mockRateLimiter.getStatus).toHaveBeenCalledWith(
        'rate_limit:192.168.1.1:session123',
        mockEnv
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const data = await response.json();
      expect(data).toEqual({
        success: true,
        rateLimitRemaining: 5,
        rateLimitReset: expect.any(Number),
        rateLimitLimit: 10,
      });
    });

    it('should handle missing session ID', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Session ID is required',
      });
    });

    it('should use X-Forwarded-For as IP fallback', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session456',
          'X-Forwarded-For': '10.0.0.1',
        },
      });

      mockRateLimiter.generateKey.mockReturnValue('rate_limit:10.0.0.1:session456');

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(mockRateLimiter.generateKey).toHaveBeenCalledWith(request);
      expect(mockRateLimiter.getStatus).toHaveBeenCalledWith(
        'rate_limit:10.0.0.1:session456',
        mockEnv
      );

      expect(response.status).toBe(200);
    });

    it('should handle unknown IP addresses', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session789',
        },
      });

      mockRateLimiter.generateKey.mockReturnValue('rate_limit:unknown:session789');

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(mockRateLimiter.getStatus).toHaveBeenCalledWith(
        'rate_limit:unknown:session789',
        mockEnv
      );

      expect(response.status).toBe(200);
    });

    it('should handle zero remaining requests', async () => {
      mockRateLimiter.getStatus.mockResolvedValue({
        remaining: 0,
        reset: Date.now() + 60000,
        limit: 10,
      });

      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session123',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        rateLimitRemaining: 0,
        rateLimitReset: expect.any(Number),
        rateLimitLimit: 10,
      });
    });

    it('should handle first-time users with no rate limit data', async () => {
      mockRateLimiter.getStatus.mockResolvedValue({
        remaining: 10,
        reset: Date.now() + 3600000,
        limit: 10,
      });

      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'new-session',
          'CF-Connecting-IP': '192.168.1.100',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({
        success: true,
        rateLimitRemaining: 10,
        rateLimitReset: expect.any(Number),
        rateLimitLimit: 10,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiter errors', async () => {
      mockRateLimiter.getStatus.mockRejectedValue(new Error('KV store unavailable'));

      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session123',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Failed to get rate limit status',
      });
    });

    it('should handle invalid session ID formats', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': '',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Session ID is required',
      });
    });

    it('should handle whitespace-only session ID', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': '   ',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({
        success: false,
        error: 'Session ID is required',
      });
    });
  });

  describe('Response Headers', () => {
    it('should set correct Content-Type header', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session123',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      const response = await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should create RateLimiter with default configuration', async () => {
      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: {
          'X-Session-ID': 'session123',
          'CF-Connecting-IP': '192.168.1.1',
        },
      });

      await handleRateLimitStatus(request, mockEnv, mockCtx);

      expect(RateLimiter).toHaveBeenCalledWith();
    });
  });
});