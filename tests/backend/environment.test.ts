import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../../src/index';
import type { Env } from '../../src/types/env';

// Mock fetch for AI Worker API
const mockFetch = vi.fn();
global.fetch = mockFetch;

global.fetch = vi.fn();

describe('Environment Variable Handling', () => {
  let baseEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    
    baseEnv = {
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
      RECIPIENT_EMAIL: 'recipient@example.com',
      ENVIRONMENT: 'test',
      QUEUE_DELAY_SECONDS: undefined,
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } as any,
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('Missing Environment Variables', () => {
    it('should handle missing AI_WORKER_API_SECRET_KEY', async () => {
      const envMissingKey = {
        ...baseEnv,
        AI_WORKER_API_SECRET_KEY: '',
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envMissingKey, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });

    it('should handle missing Gmail credentials', async () => {
      const envMissingToken = {
        ...baseEnv,
        GMAIL_CLIENT_ID: '',
        GMAIL_CLIENT_SECRET: '',
        GMAIL_REFRESH_TOKEN: '',
      };

      const request = new Request('http://localhost/api/test-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envMissingToken, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });

    it('should handle missing RECIPIENT_EMAIL', async () => {
      const envMissingRecipient = {
        ...baseEnv,
        RECIPIENT_EMAIL: '',
      };

      const request = new Request('http://localhost/api/test-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envMissingRecipient, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });

    it('should handle undefined AI_WORKER_API_SECRET_KEY', async () => {
      const envUndefinedKey = {
        ...baseEnv,
        AI_WORKER_API_SECRET_KEY: undefined as any,
      };

      const request = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Test message',
          persona: 'professional',
        }),
      });

      const response = await worker.fetch(request, envUndefinedKey, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process preview');
    });

    it('should handle whitespace-only environment variables', async () => {
      const envWhitespaceKey = {
        ...baseEnv,
        AI_WORKER_API_SECRET_KEY: '   ',
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envWhitespaceKey, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should accept valid environment variables', async () => {
      // Mock successful AI Worker response
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed message'
      })));

      const request = new Request('http://localhost/api/test-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, baseEnv, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
    });

    it('should handle different ENVIRONMENT values', async () => {
      const environments = ['development', 'staging', 'production', 'test'];

      for (const environment of environments) {
        const envWithDifferentEnvironment = {
          ...baseEnv,
          ENVIRONMENT: environment as 'development' | 'production' | 'test',
        };

        const request = new Request('http://localhost/api/health', {
          method: 'GET',
        });

        const response = await worker.fetch(request, envWithDifferentEnvironment, mockCtx);

        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(data.status).toBe('ok');
      }
    });

    it('should handle missing ENVIRONMENT variable', async () => {
      const envMissingEnvironment = {
        ...baseEnv,
        ENVIRONMENT: undefined as any,
      };

      const request = new Request('http://localhost/api/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, envMissingEnvironment, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.status).toBe('ok');
    });
  });

  describe('KV Store Configuration', () => {
    it('should handle missing MESSAGE_QUEUE KV namespace', async () => {
      const envMissingKv = {
        ...baseEnv,
        MESSAGE_QUEUE: undefined as any,
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envMissingKv, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });

    it('should handle KV store operation failures', async () => {
      const envWithFailingKv = {
        ...baseEnv,
        MESSAGE_QUEUE: {
          get: vi.fn().mockRejectedValue(new Error('KV operation failed')),
          getWithMetadata: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
          list: vi.fn(),
        } as any,
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-ID': 'test-session',
        },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, envWithFailingKv, mockCtx);

      expect(response.status).toBe(500);
      const data = await response.json() as any;
      expect(data.error).toBe('Failed to process message');
    });
  });

  describe('Email Configuration', () => {
    it('should validate email address format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        '',
        '   ',
      ];

      for (const email of invalidEmails) {
        const envWithInvalidEmail = {
          ...baseEnv,
          RECIPIENT_EMAIL: email,
        };

        const request = new Request('http://localhost/api/test-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Test message' }),
        });

        const response = await worker.fetch(request, envWithInvalidEmail, mockCtx);

        expect(response.status).toBe(500);
        const data = await response.json() as any;
        expect(data.error).toBe('Failed to process message');
      }
    });

    it('should accept valid email addresses', async () => {
      const validEmails = [
        'user@domain.com',
        'test.email+tag@example.org',
        'user.name@domain.co.uk',
        'admin@localhost',
      ];

      // Mock successful API responses
      mockFetch.mockResolvedValue(new Response(JSON.stringify({
        result: 'Transformed message'
      })));

      for (const email of validEmails) {
        const envWithValidEmail = {
          ...baseEnv,
          RECIPIENT_EMAIL: email,
        };

        const request = new Request('http://localhost/api/test-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Test message' }),
        });

        const response = await worker.fetch(request, envWithValidEmail, mockCtx);

        expect(response.status).toBe(200);
        const data = await response.json() as any;
        expect(data.success).toBe(true);
      }
    });
  });

  describe('Security Considerations', () => {
    it('should not expose environment variables in error responses', async () => {
      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      const response = await worker.fetch(request, baseEnv, mockCtx);

      const responseText = await response.text();
      
      // Should not contain any sensitive information
      expect(responseText).not.toContain('test-ai-worker-key');
      expect(responseText).not.toContain('test-client-id');
      expect(responseText).not.toContain('test-client-secret');
      expect(responseText).not.toContain('test-refresh-token');
      expect(responseText).not.toContain('AI_WORKER_API_SECRET_KEY');
      expect(responseText).not.toContain('GMAIL_CLIENT_ID');
      expect(responseText).not.toContain('GMAIL_CLIENT_SECRET');
      expect(responseText).not.toContain('GMAIL_REFRESH_TOKEN');
    });

    it('should not log sensitive environment variables', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const envMissingKey = {
        ...baseEnv,
        AI_WORKER_API_SECRET_KEY: '',
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      await worker.fetch(request, envMissingKey, mockCtx);

      // Check that no sensitive data was logged
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('test-client-id');
      expect(logCalls).not.toContain('test-client-secret');
      expect(logCalls).not.toContain('test-refresh-token');
      expect(logCalls).not.toContain('recipient@example.com');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Development vs Production', () => {
    it('should handle development environment', async () => {
      const devEnv = {
        ...baseEnv,
        ENVIRONMENT: 'development' as const,
      };

      const request = new Request('http://localhost/api/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, devEnv, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.status).toBe('ok');
    });

    it('should handle production environment', async () => {
      const prodEnv = {
        ...baseEnv,
        ENVIRONMENT: 'production' as const,
      };

      const request = new Request('http://localhost/api/health', {
        method: 'GET',
      });

      const response = await worker.fetch(request, prodEnv, mockCtx);

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.status).toBe('ok');
    });
  });
});