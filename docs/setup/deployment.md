# Deployment Guide

Complete guide for deploying the Anonymous Comment Box to Cloudflare Workers.

## 📋 Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Node.js 18+](https://nodejs.org/) installed
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) installed
- Completed [Gmail OAuth Setup](gmail-setup.md)
- Anthropic API key for Claude AI

## 🚀 Quick Deployment

### 1. Initial Setup

```bash
# Install Wrangler globally
npm install -g wrangler

# Authenticate with Cloudflare
wrangler login
```

### 2. Configure Environment

```bash
# Set required secrets
wrangler secret put GMAIL_ACCESS_TOKEN    # From Gmail setup
wrangler secret put ANTHROPIC_API_KEY     # Your Claude API key
wrangler secret put RECIPIENT_EMAIL       # Where to receive feedback
```

### 3. Deploy

```bash
# Build and deploy
npm run deploy

# Or deploy manually
wrangler deploy
```

Your feedback box is now live at `your-app-name.workers.dev`!

## ⚙️ Configuration

### wrangler.toml Setup

Customize your deployment by editing `wrangler.toml`:

```toml
# Basic configuration
name = "anonymous-feedback-box"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Environment variables
[vars]
ENVIRONMENT = "production"
MAX_MESSAGE_LENGTH = "2000"
BATCH_SIZE_LIMIT = "50"

# KV namespace for message queue
[[kv_namespaces]]
binding = "MESSAGE_QUEUE"
id = "your-kv-namespace-id"

# Rate limiting
[[rate_limiting]]
threshold = 10
period = 60
characteristics = ["cf.colo.id", "cf.unique_visitor_id"]

# Cron triggers for queue processing
[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes
```

### KV Namespace Creation

Create storage for the message queue:

```bash
# Create production KV namespace
wrangler kv:namespace create "MESSAGE_QUEUE"

# Create preview namespace for development
wrangler kv:namespace create "MESSAGE_QUEUE" --preview

# Copy the namespace IDs to wrangler.toml
```

### Environment-Specific Deployments

```toml
# wrangler.toml
[env.staging]
name = "feedback-staging"
vars = { ENVIRONMENT = "staging" }

[env.production]
name = "feedback-production"
vars = { ENVIRONMENT = "production" }
```

Deploy to specific environments:

```bash
# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

## 🌐 Custom Domain Setup

### Option 1: Cloudflare-Managed Domain

If your domain uses Cloudflare DNS:

1. **Add Route in wrangler.toml**
   ```toml
   routes = [
     { pattern = "feedback.yourdomain.com/*", custom_domain = true }
   ]
   ```

2. **Deploy with Custom Domain**
   ```bash
   wrangler deploy
   ```

3. **DNS Configuration**
   - Cloudflare automatically creates DNS records
   - SSL certificate provisioned automatically

### Option 2: External Domain

For domains not on Cloudflare:

1. **Add Domain to Cloudflare**
   - Add site to Cloudflare (DNS only mode)
   - Update nameservers if desired

2. **Create CNAME Record**
   ```
   Name: feedback
   Content: your-worker-name.workers.dev
   Proxy status: Proxied (orange cloud)
   ```

3. **Configure SSL/TLS**
   - Set SSL/TLS mode to "Flexible" or "Full"
   - Enable "Always Use HTTPS"

## 🔧 Advanced Configuration

### Multiple Environments

```bash
# Development environment
wrangler secret put GMAIL_ACCESS_TOKEN --env development
wrangler secret put ANTHROPIC_API_KEY --env development

# Production environment  
wrangler secret put GMAIL_ACCESS_TOKEN --env production
wrangler secret put ANTHROPIC_API_KEY --env production
```

### Custom Routing

```toml
# Route specific paths to different workers
[[route]]
pattern = "feedback.example.com/admin/*"
custom_domain = true
script = "admin-worker"

[[route]]
pattern = "feedback.example.com/*"
custom_domain = true
script = "feedback-worker"
```

### Performance Optimization

```toml
# Optimize for performance
[build]
command = "npm run build"
upload_format = "modules"

# Minification settings
[minify]
javascript = true
css = true
html = true
```

## 📊 Monitoring & Analytics

### Built-in Analytics

View metrics in Cloudflare dashboard:
- **Workers & Pages** → **Your Worker** → **Analytics**
- Request volume, error rates, response times
- Geographic distribution of requests

### Custom Metrics

```javascript
// Add to your worker for custom tracking
export default {
  async fetch(request, env, ctx) {
    const start = Date.now();
    
    try {
      const response = await handleRequest(request, env);
      
      // Log metrics
      console.log({
        status: response.status,
        duration: Date.now() - start,
        path: new URL(request.url).pathname
      });
      
      return response;
    } catch (error) {
      console.error('Request failed:', error.message);
      throw error;
    }
  }
};
```

### Real-time Logs

```bash
# Stream live logs
wrangler tail

# Filter by status
wrangler tail --status error

# Filter by IP
wrangler tail --ip 1.2.3.4

# Pretty print
wrangler tail --format pretty
```

## 🛡️ Security Configuration

### Content Security Policy

```javascript
// Add CSP headers
const headers = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'"
  ].join('; '),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
```

### Rate Limiting Configuration

```toml
# Basic rate limiting
[[rate_limiting]]
threshold = 10
period = 60
characteristics = ["cf.colo.id", "cf.unique_visitor_id"]
action = "challenge"

# Advanced rate limiting
[[rate_limiting]]
threshold = 100
period = 3600
characteristics = ["ip.src"]
action = "block"
```

### Environment Variable Security

```bash
# ✅ Use secrets for sensitive data
wrangler secret put API_KEY

# ✅ Use vars for non-sensitive config
wrangler vars put MAX_REQUESTS 100

# ❌ Never put secrets in wrangler.toml
# vars = { API_KEY = "secret-key" }  # DON'T DO THIS
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npm run test
      - run: npm run typecheck

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npx wrangler deploy --env staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - run: npx wrangler deploy --env production
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

### Setup Secrets in GitHub

1. Generate Cloudflare API Token:
   - Cloudflare Dashboard → **My Profile** → **API Tokens**
   - **Create Token** → **Custom token**
   - Permissions: `Cloudflare Workers:Edit`, `Zone:Read`, `Account:Read`

2. Add to GitHub Secrets:
   - Repository → **Settings** → **Secrets and variables** → **Actions**
   - Add `CLOUDFLARE_API_TOKEN`

## 🆘 Troubleshooting

### Common Deployment Issues

**"No such namespace" error**
```bash
# Create missing KV namespace
wrangler kv:namespace create "MESSAGE_QUEUE"
# Update namespace ID in wrangler.toml
```

**"Authentication error"**
```bash
# Re-authenticate with Cloudflare
wrangler logout
wrangler login
```

**"Script size too large"**
```bash
# Check bundle size
wrangler deploy --dry-run --outdir dist

# Optimize bundle
npm run build -- --minify
```

**Custom domain not working**
- Check DNS propagation: `dig feedback.yourdomain.com`
- Verify SSL certificate: `curl -I https://feedback.yourdomain.com`
- Check Cloudflare proxy status (orange cloud)

### Performance Issues

**High response times**
```bash
# Check CPU usage in logs
wrangler tail --format pretty

# Optimize worker code
npm run build -- --analyze
```

**Rate limit errors**
```bash
# Check current limits
wrangler tail --status 429

# Adjust rate limiting in wrangler.toml
```

### Debug Commands

```bash
# Test local development
npm run dev

# Validate wrangler.toml
wrangler validate

# Check account info
wrangler whoami

# List deployed workers
wrangler list

# Get worker details
wrangler show
```

## 💰 Cost Optimization

### Free Tier Limits
- **Requests**: 100,000/day
- **CPU Time**: 10ms per request
- **KV Storage**: 1GB
- **KV Operations**: 1,000 writes/day, 10,000 reads/day

### Usage Estimation
```
Typical anonymous feedback usage:
- 100 submissions/day = 200 requests (submit + process)
- 1-2ms CPU time per request
- <1MB KV storage for queue
- Well within free tier limits
```

### Cost Monitoring
```bash
# Check usage via API
curl -X GET "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/workers/scripts/$SCRIPT_NAME/usage" \
  -H "Authorization: Bearer $API_TOKEN"
```

## 📚 Additional Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/commands/)
- [Workers KV Documentation](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Workers Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Performance Best Practices](https://developers.cloudflare.com/workers/platform/best-practices/)

---

**Next:** [Architecture Overview →](../design/architecture.md)