# Anonymous Comment Box - Simple Makefile

.PHONY: help dev build deploy clean

# Default target
help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

# Development
dev: ## Start local development server
	@echo "🚀 Starting development server..."
	@-pkill -f "wrangler" 2>/dev/null || true
	@-lsof -ti:8888 | xargs kill -9 2>/dev/null || true
	@sleep 1
	npm run dev

# Build
build: ## Build static assets
	@echo "🔨 Building static assets..."
	npm run build-static

# Deployment
deploy: build ## Deploy to Cloudflare Workers
	@echo "🚀 Deploying to Cloudflare Workers..."
	wrangler deploy

# Cleanup
clean: ## Clean and reinstall dependencies
	@echo "🧹 Cleaning project..."
	rm -rf node_modules package-lock.json
	npm install