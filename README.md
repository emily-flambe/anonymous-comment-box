# Anonymous Comment Box

A privacy-first web application for collecting completely anonymous feedback through AI-powered message transformation and time-blind queuing.

## ✨ Features

- **🔒 True Anonymity**: AI personas mask writing style, random delays hide submission timing
- **🚀 Instant Setup**: Deploy to Cloudflare Workers in under 5 minutes
- **🎭 AI Transformation**: 8 unique personas transform messages while preserving meaning
- **📧 Gmail Integration**: Simple OAuth setup, no domain verification required
- **⚡ Serverless**: Built on Cloudflare Workers - globally distributed, zero maintenance
- **🔐 Privacy-First**: No tracking, no cookies, no user identification possible

## 🎯 Use Cases

- **Team Feedback**: Safe space for honest opinions about processes, management, culture
- **Event Feedback**: Anonymous conference/workshop feedback without fear of identification
- **Academic Research**: Collect sensitive opinions for research studies
- **Product Feedback**: Get unfiltered user feedback without social desirability bias
- **Whistleblowing**: Secure channel for reporting issues in organizations

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/anonymous-comment-box.git
   cd anonymous-comment-box
   npm install
   ```

2. **Local Development** (Optional)
   ```bash
   # Create .dev.vars file with your API keys
   echo "AI_WORKER_API_SECRET_KEY=your_key_here" > .dev.vars
   
   # Start development server
   make dev
   # or: npm run dev
   ```

3. **Setup Gmail OAuth** (2 minutes)
   ```bash
   # Follow the guide in docs/setup/gmail-setup.md
   wrangler secret put GMAIL_CLIENT_ID
   wrangler secret put GMAIL_CLIENT_SECRET
   wrangler secret put GMAIL_REFRESH_TOKEN
   wrangler secret put RECIPIENT_EMAIL
   ```

4. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

5. **Done!** Your anonymous feedback box is live at `your-app.workers.dev`

> **⚠️ Important**: AI transformation and email functionality do not work in the Cloudflare preview environment. These features only work in local development or production deployments.

[**📖 Full Setup Guide →**](docs/setup/quickstart.md)

## 🔧 Debug & Monitoring

Built-in debug endpoints for system diagnostics:

```bash
# Check system health
curl https://your-app.workers.dev/api/health

# Verify Gmail OAuth status
curl https://your-app.workers.dev/api/debug/token-status

# Test email connectivity
curl https://your-app.workers.dev/api/debug/email-status

# Monitor queue status
curl https://your-app.workers.dev/api/debug/queue-status

# Send test email
curl -X POST https://your-app.workers.dev/api/debug/send-test-email
```

## 🏗️ How It Works

```
User Input → AI Transformation → Time-Blind Queue → Email Delivery
     ↓              ↓                   ↓              ↓
"This sucks"   "Well, I reckon     Random 1-6h      Batch email
               this here thing      delay            with persona
               ain't working                         tag
               right, y'all"
```

1. **User submits feedback** through a simple web form
2. **AI persona transformation** rewrites the message to mask writing style
3. **Time-blind queuing** adds random delays (1-6 hours) to prevent timing correlation
4. **Batch email delivery** sends anonymized feedback via Gmail API

## 🎭 Available Personas

- **Internet Random**: "ngl this idea slaps 💯 we should def implement this fr fr"
- **Barely Literate**: "i dont like this thing cuz it dont make sense to me and stuff"
- **Extremely Serious**: "This matter requires immediate attention and systematic remediation..."
- **Super Nice**: "I hope this feedback is helpful! Thank you for considering improvements! 😊"
- **Custom Persona**: Define your own transformation style
- **Legacy Random**: Classic personas including Professional, Casual, Academic, Technical, etc.

## 📁 Project Structure

```
├── src/
│   ├── api/           # API endpoints (submit, debug, queue processing)
│   ├── lib/           # Core logic (AI client, Gmail auth, queue)
│   ├── static/        # Frontend (HTML, CSS, JS)
│   └── types/         # TypeScript definitions
├── docs/              # Documentation
├── tests/             # Test suites
└── wrangler.toml      # Cloudflare Workers configuration
```

## 🛡️ Privacy & Security

- **No User Tracking**: Zero cookies, localStorage, or session data
- **No IP Logging**: Rate limiting only, no permanent storage
- **End-to-End Protection**: TLS 1.3 in transit, AES-256 at rest
- **Automatic Deletion**: Messages auto-expire after delivery
- **AI Anonymization**: Writing style completely transformed
- **Time Obfuscation**: Random delays prevent timing correlation

## 📚 Documentation

### 🚀 Getting Started
- [**Quick Start Guide**](docs/setup/quickstart.md) - Get running in 5 minutes
- [**Gmail API Setup**](docs/setup/gmail-setup.md) - Complete OAuth configuration
- [**Deployment Guide**](docs/setup/deployment.md) - Cloudflare Workers deployment

### 🏗️ Architecture & Design
- [**System Architecture**](docs/design/architecture.md) - Technical overview and design decisions
- [**API Reference**](docs/design/api-reference.md) - Complete API documentation
- [**Security Model**](docs/design/security.md) - Privacy and security implementation

### ✨ Features
- [**Message Customization**](docs/features/message-customization.md) - AI personas and preview system (Future)
- [**Rate Limiting**](docs/features/rate-limiting.md) - Abuse prevention system
- [**Email Templates**](docs/features/email-templates.md) - Delivery formatting

### 🛠️ Development
- [**Development Setup**](docs/contributing/development.md) - Local development environment
- [**Testing Guide**](docs/contributing/testing.md) - Test suites and strategies
- [**Contributing Guidelines**](docs/contributing/contributing.md) - How to contribute

### 📊 Operations
- [**Monitoring**](docs/operations/monitoring.md) - Metrics and alerting
- [**Troubleshooting**](docs/operations/troubleshooting.md) - Common issues and solutions
- [**Performance**](docs/operations/performance.md) - Optimization and scaling

## 🚀 Tech Stack

- **Runtime**: Cloudflare Workers (Edge computing)
- **Storage**: Cloudflare KV (Global key-value store)
- **AI**: Custom AI Worker API (ai-worker-api.emily-cogsdill.workers.dev)
- **Email**: Gmail API with OAuth (Secure, refresh-token based)
- **Frontend**: Vanilla JavaScript (No framework overhead)
- **Language**: TypeScript (Type safety)

## 🤝 Contributing

We welcome contributions! Please see our [Development Guide](docs/contributing/development.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run tests (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Cloudflare Workers](https://workers.cloudflare.com/) for the serverless platform
- [Gmail API](https://developers.google.com/gmail/api) for reliable email delivery
- Custom AI Worker infrastructure for secure message transformations

---

**Made with ❤️ for privacy and honest feedback**

[Live Demo](https://your-app.workers.dev) • [Documentation](docs/) • [Issues](../../issues) • [Discussions](../../discussions)