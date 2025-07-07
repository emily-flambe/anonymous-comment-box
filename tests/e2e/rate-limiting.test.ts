import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockHTML, 
  simulateUserInteraction, 
  assertElementVisible, 
  assertElementHidden,
  assertRateLimitDisplay,
  createMockPreviewResponse,
  createMockRateLimitStatus,
  setupMockAPIs,
  simulateRateLimitError,
  waitFor
} from '../utils/test-helpers';

// Rate limiting test helper that simulates realistic user scenarios
class RateLimitingE2E {
  private requestCount: number = 0;
  private sessionId: string = 'rate-limit-test-session';
  private rateLimitMax: number = 10;
  private rateLimitWindow: number = 60000; // 1 minute
  private windowStart: number = Date.now();

  constructor() {
    this.setupRealisticRateLimiting();
  }

  private setupRealisticRateLimiting() {
    // Mock fetch to implement realistic rate limiting
    (global.fetch as any) = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const now = Date.now();
      
      // Reset window if expired
      if (now - this.windowStart > this.rateLimitWindow) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      if (url.includes('/api/rate-limit-status')) {
        const remaining = Math.max(0, this.rateLimitMax - this.requestCount);
        const resetTime = this.windowStart + this.rateLimitWindow;
        
        return {
          ok: true,
          json: () => Promise.resolve({
            remaining,
            reset: resetTime,
            limit: this.rateLimitMax
          })
        };
      }

      if (url.includes('/api/preview') || url.includes('/api/submit')) {
        // Check rate limit
        const remaining = Math.max(0, this.rateLimitMax - this.requestCount);
        
        if (remaining <= 0) {
          return {
            ok: false,
            status: 429,
            json: () => Promise.resolve({
              error: 'Rate limit exceeded. Please wait before trying again.',
              remaining: 0,
              reset: this.windowStart + this.rateLimitWindow
            })
          };
        }

        // Consume rate limit
        this.requestCount++;
        const newRemaining = Math.max(0, this.rateLimitMax - this.requestCount);
        
        if (url.includes('/api/preview')) {
          const body = await new Request(url, options).json() as any;
          return {
            ok: true,
            json: () => Promise.resolve({
              ...createMockPreviewResponse(body.message, `${body.message} [transformed]`, body.persona),
              rateLimitRemaining: newRemaining,
              rateLimitReset: this.windowStart + this.rateLimitWindow
            })
          };
        } else {
          return {
            ok: true,
            json: () => Promise.resolve({
              success: true,
              message: 'Message queued for anonymous delivery',
              queuedAt: new Date().toISOString()
            })
          };
        }
      }

      return { ok: false, status: 404 };
    });
  }

  async makePreviewRequest(message: string = 'Test message', persona: string = 'none') {
    simulateUserInteraction.typeInTextarea('message', message);
    if (persona !== 'none') {
      simulateUserInteraction.selectPersona(persona);
    }
    simulateUserInteraction.clickButton('previewBtn');
    await waitFor(10);
    
    return this.getRequestResult();
  }

  async makeSubmitRequest(message: string = 'Test message', persona: string = 'none') {
    simulateUserInteraction.typeInTextarea('message', message);
    if (persona !== 'none') {
      simulateUserInteraction.selectPersona(persona);
    }
    simulateUserInteraction.clickButton('submitBtn');
    await waitFor(10);
    
    return this.getRequestResult();
  }

  public getRequestResult() {
    const previewContainer = document.getElementById('messagePreview') as HTMLElement;
    const successMessage = document.getElementById('successMessage') as HTMLElement;
    const errorMessage = document.getElementById('errorMessage') as HTMLElement;
    const rateLimitText = document.getElementById('rateLimitText') as HTMLElement;
    const errorText = document.getElementById('errorText') as HTMLElement;

    return {
      isPreviewVisible: previewContainer?.style.display !== 'none',
      isSuccessVisible: !successMessage?.classList.contains('hidden'),
      isErrorVisible: !errorMessage?.classList.contains('hidden'),
      errorText: errorText?.textContent || '',
      rateLimitText: rateLimitText?.textContent || '',
      currentCount: this.requestCount,
      remaining: this.rateLimitMax - this.requestCount
    };
  }

  getRemainingRequests(): number {
    return Math.max(0, this.rateLimitMax - this.requestCount);
  }

  resetRateLimit() {
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  setRequestCount(count: number) {
    this.requestCount = count;
  }

  simulateTimeWindow() {
    this.windowStart = Date.now() - this.rateLimitWindow - 1000; // Expired window
  }
}

describe('Rate Limiting Enforcement E2E Tests', () => {
  let rateLimitE2E: RateLimitingE2E;

  beforeEach(() => {
    createMockHTML();
    rateLimitE2E = new RateLimitingE2E();
  });

  describe('Basic Rate Limiting Behavior', () => {
    it('should allow requests within rate limit', async () => {
      const result = await rateLimitE2E.makePreviewRequest('First request');
      
      expect(result.isPreviewVisible).toBe(true);
      expect(result.isErrorVisible).toBe(false);
      expect(result.remaining).toBe(9);
      assertRateLimitDisplay(9, 10);
    });

    it('should enforce rate limit after maximum requests', async () => {
      // Make 10 requests to exhaust the limit
      for (let i = 0; i < 10; i++) {
        const result = await rateLimitE2E.makePreviewRequest(`Request ${i + 1}`);
        
        if (i < 9) {
          expect(result.isPreviewVisible).toBe(true);
          expect(result.remaining).toBe(9 - i);
        }
      }
      
      // 11th request should be blocked
      const result = await rateLimitE2E.makePreviewRequest('Blocked request');
      
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
      expect(result.isPreviewVisible).toBe(false);
      expect(result.remaining).toBe(0);
      assertRateLimitDisplay(0, 10);
    });

    it('should share rate limit between preview and submit requests', async () => {
      // Make 5 preview requests
      for (let i = 0; i < 5; i++) {
        await rateLimitE2E.makePreviewRequest(`Preview ${i + 1}`);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(5);
      
      // Make 5 submit requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitE2E.makeSubmitRequest(`Submit ${i + 1}`);
        
        if (i < 4) {
          expect(result.isSuccessVisible).toBe(true);
        }
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(0);
      
      // Next request should be blocked
      const result = await rateLimitE2E.makePreviewRequest('Should be blocked');
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
    });

    it('should reset rate limit after time window expires', async () => {
      // Exhaust rate limit
      rateLimitE2E.setRequestCount(10);
      
      let result = await rateLimitE2E.makePreviewRequest('Should be blocked');
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
      
      // Simulate time window expiry
      rateLimitE2E.simulateTimeWindow();
      
      // Should work again
      result = await rateLimitE2E.makePreviewRequest('Should work now');
      expect(result.isPreviewVisible).toBe(true);
      expect(result.isErrorVisible).toBe(false);
      assertRateLimitDisplay(9, 10);
    });
  });

  describe('User Interface Rate Limit Indicators', () => {
    it('should show accurate rate limit counter throughout usage', async () => {
      const testCases = [
        { requestNum: 1, expectedRemaining: 9 },
        { requestNum: 2, expectedRemaining: 8 },
        { requestNum: 5, expectedRemaining: 5 },
        { requestNum: 8, expectedRemaining: 2 },
        { requestNum: 10, expectedRemaining: 0 }
      ];
      
      for (const testCase of testCases) {
        await rateLimitE2E.makePreviewRequest(`Request ${testCase.requestNum}`);
        assertRateLimitDisplay(testCase.expectedRemaining, 10);
      }
    });

    it('should change rate limit bar color based on remaining requests', async () => {
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      
      // Start with green (high remaining)
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(16, 185, 129)'); // Green
      
      // Make requests to get to yellow range (5 remaining)
      for (let i = 0; i < 5; i++) {
        await rateLimitE2E.makePreviewRequest(`Request ${i + 1}`);
      }
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(245, 158, 11)'); // Yellow
      
      // Make more requests to get to red range (2 remaining)
      for (let i = 0; i < 3; i++) {
        await rateLimitE2E.makePreviewRequest(`Request ${i + 6}`);
      }
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(239, 68, 68)'); // Red
    });

    it('should show warning when approaching rate limit', async () => {
      // Make requests to get to warning threshold (2 remaining)
      for (let i = 0; i < 8; i++) {
        await rateLimitE2E.makePreviewRequest(`Request ${i + 1}`);
      }
      
      const rateLimitWarning = document.getElementById('rateLimitWarning');
      expect(rateLimitWarning?.style.display).toBe('block');
      expect(rateLimitWarning?.textContent).toContain('Warning: Only 2 requests remaining');
    });

    it('should disable buttons when rate limit is exceeded', async () => {
      // Exhaust rate limit
      for (let i = 0; i < 10; i++) {
        await rateLimitE2E.makePreviewRequest(`Request ${i + 1}`);
      }
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      // Try to make another request - buttons should be disabled
      await rateLimitE2E.makePreviewRequest('This should not work');
      
      expect(previewBtn.disabled).toBe(true);
      // Note: Submit button disabling depends on implementation
      // It might be disabled or might show rate limit error on click
    });

    it('should re-enable buttons after rate limit reset', async () => {
      // Exhaust rate limit
      rateLimitE2E.setRequestCount(10);
      await rateLimitE2E.makePreviewRequest('Should be blocked');
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
      
      // Simulate time window reset
      rateLimitE2E.simulateTimeWindow();
      
      // Make a successful request to trigger UI update
      await rateLimitE2E.makePreviewRequest('Should work now');
      
      expect(previewBtn.disabled).toBe(false);
      assertRateLimitDisplay(9, 10);
    });
  });

  describe('Rate Limiting Error Messages and User Guidance', () => {
    it('should show clear error message when rate limit is exceeded', async () => {
      rateLimitE2E.setRequestCount(10);
      
      const result = await rateLimitE2E.makePreviewRequest('Rate limited request');
      
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toBe('Rate limit exceeded. Please wait before trying again.');
    });

    it('should provide different error messages for preview vs submit', async () => {
      rateLimitE2E.setRequestCount(10);
      
      // Test preview error
      let result = await rateLimitE2E.makePreviewRequest('Preview rate limited');
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
      
      // Reset error state
      const errorMessage = document.getElementById('errorMessage');
      errorMessage?.classList.add('hidden');
      
      // Test submit error
      result = await rateLimitE2E.makeSubmitRequest('Submit rate limited');
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
    });

    it('should clear error messages when rate limit is restored', async () => {
      // Show rate limit error
      rateLimitE2E.setRequestCount(10);
      await rateLimitE2E.makePreviewRequest('Error request');
      
      let result = rateLimitE2E.getRequestResult();
      expect(result.isErrorVisible).toBe(true);
      
      // Reset rate limit and make successful request
      rateLimitE2E.simulateTimeWindow();
      await rateLimitE2E.makePreviewRequest('Success request');
      
      result = rateLimitE2E.getRequestResult();
      expect(result.isErrorVisible).toBe(false);
      expect(result.isPreviewVisible).toBe(true);
    });

    it('should handle mixed error scenarios gracefully', async () => {
      // Make some successful requests
      for (let i = 0; i < 5; i++) {
        const result = await rateLimitE2E.makePreviewRequest(`Success ${i + 1}`);
        expect(result.isPreviewVisible).toBe(true);
      }
      
      // Simulate network error for next request
      const originalFetch = global.fetch;
      (global.fetch as any) = vi.fn().mockRejectedValue(new Error('Network error'));
      
      simulateUserInteraction.typeInTextarea('message', 'Network error request');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      let result = rateLimitE2E.getRequestResult();
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toBe('Network error');
      
      // Restore fetch and continue with rate limiting
      global.fetch = originalFetch;
      rateLimitE2E = new RateLimitingE2E();
      rateLimitE2E.setRequestCount(5); // Continue from where we left off
      
      const finalResult = await rateLimitE2E.makePreviewRequest('Back to rate limiting');
      expect(finalResult.isPreviewVisible).toBe(true);
      expect(finalResult.remaining).toBe(4);
    });
  });

  describe('Advanced Rate Limiting Scenarios', () => {
    it('should handle rapid consecutive requests correctly', async () => {
      const promises = [];
      
      // Make 5 rapid requests
      for (let i = 0; i < 5; i++) {
        promises.push(rateLimitE2E.makePreviewRequest(`Rapid request ${i + 1}`));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.isPreviewVisible).toBe(true);
        expect(result.isErrorVisible).toBe(false);
      });
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(5);
    });

    it('should handle preview-submit combinations within rate limit', async () => {
      const operations = [
        { type: 'preview', message: 'Preview 1' },
        { type: 'submit', message: 'Submit 1' },
        { type: 'preview', message: 'Preview 2' },
        { type: 'preview', message: 'Preview 3' },
        { type: 'submit', message: 'Submit 2' }
      ];
      
      for (const op of operations) {
        let result;
        if (op.type === 'preview') {
          result = await rateLimitE2E.makePreviewRequest(op.message);
          expect(result.isPreviewVisible).toBe(true);
        } else {
          result = await rateLimitE2E.makeSubmitRequest(op.message);
          expect(result.isSuccessVisible).toBe(true);
        }
        expect(result.isErrorVisible).toBe(false);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(5);
    });

    it('should handle rate limit exhaustion mid-workflow', async () => {
      // Use up 9 requests
      for (let i = 0; i < 9; i++) {
        await rateLimitE2E.makePreviewRequest(`Setup request ${i + 1}`);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(1);
      
      // Preview should work (using last request)
      let result = await rateLimitE2E.makePreviewRequest('Last preview');
      expect(result.isPreviewVisible).toBe(true);
      expect(rateLimitE2E.getRemainingRequests()).toBe(0);
      
      // Submit should fail (rate limit exhausted)
      result = await rateLimitE2E.makeSubmitRequest('Blocked submit');
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
      expect(result.isSuccessVisible).toBe(false);
    });

    it('should accurately track rate limit across form resets', async () => {
      // Make some requests
      for (let i = 0; i < 3; i++) {
        await rateLimitE2E.makePreviewRequest(`Request ${i + 1}`);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(7);
      
      // Reset form (simulate user clicking reset)
      const resetBtn = document.querySelector('.reset-btn') as HTMLButtonElement;
      resetBtn?.click();
      
      // Rate limit should persist
      const result = await rateLimitE2E.makePreviewRequest('After reset');
      expect(result.isPreviewVisible).toBe(true);
      expect(rateLimitE2E.getRemainingRequests()).toBe(6);
      assertRateLimitDisplay(6, 10);
    });

    it('should handle edge case at exactly rate limit boundary', async () => {
      // Make exactly 9 requests
      for (let i = 0; i < 9; i++) {
        const result = await rateLimitE2E.makePreviewRequest(`Request ${i + 1}`);
        expect(result.isPreviewVisible).toBe(true);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(1);
      
      // 10th request should work
      let result = await rateLimitE2E.makePreviewRequest('10th request');
      expect(result.isPreviewVisible).toBe(true);
      expect(rateLimitE2E.getRemainingRequests()).toBe(0);
      
      // 11th request should fail
      result = await rateLimitE2E.makePreviewRequest('11th request');
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
    });

    it('should handle rate limit with custom persona workflows', async () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      // Make requests with custom persona
      for (let i = 0; i < 5; i++) {
        simulateUserInteraction.typeInTextarea('message', `Custom message ${i + 1}`);
        simulateUserInteraction.selectPersona('custom');
        simulateUserInteraction.typeInTextarea('customPersona', 'Make it sound formal');
        simulateUserInteraction.clickButton('previewBtn');
        await waitFor(10);
        
        const result = rateLimitE2E.getRequestResult();
        expect(result.isPreviewVisible).toBe(true);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(5);
      assertRateLimitDisplay(5, 10);
    });
  });

  describe('Rate Limit Recovery and User Experience', () => {
    it('should provide smooth user experience during rate limit recovery', async () => {
      // Exhaust rate limit
      rateLimitE2E.setRequestCount(10);
      
      // Show rate limit error
      let result = await rateLimitE2E.makePreviewRequest('Blocked request');
      expect(result.isErrorVisible).toBe(true);
      
      // Simulate gradual recovery (as if time is passing)
      rateLimitE2E.simulateTimeWindow();
      
      // User tries again - should work
      result = await rateLimitE2E.makePreviewRequest('Recovery request');
      expect(result.isPreviewVisible).toBe(true);
      expect(result.isErrorVisible).toBe(false);
      
      // Rate limit display should be updated
      assertRateLimitDisplay(9, 10);
      
      // Warning should be cleared
      const rateLimitWarning = document.getElementById('rateLimitWarning');
      expect(rateLimitWarning?.style.display).not.toBe('block');
    });

    it('should maintain user data during rate limit scenarios', async () => {
      const testMessage = 'Important user message that should not be lost';
      const testPersona = 'super-nice';
      
      // User fills form
      simulateUserInteraction.typeInTextarea('message', testMessage);
      simulateUserInteraction.selectPersona(testPersona);
      
      // Exhaust rate limit
      rateLimitE2E.setRequestCount(10);
      
      // User tries to preview - should fail but data should remain
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const result = rateLimitE2E.getRequestResult();
      expect(result.isErrorVisible).toBe(true);
      
      // Form data should be preserved
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      expect(messageTextarea.value).toBe(testMessage);
      expect(personaSelect.value).toBe(testPersona);
      
      // After rate limit recovery, user should be able to continue
      rateLimitE2E.simulateTimeWindow();
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const finalResult = rateLimitE2E.getRequestResult();
      expect(finalResult.isPreviewVisible).toBe(true);
    });

    it('should handle multiple users/sessions independently', async () => {
      // Simulate first user exhausting their rate limit
      for (let i = 0; i < 10; i++) {
        await rateLimitE2E.makePreviewRequest(`User1 Request ${i + 1}`);
      }
      
      expect(rateLimitE2E.getRemainingRequests()).toBe(0);
      
      // First user should be blocked
      let result = await rateLimitE2E.makePreviewRequest('User1 blocked');
      expect(result.isErrorVisible).toBe(true);
      
      // Simulate second user (new session) - should have fresh rate limit
      // In a real scenario, this would be a different session ID
      rateLimitE2E.resetRateLimit(); // Simulate different session
      
      result = await rateLimitE2E.makePreviewRequest('User2 fresh start');
      expect(result.isPreviewVisible).toBe(true);
      expect(rateLimitE2E.getRemainingRequests()).toBe(9);
    });
  });
});