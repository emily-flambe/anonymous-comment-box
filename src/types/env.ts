export interface Env {
  // KV Namespace bindings
  MESSAGE_QUEUE: KVNamespace;
  
  // Rate limiter binding
  RATE_LIMITER: any;
  
  // Environment variables
  ANTHROPIC_API_KEY: string;
  SENDGRID_API_KEY?: string;
  MAILGUN_API_KEY?: string;
  RECIPIENT_EMAIL: string;
  ENVIRONMENT: 'development' | 'production';
}