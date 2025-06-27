# Gmail API Setup Guide

Complete guide to setting up Gmail API for the Anonymous Comment Box.

## Overview

The application uses Gmail API to send feedback emails from your Gmail account to yourself. This approach is simple, free, and doesn't require domain verification.

## 📋 Prerequisites

- Google account (Gmail)
- Access to Google Cloud Console
- Basic understanding of OAuth 2.0

## 🚀 Quick Setup (5 Minutes)

### Step 1: Enable Gmail API (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing:
   - Click project dropdown → "New Project"
   - Name: "Anonymous Feedback Box"
   - Click "Create"
3. Enable Gmail API:
   - Navigate to **APIs & Services** → **Library**
   - Search for "Gmail API"
   - Click **Enable**

### Step 2: Get OAuth Token (3 minutes)

**Using OAuth 2.0 Playground (Recommended for quick setup):**

1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. In **Step 1**:
   - Find "Gmail API v1" in the list
   - Check `https://www.googleapis.com/auth/gmail.send`
   - Click **"Authorize APIs"**
3. Sign in with your Google account and grant permissions
4. In **Step 2**:
   - Click **"Exchange authorization code for tokens"**
   - Copy the **"Access token"** (starts with `ya29...`)

### Step 3: Configure Cloudflare Worker

Set the Gmail access token as a secret:

```bash
wrangler secret put GMAIL_ACCESS_TOKEN
# Paste your access token when prompted

wrangler secret put RECIPIENT_EMAIL
# Enter the email address where you want to receive feedback
```

### Step 4: Test Integration

Deploy and test:

```bash
npm run deploy
# Visit your worker URL and submit test feedback
```

## 🔧 Production Setup

For production use, you'll want a more robust OAuth setup:

### Option 1: OAuth Client (Recommended)

1. **Create OAuth Credentials**
   - In Google Cloud Console: **APIs & Services** → **Credentials**
   - Click **"+ CREATE CREDENTIALS"** → **"OAuth client ID"**
   - Configure OAuth consent screen if prompted:
     - Choose **External** user type
     - Fill required fields (app name, support email)
     - Add your email to test users
   - For Application type: **Web application**
   - Name: "Anonymous Comment Box"
   - Authorized redirect URIs: `https://developers.google.com/oauthplayground`
   - Save Client ID and Client Secret

2. **Use Your Own OAuth Credentials in Playground**
   - Go back to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
   - Click gear icon (⚙️) → Check **"Use your own OAuth credentials"**
   - Enter your Client ID and Client Secret
   - Follow steps 2-4 from Quick Setup above

### Option 2: Service Account

For completely automated setup without user interaction:

1. **Create Service Account**
   ```bash
   # In Google Cloud Console
   IAM & Admin → Service Accounts → Create Service Account
   ```

2. **Enable Domain-Wide Delegation**
   ```bash
   # Check "Enable Google Workspace Domain-wide Delegation"
   # Download JSON key file
   ```

3. **Use Service Account in Code**
   ```javascript
   // Example implementation
   const { JWT } = require('google-auth-library');
   
   const client = new JWT({
     email: 'service-account@project.iam.gserviceaccount.com',
     key: process.env.GOOGLE_PRIVATE_KEY,
     scopes: ['https://www.googleapis.com/auth/gmail.send'],
     subject: 'your-email@gmail.com'
   });
   ```

## ⚡ Advanced Configuration

### Refresh Token Implementation

For long-term token management:

```javascript
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token'
    })
  });
  
  const data = await response.json();
  return data.access_token;
}
```

### Multiple Environment Setup

For staging/production environments:

```bash
# Development
wrangler secret put GMAIL_ACCESS_TOKEN --env development

# Production  
wrangler secret put GMAIL_ACCESS_TOKEN --env production
```

## 🛡️ Security Best Practices

### 1. Scope Limitation
- Only request `gmail.send` scope
- Never request broader permissions than needed

### 2. Token Security
```bash
# ✅ Do this
wrangler secret put GMAIL_ACCESS_TOKEN

# ❌ Never do this
export GMAIL_ACCESS_TOKEN="ya29..."  # Don't put in env files
```

### 3. Regular Rotation
- Rotate tokens every 30 days
- Monitor for unauthorized access
- Use refresh tokens for automation

### 4. Access Monitoring
- Enable Gmail API audit logs
- Monitor unusual sending patterns
- Set up usage quotas

## 📊 Monitoring & Quotas

### Gmail API Limits
- **Quota**: 250 quota units per user per second
- **Daily Limit**: 1 billion quota units per day
- **Rate Limiting**: Built into the API

### Usage Tracking
```javascript
// Monitor API usage
const usage = await gmail.users.getProfile({
  userId: 'me',
  fields: 'messagesTotal,threadsTotal'
});
```

## 🆘 Troubleshooting

### Common Errors

**"Invalid credentials" (401)**
```bash
# Token expired or invalid
# Solution: Generate new token from OAuth Playground
wrangler secret put GMAIL_ACCESS_TOKEN
```

**"Insufficient permissions" (403)**
```bash
# Missing or incorrect scope
# Solution: Ensure you selected gmail.send scope
```

**"Quota exceeded" (429)**
```bash
# Too many requests
# Solution: Implement exponential backoff
```

**"User rate limit exceeded" (429)**
```bash
# Per-user quota exceeded
# Solution: Implement request queuing
```

### Debug Mode

Enable detailed logging:

```javascript
// Add to your worker
console.log('Gmail API Request:', {
  method: 'POST',
  url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
  headers: { Authorization: `Bearer ${token.substring(0, 10)}...` }
});
```

### Testing Commands

```bash
# Test Gmail API access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://gmail.googleapis.com/gmail/v1/users/me/profile

# Test sending capability
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"raw":"VG86IHRlc3RAZXhhbXBsZS5jb20KU3ViamVjdDogVGVzdAoKVGVzdCBtZXNzYWdl"}' \
  https://gmail.googleapis.com/gmail/v1/users/me/messages/send
```

## 📈 Cost Analysis

### Gmail API Pricing
- **Personal Use**: Free unlimited
- **Business Use**: Free up to quotas
- **High Volume**: Contact Google for pricing

### Typical Usage Costs
```
100 feedback messages/day:
- Gmail API: $0 (free)
- Total cost: $0

1,000 feedback messages/day:
- Gmail API: $0 (free)
- Total cost: $0
```

## 🔄 Migration & Backup

### Backing Up Configuration
```bash
# Export current secrets (for migration)
wrangler secret list

# Backup to secure storage
echo "GMAIL_ACCESS_TOKEN=ya29..." > .env.backup
```

### Alternative Email Providers

If you need to switch from Gmail:

- **Resend**: Simple API, good deliverability
- **Mailgun**: Enterprise features, bulk sending
- **SendGrid**: Comprehensive analytics
- **Brevo**: European data residency

## 📚 Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Gmail API Quotas and Limits](https://developers.google.com/gmail/api/reference/quota)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)

---

**Next:** [Deployment Guide →](deployment.md)