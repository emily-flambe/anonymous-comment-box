# Anonymous Comment Box - Project Context

## Overview

Anonymous Comment Box is a privacy-first web application built on Cloudflare Workers that enables truly anonymous feedback collection. The system uses AI-powered message transformation and time-blind queuing to ensure complete anonymity while maintaining the essence of user feedback.

## Key Features

### 1. True Anonymity
- **AI Persona Transformation**: 4 preset AI personas transform messages to mask writing style
- **Random Time Delays**: Messages are queued with random delays (1-6 hours by default) to prevent timing correlation
- **No User Tracking**: Zero cookies, no IP logging, no user identification possible

### 2. Technology Stack
- **Runtime**: Cloudflare Workers (edge serverless)
- **Language**: TypeScript
- **AI**: Cloudflare AI Workers (Llama 3.1 8B Instruct)
- **Email**: Gmail API integration
- **Testing**: Vitest
- **Build**: Wrangler

### 3. Architecture Highlights
- **Serverless Edge Computing**: Globally distributed with zero infrastructure management
- **Queue-Based Processing**: Messages are queued and processed asynchronously
- **API-First Design**: RESTful API endpoints for all operations
- **Static Asset Optimization**: Embedded static files for performance

## Use Cases

1. **Team Feedback**: Safe space for honest organizational feedback
2. **Event Feedback**: Anonymous conference/workshop evaluations
3. **Academic Research**: Collect sensitive opinions without bias
4. **Product Feedback**: Unfiltered user insights
5. **Whistleblowing**: Secure reporting channel

## Privacy & Security

### Data Protection
- No personal data collection
- Messages transformed before storage
- No analytics or tracking scripts
- HTTPS-only communication

### Anonymization Techniques
1. **Content Transformation**: AI rewrites messages in different styles
2. **Temporal Anonymization**: Random delays break submission patterns
3. **Style Masking**: Writing patterns obscured by AI personas
4. **Metadata Stripping**: No headers, IPs, or identifiers stored

## Project Structure

```
/
├── src/                 # Source code
│   ├── api/            # API endpoints
│   ├── lib/            # Core libraries
│   ├── static/         # Frontend assets
│   └── types/          # TypeScript types
├── tests/              # Test suites
├── docs/               # Documentation
└── wrangler.toml       # Cloudflare config
```

## Development Philosophy

1. **Privacy First**: Every feature evaluated for privacy impact
2. **Simplicity**: Minimal dependencies, clear code structure
3. **Performance**: Edge-optimized for global distribution
4. **Accessibility**: Works without JavaScript, screen reader friendly
5. **Open Source**: MIT licensed for transparency and trust

## Current Status

The project is actively maintained with regular updates for:
- Security patches
- AI model improvements
- Performance optimizations
- Feature enhancements based on community feedback

## Integration Points

- **Cloudflare Workers**: Serverless runtime
- **Cloudflare AI**: Message transformation
- **Gmail API**: Email delivery
- **Cloudflare KV**: Message queue storage
- **GitHub Actions**: CI/CD pipeline