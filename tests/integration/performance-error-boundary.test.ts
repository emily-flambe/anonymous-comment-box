import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockHTML, 
  simulateUserInteraction, 
  setupMockAPIs,
  waitFor,
  createMockPreviewResponse
} from '../utils/test-helpers';

// Performance and error boundary testing utilities
class PerformanceErrorTester {
  private performanceEntries: PerformanceEntry[] = [];
  private errorLog: Error[] = [];
  public mockAPIs: ReturnType<typeof setupMockAPIs>;

  constructor() {
    this.mockAPIs = setupMockAPIs();
    this.setupErrorTracking();
    this.setupPerformanceTracking();
  }

  private setupErrorTracking() {
    // Mock error handler
    window.addEventListener('error', (event) => {
      this.errorLog.push(new Error(event.message));
    });

    // Mock unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.errorLog.push(new Error(`Unhandled Promise Rejection: ${event.reason}`));
    });

    // Mock console.error to track application errors
    const originalConsoleError = console.error;
    console.error = vi.fn().mockImplementation((...args) => {
      this.errorLog.push(new Error(args.join(' ')));
      originalConsoleError.apply(console, args);
    });
  }

  private setupPerformanceTracking() {
    // Mock Performance API
    if (!window.performance) {
      (window as any).performance = {
        now: () => Date.now(),
        mark: vi.fn(),
        measure: vi.fn(),
        getEntriesByType: vi.fn().mockReturnValue([]),
        getEntriesByName: vi.fn().mockReturnValue([])
      };
    }

    // Track timing information
    this.startTiming = this.startTiming.bind(this);
    this.endTiming = this.endTiming.bind(this);
  }

  startTiming(label: string): number {
    const startTime = performance.now();
    if (performance.mark) {
      performance.mark(`${label}-start`);
    }
    return startTime;
  }

  endTiming(label: string, startTime: number): number {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (performance.mark && performance.measure) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
    }
    
    this.performanceEntries.push({
      name: label,
      duration,
      startTime,
      entryType: 'measure'
    } as PerformanceEntry);
    
    return duration;
  }

  getPerformanceData(): PerformanceEntry[] {
    return [...this.performanceEntries];
  }

  getErrors(): Error[] {
    return [...this.errorLog];
  }

  clearErrors(): void {
    this.errorLog = [];
  }

  clearPerformanceData(): void {
    this.performanceEntries = [];
  }

  // Simulate various error conditions
  simulateNetworkError(): void {
    this.mockAPIs.mockPreviewSuccess.mockRejectedValue(new Error('Network connection failed'));
    this.mockAPIs.mockSubmitSuccess.mockRejectedValue(new Error('Network connection failed'));
  }

  simulateServerError(): void {
    this.mockAPIs.mockPreviewSuccess.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' })
    } as Response);
  }

  simulateTimeout(): void {
    this.mockAPIs.mockPreviewSuccess.mockImplementation(() => 
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 100)
      )
    );
  }

  simulateRateLimitError(): void {
    this.mockAPIs.mockPreviewSuccess.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit exceeded' })
    } as Response);
  }

  simulateInvalidResponse(): void {
    this.mockAPIs.mockPreviewSuccess.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(null) // Invalid response structure
    } as Response);
  }

  // Memory usage simulation
  simulateMemoryPressure(): void {
    // Create large objects to simulate memory pressure
    const largeArrays: number[][] = [];
    for (let i = 0; i < 100; i++) {
      largeArrays.push(new Array(10000).fill(Math.random()));
    }
    
    // Cleanup after test
    setTimeout(() => {
      largeArrays.length = 0;
    }, 1000);
  }

  // Performance test helpers
  async measureFormInteractionPerformance(): Promise<{ [key: string]: number }> {
    const measurements: { [key: string]: number } = {};

    // Measure typing performance
    const typingStart = this.startTiming('typing');
    simulateUserInteraction.typeInTextarea('message', 'Performance test message');
    measurements.typing = this.endTiming('typing', typingStart);

    // Measure persona selection performance
    const personaStart = this.startTiming('persona-selection');
    simulateUserInteraction.selectPersona('internet-random');
    measurements.personaSelection = this.endTiming('persona-selection', personaStart);

    // Measure preview generation performance
    const previewStart = this.startTiming('preview-generation');
    simulateUserInteraction.clickButton('previewBtn');
    await waitFor(10);
    measurements.previewGeneration = this.endTiming('preview-generation', previewStart);

    return measurements;
  }

  async measureMemoryUsage(): Promise<{ [key: string]: number }> {
    const memory: { [key: string]: number } = {};

    // Mock memory API if available
    if ((performance as any).memory) {
      const memBefore = (performance as any).memory.usedJSHeapSize;
      
      // Perform operations
      await this.measureFormInteractionPerformance();
      
      const memAfter = (performance as any).memory.usedJSHeapSize;
      memory.heapIncrease = memAfter - memBefore;
    } else {
      // Fallback measurement
      memory.heapIncrease = 0;
    }

    return memory;
  }
}

describe('Performance and Error Boundary Tests', () => {
  let perfTester: PerformanceErrorTester;

  beforeEach(() => {
    createMockHTML();
    perfTester = new PerformanceErrorTester();
  });

  afterEach(() => {
    perfTester.clearErrors();
    perfTester.clearPerformanceData();
  });

  describe('Performance Tests', () => {
    it('should complete form interactions within acceptable time limits', async () => {
      const measurements = await perfTester.measureFormInteractionPerformance();

      // All interactions should complete quickly
      expect(measurements.typing).toBeLessThan(100); // < 100ms
      expect(measurements.personaSelection).toBeLessThan(50); // < 50ms
      expect(measurements.previewGeneration).toBeLessThan(200); // < 200ms including API call
    });

    it('should handle rapid user input without performance degradation', async () => {
      const rapidInputTimes: number[] = [];

      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        const start = perfTester.startTiming(`rapid-input-${i}`);
        simulateUserInteraction.typeInTextarea('message', `Rapid input test ${i}`);
        const duration = perfTester.endTiming(`rapid-input-${i}`, start);
        rapidInputTimes.push(duration);
      }

      // Performance should not degrade significantly
      const avgTime = rapidInputTimes.reduce((a, b) => a + b, 0) / rapidInputTimes.length;
      const maxTime = Math.max(...rapidInputTimes);
      
      expect(avgTime).toBeLessThan(50); // Average should be fast
      expect(maxTime).toBeLessThan(100); // Even slowest should be acceptable
    });

    it('should efficiently handle persona switching', async () => {
      const personas = ['none', 'internet-random', 'barely-literate', 'extremely-serious', 'super-nice'];
      const switchTimes: number[] = [];

      for (const persona of personas) {
        const start = perfTester.startTiming(`persona-switch-${persona}`);
        simulateUserInteraction.selectPersona(persona);
        const duration = perfTester.endTiming(`persona-switch-${persona}`, start);
        switchTimes.push(duration);
      }

      // All persona switches should be fast
      switchTimes.forEach(time => {
        expect(time).toBeLessThan(25); // Very fast persona switching
      });
    });

    it('should handle concurrent API requests efficiently', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Concurrent test message');

      const promises: Promise<void>[] = [];
      const startTime = perfTester.startTiming('concurrent-requests');

      // Make multiple concurrent preview requests
      for (let i = 0; i < 3; i++) {
        promises.push(
          (async () => {
            simulateUserInteraction.clickButton('previewBtn');
            await waitFor(10);
          })()
        );
      }

      await Promise.all(promises);
      const totalTime = perfTester.endTiming('concurrent-requests', startTime);

      // Concurrent requests should not take much longer than sequential
      expect(totalTime).toBeLessThan(100); // Should handle concurrency well
    });

    it('should maintain performance under memory pressure', async () => {
      perfTester.simulateMemoryPressure();

      const memoryMeasurements = await perfTester.measureMemoryUsage();
      const performanceMeasurements = await perfTester.measureFormInteractionPerformance();

      // Performance should remain acceptable even under memory pressure
      expect(performanceMeasurements.typing).toBeLessThan(150); // Slightly higher threshold
      expect(performanceMeasurements.personaSelection).toBeLessThan(75);
      expect(performanceMeasurements.previewGeneration).toBeLessThan(300);
    });

    it('should efficiently render large character counts', async () => {
      const longMessage = 'a'.repeat(4000); // Long but valid message
      
      const start = perfTester.startTiming('large-text-rendering');
      simulateUserInteraction.typeInTextarea('message', longMessage);
      const duration = perfTester.endTiming('large-text-rendering', start);

      expect(duration).toBeLessThan(100); // Should handle large text efficiently
      
      // Character count should update correctly
      const charCount = document.getElementById('charCount');
      expect(charCount?.textContent).toBe('4000');
    });

    it('should handle rate limit updates efficiently', async () => {
      const rateLimitUpdates: number[] = [];

      // Simulate multiple rate limit updates
      for (let remaining = 10; remaining >= 0; remaining--) {
        const start = perfTester.startTiming(`rate-limit-update-${remaining}`);
        
        // Simulate rate limit update
        const rateLimitText = document.getElementById('rateLimitText');
        const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
        
        if (rateLimitText) {
          rateLimitText.textContent = `Requests remaining: ${remaining}/10`;
        }
        if (rateLimitFill) {
          const percentage = (remaining / 10) * 100;
          rateLimitFill.style.width = `${percentage}%`;
        }
        
        const duration = perfTester.endTiming(`rate-limit-update-${remaining}`, start);
        rateLimitUpdates.push(duration);
      }

      // All rate limit updates should be very fast
      rateLimitUpdates.forEach(time => {
        expect(time).toBeLessThan(10); // DOM updates should be instant
      });
    });
  });

  describe('Error Boundary and Recovery Tests', () => {
    it('should handle network errors gracefully', async () => {
      perfTester.simulateNetworkError();
      
      simulateUserInteraction.typeInTextarea('message', 'Network error test');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(50);
      
      // Should show error message without crashing
      const errorMessage = document.getElementById('errorMessage');
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      
      // Application should still be functional
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      expect(messageField.disabled).toBe(false);
      
      // Should not have unhandled errors
      const errors = perfTester.getErrors();
      const unhandledErrors = errors.filter(e => e.message.includes('Unhandled'));
      expect(unhandledErrors).toHaveLength(0);
    });

    it('should recover from server errors', async () => {
      perfTester.simulateServerError();
      
      simulateUserInteraction.typeInTextarea('message', 'Server error test');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(50);
      
      // Should show appropriate error
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toContain('Internal server error');
      
      // Should allow retry after fixing the error
      perfTester.mockAPIs = setupMockAPIs(); // Reset to working state
      
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Should now work
      const previewContainer = document.getElementById('messagePreview');
      expect(previewContainer?.style.display).not.toBe('none');
    });

    it('should handle API timeouts gracefully', async () => {
      perfTester.simulateTimeout();
      
      simulateUserInteraction.typeInTextarea('message', 'Timeout test');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(150); // Wait for timeout
      
      // Should show timeout error
      const errorMessage = document.getElementById('errorMessage');
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      
      // Button should be re-enabled
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Message');
    });

    it('should handle invalid API responses', async () => {
      perfTester.simulateInvalidResponse();
      
      simulateUserInteraction.typeInTextarea('message', 'Invalid response test');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(50);
      
      // Should handle gracefully without crashing
      const errors = perfTester.getErrors();
      const crashErrors = errors.filter(e => e.message.includes('Cannot read property'));
      expect(crashErrors).toHaveLength(0);
      
      // Should show some form of error to user
      const errorMessage = document.getElementById('errorMessage');
      const isErrorShown = errorMessage && !errorMessage.classList.contains('hidden');
      expect(isErrorShown).toBe(true);
    });

    it('should handle rapid error recovery cycles', async () => {
      const errorRecoveryCycles = 5;
      
      for (let i = 0; i < errorRecoveryCycles; i++) {
        // Cause error
        perfTester.simulateNetworkError();
        simulateUserInteraction.clickButton('previewBtn');
        await waitFor(20);
        
        // Recover
        perfTester.mockAPIs = setupMockAPIs();
        simulateUserInteraction.clickButton('previewBtn');
        await waitFor(20);
      }
      
      // Application should still be functional
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      expect(messageField.disabled).toBe(false);
      
      // Should not accumulate errors
      const errors = perfTester.getErrors();
      expect(errors.length).toBeLessThan(10); // Some errors expected, but not accumulating
    });

    it('should maintain state consistency during errors', async () => {
      const testMessage = 'State consistency test message';
      const testPersona = 'super-nice';
      
      // Set up form state
      simulateUserInteraction.typeInTextarea('message', testMessage);
      simulateUserInteraction.selectPersona(testPersona);
      
      // Cause error
      perfTester.simulateNetworkError();
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(50);
      
      // Form state should be preserved
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      expect(messageField.value).toBe(testMessage);
      expect(personaSelect.value).toBe(testPersona);
    });

    it('should handle memory cleanup after errors', async () => {
      const initialErrors = perfTester.getErrors().length;
      
      // Create multiple error scenarios
      const errorTypes = [
        () => perfTester.simulateNetworkError(),
        () => perfTester.simulateServerError(),
        () => perfTester.simulateTimeout(),
        () => perfTester.simulateRateLimitError()
      ];
      
      for (const createError of errorTypes) {
        createError();
        simulateUserInteraction.clickButton('previewBtn');
        await waitFor(30);
        
        // Reset for next test
        perfTester.mockAPIs = setupMockAPIs();
      }
      
      // Should not have memory leaks (simulated by error accumulation)
      const finalErrors = perfTester.getErrors().length;
      const errorIncrease = finalErrors - initialErrors;
      expect(errorIncrease).toBeLessThan(20); // Some errors expected, but bounded
    });

    it('should prevent cascading failures', async () => {
      // Simulate multiple simultaneous failures
      perfTester.simulateNetworkError();
      perfTester.simulateMemoryPressure();
      
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          (async () => {
            simulateUserInteraction.clickButton('previewBtn');
            await waitFor(20);
          })()
        );
      }
      
      await Promise.all(promises);
      
      // Application should still be responsive
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn).toBeTruthy();
      expect(previewBtn.disabled).toBe(false);
      
      // Should not have crashed
      const fatalErrors = perfTester.getErrors().filter(e => 
        e.message.includes('crash') || e.message.includes('fatal')
      );
      expect(fatalErrors).toHaveLength(0);
    });

    it('should maintain accessibility during error states', async () => {
      perfTester.simulateNetworkError();
      
      simulateUserInteraction.typeInTextarea('message', 'Accessibility error test');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(50);
      
      // Error message should be announced to screen readers
      const errorMessage = document.getElementById('errorMessage');
      expect(errorMessage?.getAttribute('aria-live') || errorMessage?.getAttribute('role')).toBeTruthy();
      
      // Focus should still be manageable
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      messageField.focus();
      expect(document.activeElement).toBe(messageField);
      
      // Keyboard navigation should still work
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      expect(document.activeElement).toBe(previewBtn);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid consecutive form submissions', async () => {
      const submissionCount = 10;
      const submissionTimes: number[] = [];
      
      for (let i = 0; i < submissionCount; i++) {
        const start = perfTester.startTiming(`submission-${i}`);
        
        simulateUserInteraction.typeInTextarea('message', `Stress test message ${i}`);
        simulateUserInteraction.clickButton('submitBtn');
        
        const duration = perfTester.endTiming(`submission-${i}`, start);
        submissionTimes.push(duration);
        
        await waitFor(10);
      }
      
      // Performance should remain consistent
      const avgTime = submissionTimes.reduce((a, b) => a + b, 0) / submissionTimes.length;
      expect(avgTime).toBeLessThan(100);
      
      // No errors should occur
      const errors = perfTester.getErrors();
      const stressErrors = errors.filter(e => e.message.includes('stress') || e.message.includes('overwhelmed'));
      expect(stressErrors).toHaveLength(0);
    });

    it('should handle extreme character limits without breaking', async () => {
      const extremeMessage = 'a'.repeat(10000); // Way over limit
      
      const start = perfTester.startTiming('extreme-input');
      simulateUserInteraction.typeInTextarea('message', extremeMessage);
      const duration = perfTester.endTiming('extreme-input', start);
      
      // Should handle gracefully
      expect(duration).toBeLessThan(200);
      
      // Character count should update
      const charCount = document.getElementById('charCount');
      expect(charCount?.textContent).toBe('10000');
      
      // Should show over limit styling
      expect(charCount?.style.color).toBe('rgb(239, 68, 68)');
    });

    it('should handle browser resource constraints', async () => {
      // Simulate low-resource environment
      const reducedPerformanceMode = true;
      
      if (reducedPerformanceMode) {
        // Add delays to simulate slow environment
        const originalTimeout = setTimeout;
        (global as any).setTimeout = (fn: any, delay: number) => originalTimeout(fn, delay * 2);
        
        const measurements = await perfTester.measureFormInteractionPerformance();
        
        // Should still work, albeit slower
        expect(measurements.typing).toBeLessThan(500); // Higher threshold for constrained environment
        expect(measurements.previewGeneration).toBeLessThan(1000);
        
        // Restore
        global.setTimeout = originalTimeout;
      }
    });
  });
});