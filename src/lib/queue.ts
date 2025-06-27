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
  ctx: ExecutionContext,
  testMode: boolean = false
): Promise<void> {
  // Generate unique ID
  const messageId = crypto.randomUUID();
  
  // In test mode, send immediately; otherwise use random delay
  let scheduledFor: number;
  if (testMode) {
    scheduledFor = Date.now(); // Send immediately
  } else {
    // Random delay between 1-6 hours (in milliseconds)
    const minDelay = 60 * 60 * 1000; // 1 hour
    const maxDelay = 6 * 60 * 60 * 1000; // 6 hours
    const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
    scheduledFor = Date.now() + randomDelay;
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
    console.log('Sending email to:', env.RECIPIENT_EMAIL);
    
    // Create RFC 2822 compliant email message
    const emailContent = [
      `To: ${env.RECIPIENT_EMAIL}`,
      `Subject: Anonymous Feedback`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      message
    ].join('\r\n');
    
    // Base64 encode the email (Gmail API requirement)
    const encodedMessage = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GMAIL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json() as { id: string };
    console.log('Email sent successfully:', result.id);
    
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}