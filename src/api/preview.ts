import { Env } from '../types/env';
import { PreviewRequest, PreviewResponse, ErrorResponse, ValidationLimits } from '../types/api';
import { RateLimiter, RateLimitError } from '../lib/rate-limiter';
import { PersonaTransformer, AIPersonaTransformerError } from '../lib/ai-persona-transformer';

const rateLimiter = new RateLimiter();

export async function handlePreview(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  try {
    // Parse and validate request body
    const body = await request.json() as PreviewRequest;
    
    const validationError = validatePreviewRequest(body);
    if (validationError) {
      return createErrorResponse(validationError.error, validationError.status);
    }

    const { message, persona, customPersona } = body;

    // Check rate limiting
    const rateLimitKey = rateLimiter.generateKey(request);
    
    try {
      const rateLimitResult = await rateLimiter.checkLimit(rateLimitKey, env);
      
      // Transform message with persona
      let personaTransformer: PersonaTransformer;
      try {
        personaTransformer = new PersonaTransformer(env);
      } catch (error) {
        if (error instanceof AIPersonaTransformerError) {
          return createErrorResponse(
            `AI service configuration error: ${error.message}. This is likely a preview deployment issue - secrets may not be available.`,
            503
          );
        }
        throw error;
      }
      
      const transformationResult = await personaTransformer.transformMessage(
        message,
        persona || '',
        customPersona
      );

      // Format the email preview to match actual email format
      const emailPreview = formatEmailPreview(transformationResult.transformedMessage, env);
      
      const response: PreviewResponse = {
        transformedMessage: transformationResult.transformedMessage,
        originalMessage: transformationResult.originalMessage,
        persona: transformationResult.persona,
        rateLimitRemaining: rateLimitResult.remaining,
        rateLimitReset: rateLimitResult.reset,
        fallbackUsed: transformationResult.fallbackUsed,
        error: transformationResult.error,
        emailPreview: emailPreview
      };

      // Log if transformation failed silently
      if (transformationResult.fallbackUsed || transformationResult.error) {
        console.warn('Transformation used fallback:', {
          fallbackUsed: transformationResult.fallbackUsed,
          error: transformationResult.error,
          persona: transformationResult.persona
        });
      }

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } catch (error) {
      if (error instanceof RateLimitError) {
        return createErrorResponse(
          'Rate limit exceeded. Please try again later.',
          429,
          {
            rateLimitRemaining: 0,
            rateLimitReset: error.resetTime,
            rateLimitLimit: ValidationLimits.RATE_LIMIT_MAX_REQUESTS
          }
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Preview error:', error);
    
    if (error instanceof AIPersonaTransformerError) {
      return createErrorResponse(error.message, 400);
    }

    if (error instanceof SyntaxError) {
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    return createErrorResponse('Failed to process preview request', 500);
  }
}

function validatePreviewRequest(body: any): { error: string; status: number } | null {
  if (!body || typeof body !== 'object') {
    return { error: 'Request body must be a JSON object', status: 400 };
  }

  if (!body.message || typeof body.message !== 'string') {
    return { error: 'Message is required and must be a string', status: 400 };
  }

  if (body.message.length < ValidationLimits.MESSAGE_MIN_LENGTH) {
    return { error: 'Message cannot be empty', status: 400 };
  }

  if (body.message.length > ValidationLimits.MESSAGE_MAX_LENGTH) {
    return { error: `Message too long (max ${ValidationLimits.MESSAGE_MAX_LENGTH} characters)`, status: 400 };
  }

  if (!body.sessionId || typeof body.sessionId !== 'string') {
    return { error: 'Session ID is required', status: 400 };
  }

  if (body.persona && typeof body.persona !== 'string') {
    return { error: 'Persona must be a string', status: 400 };
  }

  if (body.customPersona) {
    if (typeof body.customPersona !== 'string') {
      return { error: 'Custom persona must be a string', status: 400 };
    }
    
    if (body.customPersona.length > ValidationLimits.CUSTOM_PERSONA_MAX_LENGTH) {
      return { error: `Custom persona too long (max ${ValidationLimits.CUSTOM_PERSONA_MAX_LENGTH} characters)`, status: 400 };
    }
  }

  return null;
}

function formatEmailPreview(message: string, env: Env): string {
  // Return only the transformed message content for preview
  return message;
}

function createErrorResponse(message: string, status: number, additionalData?: any): Response {
  const errorResponse: ErrorResponse & any = {
    error: message,
    ...additionalData
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}