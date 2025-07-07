import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    environmentOptions: {
      bindings: {
        ANTHROPIC_API_KEY: 'test-api-key',
        RECIPIENT_EMAIL: 'test@example.com',
        ENVIRONMENT: 'test',
      },
      kvNamespaces: ['MESSAGE_QUEUE'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});