# Frequently Asked Questions

Common questions and answers about the Anonymous Comment Box.

## 🚀 Getting Started

### Q: How long does setup take?
**A:** About 5 minutes for basic setup, 15 minutes for production deployment with custom domain.

### Q: What are the costs?
**A:** Very low cost:
- Cloudflare Workers: Free for 100k requests/day
- Gmail API: Free for personal use
- Anthropic Claude: $3-8/month for moderate usage

### Q: Do I need a custom domain?
**A:** No, you get a free `.workers.dev` subdomain. Custom domains are optional.

## 🔐 Privacy & Security

### Q: How anonymous is it really?
**A:** Extremely anonymous through multiple layers:
- AI personas completely rewrite messages
- Random 1-6 hour delays hide submission timing
- No user tracking, cookies, or IP logging
- Messages auto-delete after delivery

### Q: Can recipients identify who sent feedback?
**A:** No. Even with multiple submissions from the same person, AI personas and time delays make correlation nearly impossible.

### Q: What data is stored?
**A:** Only the message content temporarily (max 24 hours). No user information, no IP addresses, no tracking data.

### Q: Is it GDPR compliant?
**A:** Yes, through data minimization and automatic deletion. No personal data is collected or stored.

## 🎭 AI Personas

### Q: How do AI personas work?
**A:** Claude AI rewrites your message in different styles while preserving meaning. For example:
- Original: "This process is inefficient"
- Nervous Southerner: "Well, I reckon this here process might could work a bit better, if that's alright..."

### Q: Can I choose which persona to use?
**A:** Currently, personas are randomly selected. Custom persona selection is planned for a future release.

### Q: What if AI transformation fails?
**A:** The system has fallback patterns that apply basic transformations to ensure anonymity is maintained.

## 📧 Email Delivery

### Q: Why use Gmail API instead of SMTP?
**A:** Gmail API is:
- Free for personal use
- No domain verification needed
- More reliable delivery
- Better security (OAuth vs password)

### Q: How often are emails sent?
**A:** Messages are batched and sent every 5 minutes if any are ready for delivery.

### Q: Can I change the recipient email?
**A:** Yes, update the `RECIPIENT_EMAIL` environment variable and redeploy.

### Q: What if Gmail token expires?
**A:** Tokens expire after 1 hour. For production, implement refresh token logic or use service accounts.

## ⚙️ Technical

### Q: Why Cloudflare Workers over traditional servers?
**A:** Benefits include:
- Global edge deployment (faster responses)
- Auto-scaling without configuration
- No server maintenance
- Cost-effective pay-per-request model

### Q: Can I self-host this?
**A:** The code is designed for Cloudflare Workers, but could be adapted for other serverless platforms with modifications.

### Q: How do I backup my data?
**A:** Messages auto-delete after delivery, so there's minimal data to backup. Configuration is stored in version control.

### Q: Can I integrate this into my existing website?
**A:** Yes, you can embed the feedback form or build custom integrations using the API.

## 🛠️ Development

### Q: How do I run this locally?
**A:** Use `npm run dev` after setting up environment variables. See the [Development Guide](../contributing/development.md).

### Q: Can I customize the UI?
**A:** Yes, edit files in `src/static/`. The frontend is vanilla HTML/CSS/JS for easy customization.

### Q: How do I add new personas?
**A:** Edit `src/lib/ai-transform.ts` to add new persona configurations. See the [Development Guide](../contributing/development.md).

### Q: Can I change the AI provider?
**A:** Yes, the AI transformation module can be adapted for OpenAI, Cohere, or other providers.

## 🔧 Configuration

### Q: How do I change the message length limit?
**A:** Update `MAX_MESSAGE_LENGTH` in `wrangler.toml` and redeploy.

### Q: Can I adjust the delay range?
**A:** Yes, modify the delay calculation in `src/lib/queue.ts`.

### Q: How do I enable/disable rate limiting?
**A:** Configure rate limiting in `wrangler.toml` under the `[[rate_limiting]]` section.

## 🆘 Troubleshooting

### Q: "No such namespace" error
**A:** Create a KV namespace:
```bash
wrangler kv:namespace create "MESSAGE_QUEUE"
```
Then update the namespace ID in `wrangler.toml`.

### Q: "Authentication error" during deployment
**A:** Re-authenticate with Cloudflare:
```bash
wrangler logout
wrangler login
```

### Q: Messages not being delivered
**A:** Check:
1. Gmail token validity (regenerate if expired)
2. Worker logs: `wrangler tail`
3. Queue processing: `wrangler kv:key list --namespace-id=YOUR_ID`

### Q: Rate limiting not working
**A:** Verify rate limiting configuration in `wrangler.toml` and ensure it's deployed.

## 📈 Usage & Scaling

### Q: How many submissions can it handle?
**A:** Cloudflare Workers can handle millions of requests. The free tier supports 100k requests/day.

### Q: What happens if I exceed free tier limits?
**A:** Cloudflare will automatically scale, and you'll be charged based on usage. Costs are typically very low.

### Q: Can I use this for my organization?
**A:** Yes, it's designed to scale from personal use to organizational deployment.

### Q: How do I monitor usage?
**A:** Use the Cloudflare dashboard for analytics and set up alerts for unusual patterns.

## 🔮 Future Features

### Q: What features are planned?
**A:** Upcoming features include:
- Custom persona selection
- Message preview before submission
- Admin dashboard
- Multi-recipient support
- Webhook integrations

### Q: Can I contribute features?
**A:** Yes! See our [Contributing Guide](../contributing/development.md) and check open issues.

### Q: How do I request a feature?
**A:** Open a [feature request](../../issues/new?template=feature_request.md) or start a [discussion](../../discussions).

## 💡 Best Practices

### Q: How should I introduce this to users?
**A:** Emphasize:
- Complete anonymity guarantee
- AI transformation for style masking
- Time delays for additional privacy
- Simple, friction-free process

### Q: What makes good feedback prompts?
**A:** Effective prompts:
- Ask specific questions
- Encourage honest opinions
- Emphasize anonymity protection
- Provide context or examples

### Q: How do I analyze anonymous feedback?
**A:** Focus on:
- Common themes across messages
- Actionable suggestions
- Sentiment patterns
- Frequency of similar issues

---

**Still have questions?** 
- 📖 [Documentation](../README.md)
- 💬 [GitHub Discussions](../../discussions)
- 🐛 [Report Issues](../../issues)