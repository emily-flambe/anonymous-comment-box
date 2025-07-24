# Anonymous Comment Box - Development Instructions

## Core Principles

### 1. Privacy First
- **Never** add tracking, analytics, or user identification features
- **Always** consider privacy implications of new features
- **Reject** any changes that could compromise anonymity

### 2. Code Quality Standards
- Run `npm run lint` before committing code
- Run `npm run typecheck` for TypeScript validation
- Follow existing code patterns and conventions
- Keep dependencies minimal

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# The server runs on http://localhost:8787
```

### Testing
⚠️ **Note**: Automated tests are currently disabled due to unrelated failures. Use manual testing and linting/typechecking for validation.

### Deployment
```bash
# Deploy to Cloudflare Workers
npm run deploy
```

## Key Implementation Guidelines

### 1. API Endpoints
- All APIs follow RESTful conventions
- Endpoints return consistent JSON responses
- Error handling must be comprehensive
- CORS headers properly configured

### 2. AI Transformation
- Use Cloudflare AI Workers API
- Implement fallback for API failures
- Maintain persona consistency
- Preserve message meaning while transforming style

### 3. Queue Management
- Messages stored in Cloudflare KV
- Random delays between 5 minutes and 24 hours
- Automatic retry on processing failures
- Clean up processed messages

### 4. Security Considerations
- Validate all user inputs
- Sanitize HTML in messages
- Rate limit submissions
- No sensitive data in logs

## Common Tasks

### Adding a New AI Persona
1. Update `AI_PERSONAS` in `src/lib/ai-persona-transformer.ts`
2. Test transformation quality
3. Ensure persona maintains anonymity

### Modifying Email Templates
1. Edit templates in `src/lib/gmail-auth.ts`
2. Test with preview endpoint
3. Verify formatting in Gmail

### Updating Frontend
1. Edit files in `src/static/`
2. Run `npm run build-static` to embed
3. Test UI changes locally

## Environment Variables

### Required Secrets (Production)
- `GMAIL_CLIENT_ID`: OAuth client ID
- `GMAIL_CLIENT_SECRET`: OAuth client secret
- `GMAIL_REFRESH_TOKEN`: OAuth refresh token
- `RECIPIENT_EMAIL`: Email to receive messages
- `AI_WORKER_API_SECRET_KEY`: Cloudflare AI API key

### Local Development
Create `.dev.vars` file:
```
AI_WORKER_API_SECRET_KEY=your_key_here
```

## Debugging Tips

### Check Queue Status
```bash
# Use the debug endpoint in development
curl http://localhost:8787/api/debug/queue
```

### Test AI Transformation
Use the AI test page at `/ai-test.html` in development mode

### Email Preview
Use `/api/preview` endpoint to test email formatting without sending

## Performance Optimization

1. **Static Assets**: Pre-build and embed for zero latency
2. **Edge Caching**: Leverage Cloudflare's edge network
3. **Minimal Dependencies**: Keep bundle size small
4. **Async Processing**: Use queue for heavy operations

## Maintenance Tasks

### Regular Updates
- Update Cloudflare Workers runtime
- Update AI model versions when available
- Security patches for dependencies
- Performance monitoring

### Monitoring
- Check Cloudflare Workers analytics
- Monitor error rates
- Track queue processing times
- Review user feedback

## Troubleshooting

### Common Issues

1. **AI API Failures**
   - Check API key validity
   - Verify Cloudflare AI service status
   - Review rate limits

2. **Email Delivery Issues**
   - Verify OAuth tokens
   - Check Gmail API quotas
   - Review email formatting

3. **Queue Processing Delays**
   - Check KV storage limits
   - Monitor worker execution time
   - Review error logs

### Getting Help
- Check documentation in `/docs`
- Review existing issues on GitHub
- Contact maintainers for complex issues