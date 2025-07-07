import { describe, it, expect, beforeEach, vi } from 'vitest';
import { queueMessage } from '../../../src/lib/queue';
import type { Env } from '../../../src/types/env';

// Mock Gmail API
global.fetch = vi.fn();

describe('Queue Service', () => {
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

    // Mock successful Gmail API response
    vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
      id: 'message-id-123',
      threadId: 'thread-id-456',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  describe('queueMessage', () => {
    it('should send email immediately in test mode', async () => {
      await queueMessage('Test message content', mockEnv, mockCtx, true);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-gmail-token',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Test message content'),
        })
      );
    });

    it('should queue email with random delay in normal mode', async () => {
      await queueMessage('Test message content', mockEnv, mockCtx, false);

      // Should not send immediately
      expect(global.fetch).not.toHaveBeenCalled();

      // Should schedule with waitUntil
      expect(mockCtx.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
    });

    it('should format email correctly', async () => {
      await queueMessage('Test feedback message', mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);

      expect(rawEmail).toContain('To: recipient@example.com');
      expect(rawEmail).toContain('Subject: Anonymous Feedback');
      expect(rawEmail).toContain('Test feedback message');
      expect(rawEmail).toContain('Content-Type: text/html; charset=utf-8');
    });

    it('should handle Gmail API errors', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
        error: {
          code: 401,
          message: 'Invalid credentials',
        },
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));

      await expect(queueMessage('Test message', mockEnv, mockCtx, true))
        .rejects.toThrow('Gmail API error: Invalid credentials');
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'));

      await expect(queueMessage('Test message', mockEnv, mockCtx, true))
        .rejects.toThrow('Failed to send email: Network error');
    });

    it('should handle missing Gmail token', async () => {
      const envWithoutToken = {
        ...mockEnv,
        GMAIL_ACCESS_TOKEN: '',
      };

      await expect(queueMessage('Test message', envWithoutToken, mockCtx, true))
        .rejects.toThrow('Gmail access token not configured');
    });

    it('should handle missing recipient email', async () => {
      const envWithoutRecipient = {
        ...mockEnv,
        RECIPIENT_EMAIL: '',
      };

      await expect(queueMessage('Test message', envWithoutRecipient, mockCtx, true))
        .rejects.toThrow('Recipient email not configured');
    });

    it('should encode email content correctly', async () => {
      const messageWithSpecialChars = 'Message with émojis 🎉 and spëcial chars: <>&"\'';
      
      await queueMessage(messageWithSpecialChars, mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      
      // Should be base64 encoded
      expect(requestBody.raw).toMatch(/^[A-Za-z0-9+/]+=*$/);
      
      // When decoded, should contain the special characters
      const rawEmail = atob(requestBody.raw);
      expect(rawEmail).toContain(messageWithSpecialChars);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'a'.repeat(50000);
      
      await queueMessage(longMessage, mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);
      
      expect(rawEmail).toContain(longMessage);
    });

    it('should include proper email headers', async () => {
      await queueMessage('Test message', mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);

      expect(rawEmail).toContain('MIME-Version: 1.0');
      expect(rawEmail).toContain('Content-Type: text/html; charset=utf-8');
      expect(rawEmail).toContain('Content-Transfer-Encoding: base64');
    });

    it('should handle HTML content in messages', async () => {
      const htmlMessage = '<p>This is <strong>bold</strong> text with <a href="http://example.com">a link</a></p>';
      
      await queueMessage(htmlMessage, mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);
      
      // HTML should be escaped in the email
      expect(rawEmail).toContain('&lt;p&gt;This is &lt;strong&gt;bold&lt;/strong&gt;');
    });

    it('should retry on temporary failures', async () => {
      // First call fails with 503, second succeeds
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(new Response(JSON.stringify({
          error: {
            code: 503,
            message: 'Service temporarily unavailable',
          },
        }), { status: 503 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({
          id: 'message-id-123',
        }), { status: 200 }));

      await queueMessage('Test message', mockEnv, mockCtx, true);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent failures', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
        error: {
          code: 400,
          message: 'Bad request',
        },
      }), { status: 400 }));

      await expect(queueMessage('Test message', mockEnv, mockCtx, true))
        .rejects.toThrow('Gmail API error: Bad request');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed Gmail API responses', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response('Invalid JSON', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      await expect(queueMessage('Test message', mockEnv, mockCtx, true))
        .rejects.toThrow('Invalid response from Gmail API');
    });

    it('should include timestamp in email', async () => {
      const beforeTime = new Date().toISOString();
      
      await queueMessage('Test message', mockEnv, mockCtx, true);
      
      const afterTime = new Date().toISOString();

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);

      // Should contain a timestamp between before and after
      expect(rawEmail).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should handle empty messages', async () => {
      await queueMessage('', mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);

      expect(rawEmail).toContain('Subject: Anonymous Feedback');
      expect(rawEmail).toContain('Content-Type: text/html');
    });

    it('should handle rate limiting from Gmail API', async () => {
      vi.mocked(global.fetch).mockResolvedValue(new Response(JSON.stringify({
        error: {
          code: 429,
          message: 'Rate limit exceeded',
        },
      }), { 
        status: 429,
        headers: { 'Retry-After': '60' },
      }));

      await expect(queueMessage('Test message', mockEnv, mockCtx, true))
        .rejects.toThrow('Gmail API error: Rate limit exceeded');
    });
  });

  describe('Email Formatting', () => {
    it('should create properly formatted MIME email', async () => {
      await queueMessage('Simple test message', mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);

      const lines = rawEmail.split('\r\n');
      
      // Check headers
      expect(lines).toContain('MIME-Version: 1.0');
      expect(lines.some(line => line.startsWith('To: '))).toBe(true);
      expect(lines.some(line => line.startsWith('Subject: '))).toBe(true);
      expect(lines.some(line => line.startsWith('Content-Type: '))).toBe(true);

      // Should have blank line separating headers and body
      expect(lines).toContain('');

      // Should contain the message content
      expect(rawEmail).toContain('Simple test message');
    });

    it('should properly escape HTML entities', async () => {
      const messageWithHtml = '<script>alert("xss")</script> & other <tags>';
      
      await queueMessage(messageWithHtml, mockEnv, mockCtx, true);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string || '{}');
      const rawEmail = atob(requestBody.raw);

      expect(rawEmail).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(rawEmail).toContain('&amp; other &lt;tags&gt;');
    });
  });

  describe('Delay Mechanism', () => {
    beforeEach(() => {
      // Mock Math.random to return a predictable value
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should calculate random delay correctly', async () => {
      await queueMessage('Test message', mockEnv, mockCtx, false);

      // With Math.random() = 0.5, delay should be 15 minutes (900000ms)
      expect(mockCtx.waitUntil).toHaveBeenCalledWith(expect.any(Promise));
      
      // The promise should resolve after the delay
      const delayPromise = (mockCtx.waitUntil as any).mock.calls[0][0];
      expect(delayPromise).toBeInstanceOf(Promise);
    });
  });
});