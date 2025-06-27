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

2. **Setup Gmail API** (2 minutes)
   ```bash
   # Follow the guide in docs/setup/gmail-setup.md
   wrangler secret put GMAIL_ACCESS_TOKEN
   ```

3. **Deploy to Cloudflare**
   ```bash
   npm run deploy
   ```

4. **Done!** Your anonymous feedback box is live at `your-app.workers.dev`

[**📖 Full Setup Guide →**](docs/setup/quickstart.md)

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

- **Nervous Southerner**: "Well, I reckon this might could be better, if that's alright..."
- **Excited Californian**: "Dude, this is totally rad but maybe we could optimize..."
- **Formal Academic**: "The aforementioned implementation exhibits certain deficiencies..."
- **Brooklyn Native**: "Listen, this thing's broken and you gotta fix it, capisce?"
- **Midwest Polite**: "Oh, this is really great! Maybe just a tiny suggestion..."
- **Tech Bro**: "We need to pivot this workflow to optimize our KPIs..."
- **Zen Philosopher**: "In mindful consideration, this path may benefit from adjustment..."
- **Pirate Captain**: "Arrr, this here contraption be needin' some work, savvy?"

## 📁 Project Structure

```
├── src/
│   ├── api/           # API endpoints (submit, queue processing)
│   ├── lib/           # Core logic (AI transform, queue, email)
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

- [**Quick Start Guide**](docs/setup/quickstart.md) - Get running in 5 minutes
- [**Gmail Setup**](docs/setup/gmail-setup.md) - OAuth configuration walkthrough
- [**Deployment Guide**](docs/setup/deployment.md) - Cloudflare Workers deployment
- [**Architecture Overview**](docs/design/architecture.md) - Technical design details
- [**Development Guide**](docs/contributing/development.md) - Local development setup
- [**API Reference**](docs/design/api-reference.md) - Endpoint documentation

## 🚀 Tech Stack

- **Runtime**: Cloudflare Workers (Edge computing)
- **Storage**: Cloudflare KV (Global key-value store)
- **AI**: Anthropic Claude API (Message transformation)
- **Email**: Gmail API (Zero-config email delivery)
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
- [Anthropic Claude](https://www.anthropic.com/) for AI-powered transformations
- [Gmail API](https://developers.google.com/gmail/api) for reliable email delivery

---

**Made with ❤️ for privacy and honest feedback**

[Live Demo](https://your-app.workers.dev) • [Documentation](docs/) • [Issues](../../issues) • [Discussions](../../discussions)