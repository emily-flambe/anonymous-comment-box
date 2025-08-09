import { Env } from './types/env';
import { handleSubmission } from './api/submit';
import { handlePreview } from './api/preview';
import { handleRateLimitStatus } from './api/rate-limit-status';
import { handleStaticAssets } from './lib/static';
import { AIClientError } from './lib/ai-client';
import { 
  handleDebugEmailStatus, 
  handleDebugQueueStatus, 
  handleDebugTokenStatus, 
  handleDebugSendTestEmail 
} from './api/debug';
import { handleProcessQueue } from './api/process-queue';

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
          
          // Use the correct AI worker API endpoint (matching chat-bgd project)
          try {
            console.log('🤖 Making request to AI worker with message:', message);
            const aiResponse = await fetch('https://ai-worker.emily-cogsdill.workers.dev/api/v1/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Anonymous-Comment-Box/1.0',
              },
              body: JSON.stringify({
                input: message
              })
            });
            
            console.log('🤖 AI worker response status:', aiResponse.status);
            console.log('🤖 AI worker response headers:', Object.fromEntries(aiResponse.headers.entries()));
            
            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              console.error('🤖 AI worker error response:', errorText);
              
              let errorMessage = 'AI service temporarily unavailable';
              if (aiResponse.status === 429) {
                errorMessage = 'Too many requests. Please wait a moment.';
              } else if (aiResponse.status >= 500) {
                errorMessage = 'AI service error. Please try again later.';
              }
              
              return new Response(JSON.stringify({ error: errorMessage }), {
                status: aiResponse.status === 429 ? 429 : 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
            }
            
            const aiData = await aiResponse.json() as any;
            console.log('🤖 AI worker response data:', aiData);
            
            // Extract response text from the complex structure
            let responseText = 'No response received';
            let reasoningText = null;
            
            if (aiData.output && Array.isArray(aiData.output)) {
              console.log('🤖 Found output array with', aiData.output.length, 'items');
              
              // Look for the assistant message in the output array
              const assistantMessage = aiData.output.find((item: any) => 
                item.type === 'message' && item.role === 'assistant'
              );
              
              if (assistantMessage && assistantMessage.content && Array.isArray(assistantMessage.content)) {
                console.log('🤖 Assistant content array has', assistantMessage.content.length, 'items');
                
                // Extract the main text response
                const textContent = assistantMessage.content.find((content: any) => content.type === 'output_text');
                if (textContent && textContent.text) {
                  responseText = textContent.text;
                  console.log('🤖 Extracted response text:', responseText);
                }
              }
              
              // Extract reasoning if present
              const reasoningObject = aiData.output.find((item: any) => item.type === 'reasoning');
              if (reasoningObject && reasoningObject.content && Array.isArray(reasoningObject.content)) {
                const reasoningContent = reasoningObject.content.find((content: any) => content.type === 'reasoning_text');
                if (reasoningContent && reasoningContent.text) {
                  reasoningText = reasoningContent.text;
                  console.log('🤖 Extracted reasoning text:', reasoningText);
                }
              }
            }
            
            // Also check for reasoning in the top-level object
            if (aiData.reasoning && typeof aiData.reasoning === 'object') {
              reasoningText = JSON.stringify(aiData.reasoning, null, 2);
            }
            
            console.log('🤖 Final response text:', responseText);
            console.log('🤖 Final reasoning:', reasoningText);
            
            return new Response(JSON.stringify({ 
              response: responseText,
              reasoning: reasoningText
            }), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          } catch (fetchError) {
            console.error('🤖 AI worker fetch error:', fetchError);
            return new Response(JSON.stringify({ 
              error: `Failed to connect to AI service: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
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

      // Process queue endpoint (for scheduled worker)
      if (url.pathname === '/api/process-queue' && request.method === 'POST') {
        const response = await handleProcessQueue(request, env, ctx);
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

  // Scheduled worker for processing queued messages
  async scheduled(event: any, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled worker triggered:', event.cron);
    
    try {
      const result = await handleProcessQueue(
        new Request('http://localhost/api/process-queue', { method: 'POST' }),
        env,
        ctx
      );
      
      const data = await result.json();
      console.log('Scheduled queue processing result:', data);
    } catch (error) {
      console.error('Scheduled worker error:', error);
    }
  },
};