# System Architecture

Technical overview of the Anonymous Comment Box system design and implementation.

## 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │───▶│ Cloudflare Edge │───▶│ Worker Runtime  │
│                 │    │   (Global CDN)  │    │  (V8 Isolate)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                         ┌─────────────────┐           │
                         │  External APIs  │◀──────────┘
                         │                 │
                         │ • Claude AI     │
                         │ • Gmail API     │
                         └─────────────────┘
                                  │
                         ┌─────────────────┐
                         │   Data Layer    │
                         │                 │
                         │ • Cloudflare KV │
                         │ • Message Queue │
                         └─────────────────┘
```

## 🎯 Core Design Principles

### 1. Privacy by Design
- **No User Tracking**: Zero cookies, localStorage, or persistent identifiers
- **Anonymization Pipeline**: Multi-layer approach to identity protection
- **Data Minimization**: Collect only essential message content
- **Automatic Deletion**: Messages expire after delivery

### 2. Serverless-First
- **Edge Computing**: Global distribution via Cloudflare Workers
- **Zero Infrastructure**: No servers to manage or scale
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost-Effective**: Pay-per-request pricing model

### 3. Resilience & Reliability
- **Graceful Degradation**: Fallback mechanisms for all external dependencies
- **Retry Logic**: Exponential backoff for transient failures
- **Error Isolation**: Failures don't cascade across components
- **Monitoring**: Comprehensive observability built-in

## 🔧 System Components

### Frontend Layer

**Technology**: Vanilla JavaScript, HTML5, CSS3

```javascript
// Core frontend architecture
class FeedbackForm {
  constructor() {
    this.form = document.getElementById('feedback-form');
    this.messageInput = document.getElementById('message');
    this.submitButton = document.getElementById('submit-btn');
    this.setupEventListeners();
  }

  async submitFeedback(message) {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    return response.json();
  }
}
```

**Features**:
- Responsive design (mobile-first)
- Real-time character counter
- Progressive enhancement
- Accessibility compliant (WCAG 2.1 AA)

### Worker Runtime

**Technology**: Cloudflare Workers (V8 JavaScript runtime)

```javascript
// Main worker entry point
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    if (url.pathname === '/') {
      return serveStaticContent();
    }
    
    if (url.pathname === '/api/submit') {
      return handleSubmission(request, env);
    }
    
    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // Process queued messages every 5 minutes
    ctx.waitUntil(processMessageQueue(env));
  }
};
```

**Capabilities**:
- HTTP request handling
- Scheduled job execution (cron)
- Global edge deployment
- Sub-millisecond cold start

### Data Storage

**Technology**: Cloudflare KV (Global key-value store)

```javascript
// KV storage schema
const MESSAGE_SCHEMA = {
  id: 'uuid-v4',                    // Unique message identifier
  originalMessage: 'string',        // User input
  transformedMessage: 'string',     // AI-processed content
  persona: 'string',               // Selected transformation persona
  submissionTime: 'ISO-8601',      // When submitted
  deliveryTime: 'ISO-8601',        // When to deliver
  status: 'queued|processing|delivered|failed',
  retryCount: 'number',
  created: 'unix-timestamp'
};

// KV operations
await env.MESSAGE_QUEUE.put(
  `queue:${messageId}`, 
  JSON.stringify(messageData),
  { expirationTtl: 86400 } // 24 hour TTL
);
```

**Characteristics**:
- Globally distributed
- Eventual consistency
- Automatic expiration
- High availability

### AI Transformation Service

**Technology**: Anthropic Claude API

```javascript
// Persona transformation engine
class PersonaTransformer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.personas = {
      'nervous_southerner': {
        prompt: 'Rewrite as nervous Southern US dialect...',
        temperature: 0.7
      },
      'excited_californian': {
        prompt: 'Rewrite as enthusiastic Californian...',
        temperature: 0.8
      }
      // ... other personas
    };
  }

  async transform(message, persona) {
    const config = this.personas[persona];
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        temperature: config.temperature,
        messages: [{
          role: 'user',
          content: `${config.prompt}\n\nOriginal: ${message}`
        }]
      })
    });

    return response.json();
  }
}
```

### Email Delivery Service

**Technology**: Gmail API

```javascript
// Email delivery system
class EmailDelivery {
  constructor(accessToken) {
    this.accessToken = accessToken;
  }

  async sendBatch(messages) {
    const email = this.formatBatchEmail(messages);
    const encodedEmail = this.encodeEmail(email);

    const response = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      }
    );

    return response.json();
  }
}
```

## 🔄 Data Flow

### Submission Flow

```
1. User Input
   ├── Frontend validation (length, content)
   ├── Rate limiting check (IP-based)
   └── CSRF protection

2. Message Processing
   ├── AI persona transformation
   ├── Content filtering & sanitization
   └── Random delay calculation (1-6 hours)

3. Queue Storage
   ├── Generate unique message ID
   ├── Store in KV with TTL
   └── Return success response

4. Background Processing (Cron)
   ├── Scan for ready messages
   ├── Batch messages for delivery
   ├── Send via Gmail API
   └── Mark as delivered/failed
```

### Queue Processing Algorithm

```javascript
async function processQueue(env) {
  const now = Date.now();
  const batch = [];
  const lockKey = `lock:processing:${now}`;
  
  // Acquire distributed lock
  const acquired = await env.KV.put(lockKey, 'locked', {
    expirationTtl: 300
  });
  if (!acquired) return; // Another instance processing
  
  try {
    // Scan for ready messages
    const listResult = await env.KV.list({ prefix: 'queue:' });
    
    for (const key of listResult.keys) {
      const item = await env.KV.get(key.name);
      if (item) {
        const message = JSON.parse(item);
        if (message.deliveryTime <= now && 
            message.status === 'queued') {
          batch.push(message);
          
          // Mark as processing
          await env.KV.put(key.name, JSON.stringify({
            ...message,
            status: 'processing'
          }));
        }
      }
    }
    
    // Deliver batch
    if (batch.length > 0) {
      await deliverBatch(batch, env);
    }
    
  } finally {
    await env.KV.delete(lockKey);
  }
}
```

## 🛡️ Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare Protection                │
│  • DDoS Protection    • WAF Rules    • Bot Management  │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                   Application Security                  │
│  • Rate Limiting     • Input Validation  • CSRF        │
└─────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────┐
│                     Data Protection                     │
│  • TLS 1.3          • AES-256         • Auto-Expiry    │
└─────────────────────────────────────────────────────────┘
```

### Privacy Protection Layers

1. **Input Layer**
   - No user identification
   - Content sanitization
   - Length validation

2. **Processing Layer**
   - AI persona transformation
   - Writing style obfuscation
   - Random time delays

3. **Storage Layer**
   - Encrypted at rest
   - Automatic expiration
   - No permanent logs

4. **Delivery Layer**
   - Batch aggregation
   - Time range abstraction
   - Persona identification only

## ⚡ Performance Architecture

### Edge Computing Benefits

```
Traditional Server Architecture:
User → CDN → Load Balancer → Server → Database
Latency: 200-500ms

Cloudflare Workers Architecture:
User → Edge Worker (with KV)
Latency: 10-50ms
```

### Optimization Strategies

1. **Cold Start Optimization**
   ```javascript
   // Minimize bundle size
   export default {
     fetch: async (request, env) => {
       // Lazy load heavy dependencies
       const { handleRequest } = await import('./handlers');
       return handleRequest(request, env);
     }
   };
   ```

2. **KV Access Patterns**
   ```javascript
   // Efficient KV operations
   const batch = await Promise.all([
     env.KV.get('config:rate_limits'),
     env.KV.get('config:personas'),
     env.KV.get(`queue:${messageId}`)
   ]);
   ```

3. **Caching Strategy**
   ```javascript
   // Static content caching
   const response = new Response(content, {
     headers: {
       'Cache-Control': 'public, max-age=3600',
       'CDN-Cache-Control': 'public, max-age=86400'
     }
   });
   ```

## 📊 Monitoring & Observability

### Metrics Collection

```javascript
// Custom metrics
class MetricsCollector {
  constructor(env) {
    this.env = env;
  }

  async recordSubmission(persona, success) {
    const key = `metrics:submissions:${new Date().toISOString().split('T')[0]}`;
    const data = await this.env.KV.get(key) || '{}';
    const metrics = JSON.parse(data);
    
    metrics[persona] = (metrics[persona] || 0) + 1;
    metrics.total = (metrics.total || 0) + 1;
    
    if (!success) {
      metrics.errors = (metrics.errors || 0) + 1;
    }
    
    await this.env.KV.put(key, JSON.stringify(metrics), {
      expirationTtl: 2592000 // 30 days
    });
  }
}
```

### Error Tracking

```javascript
// Structured error logging
function logError(error, context) {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    context,
    severity: 'error'
  }));
}
```

## 🔮 Scalability Considerations

### Horizontal Scaling

- **Workers**: Auto-scale globally across 300+ edge locations
- **KV Storage**: Automatic scaling and replication
- **External APIs**: Rate limiting and circuit breakers

### Vertical Scaling Limits

```javascript
// Resource constraints
const LIMITS = {
  CPU_TIME: 50,          // milliseconds per request
  MEMORY: 128,           // MB per isolate
  REQUEST_SIZE: 100,     // MB
  RESPONSE_SIZE: 5,      // MB
  KV_VALUE_SIZE: 25      // MB
};
```

### Future Scaling Strategies

1. **Multiple Workers**: Split functionality across specialized workers
2. **Database Migration**: Move to Cloudflare D1 for complex queries
3. **Queue Optimization**: Implement priority queues for different message types
4. **Geographic Partitioning**: Region-specific deployments for compliance

## 🔧 Development Architecture

### Local Development

```javascript
// Development environment
export default {
  async fetch(request, env) {
    if (env.ENVIRONMENT === 'development') {
      // Enable detailed logging
      console.log('Request:', request.url);
    }
    
    return handleRequest(request, env);
  }
};
```

### Testing Strategy

```javascript
// Unit test example
import { handleSubmission } from '../src/api/submit';

describe('Message Submission', () => {
  test('validates message length', async () => {
    const request = new Request('http://localhost/api/submit', {
      method: 'POST',
      body: JSON.stringify({ message: 'a'.repeat(3000) })
    });
    
    const response = await handleSubmission(request, mockEnv);
    expect(response.status).toBe(400);
  });
});
```

## 📚 Additional Resources

- [Cloudflare Workers Runtime API](https://developers.cloudflare.com/workers/runtime-apis/)
- [KV Storage Best Practices](https://developers.cloudflare.com/workers/runtime-apis/kv/#best-practices)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/claude/reference/)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference)

---

**Next:** [API Reference →](api-reference.md)