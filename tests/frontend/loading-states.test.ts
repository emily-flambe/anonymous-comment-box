import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Loading States Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;
  let mockFetch: any;

  beforeEach(() => {
    // Load the HTML file
    const html = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/index.html'),
      'utf-8'
    );
    
    dom = new JSDOM(html, {
      url: 'http://localhost:3000',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    
    document = dom.window.document;
    window = dom.window as unknown as Window & typeof globalThis;
    
    // Setup mocks
    const mockStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockStorage,
      writable: true
    });
    
    mockFetch = vi.fn();
    window.fetch = mockFetch;
    
    // Load the script
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/script.js'),
      'utf-8'
    );
    
    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    document.body.appendChild(scriptElement);
  });

  describe('Preview Button Loading States', () => {
    it('should show loading state immediately when preview is clicked', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message for preview';
      
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message for preview',
            transformedMessage: 'Transformed message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 200))
      );
      
      previewBtn.click();
      
      // Check immediately after click
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.classList.contains('loading')).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Should be restored
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should prevent multiple simultaneous preview requests', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Transformed message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 100))
      );
      
      // Click multiple times rapidly
      previewBtn.click();
      previewBtn.click();
      previewBtn.click();
      
      // Should still be disabled after rapid clicks
      expect(previewBtn.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should only have made one request
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should restore button state after successful preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'Transformed message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should restore button state after preview error', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });
  });

  describe('Submit Button Loading States', () => {
    it('should show loading state immediately when form is submitted', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test feedback message';
      
      // Mock a slow response
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 200))
      );
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      // Check immediately after submit
      expect(submitBtn.disabled).toBe(true);
      expect(submitBtn.textContent).toBe('Sending...');
      expect(messageTextarea.disabled).toBe(true);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Should be restored (but form might be hidden on success)
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
      expect(messageTextarea.disabled).toBe(false);
    });

    it('should disable form elements during submission', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      );
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      // Check that key form elements are disabled
      expect(submitBtn.disabled).toBe(true);
      expect(messageTextarea.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be re-enabled
      expect(submitBtn.disabled).toBe(false);
      expect(messageTextarea.disabled).toBe(false);
    });

    it('should prevent multiple form submissions', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      );
      
      const submitEvent1 = new Event('submit');
      submitEvent1.preventDefault = vi.fn();
      const submitEvent2 = new Event('submit');
      submitEvent2.preventDefault = vi.fn();
      
      // Submit multiple times
      feedbackForm.dispatchEvent(submitEvent1);
      feedbackForm.dispatchEvent(submitEvent2);
      
      expect(submitBtn.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should only have made one request
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should restore form state after submission error', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockRejectedValueOnce(new Error('Submission failed'));
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
      expect(messageTextarea.disabled).toBe(false);
    });
  });

  describe('Loading State Persistence', () => {
    it('should maintain loading state during network delays', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      let resolvePromise: (value: any) => void;
      const mockPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockFetch.mockReturnValueOnce(mockPromise);
      
      previewBtn.click();
      
      // Check loading state at various intervals
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(previewBtn.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(previewBtn.disabled).toBe(true);
      
      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'Transformed message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should handle very quick API responses', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      // Immediate response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'Transformed message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      // Even with immediate response, loading state should be set
      expect(previewBtn.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(previewBtn.disabled).toBe(false);
    });
  });

  describe('Loading Visual Indicators', () => {
    it('should add loading class to preview button', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Transformed message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 100))
      );
      
      expect(previewBtn.classList.contains('loading')).toBe(false);
      
      previewBtn.click();
      
      expect(previewBtn.classList.contains('loading')).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(previewBtn.classList.contains('loading')).toBe(false);
    });

    it('should change button text during loading', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      expect(previewBtn.textContent).toBe('Preview Transformation');
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Transformed message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 100))
      );
      
      previewBtn.click();
      
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should change submit button text during loading', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test feedback';
      
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      );
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      expect(submitBtn.textContent).toBe('Sending...');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
    });
  });

  describe('Loading State Cleanup', () => {
    it('should clean up loading state on successful completion', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'Transformed message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // All loading indicators should be cleared
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should clean up loading state on error', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new Error('API Error'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // All loading indicators should be cleared
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should handle cleanup when component is reset', () => {
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      
      // Set loading states manually
      previewBtn.disabled = true;
      previewBtn.classList.add('loading');
      previewBtn.textContent = 'Generating Preview...';
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      messageTextarea.disabled = true;
      
      // Reset form
      (window as any).resetForm();
      
      // Loading states should be preserved (not cleared by reset)
      // This is expected behavior as reset doesn't clear loading states
      expect(previewBtn.disabled).toBe(true);
      expect(submitBtn.disabled).toBe(true);
      expect(messageTextarea.disabled).toBe(true);
    });
  });

  describe('Accessibility During Loading', () => {
    it('should disable button to prevent multiple activations', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Transformed message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 100))
      );
      
      previewBtn.click();
      
      // Button should be disabled and not clickable
      expect(previewBtn.disabled).toBe(true);
      
      // Try to click again
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should only have made one API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should provide clear loading feedback through text changes', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      const originalText = previewBtn.textContent;
      
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Transformed message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 100))
      );
      
      previewBtn.click();
      
      // Text should change to indicate loading
      expect(previewBtn.textContent).not.toBe(originalText);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Text should be restored
      expect(previewBtn.textContent).toBe(originalText);
    });
  });

  describe('Edge Cases in Loading States', () => {
    it('should handle rapid state changes', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      // Multiple rapid API calls with different timings
      mockFetch
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              originalMessage: 'Test message',
              transformedMessage: 'First response',
              rateLimitRemaining: 9,
              rateLimitReset: Date.now() + 60000
            })
          }), 50))
        )
        .mockImplementationOnce(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: async () => ({
              originalMessage: 'Test message',
              transformedMessage: 'Second response',
              rateLimitRemaining: 8,
              rateLimitReset: Date.now() + 60000
            })
          }), 25))
        );
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 75));
      
      // Should complete first request and be ready for second
      expect(previewBtn.disabled).toBe(false);
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(previewBtn.disabled).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should handle loading state when API call is cancelled', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      // Mock an API call that will be rejected (simulating cancellation)
      mockFetch.mockRejectedValueOnce(new Error('Request cancelled'));
      
      previewBtn.click();
      
      expect(previewBtn.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should restore state even after cancellation
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });
  });
});