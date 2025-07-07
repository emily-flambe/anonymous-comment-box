# Frontend Test Suite

This directory contains comprehensive frontend tests for the anonymous comment box application. The tests cover all aspects of the client-side JavaScript functionality using Vitest with JSDOM for DOM testing.

## Test Structure

### Test Files

1. **`dom-manipulation.test.ts`** - DOM Manipulation Tests
   - Initial DOM state validation
   - Character counter updates
   - UI element visibility changes
   - Form reset functionality
   - Preview display handling
   - Rate limit display updates

2. **`form-validation.test.ts`** - Form Validation Tests
   - Message input validation (empty, whitespace)
   - Character limit enforcement (1800 chars for message, 450 for custom persona)
   - Custom persona validation
   - Preview validation requirements
   - Form state during submission
   - Input sanitization

3. **`persona-selection.test.ts`** - Persona Selection Tests
   - Persona dropdown functionality
   - Persona descriptions display
   - Custom persona text handling
   - Session state persistence
   - API integration with personas
   - Edge cases and rapid changes

4. **`preview-modal.test.ts`** - Preview Modal Tests
   - Preview container visibility
   - Content display (original/transformed)
   - Button interactions and loading
   - Error handling in preview
   - Multiple preview generations
   - Rate limiting integration

5. **`session-management.test.ts`** - Session Management Tests
   - Session ID generation and format
   - Session persistence in localStorage
   - Persona state in sessionStorage
   - Session restoration on page load
   - API request session headers
   - Cross-tab consistency

6. **`api-integration.test.ts`** - API Integration Tests
   - Preview API calls and responses
   - Submit API calls and responses
   - Rate limit status API calls
   - Request headers and body format
   - Error response handling
   - Network error handling

7. **`error-handling.test.ts`** - Error Handling Tests
   - Error message display
   - Network error handling
   - API error responses (400, 401, 403, 404, 429, 500)
   - JSON parsing errors
   - Validation errors
   - Button state recovery

8. **`loading-states.test.ts`** - Loading States Tests
   - Preview button loading states
   - Submit button loading states
   - Form element disabling during operations
   - Loading visual indicators
   - State cleanup after completion
   - Accessibility during loading

9. **`accessibility.test.ts`** - Accessibility Tests
   - Form labels and ARIA attributes
   - Keyboard navigation support
   - Screen reader announcements
   - Focus management
   - Color contrast and visual indicators
   - Error state accessibility
   - Mobile and touch accessibility

## Running the Tests

### All Frontend Tests
```bash
npm run test:frontend
```

### Watch Mode for Development
```bash
npm run test:frontend:watch
```

### Specific Test File
```bash
npx vitest tests/frontend/dom-manipulation.test.ts
```

### With Coverage
```bash
npx vitest tests/frontend --coverage
```

## Test Environment

The tests use:
- **Vitest** as the test runner
- **JSDOM** for DOM simulation
- **Mocked APIs** for fetch calls
- **Mocked Storage** for localStorage/sessionStorage

### Setup

Each test file includes:
- JSDOM setup with the actual HTML file
- Mock implementations for fetch, localStorage, sessionStorage
- Loading and execution of the actual JavaScript code
- Cleanup between tests

## Key Features Tested

### 1. DOM Manipulation
- ✅ Initial page state
- ✅ Character counters
- ✅ Element visibility toggles
- ✅ Form state changes
- ✅ Preview display
- ✅ Rate limit indicators

### 2. Form Validation
- ✅ Required field validation
- ✅ Character limits (1800 for message, 450 for custom persona)
- ✅ Input sanitization
- ✅ Real-time validation feedback
- ✅ Form submission blocking

### 3. Persona System
- ✅ Persona selection dropdown
- ✅ Dynamic description updates
- ✅ Custom persona textarea
- ✅ Session persistence
- ✅ API integration

### 4. Preview Functionality
- ✅ Preview generation
- ✅ Content display
- ✅ Loading states
- ✅ Error handling
- ✅ Rate limiting

### 5. Session Management
- ✅ Session ID generation
- ✅ Persistent storage
- ✅ State restoration
- ✅ Cross-tab consistency

### 6. API Integration
- ✅ Correct request formatting
- ✅ Response handling
- ✅ Error scenarios
- ✅ Network failures
- ✅ Rate limiting

### 7. Error Handling
- ✅ User-friendly error messages
- ✅ Network error recovery
- ✅ API error responses
- ✅ Validation errors
- ✅ State restoration after errors

### 8. Loading States
- ✅ Button state management
- ✅ Form disabling during operations
- ✅ Visual loading indicators
- ✅ Prevention of duplicate requests

### 9. Accessibility
- ✅ ARIA attributes
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus management
- ✅ Color contrast
- ✅ Error announcements

## Test Data and Mocking

### Mock Data
- Session IDs with predictable format
- API responses for preview and submit
- Error responses for various scenarios
- Rate limit data

### Storage Mocking
- localStorage for session persistence
- sessionStorage for form state
- Full CRUD operations mocked

### Network Mocking
- fetch API completely mocked
- Configurable responses per test
- Network error simulation
- Timing control for async operations

## Edge Cases Covered

- Empty and whitespace-only inputs
- Character limit boundaries
- Rapid user interactions
- Network failures and timeouts
- Malformed API responses
- Storage corruption
- JavaScript errors
- Browser compatibility issues

## Continuous Integration

These tests are designed to run in CI environments:
- No external dependencies
- Deterministic behavior
- Fast execution
- Comprehensive coverage

## Writing New Tests

When adding new frontend functionality:

1. Add tests to the appropriate existing file
2. Create a new test file if testing a new feature area
3. Follow the established patterns:
   - Use JSDOM for DOM testing
   - Mock all external dependencies
   - Test both success and error scenarios
   - Include accessibility considerations
   - Test edge cases and user interactions

### Example Test Structure

```typescript
describe('New Feature Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    // Setup JSDOM environment
    // Load HTML and script
    // Configure mocks
  });

  describe('Feature Functionality', () => {
    it('should work correctly', () => {
      // Test implementation
    });

    it('should handle errors gracefully', () => {
      // Error scenario testing
    });
  });
});
```

## Coverage Goals

The frontend tests aim for:
- **>95%** line coverage of script.js
- **100%** of user interaction paths
- **100%** of error scenarios
- **100%** of accessibility features

## Performance

Tests are optimized for speed:
- Parallel execution where possible
- Minimal DOM operations
- Efficient mocking
- Fast async resolution

Average test suite execution time: < 10 seconds