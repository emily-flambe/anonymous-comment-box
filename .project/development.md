# Anonymous Comment Box - Development Setup

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Gmail account for email delivery
- Git for version control

## Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/anonymous-comment-box.git
cd anonymous-comment-box
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment

#### Local Development Variables
Create `.dev.vars` file in the project root:
```bash
# Create a .dev.vars file with your Cloudflare AI API key
# NEVER commit this file - it should be in .gitignore
AI_WORKER_API_SECRET_KEY=your_cloudflare_ai_key_here
```

#### Get Cloudflare AI API Key
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Go to AI → Workers AI
3. Copy your API key

### 4. Gmail OAuth Setup

Follow the detailed guide in `docs/setup/gmail-setup.md` or use this quick setup:

#### Option A: OAuth Playground (Quick)
1. Visit [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Select Gmail API v1 → `gmail.send` scope
3. Authorize and get tokens
4. Set secrets:
```bash
wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
wrangler secret put RECIPIENT_EMAIL
```

#### Option B: Google Cloud Console (Production)
1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Get refresh token via provided script

### 5. Start Development Server
```bash
npm run dev
```

Server runs at `http://localhost:8787`

## Development Workflow

### Code Structure
```
src/
├── api/          # API endpoints
├── lib/          # Core libraries
├── static/       # Frontend assets
└── types/        # TypeScript definitions
```

### Available Scripts
```bash
# Development
npm run dev              # Start dev server
npm run build-static     # Build static assets

# Code Quality
npm run lint            # Run ESLint
npm run typecheck       # TypeScript checks
npm run format          # Prettier formatting

# Deployment
npm run deploy          # Deploy to Cloudflare
```

### Making Changes

#### 1. Frontend Updates
- Edit files in `src/static/`
- Run `npm run build-static`
- Changes reflect on refresh

#### 2. Backend Updates
- Edit TypeScript files
- Wrangler auto-reloads
- Test via API endpoints

#### 3. AI Personas
- Modify `src/lib/ai-persona-transformer.ts`
- Test at `/ai-test.html` in dev mode

## Testing

### Manual Testing
Since automated tests are currently disabled:

1. **Submission Flow**
   - Submit test message
   - Check browser console
   - Verify KV storage

2. **AI Transformation**
   - Use `/ai-test.html` page
   - Test each persona
   - Verify output quality

3. **Email Preview**
   - Use `/api/preview` endpoint
   - Check formatting
   - Test different message types

### API Testing
```bash
# Submit message
curl -X POST http://localhost:8787/api/submit \
  -H "Content-Type: application/json" \
  -d '{"message":"Test feedback"}'

# Check queue (dev only)
curl http://localhost:8787/api/debug/queue

# Preview email
curl -X POST http://localhost:8787/api/preview \
  -H "Content-Type: application/json" \
  -d '{"message":"Test"}'
```

## Debugging

### Common Issues

#### 1. AI API Errors
```
Error: AI transformation failed
```
**Solution**: Check AI_WORKER_API_SECRET_KEY in `.dev.vars`

#### 2. Gmail Auth Failures
```
Error: Invalid grant
```
**Solution**: Refresh OAuth tokens via playground

#### 3. KV Storage Issues
```
Error: KV namespace not found
```
**Solution**: Ensure KV binding in `wrangler.toml`

### Debug Tools

#### Browser DevTools
- Network tab for API calls
- Console for error messages
- Application tab for storage

#### Wrangler Logs
```bash
# View real-time logs
wrangler tail
```

#### Debug Endpoints (Dev Only)
- `/api/debug/queue` - View queue contents
- `/api/debug/env` - Check environment

## Deployment

### Pre-deployment Checklist
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck`
- [ ] Test submission flow
- [ ] Verify email delivery
- [ ] Check AI transformation

### Deploy to Production
```bash
# Build and deploy
npm run deploy

# Set production secrets if not done
wrangler secret put GMAIL_CLIENT_ID
wrangler secret put GMAIL_CLIENT_SECRET
wrangler secret put GMAIL_REFRESH_TOKEN
wrangler secret put RECIPIENT_EMAIL
wrangler secret put AI_WORKER_API_SECRET_KEY
```

### Post-deployment
1. Test production URL
2. Monitor Cloudflare dashboard
3. Check email delivery
4. Verify anonymization

## Environment Management

### Development vs Production

#### Development
- Local KV emulation
- Debug endpoints enabled
- Detailed error messages
- CORS allows localhost

#### Production
- Real Cloudflare KV
- Debug endpoints disabled
- Generic error messages
- CORS restricted

### Secret Management
```bash
# List secrets
wrangler secret list

# Update secret
wrangler secret put SECRET_NAME

# Delete secret
wrangler secret delete SECRET_NAME
```

## Troubleshooting

### Build Errors
```bash
# Clear node_modules
rm -rf node_modules
npm install

# Clear build cache
rm -rf .wrangler
```

### Runtime Errors
1. Check Cloudflare dashboard logs
2. Use `wrangler tail` for live logs
3. Add console.log statements
4. Test with curl commands

### Performance Issues
1. Check Cloudflare analytics
2. Monitor KV operations
3. Review AI API latency
4. Optimize static assets

## Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Gmail API Reference](https://developers.google.com/gmail/api)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Project Issues](https://github.com/yourusername/anonymous-comment-box/issues)