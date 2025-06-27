import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        ANTHROPIC_API_KEY: 'test-api-key',
        RECIPIENT_EMAIL: 'test@example.com',
        ENVIRONMENT: 'test',
      },
      kvNamespaces: ['MESSAGE_QUEUE'],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});