import { Env } from '../types/env';

export interface RateLimitResult {
  remaining: number;
  reset: number; // Unix timestamp
  limit: number;
}

export interface RateLimitConfig {
  windowMs: number;      // 60000 (1 minute)
  maxRequests: number;   // 10
}

export class RateLimitError extends Error {
  constructor(
    public readonly count: number,
    public readonly resetTime: number,
    message: string = 'Rate limit exceeded'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      windowMs: 60000, // 1 minute
      maxRequests: 10,
      ...config,
    };
  }

  /**
   * Generate rate limiting key from IP and session ID
   */
  generateKey(request: Request): string {
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               request.headers.get('X-Real-IP') || 
               'unknown';
    const sessionId = request.headers.get('X-Session-ID') || 'default';
    return `rate_limit:${ip}:${sessionId}`;
  }

  /**
   * Check if request exceeds rate limit and increment counter
   */
  async checkLimit(key: string, env: Env): Promise<RateLimitResult> {
    // Use KV store as Redis alternative in Cloudflare Workers
    const current = await env.MESSAGE_QUEUE.get(key);
    const count = current ? parseInt(current) || 0 : 0;
    
    if (count >= this.config.maxRequests) {
      // Get TTL info from metadata
      const { metadata } = await env.MESSAGE_QUEUE.getWithMetadata(key);
      const resetTime = (metadata as { resetTime?: number })?.resetTime || Date.now() + this.config.windowMs;
      
      throw new RateLimitError(count, resetTime);
    }

    // Increment counter
    const newCount = count + 1;
    const resetTime = Date.now() + this.config.windowMs;
    
    // Store with TTL
    await env.MESSAGE_QUEUE.put(key, newCount.toString(), {
      expirationTtl: Math.floor(this.config.windowMs / 1000),
      metadata: { resetTime }
    });

    return {
      remaining: this.config.maxRequests - newCount,
      reset: resetTime,
      limit: this.config.maxRequests
    };
  }

  /**
   * Get current rate limit status without incrementing counter
   */
  async getStatus(key: string, env: Env): Promise<RateLimitResult> {
    const { value, metadata } = await env.MESSAGE_QUEUE.getWithMetadata(key);
    const count = value ? parseInt(value) || 0 : 0;
    const resetTime = (metadata as { resetTime?: number })?.resetTime || Date.now() + this.config.windowMs;

    return {
      remaining: Math.max(0, this.config.maxRequests - count),
      reset: resetTime,
      limit: this.config.maxRequests
    };
  }

  /**
   * Reset rate limit for a given key (for testing purposes)
   */
  async resetLimit(key: string, env: Env): Promise<void> {
    await env.MESSAGE_QUEUE.delete(key);
  }
}