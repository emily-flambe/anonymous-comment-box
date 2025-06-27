# Gmail API Setup Guide (5 Minutes!)

## Quick Setup Checklist

### Step 1: Enable Gmail API (2 minutes)
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create new project or select existing
- [ ] Go to "APIs & Services" → "Library" 
- [ ] Search "Gmail API" and click **Enable**

### Step 2: Get OAuth Token (3 minutes)
- [ ] Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
- [ ] In **Step 1**: Select "Gmail API v1" → Check "https://www.googleapis.com/auth/gmail.send"
- [ ] Click **"Authorize APIs"** and sign in with your Gmail account
- [ ] In **Step 2**: Click **"Exchange authorization code for tokens"**
- [ ] Copy the **"Access token"** (starts with `ya29....`)

### Step 3: Set Environment Variable
```bash
wrangler secret put GMAIL_ACCESS_TOKEN
# Paste your access token when prompted
```

### Step 4: Test Integration
```bash
npm run deploy
# Submit test feedback to verify email delivery
```

## That's It! 🎉

**No domain verification needed**  
**No email templates required**  
**No complex setup**  

Your emails will be sent from your Gmail account to your Gmail account.

---

## Token Expiry Note

**Access tokens expire after 1 hour.** For development:
1. Just get a new token from OAuth Playground when needed
2. Takes 30 seconds to refresh

**For production:** Consider using refresh tokens or service accounts (optional - current method works fine for personal use).

## Troubleshooting

### "Invalid token" error:
- Get a fresh token from OAuth Playground
- Make sure you selected the Gmail send scope

### "Insufficient permissions" error:
- Verify Gmail API is enabled in your project
- Check you're using the correct scope: `gmail.send`

### Emails not arriving:
- Check spam folder
- Verify email address in `EMAIL_TO` environment variable

## Alternative: Service Account (Optional)

For long-term production use without token expiry:

1. Create Service Account in Google Cloud Console
2. Enable domain-wide delegation
3. Download JSON key file  
4. Use service account authentication instead of OAuth

But for personal use, the OAuth token method above is much simpler!