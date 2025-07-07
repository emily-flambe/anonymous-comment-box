import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Basic Frontend Functionality Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

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
    
    window.fetch = vi.fn();
    
    // Load the script directly into the window context
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/script.js'),
      'utf-8'
    );
    
    // Execute script in window context
    window.eval(script);
  });

  describe('DOM Elements', () => {
    it('should have all required form elements', () => {
      expect(document.getElementById('feedbackForm')).toBeTruthy();
      expect(document.getElementById('message')).toBeTruthy();
      expect(document.getElementById('charCount')).toBeTruthy();
      expect(document.getElementById('submitBtn')).toBeTruthy();
      expect(document.getElementById('personaSelect')).toBeTruthy();
      expect(document.getElementById('previewBtn')).toBeTruthy();
    });

    it('should have proper initial state', () => {
      const successMessage = document.getElementById('successMessage');
      const errorMessage = document.getElementById('errorMessage');
      const previewContainer = document.getElementById('previewContainer');
      const customPersonaGroup = document.getElementById('customPersonaGroup');
      
      expect(successMessage?.classList.contains('hidden')).toBe(true);
      expect(errorMessage?.classList.contains('hidden')).toBe(true);
      expect(previewContainer?.classList.contains('hidden')).toBe(true);
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Character Counting', () => {
    it('should update character count for message input', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount');
      
      messageTextarea.value = 'Hello World';
      messageTextarea.dispatchEvent(new Event('input'));
      
      expect(charCount?.textContent).toBe('11');
    });

    it('should update character count for custom persona input', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount');
      
      // Show custom persona section first
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      customPersonaTextarea.value = 'Test persona';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      expect(customPersonaCount?.textContent).toBe('12');
    });

    it('should change color when character limit is exceeded', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount') as HTMLElement;
      
      // Normal length
      messageTextarea.value = 'Short message';
      messageTextarea.dispatchEvent(new Event('input'));
      expect(charCount.style.color).toBe('rgb(107, 114, 128)');
      
      // Exceeded length
      messageTextarea.value = 'a'.repeat(1801);
      messageTextarea.dispatchEvent(new Event('input'));
      expect(charCount.style.color).toBe('rgb(239, 68, 68)');
    });
  });

  describe('Persona Selection', () => {
    it('should show custom persona textarea when custom is selected', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaGroup = document.getElementById('customPersonaGroup');
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(false);
    });

    it('should hide custom persona textarea when preset is selected', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaGroup = document.getElementById('customPersonaGroup');
      
      // First show custom
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(false);
      
      // Then select preset
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(true);
    });

    it('should display persona description', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Casual internet slang');
    });
  });

  describe('Preview Functionality', () => {
    it('should prevent preview with empty message', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = '';
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should make API call with valid message', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Valid test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Valid test message',
          transformedMessage: 'Transformed message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(window.fetch).toHaveBeenCalledWith('/api/preview', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.stringContaining('Valid test message')
      }));
    });

    it('should show loading state during preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockImplementationOnce(() => 
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
      
      // Check loading state immediately
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.classList.contains('loading')).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check restored state
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });
  });

  describe('Form Submission', () => {
    it('should prevent submission with empty message', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = '';
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(submitEvent.preventDefault).toHaveBeenCalled();
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should show loading state during submission', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test feedback';
      
      (window.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      );
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      // Check loading state
      expect(submitBtn.disabled).toBe(true);
      expect(submitBtn.textContent).toBe('Sending...');
      expect(messageTextarea.disabled).toBe(true);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Check restored state
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
      expect(messageTextarea.disabled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Network error. Please check your connection and try again.');
    });

    it('should handle API errors', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid request'
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Invalid request');
    });
  });

  describe('Rate Limiting', () => {
    it('should update rate limit display', () => {
      const rateLimitCount = document.getElementById('rateLimitCount');
      
      // Should have initial count
      expect(rateLimitCount?.textContent).toBe('10');
    });

    it('should handle rate limit display correctly', () => {
      const rateLimitCount = document.getElementById('rateLimitCount');
      const rateLimitStatus = document.getElementById('rateLimitStatus');
      
      // Should have initial elements
      expect(rateLimitCount).toBeTruthy();
      expect(rateLimitStatus).toBeTruthy();
      
      // Should have initial count
      expect(rateLimitCount?.textContent).toBe('10');
      
      // Rate limiting logic is handled by the updateRateLimit function
      // This would be tested in integration tests
    });
  });
});