import { Env } from './types/env';
import { handleSubmission } from './api/submit';
import { handlePreview } from './api/preview';
import { handleRateLimitStatus } from './api/rate-limit-status';
import { handleStaticAssets } from './lib/static';
import { createAIClient, AIClientError } from './lib/ai-client';
import { 
  handleDebugEmailStatus, 
  handleDebugQueueStatus, 
  handleDebugTokenStatus, 
  handleDebugSendTestEmail 
} from './api/debug';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Debug logging at the very start
    console.log('🚀 Worker Debug - Request received:', {
      url: request.url,
      pathname: url.pathname,
      method: request.method,
      hostname: url.hostname,
      origin: url.origin
    });
    console.log('🚀 Worker Debug - Environment available:', !!env);
    console.log('🚀 Worker Debug - Env keys:', Object.keys(env || {}));
    
    // CORS headers for API responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      console.log('🚀 Worker Debug - Handling OPTIONS request');
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (url.pathname === '/api/submit' && request.method === 'POST') {
        console.log('🚀 Worker Debug - Matched /api/submit route');
        const response = await handleSubmission(request, env, ctx);
        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Preview endpoint for message transformation
      if (url.pathname === '/api/preview' && request.method === 'POST') {
        console.log('🚀 Worker Debug - Matched /api/preview route');
        const response = await handlePreview(request, env, ctx);
        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Rate limit status endpoint
      if (url.pathname === '/api/rate-limit-status' && request.method === 'GET') {
        const response = await handleRateLimitStatus(request, env, ctx);
        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Test endpoint for immediate email delivery
      if (url.pathname === '/api/test-submit' && request.method === 'POST') {
        const response = await handleSubmission(request, env, ctx, true); // Enable test mode
        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Chat endpoint
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        try {
          const body = await request.json() as { message?: string };
          const { message } = body;
          
          if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Message is required and must be a string' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }
          
          // Use workers.dev URL to avoid custom domain 522 issue
          try {
            const aiResponse = await fetch('https://ai-worker-api.emily-cogsdill.workers.dev/api/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.AI_WORKER_API_SECRET_KEY}`,
              },
              body: JSON.stringify({
                messages: [{ role: 'user', content: message }],
                model: '@cf/meta/llama-3.1-8b-instruct',
                temperature: 0.7,
                max_tokens: 100
              })
            });
            
            if (!aiResponse.ok) {
              return new Response(JSON.stringify({ 
                error: `AI worker returned ${aiResponse.status}: ${aiResponse.statusText}`,
                debug: `Response headers: ${JSON.stringify(Array.from(aiResponse.headers.entries()))}`
              }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
            }
            
            const aiData = await aiResponse.json() as any;
            const reply = aiData.choices?.[0]?.message?.content || 'No response content';
            
            return new Response(JSON.stringify({ response: reply }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          } catch (fetchError) {
            console.error('Workers.dev fetch error:', fetchError);
            return new Response(JSON.stringify({ 
              error: `Workers.dev fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
              debug: `Trying to reach ai-worker-api.emily-cogsdill.workers.dev`
            }), {
              status: 500,
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }
        } catch (error) {
          console.error('Chat API error:', error);
          
          let errorMessage = 'An error occurred while processing your request';
          if (error instanceof AIClientError) {
            errorMessage = error.message;
          }
          
          return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
      }

      // Health check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Debug endpoints
      if (url.pathname === '/api/debug/email-status' && request.method === 'GET') {
        const response = await handleDebugEmailStatus(request, env, ctx);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (url.pathname === '/api/debug/queue-status' && request.method === 'GET') {
        const response = await handleDebugQueueStatus(request, env, ctx);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (url.pathname === '/api/debug/token-status' && request.method === 'GET') {
        const response = await handleDebugTokenStatus(request, env, ctx);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      if (url.pathname === '/api/debug/send-test-email' && request.method === 'POST') {
        const response = await handleDebugSendTestEmail(request, env, ctx);
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // AI test page
      if (url.pathname === '/ai-test') {
        return handleStaticAssets(request, url);
      }

      // Email test page
      if (url.pathname === '/test-email') {
        return handleStaticAssets(request, url);
      }

      // Static assets and frontend
      return handleStaticAssets(request, url, env);
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};