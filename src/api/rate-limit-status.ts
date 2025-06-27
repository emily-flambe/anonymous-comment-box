import { Env } from '../types/env';
import { RateLimiter } from '../lib/rate-limiter';

export interface RateLimitStatus {
  remaining: number;
  reset: number;
  limit: number;
}

export async function handleRateLimitStatus(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const rateLimiter = new RateLimiter();
    const rateLimitKey = rateLimiter.generateKey(request);
    
    const status = await rateLimiter.getStatus(env.MESSAGE_QUEUE, rateLimitKey);
    
    const response: RateLimitStatus = {
      remaining: status.remaining,
      reset: status.reset,
      limit: 10 // From rate limiter config
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get rate limit status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}