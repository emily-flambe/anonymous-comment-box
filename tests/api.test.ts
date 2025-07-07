import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleSubmission } from '../src/api/submit';
import type { Env } from '../src/types/env';

describe('API Submission Handler', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    mockEnv = {
      MESSAGE_QUEUE: {
        get: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        getWithMetadata: vi.fn(),
      } as any,
      RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: true }) },
      ANTHROPIC_API_KEY: 'test-key',
      AI_WORKER_API_SECRET_KEY: 'test-ai-worker-key',
      GMAIL_ACCESS_TOKEN: 'test-token',
      RECIPIENT_EMAIL: 'test@example.com',
      ENVIRONMENT: 'test',
    };

    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
      props: {} as any,
    } as ExecutionContext;
  });

  it('should reject empty message', async () => {
    const request = new Request('http://localhost/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '' }),
    });

    const response = await handleSubmission(request, mockEnv, mockCtx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect((data as any).error).toBe('Message cannot be empty');
  });

  it('should reject message over 2000 characters', async () => {
    const longMessage = 'a'.repeat(2001);
    const request = new Request('http://localhost/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: longMessage }),
    });

    const response = await handleSubmission(request, mockEnv, mockCtx);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect((data as any).error).toBe('Message too long (max 2000 characters)');
  });

  it('should enforce rate limiting', async () => {
    // Mock rate limit exceeded - set up for new rate limiter
    mockEnv.MESSAGE_QUEUE.get = vi.fn().mockResolvedValue('10');
    mockEnv.MESSAGE_QUEUE.getWithMetadata = vi.fn().mockResolvedValue({
      value: '10',
      metadata: { resetTime: Date.now() + 30000 }
    });

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
    expect((data as any).error).toContain('Rate limit exceeded');
  });
});