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
      // Random delay between 1-6 hours (in milliseconds)
      const minDelay = 60 * 60 * 1000; // 1 hour
      const maxDelay = 6 * 60 * 60 * 1000; // 6 hours
      const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
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
    // Wait for the scheduled time
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Retrieve and send the message
  const key = `msg_${messageId}`;
  const messageData = await env.MESSAGE_QUEUE.get(key);
  
  if (messageData) {
    const queuedMessage: QueuedMessage = JSON.parse(messageData);
    
    // Send via email service
    await sendEmail(queuedMessage.message, env);
    
    // Delete from queue
    await env.MESSAGE_QUEUE.delete(key);
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