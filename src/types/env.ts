interface RateLimiter {
  limit: (options: { key: string }) => Promise<{ success: boolean }>;
}

export interface Env {
  // KV Namespace bindings
  MESSAGE_QUEUE: KVNamespace;
  
  // Rate limiter binding  
  RATE_LIMITER: RateLimiter;
  
  // Environment variables
  ANTHROPIC_API_KEY: string;
  AI_WORKER_API_SECRET_KEY: string;
  GMAIL_ACCESS_TOKEN: string;
  RECIPIENT_EMAIL: string;
  ENVIRONMENT: 'development' | 'production' | 'test';
}