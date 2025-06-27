# Quick Start Guide

Get your anonymous feedback box running in under 5 minutes.

## Prerequisites

- [Node.js 18+](https://nodejs.org/) installed
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- Gmail account for receiving feedback

## 🚀 5-Minute Setup

### 1. Clone and Install (1 minute)

```bash
git clone https://github.com/yourusername/anonymous-comment-box.git
cd anonymous-comment-box
npm install
npm install -g wrangler
```

### 2. Authenticate with Cloudflare (30 seconds)

```bash
wrangler login
```

This opens your browser for Cloudflare authentication.

### 3. Setup Gmail API (2 minutes)

Quick Gmail setup using OAuth Playground:

1. **Enable Gmail API**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create/select project → APIs & Services → Library
   - Search "Gmail API" → Enable

2. **Get Access Token**
   - Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Select "Gmail API v1" → `https://www.googleapis.com/auth/gmail.send`
   - Click "Authorize APIs" → Sign in → "Exchange authorization code for tokens"
   - Copy the Access token (starts with `ya29...`)

3. **Set Environment Secrets**
   ```bash
   wrangler secret put GMAIL_ACCESS_TOKEN
   # Paste your access token when prompted
   
   wrangler secret put ANTHROPIC_API_KEY
   # Enter your Anthropic API key
   
   wrangler secret put RECIPIENT_EMAIL
   # Enter your email address
   ```

### 4. Deploy (1 minute)

```bash
npm run deploy
```

### 5. Test (30 seconds)

Visit your new feedback box at `your-app-name.workers.dev` and submit a test message!

## ✅ You're Done!

Your anonymous feedback box is now live and ready to collect feedback.

## 🔧 Next Steps

### Customize Your Deployment

1. **Custom Domain** (Optional)
   ```bash
   # Add to wrangler.toml
   routes = [
     { pattern = "feedback.yourdomain.com/*", custom_domain = true }
   ]
   ```

2. **Update Configuration**
   ```bash
   # Edit wrangler.toml
   name = "your-feedback-box"
   ```

3. **Configure Rate Limiting**
   ```toml
   # In wrangler.toml
   [[rate_limiting]]
   threshold = 10
   period = 60
   ```

### Development Setup

For local development:

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Run tests
npm test

# Type checking
npm run typecheck
```

## 📧 How It Works

1. **User submits feedback** → Simple web form
2. **AI transformation** → Message rewritten with random persona
3. **Time-blind queuing** → Random 1-6 hour delay added
4. **Email delivery** → Batch delivered to your Gmail

## 🛡️ Privacy Features

- ✅ No user tracking or identification
- ✅ AI personas mask writing style
- ✅ Random delays hide submission timing
- ✅ Automatic message expiration
- ✅ No IP address logging

## 💰 Cost Estimate

**Free Tier Limits:**
- Cloudflare Workers: 100,000 requests/day
- Gmail API: Unlimited for personal use
- Anthropic Claude: $3-5/month for moderate usage

**Typical Usage:**
- 100 submissions/day = Well within free limits
- Monthly cost: $3-8 total

## 🆘 Troubleshooting

### Common Issues

**"No such namespace" error**
```bash
# Create KV namespace
wrangler kv:namespace create "MESSAGE_QUEUE"
# Copy the ID to wrangler.toml
```

**"Invalid token" error**
- Gmail token expired (they last 1 hour)
- Get a fresh token from OAuth Playground

**"Unauthorized client" error**
- Verify Gmail API is enabled
- Check OAuth client configuration

**Rate limiting not working**
- Verify rate limit config in wrangler.toml
- Check Cloudflare dashboard settings

### Getting Help

- 📖 [Detailed Setup Guide](gmail-setup.md)
- 🚀 [Deployment Guide](deployment.md)
- 🐛 [Troubleshooting Guide](../operations/troubleshooting.md)
- 💬 [GitHub Discussions](../../discussions)

## ⚡ Pro Tips

1. **Test with different personas** - Try submitting feedback and see how different personas transform your message

2. **Monitor your usage** - Check Cloudflare dashboard for analytics

3. **Set up alerts** - Configure Cloudflare alerts for errors or high usage

4. **Backup your secrets** - Save your environment variables safely

5. **Use staging environment** - Test changes before deploying to production

---

**Next:** [Complete Gmail Setup Guide →](gmail-setup.md)