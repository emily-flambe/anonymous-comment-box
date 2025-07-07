import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Error Handling Tests', () => {
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
    
    // Mock console to capture errors
    global.console.error = vi.fn();
    
    // Load the script
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/script.js'),
      'utf-8'
    );
    
    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    document.body.appendChild(scriptElement);
  });

  describe('Error Display', () => {
    it('should show error message with correct text', () => {
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      const successMessage = document.getElementById('successMessage');
      
      (window as any).showError('Test error message');
      
      expect(errorText?.textContent).toBe('Test error message');
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(successMessage?.classList.add('hidden'));
    });

    it('should hide success message when showing error', () => {
      const errorMessage = document.getElementById('errorMessage');
      const successMessage = document.getElementById('successMessage');
      
      // First show success
      successMessage?.classList.remove('hidden');
      
      // Then show error
      (window as any).showError('Error occurred');
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(successMessage?.classList.contains('hidden')).toBe(true);
    });

    it('should handle empty error messages', () => {
      const errorText = document.getElementById('errorText');
      
      (window as any).showError('');
      
      expect(errorText?.textContent).toBe('');
    });

    it('should handle special characters in error messages', () => {
      const errorText = document.getElementById('errorText');
      
      const specialMessages = [
        'Error with "quotes"',
        'Error with <script>alert("xss")</script>',
        'Error with émoji 🚨',
        'Error with\nnewlines',
        'Error with\ttabs'
      ];
      
      specialMessages.forEach(message => {
        (window as any).showError(message);
        expect(errorText?.textContent).toBe(message);
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network failures in preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle network failures in submission', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle DNS resolution failures', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
    });

    it('should handle timeout errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
    });
  });

  describe('API Error Responses', () => {
    it('should handle 400 Bad Request errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid message format'
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Invalid message format');
    });

    it('should handle 401 Unauthorized errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          error: 'Unauthorized access'
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Unauthorized access');
    });

    it('should handle 403 Forbidden errors', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'Access forbidden'
        })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Access forbidden');
    });

    it('should handle 404 Not Found errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Endpoint not found'
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Endpoint not found');
    });

    it('should handle 429 Rate Limit errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Too many requests'
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Rate limit exceeded. Please wait before trying again.');
    });

    it('should handle 500 Internal Server Error', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error'
        })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Internal server error');
    });

    it('should handle API responses without error field', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          // No error field
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorText?.textContent).toBe('Failed to generate preview. Please try again.');
    });
  });

  describe('JSON Parsing Errors', () => {
    it('should handle malformed JSON in API responses', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new SyntaxError('Unexpected token');
        }
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle empty JSON responses', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => null
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should handle gracefully without throwing
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should show error for empty message in preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = '';
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Please enter a message to preview');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should show error for empty message in submission', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = '';
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Please enter a message');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should show error when rate limit is exceeded locally', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      // Set rate limit to 0
      (window as any).rateLimitRemaining = 0;
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Preview limit reached. Please wait before trying again.');
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Button State Recovery', () => {
    it('should restore preview button state after error', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      previewBtn.click();
      
      // Check loading state immediately
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should be restored after error
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
      expect(previewBtn.classList.contains('loading')).toBe(false);
    });

    it('should restore submit button state after error', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test feedback';
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      // Check loading state immediately
      expect(submitBtn.disabled).toBe(true);
      expect(submitBtn.textContent).toBe('Sending...');
      expect(messageTextarea.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should be restored after error
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
      expect(messageTextarea.disabled).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after network error', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = 'Test message';
      
      // First attempt fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      previewBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      
      // Second attempt succeeds
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
      
      const previewContainer = document.getElementById('previewContainer');
      expect(previewContainer?.classList.contains('hidden')).toBe(false);
    });

    it('should clear error message on successful operation', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = 'Test message';
      
      // Show error first
      (window as any).showError('Previous error');
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      
      // Successful preview should not explicitly clear error (by design)
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
      
      const previewContainer = document.getElementById('previewContainer');
      expect(previewContainer?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined or null error responses', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      const testCases = [
        { error: undefined },
        { error: null },
        {},
        undefined,
        null
      ];
      
      for (const testCase of testCases) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: async () => testCase
        });
        
        previewBtn.click();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(errorText?.textContent).toBe('Failed to generate preview. Please try again.');
      }
    });

    it('should handle extremely long error messages', () => {
      const errorText = document.getElementById('errorText');
      
      const longError = 'Error: ' + 'x'.repeat(10000);
      
      (window as any).showError(longError);
      
      expect(errorText?.textContent).toBe(longError);
    });

    it('should handle concurrent error states', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      // Multiple rapid errors
      mockFetch
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'));
      
      previewBtn.click();
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should display one of the errors (last one wins)
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
    });
  });
});