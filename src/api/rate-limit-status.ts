import { Env } from '../types/env';
import { RateLimitStatus, ErrorResponse } from '../types/api';
import { RateLimiter } from '../lib/rate-limiter';

const rateLimiter = new RateLimiter();

export async function handleRateLimitStatus(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  try {
    // Generate rate limit key for the current request
    const rateLimitKey = rateLimiter.generateKey(request);
    
    // Get current rate limit status
    const status = await rateLimiter.getStatus(rateLimitKey, env);

    const response: RateLimitStatus = {
      remaining: status.remaining,
      reset: status.reset,
      limit: status.limit
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Rate limit status error:', error);
    
    const errorResponse: ErrorResponse = {
      error: 'Failed to get rate limit status'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}