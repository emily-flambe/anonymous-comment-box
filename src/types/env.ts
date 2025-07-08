interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface Env {
  // KV Namespace bindings
  MESSAGE_QUEUE: KVNamespace;
  
  // Rate limiter binding  
  RATE_LIMITER: RateLimiter;
  
  // Environment variables
  AI_WORKER_API_SECRET_KEY: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  RECIPIENT_EMAIL: string;
  ENVIRONMENT: 'development' | 'production' | 'test';
  QUEUE_DELAY_SECONDS?: string; // Optional for parameterized delays
}