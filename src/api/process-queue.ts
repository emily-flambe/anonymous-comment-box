import { Env } from '../types/env';
import { processQueuedMessages } from '../lib/queue';

export async function handleProcessQueue(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // This endpoint should only be called by Cloudflare's scheduled workers
    // For security, we could add an authorization header check here
    
    console.log('Processing queued messages...');
    const result = await processQueuedMessages(env);
    
    const response = {
      success: true,
      processed: result.processed,
      errors: result.errors,
      timestamp: new Date().toISOString()
    };
    
    console.log(`Queue processing completed: ${result.processed} messages processed, ${result.errors.length} errors`);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error processing queue:', error);
    
    const response = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}