# Message Customization Feature Test Suite

This comprehensive test suite covers all aspects of the message customization and preview functionality for the anonymous comment box application.

## Test Coverage Overview

### 🏗️ **Setup & Configuration**
- **Vitest Configuration**: Enhanced with happy-dom environment, coverage reporting, and proper mocking setup
- **Test Dependencies**: @testing-library/dom, @testing-library/user-event, @testing-library/jest-dom, jsdom, happy-dom
- **Mock Infrastructure**: Comprehensive API mocking, DOM simulation, and user interaction helpers

### 🧪 **Unit Tests** (`tests/unit/`)

#### PersonaSelector.test.ts
- **Persona Selection Logic**: Tests for all preset personas (Internet Random, Barely Literate, Extremely Serious, Super Nice)
- **Custom Persona Input**: Character counting, validation, visibility toggling
- **Form Validation**: Empty custom persona detection, character limits (500 chars)
- **State Management**: Persona switching, form reset, input preservation
- **Error Handling**: Missing DOM elements, invalid persona selections
- **Accessibility**: Proper labels, keyboard navigation, ARIA attributes

#### MessagePreview.test.ts
- **Preview Generation**: API integration, loading states, content display
- **Rate Limiting Integration**: Rate limit updates, warning display, button disabling
- **Error Handling**: Network errors, server errors, malformed responses, timeout handling
- **Loading States**: Button text changes, loading indicators, state transitions
- **Content Validation**: Original vs transformed message display, persona application
- **User Experience**: Error recovery, retry functionality, state persistence

#### MessageForm.test.ts
- **Component Integration**: Persona selector + preview + form submission coordination
- **Complete User Flows**: Preview-then-submit, direct submission, custom persona workflows
- **Validation Logic**: Message length (preview: 2000 chars, submit: varies), custom persona requirements
- **State Synchronization**: Preview clearing on input changes, rate limit sharing
- **Error Recovery**: Mixed success/failure scenarios, retry mechanisms
- **Form Reset**: Complete state cleanup, UI restoration

### 🔗 **Integration Tests** (`tests/integration/`)

#### api.test.ts
- **Preview API (`/api/preview`)**: 
  - Request validation (message length, custom persona length)
  - All persona transformations (preset and custom)
  - Rate limiting enforcement (10 requests/minute)
  - Error responses (400, 429, 500)
  - Unicode and special character handling
- **Submit API (`/api/submit`)**:
  - Message submission with persona transformations
  - Rate limit sharing with preview API
  - Validation consistency
- **Rate Limit API (`/api/rate-limit-status`)**:
  - Status retrieval and updates
  - Session-based tracking
  - Reset functionality
- **Error Scenarios**: Malformed JSON, missing headers, invalid payloads
- **Performance**: Concurrent requests, rapid sequential calls
- **Data Integrity**: Message preservation, consistent responses

#### state-management.test.ts
- **State Initialization**: Default values, session storage loading, validation
- **Cross-Component Coordination**: Persona selection syncing, rate limit sharing
- **Session Persistence**: Auto-save functionality, state restoration, corruption handling
- **Reactive Updates**: Subscriber notifications, render efficiency, update batching
- **Memory Management**: Cleanup procedures, leak prevention
- **State Consistency**: Async operation coordination, race condition prevention

### 🎯 **End-to-End Tests** (`tests/e2e/`)

#### message-customization-flow.test.ts
- **Complete Preview Flow**: Message input → persona selection → preview generation → display
- **Complete Submission Flow**: With/without preview, all persona types, error recovery
- **Custom Persona Workflows**: Input validation, character limits, switching between preset/custom
- **Error Recovery**: Network failures, API errors, validation failures, retry mechanisms
- **State Management**: Form reset, data persistence, session consistency
- **User Experience**: Loading feedback, visual indicators, accessibility maintenance

#### rate-limiting.test.ts
- **Rate Limit Enforcement**: 10 requests/minute limit, shared between preview/submit
- **User Interface Indicators**: 
  - Rate limit counter (X/10 remaining)
  - Color-coded progress bar (green→yellow→red)
  - Warning messages when approaching limit
  - Button disabling when exhausted
- **Rate Limit Scenarios**:
  - Normal usage within limits
  - Gradual limit exhaustion
  - Immediate limit exhaustion
  - Rate limit reset after time window
  - Mixed preview/submit request patterns
- **Error Handling**: Rate limit exceeded messages, graceful degradation
- **Recovery Flows**: Time-based reset, session isolation, state preservation

### ♿ **Accessibility Tests** (`tests/accessibility/`)

#### a11y.test.ts
- **Keyboard Navigation**:
  - Tab order through all interactive elements
  - Focus management during dynamic changes
  - Reverse navigation (Shift+Tab)
  - Custom persona input visibility handling
  - Skip patterns for disabled elements
- **Screen Reader Support**:
  - ARIA labels and descriptions
  - Live region announcements (errors, loading, success)
  - Form control associations
  - Rate limit status announcements
  - Loading state descriptions
- **Visual Accessibility**:
  - Focus indicators
  - Color contrast validation
  - Character limit visual feedback
  - Rate limit visual indicators
  - High contrast mode compatibility
- **Keyboard-Only Workflows**:
  - Complete preview generation using only keyboard
  - Form submission via keyboard
  - Error recovery without mouse
  - Custom persona workflow navigation
- **Assistive Technology Compatibility**:
  - Reduced motion preferences
  - Speech input compatibility
  - High contrast mode support
  - Sufficient interaction time

### ⚡ **Performance & Error Boundary Tests** (`tests/integration/`)

#### performance-error-boundary.test.ts
- **Performance Benchmarks**:
  - Form interactions: <100ms (typing, persona selection)
  - Preview generation: <200ms (including API call)
  - Rapid input handling: No degradation over 10 operations
  - Memory usage: Bounded growth, no leaks
  - Large text handling: 4000+ characters efficiently
- **Error Boundary Testing**:
  - Network failures: Graceful degradation, user messaging
  - Server errors: Appropriate error display, retry capability
  - API timeouts: Loading state cleanup, re-enable controls
  - Invalid responses: Crash prevention, fallback behavior
  - Memory pressure: Performance maintenance under stress
- **Stress Testing**:
  - Rapid consecutive submissions (10+ operations)
  - Extreme character limits (10,000+ characters)
  - Browser resource constraints simulation
  - Error recovery cycles
- **Recovery & Resilience**:
  - State preservation during errors
  - Cascading failure prevention
  - Memory cleanup after errors
  - Accessibility maintenance during error states

## Test Scenarios from PRD

### ✅ **Core Requirements Coverage**

1. **Complete Persona Selection and Preview Flow** ✓
   - All preset personas (Internet Random, Barely Literate, Extremely Serious, Super Nice)
   - Custom persona input with 500-character limit
   - Real-time preview generation and display
   - Character counting and validation

2. **Rate Limiting Enforcement (10 requests, 11th fails, reset behavior)** ✓
   - Exactly 10 requests allowed per minute
   - 11th request fails with clear error message
   - Rate limit resets after time window
   - Visual indicators throughout process

3. **Custom Persona Functionality** ✓
   - Free-text input with validation
   - Character limit enforcement
   - Integration with preview system
   - Form state management

4. **Error Handling and Fallback States** ✓
   - Network connectivity issues
   - Server errors and timeouts
   - Invalid API responses
   - Rate limit exceeded scenarios
   - Form validation errors

5. **Session Persistence of Persona Selection** ✓
   - Browser session storage integration
   - State restoration on page reload
   - Corruption handling and fallbacks

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test suite
npm test tests/unit/PersonaSelector.test.ts

# Run in watch mode
npm test -- --watch

# Run accessibility tests only
npm test tests/accessibility/

# Run E2E tests only
npm test tests/e2e/
```

### Coverage Targets

- **Unit Tests**: >95% line coverage
- **Integration Tests**: >90% feature coverage  
- **E2E Tests**: 100% user journey coverage
- **Accessibility Tests**: 100% WCAG 2.1 AA compliance

### Expected Test Counts

- **Unit Tests**: ~150 test cases
- **Integration Tests**: ~80 test cases  
- **E2E Tests**: ~60 test cases
- **Accessibility Tests**: ~40 test cases
- **Performance Tests**: ~25 test cases

**Total**: ~355 comprehensive test cases

## Test Quality Standards

### ✅ **Comprehensive Coverage**
- All user interaction paths tested
- All error conditions simulated
- All accessibility requirements validated
- All performance benchmarks verified

### ✅ **Realistic Scenarios**
- Real-world usage patterns
- Edge cases and boundary conditions
- Network and infrastructure failures
- Browser compatibility scenarios

### ✅ **Maintainable Test Code**
- Shared utilities and helpers
- Clear test organization
- Descriptive test names
- Proper setup/teardown

### ✅ **CI/CD Integration Ready**
- Fast test execution (< 2 minutes total)
- Reliable and stable tests
- Clear failure reporting
- Coverage reporting integration

## Mock Strategy

### API Mocking
- **Realistic Rate Limiting**: Simulates actual 10-request/minute behavior
- **Error Simulation**: Network timeouts, server errors, malformed responses
- **Response Timing**: Configurable delays for loading state testing
- **Data Integrity**: Consistent request/response validation

### DOM Mocking
- **Complete UI Structure**: All form elements, buttons, display areas
- **Interactive Elements**: Proper event handling, focus management
- **Visual Feedback**: Rate limit bars, character counters, loading states
- **Accessibility Features**: ARIA attributes, labels, live regions

### Environment Mocking
- **Browser APIs**: localStorage, sessionStorage, Performance API
- **User Interactions**: Keyboard events, mouse events, form submissions
- **Network Conditions**: Slow connections, intermittent failures
- **Device Constraints**: Memory pressure, reduced motion preferences

## Continuous Improvement

This test suite is designed to:
- **Catch Regressions**: Prevent feature breakage during development
- **Guide Development**: Test-driven development for new features
- **Document Behavior**: Tests serve as living documentation
- **Ensure Quality**: Maintain high standards for user experience
- **Enable Confidence**: Safe refactoring and optimization

The comprehensive nature of these tests ensures that the message customization feature will be robust, accessible, and performant for all users.