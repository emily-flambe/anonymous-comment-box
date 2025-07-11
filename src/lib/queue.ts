import { Env } from '../types/env';
import { GmailAuth } from './gmail-auth';

interface QueuedMessage {
  id: string;
  message: string;
  queuedAt: number;
  scheduledFor: number;
}

export async function queueMessage(
  message: string,
  env: Env,
  ctx: ExecutionContext,
  testMode: boolean = false
): Promise<void> {
  // Generate unique ID
  const messageId = crypto.randomUUID();
  
  // Calculate delay based on mode and configuration
  let scheduledFor: number;
  if (testMode) {
    scheduledFor = Date.now(); // Send immediately
  } else {
    // Check for parameterized delay
    const customDelaySeconds = env.QUEUE_DELAY_SECONDS ? parseInt(env.QUEUE_DELAY_SECONDS) : null;
    
    if (customDelaySeconds !== null) {
      // Use custom delay (in seconds)
      scheduledFor = Date.now() + (customDelaySeconds * 1000);
    } else {
      // Environment-specific random delays
      const randomDelay = getRandomDelayForEnvironment(env.ENVIRONMENT);
      scheduledFor = Date.now() + randomDelay;
    }
  }
  
  const queuedMessage: QueuedMessage = {
    id: messageId,
    message,
    queuedAt: Date.now(),
    scheduledFor,
  };
  
  // Store in KV with TTL
  const key = `msg_${messageId}`;
  await env.MESSAGE_QUEUE.put(key, JSON.stringify(queuedMessage), {
    expirationTtl: 24 * 60 * 60, // 24 hours TTL as safety measure
  });
  
  // Schedule processing (in production, use Durable Objects or scheduled workers)
  // For now, we'll use waitUntil to simulate delayed processing
  ctx.waitUntil(
    scheduleMessageDelivery(messageId, scheduledFor, env)
  );
}

async function scheduleMessageDelivery(
  messageId: string,
  scheduledFor: number,
  env: Env
): Promise<void> {
  // Calculate delay
  const delay = scheduledFor - Date.now();
  
  if (delay > 0) {
    // For Cloudflare Workers, setTimeout doesn't work reliably for long delays
    // Instead, we rely on external scheduled workers or cron jobs to process queued messages
    // For now, log that the message is scheduled and return - scheduled worker will handle it
    console.log(`Message ${messageId} scheduled for delivery in ${Math.round(delay / 1000 / 60)} minutes`);
    return;
  }
  
  // If delay is 0 or negative, send immediately
  await processQueuedMessage(messageId, env);
}

async function processQueuedMessage(messageId: string, env: Env): Promise<void> {
  // Retrieve and send the message
  const key = `msg_${messageId}`;
  const messageData = await env.MESSAGE_QUEUE.get(key);
  
  if (messageData) {
    const queuedMessage: QueuedMessage = JSON.parse(messageData);
    
    // Send via email service
    await sendEmail(queuedMessage.message, env);
    
    // Delete from queue
    await env.MESSAGE_QUEUE.delete(key);
    
    console.log(`Message ${messageId} sent and removed from queue`);
  }
}

async function sendEmail(message: string, env: Env): Promise<void> {
  try {
    const gmailAuth = new GmailAuth(env);
    await gmailAuth.sendEmail(message);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

function getRandomDelayForEnvironment(environment: string): number {
  switch (environment) {
    case 'development': {
      // Random delay between 0-10 minutes (in milliseconds)
      const minDevDelay = 0;
      const maxDevDelay = 10 * 60 * 1000; // 10 minutes
      return Math.floor(Math.random() * (maxDevDelay - minDevDelay + 1)) + minDevDelay;
    }
    
    case 'production': {
      // Random delay between 1-6 hours (in milliseconds)
      const minProdDelay = 60 * 60 * 1000; // 1 hour
      const maxProdDelay = 6 * 60 * 60 * 1000; // 6 hours
      return Math.floor(Math.random() * (maxProdDelay - minProdDelay + 1)) + minProdDelay;
    }
    
    default: {
      // Default to production behavior for unknown environments
      const minDefaultDelay = 60 * 60 * 1000; // 1 hour
      const maxDefaultDelay = 6 * 60 * 60 * 1000; // 6 hours
      return Math.floor(Math.random() * (maxDefaultDelay - minDefaultDelay + 1)) + minDefaultDelay;
    }
  }
}

// Function to process all queued messages that are ready to be sent
export async function processQueuedMessages(env: Env): Promise<{processed: number, errors: string[]}> {
  const currentTime = Date.now();
  const result = {processed: 0, errors: [] as string[]};
  
  try {
    // List all queued messages
    const messagesList = await env.MESSAGE_QUEUE.list({ prefix: 'msg_' });
    
    for (const key of messagesList.keys) {
      try {
        const messageData = await env.MESSAGE_QUEUE.get(key.name);
        if (messageData) {
          const queuedMessage: QueuedMessage = JSON.parse(messageData);
          
          // Check if the message is ready to be sent
          if (queuedMessage.scheduledFor <= currentTime) {
            // Send the message
            await sendEmail(queuedMessage.message, env);
            
            // Delete from queue
            await env.MESSAGE_QUEUE.delete(key.name);
            
            result.processed++;
            console.log(`Processed queued message ${queuedMessage.id}`);
          }
        }
      } catch (error) {
        const errorMsg = `Error processing message ${key.name}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Error listing queued messages: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }
  
  return result;
}