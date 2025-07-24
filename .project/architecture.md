# Anonymous Comment Box - System Architecture

## Overview

The Anonymous Comment Box is built as a serverless application running on Cloudflare Workers, utilizing edge computing for global distribution and minimal latency.

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│                 │     │                  │     │                 │
│   Web Browser   │────▶│  Cloudflare CDN  │────▶│ Workers Runtime │
│                 │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                           │
                              ┌────────────────────────────┼────────────────────────────┐
                              │                            │                            │
                        ┌─────▼──────┐              ┌──────▼──────┐             ┌───────▼───────┐
                        │            │              │             │             │               │
                        │ Submit API │              │ Process API │             │  Preview API  │
                        │            │              │             │             │               │
                        └─────┬──────┘              └──────┬──────┘             └───────────────┘
                              │                            │
                        ┌─────▼──────┐              ┌──────▼──────┐
                        │            │              │             │
                        │ Queue (KV) │◀─────────────│ AI Transform│
                        │            │              │             │
                        └────────────┘              └──────┬──────┘
                                                           │
                                                    ┌──────▼──────┐
                                                    │             │
                                                    │  Gmail API  │
                                                    │             │
                                                    └─────────────┘
```

## Components

### 1. Frontend Layer
- **Static HTML/JS**: Embedded in Workers for zero-latency delivery
- **No Framework Dependencies**: Vanilla JavaScript for minimal footprint
- **Progressive Enhancement**: Works without JavaScript enabled
- **Responsive Design**: Mobile-first approach

### 2. API Layer

#### `/api/submit` - Message Submission
```typescript
interface SubmitRequest {
  message: string;
  honey?: string;  // Honeypot field
}

interface SubmitResponse {
  success: boolean;
  message: string;
}
```

#### `/api/process` - Queue Processing
- Triggered by Cloudflare Cron (every 10 minutes)
- Processes messages with random delays
- Transforms via AI and sends emails

#### Additional API Endpoints
- `/api/health` - Health check endpoint
- `/api/debug/token-status` - OAuth token validation (dev)
- `/api/debug/email-status` - Email configuration check (dev)
- `/api/debug/queue-status` - Queue contents (dev)
- `/api/debug/send-test-email` - Test email sending (dev)

#### `/api/preview` - Email Preview
- Development-only endpoint
- Tests email formatting without sending

### 3. Storage Layer

#### Cloudflare KV (Key-Value Store)
- **Namespace**: `MESSAGE_QUEUE`
- **Key Format**: `msg_${timestamp}_${random}`
- **TTL**: 48 hours (auto-cleanup)

#### Data Structure
```typescript
interface QueuedMessage {
  message: string;
  queuedAt: number;
  scheduledFor: number;
  attempts?: number;
}
```

### 4. AI Transformation Layer

#### Cloudflare AI Workers
- **Model**: Llama 3.1 8B Instruct
- **Endpoint**: `@cf/meta/llama-3.1-8b-instruct`
- **Fallback**: Original message on AI failure

#### Persona System
```typescript
const PRESET_PERSONAS = {
  'internet-random': { /* casual internet slang */ },
  'barely-literate': { /* poor grammar, simple vocab */ },
  'extremely-serious': { /* formal, corporate tone */ },
  'super-nice': { /* overly positive and friendly */ }
};
```

### 5. Email Delivery Layer

#### Gmail API Integration
- **OAuth 2.0**: Server-to-server authentication
- **Refresh Token**: Long-lived authentication
- **Rate Limiting**: Respects Gmail quotas

## Security Architecture

### 1. Input Validation
```typescript
// All user inputs sanitized
const sanitized = DOMPurify.sanitize(input);
```

### 2. Rate Limiting
- Per-IP rate limiting via Cloudflare
- Honeypot field for bot detection
- Submission cooldown enforcement

### 3. No User Tracking
- No cookies set
- No IP addresses logged
- No browser fingerprinting
- No analytics scripts

### 5. Rate Limiting
- Cloudflare rate limiter binding
- 10 requests per minute per IP
- Configurable limits via wrangler.toml

### 4. HTTPS Only
- Enforced by Cloudflare
- HSTS headers set
- Secure WebSocket upgrades

## Performance Optimizations

### 1. Edge Caching
```typescript
// Static assets cached at edge
response.headers.set('Cache-Control', 'public, max-age=3600');
```

### 2. Embedded Assets
- HTML/CSS/JS embedded in Worker
- No external asset requests
- Single round-trip for page load

### 3. Global Distribution
- Cloudflare's 200+ data centers
- Automatic geo-routing
- Sub-50ms response times globally

## Scalability Design

### 1. Horizontal Scaling
- Workers auto-scale with demand
- No server management required
- Handles millions of requests

### 2. Queue Management
- KV storage scales automatically
- Distributed processing
- No single point of failure

### 3. Cost Efficiency
- Pay-per-request model
- No idle infrastructure costs
- Predictable pricing

## Development Environment

### Local Setup
```bash
# Wrangler dev server
wrangler dev --local

# Miniflare for KV emulation
# Automatic with wrangler dev
```

### Environment Variables
```toml
# wrangler.toml
[vars]
AI_WORKER_URL = "https://api.cloudflare.com/..."

[secrets]
# Set via wrangler secret put
GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN
RECIPIENT_EMAIL
AI_WORKER_API_SECRET_KEY
```

## Deployment Pipeline

### 1. Build Process
```bash
npm run build-static  # Embed static files
npm run lint         # Code quality
npm run typecheck    # Type safety
```

### 2. Deployment
```bash
wrangler deploy      # Production deployment
```

### 3. Monitoring
- Cloudflare Analytics Dashboard
- Worker Metrics
- Error Tracking via Logpush

## Additional Features

### Widget Integration
- Embeddable widget (`widget.js`)
- Cross-origin support
- Minimal footprint (~5KB)
- Demo page for testing

### Debug Tools (Development Only)
- Queue inspection endpoints
- Email configuration validation
- Token status checking
- Test email sending

## Future Architecture Considerations

### 1. Multi-Region KV
- Replicated storage for reliability
- Reduced latency for global users

### 2. Advanced AI Models
- Support for newer models
- Custom fine-tuning options

### 3. Alternative Delivery Methods
- Webhook support
- Slack/Discord integration
- SMS notifications

### 4. Enhanced Privacy
- End-to-end encryption option
- Zero-knowledge architecture
- Decentralized storage