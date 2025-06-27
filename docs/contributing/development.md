# Development Guide

Guide for setting up and contributing to the Anonymous Comment Box project.

## 🚀 Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- Code editor with TypeScript support

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/anonymous-comment-box.git
cd anonymous-comment-box

# Install dependencies
npm install

# Install Wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### Local Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

Your development server will be available at `http://localhost:8787`

## 📁 Project Structure

```
anonymous-comment-box/
├── src/                     # Source code
│   ├── api/                # API endpoints
│   │   └── submit.ts       # Message submission handler
│   ├── lib/                # Core libraries
│   │   ├── ai-transform.ts # AI persona transformation
│   │   ├── queue.ts        # Message queue management
│   │   └── static.ts       # Static file serving
│   ├── static/             # Frontend assets
│   │   ├── index.html      # Main HTML page
│   │   ├── script.js       # Frontend JavaScript
│   │   └── styles.css      # Styling
│   ├── types/              # TypeScript definitions
│   └── index.ts            # Worker entry point
├── tests/                  # Test suites
├── docs/                   # Documentation
├── wrangler.toml          # Cloudflare configuration
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

## 🛠️ Development Workflow

### 1. Creating Features

```bash
# Create feature branch
git checkout -b feature/amazing-new-feature

# Make your changes
# ... code, test, commit ...

# Push and create PR
git push origin feature/amazing-new-feature
```

### 2. Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test tests/api.test.ts

# Run tests in watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### 3. Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
// Example test: tests/api.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { handleSubmission } from '../src/api/submit';

describe('Message Submission API', () => {
  let mockEnv: any;

  beforeEach(() => {
    mockEnv = {
      MESSAGE_QUEUE: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn()
      },
      ANTHROPIC_API_KEY: 'test-key',
      GMAIL_ACCESS_TOKEN: 'test-token'
    };
  });

  test('validates message length', async () => {
    const request = new Request('http://localhost/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'a'.repeat(3000) })
    });

    const response = await handleSubmission(request, mockEnv);
    expect(response.status).toBe(400);
    
    const body = await response.json();
    expect(body.error).toContain('Message too long');
  });

  test('processes valid submission', async () => {
    const request = new Request('http://localhost/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Valid feedback message' })
    });

    const response = await handleSubmission(request, mockEnv);
    expect(response.status).toBe(200);
    expect(mockEnv.MESSAGE_QUEUE.put).toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// Example integration test
import { unstable_dev } from 'wrangler';

describe('Worker Integration', () => {
  let worker: any;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true }
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  test('serves homepage', async () => {
    const response = await worker.fetch('http://localhost:8787/');
    expect(response.status).toBe(200);
    
    const content = await response.text();
    expect(content).toContain('Anonymous Comment Box');
  });
});
```

### Manual Testing

```bash
# Test submission endpoint
curl -X POST http://localhost:8787/api/submit \
  -H "Content-Type: application/json" \
  -d '{"message": "Test feedback message"}'

# Test static serving
curl http://localhost:8787/

# Test with invalid data
curl -X POST http://localhost:8787/api/submit \
  -H "Content-Type: application/json" \
  -d '{"message": ""}'
```

## 🔧 Configuration

### Environment Variables

Create `.dev.vars` for local development:

```bash
# .dev.vars (never commit this file)
ANTHROPIC_API_KEY=your-claude-api-key
GMAIL_ACCESS_TOKEN=your-gmail-token
RECIPIENT_EMAIL=your-email@gmail.com
```

### wrangler.toml

```toml
name = "anonymous-feedback-dev"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[vars]
ENVIRONMENT = "development"

[[kv_namespaces]]
binding = "MESSAGE_QUEUE"
preview_id = "your-preview-namespace-id"
id = "your-production-namespace-id"
```

## 🎯 Adding New Features

### 1. AI Personas

Add new persona to `src/lib/ai-transform.ts`:

```typescript
export const PERSONAS = {
  // Existing personas...
  
  'excited_gamer': {
    description: 'Transform message to enthusiastic gamer speak',
    prompt: `Rewrite this message as an excited gamer would say it, 
             using gaming terminology and enthusiastic language. 
             Preserve the original meaning.`,
    temperature: 0.8,
    examples: [
      {
        input: 'This feature needs improvement',
        output: 'Yo, this feature needs a serious buff! It\'s got potential but needs some major patches to level up! 🎮'
      }
    ]
  }
};
```

### 2. API Endpoints

Create new endpoint in `src/api/`:

```typescript
// src/api/new-endpoint.ts
export async function handleNewEndpoint(
  request: Request, 
  env: Env
): Promise<Response> {
  try {
    // Validate request
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Process request
    const data = await request.json();
    
    // Return response
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Endpoint error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
```

### 3. Frontend Features

Add to `src/static/script.js`:

```javascript
class FeedbackForm {
  constructor() {
    this.setupPersonaSelector();
  }

  setupPersonaSelector() {
    const selector = document.getElementById('persona-selector');
    selector.addEventListener('change', (e) => {
      this.selectedPersona = e.target.value;
      this.updatePreview();
    });
  }

  async updatePreview() {
    // Implementation for preview functionality
  }
}
```

## 🐛 Debugging

### Local Debugging

```bash
# Enable debug mode
export WRANGLER_LOG=debug

# Run with detailed logs
npm run dev -- --log-level debug

# Inspect worker execution
wrangler tail --local
```

### Remote Debugging

```bash
# Stream production logs
wrangler tail

# Filter by status
wrangler tail --status error

# Pretty print logs
wrangler tail --format pretty
```

### Common Issues

**"KV namespace not found"**
```bash
# Create development namespace
wrangler kv:namespace create "MESSAGE_QUEUE" --preview

# Update wrangler.toml with the ID
```

**"Secret not found"**
```bash
# Set development secrets
echo "your-api-key" | wrangler secret put ANTHROPIC_API_KEY --local
```

**Type errors**
```bash
# Regenerate types
npm run typecheck

# Check specific file
npx tsc src/lib/ai-transform.ts --noEmit
```

## 📦 Dependencies

### Core Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",    // Claude AI integration
    "hono": "^3.12.0",                 // Web framework
    "uuid": "^9.0.0"                   // ID generation
  },
  "devDependencies": {
    "@types/uuid": "^9.0.0",           // Type definitions
    "typescript": "^5.0.0",            // Language support
    "vitest": "^1.0.0",               // Testing framework
    "wrangler": "^3.0.0"              // Cloudflare CLI
  }
}
```

### Adding Dependencies

```bash
# Add runtime dependency
npm install package-name

# Add development dependency
npm install -D package-name

# Update types
npm install -D @types/package-name
```

## 🚀 Deployment

### Development Deployment

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy with specific name
wrangler deploy --name feedback-dev
```

### Production Deployment

```bash
# Build and deploy
npm run deploy

# Deploy specific environment
npm run deploy:production
```

## 📝 Code Style

### TypeScript Guidelines

```typescript
// ✅ Good: Explicit types
interface SubmissionRequest {
  message: string;
  persona?: string;
}

async function handleSubmission(
  request: Request,
  env: Env
): Promise<Response> {
  // Implementation
}

// ❌ Avoid: Any types
function handleSubmission(request: any, env: any): any {
  // Implementation
}
```

### Error Handling

```typescript
// ✅ Good: Structured error handling
try {
  const result = await processMessage(message);
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
} catch (error) {
  console.error('Processing failed:', {
    error: error.message,
    message: message.substring(0, 100),
    timestamp: new Date().toISOString()
  });
  
  return new Response(
    JSON.stringify({ error: 'Processing failed' }), 
    { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}
```

### Performance Guidelines

```typescript
// ✅ Good: Lazy loading
async function getTransformer(env: Env) {
  if (!transformer) {
    const { PersonaTransformer } = await import('./ai-transform');
    transformer = new PersonaTransformer(env.ANTHROPIC_API_KEY);
  }
  return transformer;
}

// ✅ Good: Batch operations
const results = await Promise.all([
  env.KV.get('config:personas'),
  env.KV.get('config:rate_limits'),
  env.KV.get(`queue:${messageId}`)
]);
```

## 🤝 Contributing Guidelines

### Before You Start

1. Check existing [issues](../../issues) and [discussions](../../discussions)
2. Create an issue for new features or significant changes
3. Read the [Code of Conduct](CODE_OF_CONDUCT.md)

### Pull Request Process

1. **Fork** the repository
2. **Create** a feature branch
3. **Write** tests for new functionality
4. **Ensure** all tests pass
5. **Update** documentation
6. **Submit** pull request

### PR Checklist

- [ ] Tests added/updated and passing
- [ ] TypeScript types updated
- [ ] Documentation updated
- [ ] No console.log statements in production code
- [ ] Performance impact considered
- [ ] Security implications reviewed

### Commit Messages

```bash
# Good commit messages
feat: add preview functionality for personas
fix: handle empty messages in AI transformation
docs: update deployment guide for custom domains
refactor: simplify queue processing logic

# Bad commit messages
update stuff
fix bug
changes
```

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Testing Guide](https://vitest.dev/guide/)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/)

---

**Next:** [Testing Guide →](testing.md)