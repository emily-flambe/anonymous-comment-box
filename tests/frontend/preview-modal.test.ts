import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Preview Modal Tests', () => {
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

  describe('Preview Container Visibility', () => {
    it('should be hidden initially', () => {
      const previewContainer = document.getElementById('previewContainer');
      expect(previewContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should show preview container when preview is generated', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const previewContainer = document.getElementById('previewContainer');
      
      messageTextarea.value = 'Test message for preview';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message for preview',
          transformedMessage: 'transformed test message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(previewContainer?.classList.contains('hidden')).toBe(false);
    });

    it('should hide preview container on form reset', () => {
      const previewContainer = document.getElementById('previewContainer');
      
      // Show preview container first
      previewContainer?.classList.remove('hidden');
      
      // Reset form
      (window as any).resetForm();
      
      expect(previewContainer?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Preview Content Display', () => {
    it('should display original and transformed messages', () => {
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      const testData = {
        originalMessage: 'This is the original message',
        transformedMessage: 'dis is da original msg lol'
      };
      
      (window as any).displayPreview(testData);
      
      expect(originalPreview?.textContent).toBe(testData.originalMessage);
      expect(transformedPreview?.textContent).toBe(testData.transformedMessage);
    });

    it('should handle multiline messages in preview', () => {
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      const testData = {
        originalMessage: 'Line 1\nLine 2\nLine 3',
        transformedMessage: 'line 1\nline 2\nline 3'
      };
      
      (window as any).displayPreview(testData);
      
      expect(originalPreview?.textContent).toBe(testData.originalMessage);
      expect(transformedPreview?.textContent).toBe(testData.transformedMessage);
    });

    it('should handle empty or null values gracefully', () => {
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      const testCases = [
        { originalMessage: '', transformedMessage: '' },
        { originalMessage: null, transformedMessage: null },
        { originalMessage: 'Original', transformedMessage: '' },
        { originalMessage: '', transformedMessage: 'Transformed' }
      ];
      
      testCases.forEach(testData => {
        (window as any).displayPreview(testData);
        
        expect(originalPreview?.textContent).toBe(testData.originalMessage || '');
        expect(transformedPreview?.textContent).toBe(testData.transformedMessage || '');
      });
    });

    it('should handle special characters in preview', () => {
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      const testData = {
        originalMessage: 'Special chars: <>&"\'`',
        transformedMessage: 'SPECIAL CHARS: <>&"\'`'
      };
      
      (window as any).displayPreview(testData);
      
      expect(originalPreview?.textContent).toBe(testData.originalMessage);
      expect(transformedPreview?.textContent).toBe(testData.transformedMessage);
    });
  });

  describe('Preview Button Interactions', () => {
    it('should prevent preview when message is empty', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      
      messageTextarea.value = '';
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should show loading state during preview generation', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({
            originalMessage: 'Test message',
            transformedMessage: 'transformed test message',
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
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.classList.contains('loading')).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should handle preview API errors gracefully', async () => {
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
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Transformation');
    });

    it('should handle rate limit exceeded error', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Rate limit exceeded. Please wait before trying again.');
    });

    it('should handle API error responses', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid request format' })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Invalid request format');
    });
  });

  describe('Preview with Different Personas', () => {
    it('should generate preview with selected persona', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Hello world';
      personaSelect.value = 'internet-random';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Hello world',
          transformedMessage: 'yo world whats good 💯',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBe('internet-random');
      expect(body.message).toBe('Hello world');
    });

    it('should generate preview with custom persona', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Hello world';
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      customPersonaTextarea.value = 'Write like a medieval knight';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Hello world',
          transformedMessage: 'Hail and well met, world!',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.customPersona).toBe('Write like a medieval knight');
      expect(body.message).toBe('Hello world');
    });

    it('should generate preview without persona when none selected', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Hello world';
      personaSelect.value = '';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Hello world',
          transformedMessage: 'Hello world',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBeUndefined();
      expect(body.customPersona).toBeUndefined();
      expect(body.message).toBe('Hello world');
    });
  });

  describe('Preview Rate Limiting', () => {
    it('should prevent preview when rate limit is exceeded', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      
      messageTextarea.value = 'Test message';
      
      // Set rate limit to 0
      (window as any).rateLimitRemaining = 0;
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(window.fetch).not.toHaveBeenCalled();
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(errorText?.textContent).toBe('Preview limit reached. Please wait before trying again.');
    });

    it('should update rate limit after successful preview', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const rateLimitCount = document.getElementById('rateLimitCount');
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'transformed message',
          rateLimitRemaining: 7,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(rateLimitCount?.textContent).toBe('7');
    });
  });

  describe('Multiple Preview Generations', () => {
    it('should handle multiple consecutive previews', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      const testCases = [
        { message: 'First message', transformed: 'first msg' },
        { message: 'Second message', transformed: 'second msg' },
        { message: 'Third message', transformed: 'third msg' }
      ];
      
      for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        
        messageTextarea.value = testCase.message;
        
        (window.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            originalMessage: testCase.message,
            transformedMessage: testCase.transformed,
            rateLimitRemaining: 9 - i,
            rateLimitReset: Date.now() + 60000
          })
        });
        
        previewBtn.click();
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(originalPreview?.textContent).toBe(testCase.message);
        expect(transformedPreview?.textContent).toBe(testCase.transformed);
      }
    });

    it('should preserve latest preview content', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      // Generate first preview
      messageTextarea.value = 'First message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'First message',
          transformedMessage: 'first transformed',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Generate second preview
      messageTextarea.value = 'Second message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Second message',
          transformedMessage: 'second transformed',
          rateLimitRemaining: 8,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Should show latest preview
      expect(originalPreview?.textContent).toBe('Second message');
      expect(transformedPreview?.textContent).toBe('second transformed');
    });
  });
});