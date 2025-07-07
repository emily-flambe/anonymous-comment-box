# Backend Test Suite

This directory contains comprehensive backend tests for the anonymous comment box application, focusing on testing all server-side functionality including API endpoints, AI services, email handling, and rate limiting.

## Test Structure

```
tests/backend/
├── README.md                      # This file
├── index.test.ts                  # Main worker entry point tests
├── api/                           # API endpoint tests
│   ├── submit.test.ts            # Message submission endpoint
│   ├── preview.test.ts           # Message preview endpoint
│   └── rate-limit-status.test.ts # Rate limit status endpoint
├── lib/                          # Library/service tests
│   ├── ai-transform.test.ts      # Legacy AI transformation service
│   ├── ai-persona-transformer.test.ts # New persona transformation service
│   ├── queue.test.ts             # Email queue service
│   ├── rate-limiter.test.ts      # Rate limiting service
│   └── static.test.ts            # Static file handler
├── integration/                  # Integration tests
│   └── full-flow.test.ts         # End-to-end workflow tests
└── environment.test.ts           # Environment variable validation
```

## Test Categories

### 1. Unit Tests (`lib/` and `api/`)
- **AI Transform Service**: Tests for Anthropic API integration
- **Persona Transformer**: Tests for new persona-based message transformation
- **Rate Limiter**: Tests for rate limiting logic and KV store integration
- **Email Queue**: Tests for Gmail API integration and email formatting
- **Static Handler**: Tests for serving static assets
- **API Endpoints**: Tests for request validation, response formatting, and error handling

### 2. Integration Tests (`integration/`)
- **Full Flow Tests**: End-to-end tests covering complete user workflows
- **Error Handling**: Tests for graceful degradation when services fail
- **CORS**: Tests for cross-origin request handling

### 3. System Tests
- **Environment Configuration**: Tests for environment variable validation
- **Worker Entry Point**: Tests for routing and middleware

## Test Coverage Areas

### ✅ API Route Tests
- [x] POST `/api/submit` - Message submission with validation
- [x] POST `/api/preview` - Message preview without submission
- [x] GET `/api/rate-limit-status` - Rate limit status check
- [x] POST `/api/test-submit` - Immediate email delivery for testing
- [x] GET `/api/health` - Health check endpoint
- [x] CORS preflight handling
- [x] Method validation
- [x] Error responses

### ✅ Message Processing Tests
- [x] Input validation (length, required fields)
- [x] Persona validation (predefined and custom)
- [x] AI transformation with personas
- [x] Fallback to legacy transformation
- [x] Error handling for AI service failures
- [x] Special character handling
- [x] Long message handling

### ✅ Rate Limiting Tests
- [x] Rate limit checking and incrementing
- [x] KV store integration
- [x] Session and IP-based keys
- [x] Rate limit exceeded scenarios
- [x] Reset time calculation
- [x] Status checking without incrementing
- [x] Error handling for KV failures

### ✅ Email Service Tests
- [x] Gmail API integration
- [x] Email formatting (MIME, headers, encoding)
- [x] HTML content escaping
- [x] Retry logic for temporary failures
- [x] Error handling for permanent failures
- [x] Test mode vs normal mode queueing
- [x] Random delay implementation

### ✅ AI Service Tests
- [x] Anthropic API integration
- [x] Request/response formatting
- [x] Error handling (rate limits, auth, quota)
- [x] Content validation
- [x] Token usage tracking
- [x] Multiple content block handling
- [x] Persona-specific prompting

### ✅ Error Handling Tests
- [x] API service failures
- [x] Network timeouts
- [x] Invalid JSON requests
- [x] Missing environment variables
- [x] KV store failures
- [x] Malformed API responses
- [x] Security error prevention

### ✅ CORS Tests
- [x] Preflight OPTIONS requests
- [x] CORS headers on all responses
- [x] Cross-origin request handling
- [x] Allowed methods and headers

### ✅ Environment Variable Tests
- [x] Missing API keys
- [x] Invalid email addresses
- [x] KV namespace configuration
- [x] Security (no exposure in errors)
- [x] Different environment modes

## Running Tests

### All Backend Tests
```bash
npm run test:backend
```

### Watch Mode
```bash
npm run test:backend:watch
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage:backend
```

### Individual Test Files
```bash
# Specific test file
npx vitest tests/backend/api/submit.test.ts

# Specific test pattern
npx vitest tests/backend/lib/
```

## Mock Strategy

### External Services
- **Anthropic API**: Mocked with realistic response structures
- **Gmail API**: Mocked with success/error scenarios
- **KV Store**: In-memory mock with full CRUD operations
- **Fetch API**: Mocked for HTTP requests

### Test Data
- Realistic message content with various edge cases
- Valid/invalid persona configurations
- Different IP addresses and session IDs
- Various error scenarios from external APIs

## Test Patterns

### Setup Pattern
```typescript
beforeEach(() => {
  vi.clearAllMocks();
  // Setup fresh mocks and environment
});
```

### Mock Verification
```typescript
expect(mockService.method).toHaveBeenCalledWith(
  expectedArgs,
  expect.objectContaining({ /* partial match */ })
);
```

### Error Testing
```typescript
mockService.method.mockRejectedValue(new Error('Service error'));
await expect(functionUnderTest()).rejects.toThrow('Expected error');
```

### Response Validation
```typescript
expect(response.status).toBe(200);
expect(response.headers.get('Content-Type')).toBe('application/json');
const data = await response.json();
expect(data).toMatchObject({ success: true });
```

## Test Quality Metrics

- **Coverage Target**: >90% for all backend code
- **Assertion Quality**: Each test verifies specific behavior
- **Error Coverage**: All error paths tested
- **Edge Cases**: Boundary conditions and unusual inputs
- **Isolation**: Tests don't depend on external services
- **Repeatability**: Tests produce consistent results

## Continuous Testing

The test suite is designed to:
- Run quickly (< 30 seconds for full backend suite)
- Provide clear failure messages
- Support watch mode for development
- Generate coverage reports
- Integrate with CI/CD pipelines

## Adding New Tests

When adding new features:

1. **Add unit tests** for new functions/classes
2. **Add integration tests** for new API endpoints
3. **Update error handling tests** for new error scenarios
4. **Add environment tests** for new configuration
5. **Update this README** with new test coverage

### Example Test Template
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Happy Path', () => {
    it('should handle normal operation', async () => {
      // Arrange
      // Act
      // Assert
    });
  });

  describe('Error Cases', () => {
    it('should handle specific error condition', async () => {
      // Arrange error condition
      // Act
      // Assert error response
    });
  });
});
```