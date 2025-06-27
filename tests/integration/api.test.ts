import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockResponse,
  createMockPreviewResponse,
  createMockRateLimitStatus,
  waitFor
} from '../utils/test-helpers';

// Mock API endpoints that would be implemented in the actual backend
class MockAPIHandler {
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly RATE_LIMIT_MAX = 10;
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute

  async handlePreview(request: Request): Promise<Response> {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sessionId = body.sessionId || 'default';
    
    // Check rate limit
    const rateLimitResult = this.checkRateLimit(sessionId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before trying again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    if (!body.message || body.message.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 2000 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.customPersona && body.customPersona.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Custom persona description too long (max 500 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simulate AI transformation
    const transformedMessage = this.transformMessage(body.message, body.persona, body.customPersona);
    
    // Update rate limit
    this.updateRateLimit(sessionId);
    const updatedRateLimit = this.checkRateLimit(sessionId);

    const response = {
      transformedMessage,
      originalMessage: body.message,
      persona: body.persona || 'none',
      rateLimitRemaining: updatedRateLimit.remaining,
      rateLimitReset: updatedRateLimit.resetTime,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  async handleSubmit(request: Request): Promise<Response> {
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sessionId = body.sessionId || 'default';
    
    // Check rate limit
    const rateLimitResult = this.checkRateLimit(sessionId);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please wait before trying again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate request
    if (!body.message || body.message.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Message cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 2000 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simulate message processing and queuing
    const transformedMessage = this.transformMessage(body.message, body.persona, body.customPersona);
    
    // Update rate limit
    this.updateRateLimit(sessionId);

    const response = {
      success: true,
      message: 'Message queued for anonymous delivery',
      queuedAt: new Date().toISOString(),
      transformedMessage, // Include for testing purposes
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  async handleRateLimitStatus(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId') || 'default';
    
    const rateLimitResult = this.checkRateLimit(sessionId);
    
    const response = {
      remaining: rateLimitResult.remaining,
      reset: rateLimitResult.resetTime,
      limit: this.RATE_LIMIT_MAX,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  private checkRateLimit(sessionId: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.rateLimitStore.get(sessionId);
    
    if (!entry || now > entry.resetTime) {
      // Reset or initialize
      const resetTime = now + this.RATE_LIMIT_WINDOW;
      this.rateLimitStore.set(sessionId, { count: 0, resetTime });
      return { allowed: true, remaining: this.RATE_LIMIT_MAX, resetTime };
    }
    
    const remaining = Math.max(0, this.RATE_LIMIT_MAX - entry.count);
    return {
      allowed: entry.count < this.RATE_LIMIT_MAX,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  private updateRateLimit(sessionId: string): void {
    const entry = this.rateLimitStore.get(sessionId);
    if (entry) {
      entry.count += 1;
      this.rateLimitStore.set(sessionId, entry);
    }
  }

  private transformMessage(message: string, persona?: string, customPersona?: string): string {
    // Simple mock transformations
    if (customPersona) {
      return `[${customPersona}] ${message}`;
    }
    
    switch (persona) {
      case 'internet-random':
        return `${message} fr fr 💯`;
      case 'barely-literate':
        return message.toLowerCase().replace(/\./g, '').replace(/,/g, '');
      case 'extremely-serious':
        return `It is of paramount importance to note that ${message}`;
      case 'super-nice':
        return `I hope this feedback is helpful! ${message} Thank you for your consideration! 😊`;
      default:
        return message;
    }
  }

  // Test utilities
  public resetRateLimit(sessionId: string = 'default'): void {
    this.rateLimitStore.delete(sessionId);
  }

  public setRateLimit(sessionId: string, count: number): void {
    const resetTime = Date.now() + this.RATE_LIMIT_WINDOW;
    this.rateLimitStore.set(sessionId, { count, resetTime });
  }

  public simulateError(errorType: 'network' | 'server' | 'timeout' = 'server'): void {
    // This would be used to simulate different error conditions
    // Implementation would depend on how we want to inject errors
  }
}

describe('API Integration Tests', () => {
  let apiHandler: MockAPIHandler;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    apiHandler = new MockAPIHandler();
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Setup mock fetch to route to our API handler
    mockFetch.mockImplementation(async (url: string, options?: any) => {
      const urlObj = new URL(url, 'http://localhost');
      const pathname = urlObj.pathname;
      
      if (pathname.includes('/api/preview')) {
        const request = new Request(url, options);
        return await apiHandler.handlePreview(request);
      } else if (pathname.includes('/api/submit')) {
        const request = new Request(url, options);
        return await apiHandler.handleSubmit(request);
      } else if (pathname.includes('/api/rate-limit-status')) {
        const request = new Request(url, options);
        return await apiHandler.handleRateLimitStatus(request);
      }
      
      return new Response('Not Found', { status: 404 });
    });
  });

  describe('Preview API (/api/preview)', () => {
    it('should successfully generate preview with valid request', async () => {
      const requestBody = {
        message: 'Test message for preview',
        persona: 'internet-random',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.originalMessage).toBe('Test message for preview');
      expect(data.transformedMessage).toBe('Test message for preview fr fr 💯');
      expect(data.persona).toBe('internet-random');
      expect(data.rateLimitRemaining).toBe(9);
      expect(data.rateLimitReset).toBeGreaterThan(Date.now());
    });

    it('should handle custom persona transformations', async () => {
      const requestBody = {
        message: 'Test message',
        persona: 'custom',
        customPersona: 'Make it sound like a pirate',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.transformedMessage).toBe('[Make it sound like a pirate] Test message');
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(2001);
      const requestBody = {
        message: longMessage,
        persona: 'none',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message too long (max 2000 characters)');
    });

    it('should validate custom persona length', async () => {
      const longPersona = 'a'.repeat(501);
      const requestBody = {
        message: 'Test message',
        persona: 'custom',
        customPersona: longPersona,
        sessionId: 'test-session',
      };

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Custom persona description too long (max 500 characters)');
    });

    it('should reject empty messages', async () => {
      const requestBody = {
        message: '',
        persona: 'none',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message cannot be empty');
    });

    it('should handle all preset personas correctly', async () => {
      const personas = [
        { key: 'internet-random', expectedSuffix: ' fr fr 💯' },
        { key: 'barely-literate', expectedTransform: 'test message' },
        { key: 'extremely-serious', expectedPrefix: 'It is of paramount importance to note that ' },
        { key: 'super-nice', expectedSuffix: ' Thank you for your consideration! 😊' },
      ];

      for (const persona of personas) {
        const requestBody = {
          message: 'Test message',
          persona: persona.key,
          sessionId: `test-session-${persona.key}`,
        };

        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        expect(response.status).toBe(200);
        
        if (persona.expectedSuffix) {
          expect(data.transformedMessage).toContain(persona.expectedSuffix);
        }
        if (persona.expectedPrefix) {
          expect(data.transformedMessage).toContain(persona.expectedPrefix);
        }
        if (persona.expectedTransform) {
          expect(data.transformedMessage).toBe(persona.expectedTransform);
        }
      }
    });
  });

  describe('Submit API (/api/submit)', () => {
    it('should successfully submit message with persona', async () => {
      const requestBody = {
        message: 'Test submission message',
        persona: 'super-nice',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Message queued for anonymous delivery');
      expect(data.queuedAt).toBeDefined();
      expect(data.transformedMessage).toContain('Thank you for your consideration! 😊');
    });

    it('should submit with custom persona', async () => {
      const requestBody = {
        message: 'Custom submission',
        persona: 'custom',
        customPersona: 'Make it sound professional',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.transformedMessage).toBe('[Make it sound professional] Custom submission');
    });

    it('should validate message length for submission', async () => {
      const longMessage = 'a'.repeat(2001);
      const requestBody = {
        message: longMessage,
        persona: 'none',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message too long (max 2000 characters)');
    });

    it('should reject empty message submissions', async () => {
      const requestBody = {
        message: '   ',
        persona: 'none',
        sessionId: 'test-session',
      };

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Message cannot be empty');
    });
  });

  describe('Rate Limit Status API (/api/rate-limit-status)', () => {
    it('should return current rate limit status', async () => {
      const response = await fetch('/api/rate-limit-status?sessionId=test-session');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.remaining).toBe(10);
      expect(data.limit).toBe(10);
      expect(data.reset).toBeGreaterThan(Date.now());
    });

    it('should return updated status after API usage', async () => {
      // First, use the preview API
      await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          sessionId: 'test-session',
        }),
      });

      // Then check rate limit status
      const response = await fetch('/api/rate-limit-status?sessionId=test-session');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.remaining).toBe(9);
      expect(data.limit).toBe(10);
    });

    it('should handle missing session ID', async () => {
      const response = await fetch('/api/rate-limit-status');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.remaining).toBe(10);
      expect(data.limit).toBe(10);
    });
  });

  describe('Rate Limiting Enforcement', () => {
    it('should enforce rate limits across preview and submit', async () => {
      const sessionId = 'rate-limit-test';
      
      // Make 10 requests (hitting the limit)
      for (let i = 0; i < 10; i++) {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Test message ${i}`,
            sessionId,
          }),
        });
        
        expect(response.status).toBe(200);
      }

      // 11th request should be rate limited
      const rateLimitedResponse = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'This should be rate limited',
          sessionId,
        }),
      });

      expect(rateLimitedResponse.status).toBe(429);
      const data = await rateLimitedResponse.json();
      expect(data.error).toContain('Rate limit exceeded');
    });

    it('should apply rate limits to submit API as well', async () => {
      const sessionId = 'submit-rate-limit-test';
      
      // Set rate limit to near max
      apiHandler.setRateLimit(sessionId, 9);

      // Submit should work once
      const response1 = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'First submit',
          sessionId,
        }),
      });
      expect(response1.status).toBe(200);

      // Second submit should be rate limited
      const response2 = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Second submit',
          sessionId,
        }),
      });
      expect(response2.status).toBe(429);
    });

    it('should track rate limits separately per session', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Use up rate limit for session1
      apiHandler.setRateLimit(session1, 10);

      // Session1 should be rate limited
      const response1 = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Session 1 message',
          sessionId: session1,
        }),
      });
      expect(response1.status).toBe(429);

      // Session2 should still work
      const response2 = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Session 2 message',
          sessionId: session2,
        }),
      });
      expect(response2.status).toBe(200);
    });

    it('should reset rate limits after time window', async () => {
      const sessionId = 'reset-test';
      
      // Simulate rate limit expiry by resetting
      apiHandler.setRateLimit(sessionId, 10);
      
      // Should be rate limited initially
      const response1 = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Should be rate limited',
          sessionId,
        }),
      });
      expect(response1.status).toBe(429);

      // Reset the rate limit manually (simulating time passage)
      apiHandler.resetRateLimit(sessionId);

      // Should work after reset
      const response2 = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Should work after reset',
          sessionId,
        }),
      });
      expect(response2.status).toBe(200);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should handle missing Content-Type header', async () => {
      const response = await fetch('/api/preview', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
          sessionId: 'test',
        }),
      });

      // Should still work (request body parsing should handle this)
      expect(response.status).toBe(200);
    });

    it('should handle empty request body', async () => {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should handle missing required fields', async () => {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: 'internet-random',
          sessionId: 'test',
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Message cannot be empty');
    });

    it('should handle unknown persona types gracefully', async () => {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          persona: 'unknown-persona-type',
          sessionId: 'test',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      // Should fall back to no transformation
      expect(data.transformedMessage).toBe('Test message');
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should preserve original message in all responses', async () => {
      const originalMessage = 'This is the original message that should be preserved';
      
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: originalMessage,
          persona: 'internet-random',
          sessionId: 'test',
        }),
      });

      const data = await response.json();
      expect(data.originalMessage).toBe(originalMessage);
    });

    it('should return consistent persona information', async () => {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          persona: 'extremely-serious',
          sessionId: 'test',
        }),
      });

      const data = await response.json();
      expect(data.persona).toBe('extremely-serious');
    });

    it('should handle unicode and special characters correctly', async () => {
      const messageWithUnicode = 'Test message with unicode: 🌟 and special chars: <>&"\'';
      
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageWithUnicode,
          persona: 'none',
          sessionId: 'test',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.originalMessage).toBe(messageWithUnicode);
      expect(data.transformedMessage).toBe(messageWithUnicode);
    });

    it('should handle very long valid messages correctly', async () => {
      const longMessage = 'a'.repeat(2000); // Max allowed length
      
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: longMessage,
          persona: 'none',
          sessionId: 'test',
        }),
      });

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.originalMessage).toBe(longMessage);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          fetch('/api/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Concurrent message ${i}`,
              persona: 'internet-random',
              sessionId: `concurrent-${i}`,
            }),
          })
        );
      }

      const responses = await Promise.all(promises);
      
      for (let i = 0; i < responses.length; i++) {
        expect(responses[i].status).toBe(200);
        const data = await responses[i].json();
        expect(data.originalMessage).toBe(`Concurrent message ${i}`);
      }
    });

    it('should handle rapid sequential requests from same session', async () => {
      const sessionId = 'rapid-test';
      const responses = [];

      for (let i = 0; i < 5; i++) {
        const response = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Rapid message ${i}`,
            persona: 'none',
            sessionId,
          }),
        });
        responses.push(response);
      }

      // All should succeed (within rate limit)
      for (let i = 0; i < responses.length; i++) {
        expect(responses[i].status).toBe(200);
      }

      // Rate limit should be properly tracked
      const statusResponse = await fetch(`/api/rate-limit-status?sessionId=${sessionId}`);
      const statusData = await statusResponse.json();
      expect(statusData.remaining).toBe(5); // 10 - 5 = 5
    });
  });
});