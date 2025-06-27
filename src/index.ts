import { Env } from './types/env';
import { handleSubmission } from './api/submit';
import { handlePreview } from './api/preview';
import { handleRateLimitStatus } from './api/rate-limit-status';
import { handleStaticAssets } from './lib/static';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers for API responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-ID',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (url.pathname === '/api/submit' && request.method === 'POST') {
        const response = await handleSubmission(request, env, ctx);
        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Preview endpoint for message transformation
      if (url.pathname === '/api/preview' && request.method === 'POST') {
        const response = await handlePreview(request, env, ctx);
        // Add CORS headers to the response
        Object.entries(corsHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      // Rate limit status endpoint
      if (url.pathname === '/api/rate-limit-status' && request.method === 'GET') {
        const response = await handleRateLimitStatus(request, env);
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

      // Health check
      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // Static assets and frontend
      return handleStaticAssets(request, url);
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};