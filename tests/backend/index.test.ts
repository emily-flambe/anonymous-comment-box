import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../../src/index';
import type { Env } from '../../src/types/env';

// Mock the API handlers
vi.mock('../../src/api/submit', () => ({
  handleSubmission: vi.fn(),
}));

vi.mock('../../src/api/preview', () => ({
  handlePreview: vi.fn(),
}));

vi.mock('../../src/api/rate-limit-status', () => ({
  handleRateLimitStatus: vi.fn(),
}));

vi.mock('../../src/lib/static', () => ({
  handleStaticAssets: vi.fn(),
}));

import { handleSubmission } from '../../src/api/submit';
import { handlePreview } from '../../src/api/preview';
import { handleRateLimitStatus } from '../../src/api/rate-limit-status';
import { handleStaticAssets } from '../../src/lib/static';

describe('Worker Main Entry Point', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEnv = {
      MESSAGE_QUEUE: {
        get: vi.fn(),
        getWithMetadata: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as any,
      AI_WORKER_API_SECRET_KEY: 'test-ai-worker-key',
      GMAIL_CLIENT_ID: 'test-client-id',
      GMAIL_CLIENT_SECRET: 'test-client-secret',
      GMAIL_REFRESH_TOKEN: 'test-refresh-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
      QUEUE_DELAY_SECONDS: undefined,
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } as any,
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('CORS Headers', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'OPTIONS',
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-Session-ID');
    });

    it('should add CORS headers to API responses', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(handleSubmission).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, X-Session-ID');
    });
  });

  describe('API Routes', () => {
    it('should route POST /api/submit to handleSubmission', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      vi.mocked(handleSubmission).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handleSubmission).toHaveBeenCalledWith(request, mockEnv, mockCtx);
    });

    it('should route POST /api/preview to handlePreview', async () => {
      const mockResponse = new Response(JSON.stringify({ preview: 'test' }));
      vi.mocked(handlePreview).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handlePreview).toHaveBeenCalledWith(request, mockEnv, mockCtx);
    });

    it('should route GET /api/rate-limit-status to handleRateLimitStatus', async () => {
      const mockResponse = new Response(JSON.stringify({ remaining: 10 }));
      vi.mocked(handleRateLimitStatus).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'GET',
        headers: { 'X-Session-ID': 'test-session' },
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handleRateLimitStatus).toHaveBeenCalledWith(request, mockEnv, mockCtx);
    });

    it('should route POST /api/test-submit to handleSubmission with test mode', async () => {
      const mockResponse = new Response(JSON.stringify({ success: true }));
      vi.mocked(handleSubmission).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/test-submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handleSubmission).toHaveBeenCalledWith(request, mockEnv, mockCtx, true);
    });

    it('should return health check response for GET /api/health', async () => {
      const request = new Request('http://localhost/api/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });

    it('should route static assets to handleStaticAssets', async () => {
      const mockResponse = new Response('static content');
      vi.mocked(handleStaticAssets).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/index.html', {
        method: 'GET',
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handleStaticAssets).toHaveBeenCalledWith(
        request,
        expect.objectContaining({ pathname: '/index.html' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 error with CORS headers on handler error', async () => {
      vi.mocked(handleSubmission).mockRejectedValue(new Error('Handler error'));

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' }),
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      
      const data = await response.json();
      expect(data).toEqual({ error: 'Internal server error' });
    });

    it('should handle errors in static asset serving', async () => {
      vi.mocked(handleStaticAssets).mockRejectedValue(new Error('Static error'));

      const request = new Request('http://localhost/unknown.file', {
        method: 'GET',
      });

      const response = await worker.fetch(request, mockEnv, mockCtx);

      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });

  describe('Method Validation', () => {
    it('should allow only POST to /api/submit', async () => {
      const mockResponse = new Response('static content');
      vi.mocked(handleStaticAssets).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/submit', {
        method: 'GET',
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handleSubmission).not.toHaveBeenCalled();
      expect(handleStaticAssets).toHaveBeenCalled();
    });

    it('should allow only GET to /api/rate-limit-status', async () => {
      const mockResponse = new Response('static content');
      vi.mocked(handleStaticAssets).mockResolvedValue(mockResponse);

      const request = new Request('http://localhost/api/rate-limit-status', {
        method: 'POST',
      });

      await worker.fetch(request, mockEnv, mockCtx);

      expect(handleRateLimitStatus).not.toHaveBeenCalled();
      expect(handleStaticAssets).toHaveBeenCalled();
    });
  });
});