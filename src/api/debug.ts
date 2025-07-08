import { Env } from '../types/env';
import { GmailAuth } from '../lib/gmail-auth';

export async function handleDebugEmailStatus(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const gmailAuth = new GmailAuth(env);
    
    // Try to get a valid access token
    const accessToken = await gmailAuth.getValidAccessToken();
    
    // Test Gmail API connectivity
    const testResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const profileData = testResponse.ok ? await testResponse.json() : null;
    
    return new Response(JSON.stringify({
      status: 'success',
      gmail_api_accessible: testResponse.ok,
      gmail_api_status: testResponse.status,
      recipient_email: env.RECIPIENT_EMAIL,
      profile_data: profileData,
      token_length: accessToken.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDebugQueueStatus(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    // List all queued messages (this is a simple approach - in production you'd want pagination)
    const { keys } = await env.MESSAGE_QUEUE.list({ prefix: 'msg_' });
    
    const queuedMessages = [];
    for (const key of keys) {
      const messageData = await env.MESSAGE_QUEUE.get(key.name);
      if (messageData) {
        const message = JSON.parse(messageData);
        queuedMessages.push({
          id: message.id,
          queuedAt: new Date(message.queuedAt).toISOString(),
          scheduledFor: new Date(message.scheduledFor).toISOString(),
          timeUntilDelivery: Math.max(0, message.scheduledFor - Date.now()),
          messagePreview: message.message.substring(0, 100)
        });
      }
    }
    
    return new Response(JSON.stringify({
      status: 'success',
      total_queued: queuedMessages.length,
      queued_messages: queuedMessages,
      queue_delay_setting: env.QUEUE_DELAY_SECONDS || 'random (1-6 hours)',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDebugTokenStatus(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const gmailAuth = new GmailAuth(env);
    
    // Check if we can get a valid token
    const accessToken = await gmailAuth.getValidAccessToken();
    
    return new Response(JSON.stringify({
      status: 'success',
      token_available: !!accessToken,
      token_length: accessToken.length,
      environment_variables: {
        GMAIL_CLIENT_ID: !!env.GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET: !!env.GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN: !!env.GMAIL_REFRESH_TOKEN,
        RECIPIENT_EMAIL: !!env.RECIPIENT_EMAIL
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      environment_variables: {
        GMAIL_CLIENT_ID: !!env.GMAIL_CLIENT_ID,
        GMAIL_CLIENT_SECRET: !!env.GMAIL_CLIENT_SECRET,
        GMAIL_REFRESH_TOKEN: !!env.GMAIL_REFRESH_TOKEN,
        RECIPIENT_EMAIL: !!env.RECIPIENT_EMAIL
      },
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function handleDebugSendTestEmail(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const gmailAuth = new GmailAuth(env);
    
    const testMessage = `Debug test email sent at ${new Date().toISOString()}`;
    await gmailAuth.sendEmail(testMessage);
    
    return new Response(JSON.stringify({
      status: 'success',
      message: 'Test email sent successfully',
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}