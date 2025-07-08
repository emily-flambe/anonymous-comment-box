import { Env } from '../types/env';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

interface TokenCache {
  access_token: string;
  expires_at: number;
}

export class GmailAuth {
  private tokenCache: TokenCache | null = null;
  
  constructor(private env: Env) {}

  async getValidAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && this.tokenCache.expires_at > Date.now() + 60000) {
      return this.tokenCache.access_token;
    }

    // Refresh the token
    const accessToken = await this.refreshAccessToken();
    
    // Cache the token with expiration
    this.tokenCache = {
      access_token: accessToken,
      expires_at: Date.now() + 3300000 // 55 minutes (tokens expire in 1 hour)
    };

    return accessToken;
  }

  private async refreshAccessToken(): Promise<string> {
    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.env.GMAIL_CLIENT_ID,
        client_secret: this.env.GMAIL_CLIENT_SECRET,
        refresh_token: this.env.GMAIL_REFRESH_TOKEN,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OAuth token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json() as TokenResponse;
    
    if (!tokenData.access_token) {
      throw new Error('No access token received from OAuth refresh');
    }

    return tokenData.access_token;
  }

  async sendEmail(message: string): Promise<void> {
    const accessToken = await this.getValidAccessToken();
    
    console.log('Sending email to:', this.env.RECIPIENT_EMAIL);
    
    // Create RFC 2822 compliant email message
    const emailContent = [
      `To: ${this.env.RECIPIENT_EMAIL}`,
      `Subject: Anonymous Feedback`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      message
    ].join('\r\n');
    
    // Base64 encode the email (Gmail API requirement)
    const encodedMessage = btoa(emailContent)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send via Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      
      // If it's a 401 error, clear the cache and try once more
      if (response.status === 401) {
        console.log('Access token expired, clearing cache and retrying...');
        this.tokenCache = null;
        return this.sendEmail(message); // Recursive retry
      }
      
      throw new Error(`Gmail API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json() as { id: string };
    console.log('Email sent successfully:', result.id);
  }
}