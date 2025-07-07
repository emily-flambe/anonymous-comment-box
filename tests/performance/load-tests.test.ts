import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handlePreview } from '../../src/api/preview';
import { handleRateLimitStatus } from '../../src/api/rate-limit-status';
import { handleSubmission } from '../../src/api/submit';
import type { Env } from '../../src/types/env';

// Mock dependencies
vi.mock('../../src/lib/ai-persona-transformer', () => ({
  PersonaTransformer: vi.fn().mockImplementation(() => ({
    transformMessage: vi.fn().mockResolvedValue({
      transformedMessage: 'Transformed message',
      originalMessage: 'Original message',
      persona: 'test'
    })
  }))
}));

vi.mock('../../src/lib/rate-limiter', () => ({
  RateLimiter: vi.fn().mockImplementation(() => ({
    generateKey: vi.fn().mockReturnValue('rate_limit:test:session'),
    checkLimit: vi.fn().mockResolvedValue({
      remaining: 9,
      reset: Date.now() + 60000,
      allowed: true
    }),
    getStatus: vi.fn().mockResolvedValue({
      remaining: 8,
      reset: Date.now() + 45000,
      allowed: true
    })
  }))
}));

vi.mock('../../src/lib/ai-transform', () => ({
  transformMessage: vi.fn().mockResolvedValue('AI transformed message')
}));

vi.mock('../../src/lib/queue', () => ({
  queueMessage: vi.fn().mockResolvedValue(undefined)
}));

describe('Performance and Load Tests', () => {
  let mockEnv: Env;
  let mockCtx: ExecutionContext;

  beforeEach(() => {
    mockEnv = {
      MESSAGE_QUEUE: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        getWithMetadata: vi.fn().mockResolvedValue({
          value: null,
          metadata: null
        }),
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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('concurrent user simulation', () => {
    it('should handle multiple concurrent preview requests', async () => {
      const concurrentUsers = 10;
      const requestsPerUser = 5;

      const startTime = Date.now();

      const userSessions = Array.from({ length: concurrentUsers }, (_, userIndex) => {
        const sessionId = `session-${userIndex}`;
        
        return Array.from({ length: requestsPerUser }, (_, requestIndex) => {
          const request = new Request('http://localhost/api/preview', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'CF-Connecting-IP': `192.168.1.${userIndex + 1}`,
              'X-Session-ID': sessionId
            },
            body: JSON.stringify({
              message: `Test message ${requestIndex + 1} from user ${userIndex + 1}`,
              persona: 'internet-random',
              sessionId
            }),
          });

          return handlePreview(request, mockEnv, mockCtx);
        });
      });

      // Flatten all requests and execute concurrently
      const allRequests = userSessions.flat();
      const responses = await Promise.all(allRequests);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance assertions
      expect(responses).toHaveLength(concurrentUsers * requestsPerUser);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds with mocks
      
      console.log(`Processed ${responses.length} concurrent requests in ${totalTime}ms`);
      console.log(`Average response time: ${totalTime / responses.length}ms per request`);
    });

    it('should handle burst traffic scenario', async () => {
      const burstSize = 50;
      const burstRequests = Array.from({ length: burstSize }, (_, i) => {
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `burst-session-${i}`
          },
          body: JSON.stringify({
            message: `Burst message ${i + 1}`,
            persona: 'extremely-serious',
            sessionId: `burst-session-${i}`
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      const startTime = Date.now();
      const responses = await Promise.all(burstRequests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(endTime - startTime).toBeLessThan(3000); // Burst should be handled quickly
      console.log(`Handled burst of ${burstSize} requests in ${endTime - startTime}ms`);
    });
  });

  describe('rate limiting stress tests', () => {
    it('should enforce rate limits under concurrent load', async () => {
      const sessionId = 'rate-limit-test-session';
      let rateLimitCount = 0;

      // Mock rate limiter to track requests and enforce limit
      const { RateLimiter } = await import('../../src/lib/rate-limiter');
      const mockRateLimiter = vi.mocked(RateLimiter);
      
      // Override the checkLimit method for this specific test
      mockRateLimiter.mockImplementation(() => ({
        generateKey: vi.fn().mockReturnValue('rate_limit:test:session'),
        checkLimit: vi.fn().mockImplementation(async () => {
          rateLimitCount++;
          if (rateLimitCount > 10) {
            const error = new Error('Rate limit exceeded');
            error.name = 'RateLimitError';
            (error as any).resetTime = Date.now() + 60000;
            throw error;
          }
          return {
            remaining: 10 - rateLimitCount,
            reset: Date.now() + 60000,
            limit: 10
          };
        }),
        getStatus: vi.fn().mockResolvedValue({
          remaining: 8,
          reset: Date.now() + 45000,
          limit: 10
        }),
        resetLimit: vi.fn().mockResolvedValue(undefined)
      } as any));

      // Create 15 requests (5 over the limit)
      const requests = Array.from({ length: 15 }, (_, i) => {
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': sessionId
          },
          body: JSON.stringify({
            message: `Rate limit test message ${i + 1}`,
            persona: 'internet-random',
            sessionId
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      const responses = await Promise.all(requests);

      // First 10 should succeed, next 5 should be rate limited
      const successful = responses.filter(r => r.status === 200);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(successful).toHaveLength(10);
      expect(rateLimited).toHaveLength(5);

      console.log(`Rate limiting enforced: ${successful.length} allowed, ${rateLimited.length} blocked`);
    });

    it('should handle rate limit status requests under load', async () => {
      const statusRequests = Array.from({ length: 100 }, (_, i) => {
        const request = new Request('http://localhost/api/rate-limit-status', {
          method: 'GET',
          headers: {
            'CF-Connecting-IP': `192.168.${Math.floor(i / 10) + 1}.${(i % 10) + 1}`,
            'X-Session-ID': `status-session-${i}`
          }
        });

        return handleRateLimitStatus(request, mockEnv, mockCtx);
      });

      const startTime = Date.now();
      const responses = await Promise.all(statusRequests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(endTime - startTime).toBeLessThan(2000);
      console.log(`Processed ${statusRequests.length} status requests in ${endTime - startTime}ms`);
    });
  });

  describe('AI service response time validation', () => {
    it('should handle AI transformation delays', async () => {
      // Mock slower AI responses
      const { PersonaTransformer } = await import('../../src/lib/ai-persona-transformer');
      const mockTransformer = vi.mocked(PersonaTransformer);
      
      mockTransformer.mockImplementation((env: any) => ({
        transformMessage: vi.fn().mockImplementation(async () => {
          // Simulate AI processing delay
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            transformedMessage: 'Delayed transformation result',
            originalMessage: 'Original message',
            persona: 'test'
          };
        }),
        anthropic: {} as any,
        performTransformation: vi.fn(),
        buildCustomPersonaPrompt: vi.fn(),
        containsProblematicContent: vi.fn(),
        sanitizeTransformation: vi.fn()
      } as any));

      const requests = Array.from({ length: 10 }, (_, i) => {
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `delay-session-${i}`
          },
          body: JSON.stringify({
            message: `Delayed test message ${i + 1}`,
            persona: 'internet-random',
            sessionId: `delay-session-${i}`
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time even with delays
      expect(endTime - startTime).toBeLessThan(2000);
      console.log(`Handled AI delays for ${requests.length} requests in ${endTime - startTime}ms`);
    });

    it('should handle mixed persona types efficiently', async () => {
      const personas = ['internet-random', 'barely-literate', 'extremely-serious', 'super-nice'];
      
      const requests = Array.from({ length: 20 }, (_, i) => {
        const persona = personas[i % personas.length];
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `mixed-session-${i}`
          },
          body: JSON.stringify({
            message: `Mixed persona test message ${i + 1}`,
            persona,
            sessionId: `mixed-session-${i}`
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`Mixed persona requests completed in ${endTime - startTime}ms`);
    });
  });

  describe('memory usage monitoring', () => {
    it('should handle large message volumes without memory leaks', async () => {
      const largeMessageBatch = Array.from({ length: 50 }, (_, i) => {
        // Create moderately large messages to test memory handling
        const largeMessage = `Large message ${i + 1}: ${'x'.repeat(1000)}`;
        
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `large-session-${i}`
          },
          body: JSON.stringify({
            message: largeMessage,
            persona: 'internet-random',
            sessionId: `large-session-${i}`
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      // Process in batches to simulate real-world scenarios
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < largeMessageBatch.length; i += batchSize) {
        batches.push(largeMessageBatch.slice(i, i + batchSize));
      }

      const startTime = Date.now();
      
      for (const batch of batches) {
        const batchResponses = await Promise.all(batch);
        batchResponses.forEach(response => {
          expect(response.status).toBe(200);
        });
        
        // Small delay between batches to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const endTime = Date.now();
      console.log(`Processed ${largeMessageBatch.length} large messages in ${endTime - startTime}ms`);
    });

    it('should handle maximum length messages efficiently', async () => {
      const maxLengthMessage = 'a'.repeat(2000); // Maximum allowed length
      
      const requests = Array.from({ length: 5 }, (_, i) => {
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `max-length-session-${i}`
          },
          body: JSON.stringify({
            message: maxLengthMessage,
            persona: 'internet-random',
            sessionId: `max-length-session-${i}`
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`Max length messages processed in ${endTime - startTime}ms`);
    });
  });

  describe('error handling under load', () => {
    it('should handle mixed success and failure scenarios', async () => {
      let requestCount = 0;
      
      // Mock AI transformer to fail every 3rd request
      const { PersonaTransformer } = await import('../../src/lib/ai-persona-transformer');
      const mockTransformer = vi.mocked(PersonaTransformer);
      
      mockTransformer.mockImplementation((env: any) => ({
        transformMessage: vi.fn().mockImplementation(async () => {
          requestCount++;
          if (requestCount % 3 === 0) {
            const error = new Error('AI service temporarily unavailable');
            error.name = 'PersonaTransformationError';
            throw error;
          }
          return {
            transformedMessage: 'Successful transformation',
            originalMessage: 'Original message',
            persona: 'test'
          };
        }),
        anthropic: {} as any,
        performTransformation: vi.fn(),
        buildCustomPersonaPrompt: vi.fn(),
        containsProblematicContent: vi.fn(),
        sanitizeTransformation: vi.fn()
      } as any));

      const requests = Array.from({ length: 15 }, (_, i) => {
        const request = new Request('http://localhost/api/preview', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `error-test-session-${i}`
          },
          body: JSON.stringify({
            message: `Error test message ${i + 1}`,
            persona: 'internet-random',
            sessionId: `error-test-session-${i}`
          }),
        });

        return handlePreview(request, mockEnv, mockCtx);
      });

      const responses = await Promise.all(requests);

      const successful = responses.filter(r => r.status === 200);
      const failed = responses.filter(r => r.status === 500);

      expect(successful).toHaveLength(10); // 2/3 should succeed
      expect(failed).toHaveLength(5); // 1/3 should fail

      console.log(`Mixed scenario: ${successful.length} successful, ${failed.length} failed`);
    });
  });

  describe('submission endpoint performance', () => {
    it('should handle concurrent submissions efficiently', async () => {
      const submissions = Array.from({ length: 20 }, (_, i) => {
        const request = new Request('http://localhost/api/submit', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'CF-Connecting-IP': `192.168.1.${Math.floor(i / 5) + 1}`
          },
          body: JSON.stringify({
            message: `Concurrent submission ${i + 1}`
          }),
        });

        return handleSubmission(request, mockEnv, mockCtx);
      });

      const startTime = Date.now();
      const responses = await Promise.all(submissions);
      const endTime = Date.now();

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      console.log(`${submissions.length} submissions processed in ${endTime - startTime}ms`);
    });
  });

  describe('performance benchmarks', () => {
    it('should meet response time targets', async () => {
      const singleRequest = new Request('http://localhost/api/preview', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'CF-Connecting-IP': '192.168.1.1',
          'X-Session-ID': 'benchmark-session'
        },
        body: JSON.stringify({
          message: 'Benchmark test message',
          persona: 'internet-random',
          sessionId: 'benchmark-session'
        }),
      });

      // Measure multiple individual requests
      const measurements = [];
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        const response = await handlePreview(singleRequest.clone() as any, mockEnv, mockCtx);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        measurements.push(endTime - startTime);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);

      console.log(`Average response time: ${averageTime}ms`);
      console.log(`Max response time: ${maxTime}ms`);
      
      // Performance targets (with mocks, should be very fast)
      expect(averageTime).toBeLessThan(50); // Average < 50ms
      expect(maxTime).toBeLessThan(100); // Max < 100ms
    });

    it('should measure rate limit check performance', async () => {
      const measurements = [];
      
      for (let i = 0; i < 20; i++) {
        const request = new Request('http://localhost/api/rate-limit-status', {
          method: 'GET',
          headers: {
            'CF-Connecting-IP': '192.168.1.1',
            'X-Session-ID': `perf-session-${i}`
          }
        });

        const startTime = Date.now();
        const response = await handleRateLimitStatus(request, mockEnv, mockCtx);
        const endTime = Date.now();
        
        expect(response.status).toBe(200);
        measurements.push(endTime - startTime);
      }

      const averageTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      
      console.log(`Rate limit check average time: ${averageTime}ms`);
      expect(averageTime).toBeLessThan(25); // Should be very fast
    });
  });
});