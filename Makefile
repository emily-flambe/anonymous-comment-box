# Makefile for Anonymous Comment Box - Message Customization Feature
# Cloudflare Workers + TypeScript + Vitest

.PHONY: help dev deploy test lint format typecheck clean setup install secrets

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# Development
dev: ## Start development server with hot reload
	@echo "🚀 Starting development server..."
	npm run dev

preview: ## Preview locally (same as dev)
	@echo "👀 Starting preview server..."
	npm run dev

# Testing
test: ## Run all tests
	@echo "🧪 Running tests..."
	npm test

test-watch: ## Run tests in watch mode
	@echo "👀 Running tests in watch mode..."
	npm run test:watch

test-unit: ## Run unit tests only
	@echo "🔬 Running unit tests..."
	npx vitest run tests/unit

test-integration: ## Run integration tests only
	@echo "🔗 Running integration tests..."
	npx vitest run tests/integration

test-e2e: ## Run end-to-end tests only
	@echo "🎭 Running E2E tests..."
	npx vitest run tests/e2e

test-accessibility: ## Run accessibility tests only
	@echo "♿ Running accessibility tests..."
	npx vitest run tests/accessibility

test-performance: ## Run performance tests only
	@echo "⚡ Running performance tests..."
	npx vitest run tests/performance

# Code Quality
lint: ## Run ESLint
	@echo "🔍 Linting code..."
	npm run lint

lint-fix: ## Fix ESLint issues automatically
	@echo "🔧 Fixing lint issues..."
	npx eslint src --ext .ts,.tsx --fix

format: ## Format code with Prettier
	@echo "💅 Formatting code..."
	npm run format

format-check: ## Check code formatting
	@echo "👀 Checking code format..."
	npx prettier --check "src/**/*.{ts,tsx,js,jsx,json,css}"

typecheck: ## Run TypeScript type checking
	@echo "🔍 Type checking..."
	npm run typecheck

typecheck-src: ## Type check source only (faster)
	@echo "🔍 Type checking source..."
	npm run typecheck:src

# Quality Gate - run all checks
check: lint typecheck test ## Run all quality checks (lint, typecheck, test)
	@echo "✅ All quality checks passed!"

ci: lint typecheck-src test ## Run CI pipeline checks
	@echo "🎯 CI pipeline completed!"

# Deployment
deploy: ## Deploy to production
	@echo "🚀 Deploying to production..."
	npm run deploy

deploy-preview: ## Deploy preview/staging
	@echo "👀 Deploying preview..."
	wrangler deploy --env development

# Secrets Management
secrets-list: ## List all secrets
	@echo "🔐 Listing secrets..."
	wrangler secret list

secret-put: ## Put a secret (usage: make secret-put SECRET=key)
	@if [ -z "$(SECRET)" ]; then echo "❌ Usage: make secret-put SECRET=key"; exit 1; fi
	@echo "🔐 Setting secret $(SECRET)..."
	wrangler secret put $(SECRET)

secret-delete: ## Delete a secret (usage: make secret-delete SECRET=key)
	@if [ -z "$(SECRET)" ]; then echo "❌ Usage: make secret-delete SECRET=key"; exit 1; fi
	@echo "🗑️ Deleting secret $(SECRET)..."
	wrangler secret delete $(SECRET)

# Setup required secrets
setup-secrets: ## Interactive setup of required secrets
	@echo "🔐 Setting up required secrets..."
	@echo "Setting ANTHROPIC_API_KEY..."
	@wrangler secret put ANTHROPIC_API_KEY
	@echo "Setting RECIPIENT_EMAIL..."
	@wrangler secret put RECIPIENT_EMAIL
	@echo "Setting GMAIL_ACCESS_TOKEN..."
	@wrangler secret put GMAIL_ACCESS_TOKEN
	@echo "✅ All secrets configured!"

# KV Namespace Management
kv-list: ## List KV namespaces
	@echo "📦 Listing KV namespaces..."
	wrangler kv:namespace list

kv-keys: ## List keys in MESSAGE_QUEUE namespace
	@echo "🔑 Listing keys in MESSAGE_QUEUE..."
	wrangler kv:key list --binding MESSAGE_QUEUE

kv-get: ## Get a KV value (usage: make kv-get KEY=key)
	@if [ -z "$(KEY)" ]; then echo "❌ Usage: make kv-get KEY=key"; exit 1; fi
	@echo "📖 Getting key $(KEY)..."
	wrangler kv:key get $(KEY) --binding MESSAGE_QUEUE

kv-put: ## Put a KV pair (usage: make kv-put KEY=key VALUE=value)
	@if [ -z "$(KEY)" ] || [ -z "$(VALUE)" ]; then echo "❌ Usage: make kv-put KEY=key VALUE=value"; exit 1; fi
	@echo "📝 Setting $(KEY)=$(VALUE)..."
	wrangler kv:key put $(KEY) "$(VALUE)" --binding MESSAGE_QUEUE

kv-delete: ## Delete a KV key (usage: make kv-delete KEY=key)
	@if [ -z "$(KEY)" ]; then echo "❌ Usage: make kv-delete KEY=key"; exit 1; fi
	@echo "🗑️ Deleting key $(KEY)..."
	wrangler kv:key delete $(KEY) --binding MESSAGE_QUEUE

# Project Management
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install

setup: install ## Complete project setup
	@echo "🔧 Setting up project..."
	@echo "✅ Project setup complete!"
	@echo "Next steps:"
	@echo "  1. Run 'make setup-secrets' to configure API keys"
	@echo "  2. Run 'make dev' to start development server"
	@echo "  3. Run 'make test' to run tests"

clean: ## Clean node_modules and reinstall
	@echo "🧹 Cleaning project..."
	rm -rf node_modules package-lock.json
	npm install

# Logs and Monitoring
logs: ## View worker logs
	@echo "📜 Viewing worker logs..."
	wrangler tail

logs-follow: ## Follow worker logs in real-time
	@echo "📡 Following worker logs..."
	wrangler tail --format pretty

# Documentation
docs-serve: ## Serve documentation locally (if docs site exists)
	@echo "📚 Serving documentation..."
	@if [ -d "docs" ]; then \
		echo "Documentation available in docs/ folder"; \
		echo "Consider setting up a docs server (e.g., serve, http-server)"; \
	else \
		echo "No docs folder found"; \
	fi

# Database/Storage
db-status: ## Check KV storage status
	@echo "💾 Checking storage status..."
	@echo "KV Namespaces:"
	@wrangler kv:namespace list
	@echo "\nMessage Queue Keys:"
	@wrangler kv:key list --binding MESSAGE_QUEUE | head -10

# Performance and Monitoring
perf-test: ## Run performance tests and benchmarks
	@echo "⚡ Running performance tests..."
	npm run test tests/performance/

load-test: ## Run load tests (requires setup)
	@echo "🏋️ Running load tests..."
	@echo "Note: Configure load testing tools as needed"
	npm run test tests/performance/load-tests.test.ts

# Utilities
info: ## Show project information
	@echo "📋 Project Information:"
	@echo "  Name: anonymous-comment-box"
	@echo "  Version: $(shell node -p "require('./package.json').version")"
	@echo "  Node: $(shell node --version)"
	@echo "  NPM: $(shell npm --version)"
	@echo "  Wrangler: $(shell wrangler --version 2>/dev/null || echo 'Not installed')"
	@echo "  Working Directory: $(PWD)"

env-check: ## Check environment setup
	@echo "🔍 Environment Check:"
	@echo "Node.js: $(shell node --version 2>/dev/null || echo '❌ Not found')"
	@echo "NPM: $(shell npm --version 2>/dev/null || echo '❌ Not found')"
	@echo "Wrangler: $(shell wrangler --version 2>/dev/null || echo '❌ Not found')"
	@echo "TypeScript: $(shell npx tsc --version 2>/dev/null || echo '❌ Not found')"
	@echo "Dependencies: $(shell [ -d node_modules ] && echo '✅ Installed' || echo '❌ Run make install')"

# Git helpers (bonus commands)
git-status: ## Show git status
	@git status --short

git-log: ## Show recent commits
	@git log --oneline -10

git-branch: ## Show current branch and recent branches
	@echo "Current branch: $(shell git branch --show-current)"
	@echo "Recent branches:"
	@git branch --sort=-committerdate | head -5

# Quick development cycle
quick-check: lint-fix format typecheck-src ## Quick check before commit (fix, format, typecheck)
	@echo "🚀 Quick check complete!"

full-check: clean install check ## Full check (clean, install, all quality checks)
	@echo "✅ Full check complete!"

# Emergency commands
emergency-reset: ## Reset to clean state (careful!)
	@echo "🚨 Emergency reset - this will remove all local changes!"
	@echo "Press Ctrl+C to cancel or Enter to continue..."
	@read
	git reset --hard HEAD
	git clean -fd
	make clean
	make install

# Development workflow shortcuts
work: dev ## Shortcut for 'make dev'
w: dev    ## Ultra-short for 'make dev'
t: test   ## Shortcut for 'make test'
c: check  ## Shortcut for 'make check'
d: deploy ## Shortcut for 'make deploy'