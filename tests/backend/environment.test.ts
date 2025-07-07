import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../../src/index';
import type { Env } from '../../src/types/env';

// Mock dependencies
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

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
      ANTHROPIC_API_KEY: 'test-api-key',
      AI_WORKER_API_SECRET_KEY: 'test-ai-worker-key',
      GMAIL_ACCESS_TOKEN: 'test-gmail-token',
      RECIPIENT_EMAIL: 'recipient@example.com',
      ENVIRONMENT: 'test',
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) } as any,
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any;
  });

  describe('Missing Environment Variables', () => {
    it('should handle missing ANTHROPIC_API_KEY', async () => {
      const envMissingKey = {
        ...baseEnv,
        ANTHROPIC_API_KEY: '',
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

    it('should handle missing GMAIL_ACCESS_TOKEN', async () => {
      const envMissingToken = {
        ...baseEnv,
        GMAIL_ACCESS_TOKEN: '',
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

    it('should handle undefined ANTHROPIC_API_KEY', async () => {
      const envUndefinedKey = {
        ...baseEnv,
        ANTHROPIC_API_KEY: undefined as any,
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
        ANTHROPIC_API_KEY: '   ',
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
      // Mock successful responses
      const mockAnthropic = await import('@anthropic-ai/sdk');
      const anthropicInstance = new mockAnthropic.default({ apiKey: 'test-key' });
      vi.mocked(anthropicInstance.messages.create).mockResolvedValue({
        content: [{ type: 'text', text: 'Transformed message', citations: [] }],
        usage: { input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: 0, service_tier: 'default' },
      } as any);

      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
        id: 'message-123',
      }), { status: 200 }));

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
      const mockAnthropic = await import('@anthropic-ai/sdk');
      const anthropicInstance = new mockAnthropic.default({ apiKey: 'test-key' });
      vi.mocked(anthropicInstance.messages.create).mockResolvedValue({
        content: [{ type: 'text', text: 'Transformed message', citations: [] }],
        usage: { input_tokens: 10, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, server_tool_use: 0, service_tier: 'default' },
      } as any);

      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
        id: 'message-123',
      }), { status: 200 }));

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
      expect(responseText).not.toContain('test-api-key');
      expect(responseText).not.toContain('test-gmail-token');
      expect(responseText).not.toContain('ANTHROPIC_API_KEY');
      expect(responseText).not.toContain('GMAIL_ACCESS_TOKEN');
    });

    it('should not log sensitive environment variables', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const envMissingKey = {
        ...baseEnv,
        ANTHROPIC_API_KEY: '',
      };

      const request = new Request('http://localhost/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      });

      await worker.fetch(request, envMissingKey, mockCtx);

      // Check that no sensitive data was logged
      const logCalls = consoleSpy.mock.calls.flat().join(' ');
      expect(logCalls).not.toContain('test-gmail-token');
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