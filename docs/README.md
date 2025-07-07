# Anonymous Comment Box Documentation

Welcome to the documentation for the Anonymous Comment Box - a privacy-first feedback collection system.

## 📖 Table of Contents

### 🚀 Getting Started
- [**Quick Start Guide**](setup/quickstart.md) - Get running in 5 minutes
- [**Gmail API Setup**](setup/gmail-setup.md) - Complete OAuth configuration
- [**Deployment Guide**](setup/deployment.md) - Cloudflare Workers deployment

### 🏗️ Architecture & Design
- [**System Architecture**](design/architecture.md) - Technical overview and design decisions
- [**API Reference**](design/api-reference.md) - Complete API documentation
- [**Security Model**](design/security.md) - Privacy and security implementation

### ✨ Features
- [**Message Customization**](features/message-customization.md) - AI personas and preview system (Future)
- [**Rate Limiting**](features/rate-limiting.md) - Abuse prevention system
- [**Email Templates**](features/email-templates.md) - Delivery formatting

### 🛠️ Development
- [**Development Setup**](contributing/development.md) - Local development environment
- [**Testing Guide**](contributing/testing.md) - Test suites and strategies
- [**Contributing Guidelines**](contributing/contributing.md) - How to contribute

### 📊 Operations
- [**Monitoring**](operations/monitoring.md) - Metrics and alerting
- [**Troubleshooting**](operations/troubleshooting.md) - Common issues and solutions
- [**Performance**](operations/performance.md) - Optimization and scaling

## 🎯 Quick Navigation

### For New Users
1. [Quick Start Guide](setup/quickstart.md) - Get started immediately
2. [Gmail Setup](setup/gmail-setup.md) - Configure email delivery
3. [Deployment](setup/deployment.md) - Deploy to production

### For Developers
1. [Architecture Overview](design/architecture.md) - Understand the system
2. [Development Setup](contributing/development.md) - Set up local environment
3. [API Reference](design/api-reference.md) - Build integrations

### For Operators
1. [Monitoring](operations/monitoring.md) - Track system health
2. [Performance](operations/performance.md) - Optimize and scale
3. [Troubleshooting](operations/troubleshooting.md) - Solve problems

## 🆘 Need Help?

- **Questions?** Check the [FAQ](setup/faq.md) or search [existing issues](../../issues)
- **Bug Reports?** Open a [new issue](../../issues/new?template=bug_report.md)
- **Feature Requests?** Start a [discussion](../../discussions)
- **Security Issues?** Email security@yourproject.com

## 📝 Contributing to Documentation

Found a typo or want to improve the docs? Great!

1. All documentation is written in Markdown
2. Follow the [style guide](contributing/documentation-style.md)
3. Test all code examples before submitting
4. Update the table of contents when adding new files

## 📋 Documentation Status

| Section | Status | Last Updated |
|---------|--------|--------------|
| Setup Guides | ✅ Complete | 2024-06-27 |
| Architecture | ✅ Complete | 2024-06-27 |
| API Reference | 🚧 In Progress | 2024-06-27 |
| Contributing | ✅ Complete | 2024-06-27 |
| Operations | 📝 Planned | - |

Legend: ✅ Complete • 🚧 In Progress • 📝 Planned • ❌ Outdated

---

**Documentation Structure**
```
docs/
├── README.md                    # This file
├── setup/                       # Getting started guides
├── design/                      # Architecture and technical docs
├── features/                    # Feature specifications
├── contributing/                # Development guides
└── operations/                  # Monitoring and maintenance
```