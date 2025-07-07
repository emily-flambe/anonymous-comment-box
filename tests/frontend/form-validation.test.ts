import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Form Validation Tests', () => {
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
    
    // Load the script
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/script.js'),
      'utf-8'
    );
    
    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    document.body.appendChild(scriptElement);
  });

  describe('Message Input Validation', () => {
    it('should not submit form with empty message', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = '';
      
      // Submit form
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(submitEvent.preventDefault).toHaveBeenCalled();
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should not submit form with only whitespace', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      
      messageTextarea.value = '   \n\t   ';
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).not.toHaveBeenCalled();
    });

    it('should accept valid message', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      
      messageTextarea.value = 'This is a valid test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).toHaveBeenCalled();
    });
  });

  describe('Character Limit Validation', () => {
    it('should track character count correctly', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount');
      
      const testStrings = [
        { text: '', expectedCount: '0' },
        { text: 'Hello', expectedCount: '5' },
        { text: 'Hello World!', expectedCount: '12' },
        { text: '😀 emoji test', expectedCount: '13' },
        { text: 'a'.repeat(100), expectedCount: '100' },
        { text: 'a'.repeat(1800), expectedCount: '1800' },
        { text: 'a'.repeat(2000), expectedCount: '2000' }
      ];
      
      testStrings.forEach(({ text, expectedCount }) => {
        messageTextarea.value = text;
        messageTextarea.dispatchEvent(new Event('input'));
        expect(charCount?.textContent).toBe(expectedCount);
      });
    });

    it('should handle multi-line input correctly', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount');
      
      messageTextarea.value = 'Line 1\nLine 2\nLine 3';
      messageTextarea.dispatchEvent(new Event('input'));
      
      expect(charCount?.textContent).toBe('20'); // Including newlines
    });

    it('should indicate when message exceeds recommended length', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount') as HTMLElement;
      
      // Just at limit
      messageTextarea.value = 'a'.repeat(1800);
      messageTextarea.dispatchEvent(new Event('input'));
      expect(charCount.style.color).toBe('rgb(107, 114, 128)'); // Normal color
      
      // Over limit
      messageTextarea.value = 'a'.repeat(1801);
      messageTextarea.dispatchEvent(new Event('input'));
      expect(charCount.style.color).toBe('rgb(239, 68, 68)'); // Red color
    });
  });

  describe('Custom Persona Validation', () => {
    it('should track custom persona character count', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount');
      
      // Select custom persona
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Type in custom persona
      customPersonaTextarea.value = 'My custom writing style';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      expect(customPersonaCount?.textContent).toBe('23');
    });

    it('should indicate when custom persona exceeds limit', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount') as HTMLElement;
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Just at limit
      customPersonaTextarea.value = 'a'.repeat(450);
      customPersonaTextarea.dispatchEvent(new Event('input'));
      expect(customPersonaCount.style.color).toBe('rgb(107, 114, 128)');
      
      // Over limit
      customPersonaTextarea.value = 'a'.repeat(451);
      customPersonaTextarea.dispatchEvent(new Event('input'));
      expect(customPersonaCount.style.color).toBe('rgb(239, 68, 68)');
    });
  });

  describe('Preview Validation', () => {
    it('should not generate preview with empty message', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = '';
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should not generate preview when rate limit is exceeded', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = 'Valid message';
      
      // Set rate limit to 0
      (window as any).rateLimitRemaining = 0;
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should generate preview with valid message', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Valid test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Valid test message',
          transformedMessage: 'Transformed valid test message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(window.fetch).toHaveBeenCalledWith('/api/preview', expect.any(Object));
    });
  });

  describe('Form State During Submission', () => {
    it('should disable form elements during submission', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      // Mock a slow response
      (window.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      );
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      // Check immediately after submission
      expect(submitBtn.disabled).toBe(true);
      expect(submitBtn.textContent).toBe('Sending...');
      expect(messageTextarea.disabled).toBe(true);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be re-enabled
      expect(submitBtn.disabled).toBe(false);
      expect(submitBtn.textContent).toBe('Send Anonymous Feedback');
      expect(messageTextarea.disabled).toBe(false);
    });

    it('should disable preview button during preview generation', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      // Mock a slow response
      (window.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'Transformed test message',
            rateLimitRemaining: 9,
            rateLimitReset: Date.now() + 60000
          })
        }), 100))
      );
      
      previewBtn.click();
      
      // Check immediately after click
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.classList.contains('loading')).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be re-enabled
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });
  });

  describe('Input Sanitization', () => {
    it('should handle special characters in message', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      
      const specialMessages = [
        '<script>alert("XSS")</script>',
        '"; DROP TABLE users; --',
        '${__proto__.constructor("alert(1)")()}',
        'Message with "quotes" and \'apostrophes\'',
        'Unicode: 你好世界 🌍',
        'Line\nbreaks\rand\ttabs'
      ];
      
      for (const message of specialMessages) {
        messageTextarea.value = message;
        
        (window.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        });
        
        const submitEvent = new Event('submit');
        submitEvent.preventDefault = vi.fn();
        feedbackForm.dispatchEvent(submitEvent);
        
        await new Promise(resolve => setTimeout(resolve, 0));
        
        const fetchCall = (window.fetch as any).mock.calls.slice(-1)[0];
        const body = JSON.parse(fetchCall[1].body);
        
        expect(body.message).toBe(message);
      }
    });
  });
});