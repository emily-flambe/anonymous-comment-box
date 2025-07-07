import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('API Integration Tests', () => {
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

  describe('Preview API Calls', () => {
    it('should make correct API call for preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message for preview';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message for preview',
          transformedMessage: 'Transformed test message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockFetch).toHaveBeenCalledWith('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': expect.any(String)
        },
        body: JSON.stringify({
          message: 'Test message for preview',
          sessionId: expect.any(String)
        })
      });
    });

    it('should include persona in preview API call', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      personaSelect.value = 'internet-random';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'test msg lol',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBe('internet-random');
    });

    it('should include custom persona in preview API call', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      customPersonaTextarea.value = 'Write like a robot';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'BEEP BOOP TEST MESSAGE',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.customPersona).toBe('Write like a robot');
      expect(body.persona).toBeUndefined();
    });

    it('should handle preview API success response', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const previewContainer = document.getElementById('previewContainer');
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      messageTextarea.value = 'Hello world';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Hello world',
          transformedMessage: 'yo world whats good',
          rateLimitRemaining: 8,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(previewContainer?.classList.contains('hidden')).toBe(false);
      expect(originalPreview?.textContent).toBe('Hello world');
      expect(transformedPreview?.textContent).toBe('yo world whats good');
    });

    it('should handle preview API error response', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
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
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Invalid message format');
    });

    it('should handle preview network errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
    });
  });

  describe('Submit API Calls', () => {
    it('should make correct API call for message submission', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      
      messageTextarea.value = 'This is my feedback';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockFetch).toHaveBeenCalledWith('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': expect.any(String)
        },
        body: JSON.stringify({
          message: 'This is my feedback',
          sessionId: expect.any(String)
        })
      });
    });

    it('should include persona in submit API call', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      messageTextarea.value = 'Feedback with persona';
      personaSelect.value = 'super-nice';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBe('super-nice');
    });

    it('should handle submit API success response', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const successMessage = document.getElementById('successMessage');
      
      messageTextarea.value = 'Successful feedback';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(feedbackForm.style.display).toBe('none');
      expect(successMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should handle submit API error response', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Error feedback';
      
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
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Internal server error');
    });

    it('should handle submit network errors', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Network error test';
      
      mockFetch.mockRejectedValueOnce(new Error('Network down'));
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
    });
  });

  describe('Rate Limit Status API Calls', () => {
    it('should make correct API call for rate limit status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          remaining: 10,
          reset: Date.now() + 60000
        })
      });
      
      await (window as any).initializeRateLimit();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/rate-limit-status', {
        headers: {
          'X-Session-ID': expect.any(String)
        }
      });
    });

    it('should handle rate limit status success response', async () => {
      const rateLimitCount = document.getElementById('rateLimitCount');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          remaining: 7,
          reset: Date.now() + 60000
        })
      });
      
      await (window as any).initializeRateLimit();
      
      expect(rateLimitCount?.textContent).toBe('7');
    });

    it('should handle rate limit status errors gracefully', async () => {
      const rateLimitCount = document.getElementById('rateLimitCount');
      
      mockFetch.mockRejectedValueOnce(new Error('Rate limit API error'));
      
      await (window as any).initializeRateLimit();
      
      // Should use default value
      expect(rateLimitCount?.textContent).toBe('10');
    });
  });

  describe('Rate Limiting Handling', () => {
    it('should handle 429 rate limit exceeded in preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Rate limited message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded'
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Rate limit exceeded. Please wait before trying again.');
    });

    it('should handle 429 rate limit exceeded in submit', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Rate limited submission';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded'
        })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Rate limit exceeded. Please wait before trying again.');
    });

    it('should update rate limit after successful preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const rateLimitCount = document.getElementById('rateLimitCount');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'Transformed message',
          rateLimitRemaining: 6,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(rateLimitCount?.textContent).toBe('6');
    });
  });

  describe('Request Headers and Body', () => {
    it('should send correct Content-Type header', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'transformed',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should send session ID in both header and body', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'transformed',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      const body = JSON.parse(fetchCall[1].body);
      
      expect(headers['X-Session-ID']).toBeTruthy();
      expect(body.sessionId).toBeTruthy();
      expect(headers['X-Session-ID']).toBe(body.sessionId);
    });

    it('should properly encode JSON in request body', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      // Test with special characters
      messageTextarea.value = 'Message with "quotes" and newlines\nand tabs\t';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: messageTextarea.value,
          transformedMessage: 'transformed',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = mockFetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.message).toBe('Message with "quotes" and newlines\nand tabs\t');
    });
  });

  describe('API Response Handling', () => {
    it('should handle malformed JSON responses', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should handle responses without required fields', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          // Missing required fields
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should handle gracefully without throwing
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle empty response bodies', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Failed to generate preview. Please try again.');
    });
  });

  describe('Concurrent API Calls', () => {
    it('should handle rapid consecutive preview requests', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      // Mock multiple rapid responses
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'First response',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Second response',
            rateLimitRemaining: 8,
            rateLimitReset: Date.now() + 60000
          })
        });
      
      // Rapid clicks
      previewBtn.click();
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should have made two calls
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});