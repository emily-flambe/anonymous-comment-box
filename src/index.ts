import { Env } from './types/env';
import { handleSubmission } from './api/submit';
import { handleStaticAssets } from './lib/static';
import { createAIClient, AIClientError } from './lib/ai-client';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers for API responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // API Routes
      if (url.pathname === '/api/submit' && request.method === 'POST') {
        const response = await handleSubmission(request, env, ctx);
        return new Response(response.body, {
          status: response.status,
          headers: { ...response.headers, ...corsHeaders },
        });
      }

      // Test endpoint for immediate email delivery
      if (url.pathname === '/api/test-submit' && request.method === 'POST') {
        const response = await handleSubmission(request, env, ctx, true); // Enable test mode
        return new Response(response.body, {
          status: response.status,
          headers: { ...response.headers, ...corsHeaders },
        });
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
          
          const aiClient = createAIClient(env);
          const response = await aiClient.complete(message, {
            temperature: 0.7,
            max_tokens: 1000,
            systemPrompt: 'You are a helpful AI assistant. Be concise but friendly in your responses.'
          });
          
          return new Response(JSON.stringify({ response }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
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

      // AI test page
      if (url.pathname === '/ai-test') {
        return handleStaticAssets(request, url);
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