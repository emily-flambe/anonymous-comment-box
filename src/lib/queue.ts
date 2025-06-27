import { Env } from '../types/env';

interface QueuedMessage {
  id: string;
  message: string;
  queuedAt: number;
  scheduledFor: number;
}

export async function queueMessage(
  message: string,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  // Generate unique ID
  const messageId = crypto.randomUUID();
  
  // Random delay between 1-6 hours (in milliseconds)
  const minDelay = 60 * 60 * 1000; // 1 hour
  const maxDelay = 6 * 60 * 60 * 1000; // 6 hours
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  
  const now = Date.now();
  const scheduledFor = now + randomDelay;
  
  const queuedMessage: QueuedMessage = {
    id: messageId,
    message,
    queuedAt: now,
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
  // This would integrate with SendGrid or Mailgun
  // For now, we'll log it
  console.log('Sending email to:', env.RECIPIENT_EMAIL);
  console.log('Message:', message);
  
  // TODO: Implement actual email sending
  // Example with SendGrid:
  // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     personalizations: [{
  //       to: [{ email: env.RECIPIENT_EMAIL }],
  //     }],
  //     from: { email: 'noreply@anonymous-feedback.com' },
  //     subject: 'Anonymous Feedback',
  //     content: [{
  //       type: 'text/plain',
  //       value: message,
  //     }],
  //   }),
  // });
}