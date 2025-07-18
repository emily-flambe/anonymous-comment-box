import { Env } from '../types/env';
// import { transformMessage } from '../lib/ai-transform'; // No longer needed - using PersonaTransformer for all transformations
import { queueMessage } from '../lib/queue';
import { SubmitRequest, SubmitResponse, ValidationLimits } from '../types/api';
import { RateLimiter, RateLimitError } from '../lib/rate-limiter';
import { PersonaTransformer, AIPersonaTransformerError } from '../lib/ai-persona-transformer';

const rateLimiter = new RateLimiter();

export async function handleSubmission(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  testMode: boolean = false
): Promise<Response> {
  try {
    // Parse request body
    const body = await request.json() as SubmitRequest;
    
    if (!body.message || typeof body.message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { message: rawMessage, persona, customPersona, sessionId } = body;
    const message = rawMessage.trim();

    // Validate message length
    if (message.length === 0) {
      return new Response(JSON.stringify({ error: 'Message cannot be empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (message.length > ValidationLimits.MESSAGE_MAX_LENGTH) {
      return new Response(JSON.stringify({ error: `Message too long (max ${ValidationLimits.MESSAGE_MAX_LENGTH} characters)` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate session ID if provided
    if (sessionId && typeof sessionId !== 'string') {
      return new Response(JSON.stringify({ error: 'Session ID must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check rate limit using new rate limiter
    const rateLimitKey = rateLimiter.generateKey(request);
    let rateLimitResult;
    
    try {
      rateLimitResult = await rateLimiter.checkLimit(rateLimitKey, env);
    } catch (error) {
      if (error instanceof RateLimitError) {
        const response: SubmitResponse = {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rateLimitRemaining: 0,
          rateLimitReset: error.resetTime
        };
        return new Response(JSON.stringify(response), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw error;
    }

    // Transform message with AI (using new persona system if specified, fallback to old system)
    let transformedMessage: string;
    try {
      // Check if AI service is configured
      let personaTransformer: PersonaTransformer;
      try {
        personaTransformer = new PersonaTransformer(env);
      } catch (error) {
        if (error instanceof AIPersonaTransformerError) {
          return new Response(JSON.stringify({ 
            success: false,
            error: `AI service configuration error: ${error.message}. This is likely a preview deployment issue - secrets may not be available.`
          }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw error;
      }
      
      if (persona || customPersona) {
        // Use new persona transformer
        const transformationResult = await personaTransformer.transformMessage(
          message,
          persona || '',
          customPersona
        );
        transformedMessage = transformationResult.transformedMessage;
      } else {
        // Fallback to existing transformation system with random persona
        const presetPersonas = ['internet-random', 'barely-literate', 'extremely-serious', 'super-nice'];
        const randomPersona = presetPersonas[Math.floor(Math.random() * presetPersonas.length)];
        const transformationResult = await personaTransformer.transformMessage(
          message,
          randomPersona,
          undefined
        );
        transformedMessage = transformationResult.transformedMessage;
      }
    } catch (error) {
      console.error('AI transformation failed:', error);
      
      if (error instanceof AIPersonaTransformerError) {
        return new Response(JSON.stringify({ 
          success: false,
          error: error.message 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        success: false,
        error: 'AI transformation service unavailable' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Queue message with random delay (or immediate if test mode)
    await queueMessage(transformedMessage, env, ctx, testMode);

    // Return success response with rate limit info
    const response: SubmitResponse = {
      success: true,
      rateLimitRemaining: rateLimitResult.remaining,
      rateLimitReset: rateLimitResult.reset
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Submission error:', error);
    
    const response: SubmitResponse = {
      success: false,
      error: 'Failed to process message'
    };
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}