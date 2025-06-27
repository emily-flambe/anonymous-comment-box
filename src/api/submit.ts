import { Env } from '../types/env';
import { transformMessage } from '../lib/ai-transform';
import { queueMessage } from '../lib/queue';

export async function handleSubmission(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as { message?: string };
    
    if (!body.message || typeof body.message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = body.message.trim();

    // Validate message length
    if (message.length === 0) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (message.length > 5000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 5000 characters)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitKey = `rate_limit_${clientIP}`;
    
    // Simple rate limiting check (10 per hour)
    const hourlyCount = await env.MESSAGE_QUEUE.get(rateLimitKey);
    if (hourlyCount && parseInt(hourlyCount) >= 10) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Transform message with AI
    const transformedMessage = await transformMessage(message, env);

    // Queue message with random delay
    await queueMessage(transformedMessage, env, ctx);

    // Update rate limit counter
    const currentCount = hourlyCount ? parseInt(hourlyCount) : 0;
    await env.MESSAGE_QUEUE.put(rateLimitKey, (currentCount + 1).toString(), {
      expirationTtl: 3600, // 1 hour
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Submission error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process message' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}