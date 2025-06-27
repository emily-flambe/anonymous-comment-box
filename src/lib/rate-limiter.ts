export interface RateLimitResult {
  remaining: number;
  reset: number; // Unix timestamp
  allowed: boolean;
}

export interface RateLimitConfig {
  windowMs: number;      // 60000 (1 minute)
  maxRequests: number;   // 10
}

export class RateLimitError extends Error {
  constructor(
    public count: number,
    public resetTime: number,
    message: string = 'Rate limit exceeded'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }) {
    this.config = config;
  }

  /**
   * Generate rate limit key from request
   */
  generateKey(request: Request): string {
    const ip = request.headers.get('CF-Connecting-IP') || 
               request.headers.get('X-Forwarded-For') || 
               'unknown';
    const sessionId = request.headers.get('X-Session-ID') || '';
    return `rate_limit:${ip}:${sessionId}`;
  }

  /**
   * Check and update rate limit for a key
   */
  async checkLimit(kv: KVNamespace, key: string): Promise<RateLimitResult> {
    const current = await kv.get(key);
    const count = current ? parseInt(current) : 0;
    const resetTime = Date.now() + this.config.windowMs;
    
    if (count >= this.config.maxRequests) {
      // Get TTL to calculate actual reset time
      const metadata = await kv.getWithMetadata(key);
      const actualResetTime = metadata.metadata?.resetTime as number || resetTime;
      
      throw new RateLimitError(count, actualResetTime);
    }

    // Increment counter
    const newCount = count + 1;
    await kv.put(key, newCount.toString(), {
      expirationTtl: Math.floor(this.config.windowMs / 1000),
      metadata: { resetTime }
    });

    return {
      remaining: this.config.maxRequests - newCount,
      reset: resetTime,
      allowed: true
    };
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(kv: KVNamespace, key: string): Promise<RateLimitResult> {
    const current = await kv.get(key);
    const count = current ? parseInt(current) : 0;
    const resetTime = Date.now() + this.config.windowMs;
    
    // Get metadata for actual reset time
    const metadata = await kv.getWithMetadata(key);
    const actualResetTime = metadata.metadata?.resetTime as number || resetTime;

    return {
      remaining: Math.max(0, this.config.maxRequests - count),
      reset: actualResetTime,
      allowed: count < this.config.maxRequests
    };
  }

  /**
   * Reset rate limit for a key (useful for testing)
   */
  async reset(kv: KVNamespace, key: string): Promise<void> {
    await kv.delete(key);
  }
}