import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('DOM Manipulation Tests', () => {
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
    
    // Mock localStorage and sessionStorage
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
    
    // Mock fetch
    window.fetch = vi.fn();
    
    // Load and execute the script
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/script.js'),
      'utf-8'
    );
    
    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    document.body.appendChild(scriptElement);
  });

  describe('Initial DOM State', () => {
    it('should have all required DOM elements', () => {
      expect(document.getElementById('feedbackForm')).toBeTruthy();
      expect(document.getElementById('message')).toBeTruthy();
      expect(document.getElementById('charCount')).toBeTruthy();
      expect(document.getElementById('submitBtn')).toBeTruthy();
      expect(document.getElementById('successMessage')).toBeTruthy();
      expect(document.getElementById('errorMessage')).toBeTruthy();
      expect(document.getElementById('personaSelect')).toBeTruthy();
      expect(document.getElementById('previewBtn')).toBeTruthy();
      expect(document.getElementById('previewContainer')).toBeTruthy();
      expect(document.getElementById('rateLimitStatus')).toBeTruthy();
    });

    it('should have success and error messages hidden initially', () => {
      const successMessage = document.getElementById('successMessage');
      const errorMessage = document.getElementById('errorMessage');
      
      expect(successMessage?.classList.contains('hidden')).toBe(true);
      expect(errorMessage?.classList.contains('hidden')).toBe(true);
    });

    it('should have preview container hidden initially', () => {
      const previewContainer = document.getElementById('previewContainer');
      expect(previewContainer?.classList.contains('hidden')).toBe(true);
    });

    it('should have custom persona group hidden initially', () => {
      const customPersonaGroup = document.getElementById('customPersonaGroup');
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Character Counter Updates', () => {
    it('should update character count when typing in message textarea', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount');
      
      messageTextarea.value = 'Hello, this is a test message';
      messageTextarea.dispatchEvent(new Event('input'));
      
      expect(charCount?.textContent).toBe('29');
    });

    it('should change character count color when exceeding limit', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount') as HTMLElement;
      
      // Test normal length
      messageTextarea.value = 'Short message';
      messageTextarea.dispatchEvent(new Event('input'));
      expect(charCount.style.color).toBe('rgb(107, 114, 128)');
      
      // Test exceeding length
      messageTextarea.value = 'a'.repeat(1801);
      messageTextarea.dispatchEvent(new Event('input'));
      expect(charCount.style.color).toBe('rgb(239, 68, 68)');
    });
  });

  describe('Persona Selection UI', () => {
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
      
      // First select custom
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Then select preset
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(true);
    });

    it('should display persona description for preset personas', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Casual internet slang');
      expect(personaDescription?.innerHTML).toContain('Example:');
    });

    it('should clear custom persona text when switching from custom to preset', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount');
      
      // Select custom and add text
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      customPersonaTextarea.value = 'My custom persona';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      // Switch to preset
      personaSelect.value = 'barely-literate';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(customPersonaTextarea.value).toBe('');
      expect(customPersonaCount?.textContent).toBe('0');
    });
  });

  describe('Success and Error Message Display', () => {
    it('should show success message and hide form on successful submission', () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const successMessage = document.getElementById('successMessage');
      const errorMessage = document.getElementById('errorMessage');
      
      // Trigger showSuccess function by calling it directly through window
      (window as any).showSuccess();
      
      expect(feedbackForm.style.display).toBe('none');
      expect(successMessage?.classList.contains('hidden')).toBe(false);
      expect(errorMessage?.classList.contains('hidden')).toBe(true);
    });

    it('should show error message with custom text', () => {
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');
      const successMessage = document.getElementById('successMessage');
      
      // Trigger showError function
      (window as any).showError('Test error message');
      
      expect(errorText?.textContent).toBe('Test error message');
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      expect(successMessage?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Preview Display', () => {
    it('should display preview with original and transformed messages', () => {
      const previewContainer = document.getElementById('previewContainer');
      const originalPreview = document.getElementById('originalPreview');
      const transformedPreview = document.getElementById('transformedPreview');
      
      // Trigger displayPreview function
      (window as any).displayPreview({
        originalMessage: 'Original test message',
        transformedMessage: 'Transformed test message'
      });
      
      expect(originalPreview?.textContent).toBe('Original test message');
      expect(transformedPreview?.textContent).toBe('Transformed test message');
      expect(previewContainer?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Rate Limit Display', () => {
    it('should update rate limit display', () => {
      const rateLimitCount = document.getElementById('rateLimitCount');
      const rateLimitStatus = document.getElementById('rateLimitStatus');
      
      // Normal rate limit
      (window as any).updateRateLimit(8, Date.now() + 60000);
      
      expect(rateLimitCount?.textContent).toBe('8');
      expect(rateLimitStatus?.classList.contains('rate-limit-warning')).toBe(false);
    });

    it('should show warning when rate limit is low', () => {
      const rateLimitStatus = document.getElementById('rateLimitStatus');
      const rateLimitText = document.getElementById('rateLimitText');
      
      // Low rate limit
      (window as any).updateRateLimit(2, Date.now() + 60000);
      
      expect(rateLimitStatus?.classList.contains('rate-limit-warning')).toBe(true);
      expect(rateLimitText?.innerHTML).toContain('⚠️ Only');
    });
  });

  describe('Form Reset', () => {
    it('should reset form to initial state', () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount') as HTMLElement;
      const successMessage = document.getElementById('successMessage');
      const errorMessage = document.getElementById('errorMessage');
      const previewContainer = document.getElementById('previewContainer');
      
      // Set various states
      messageTextarea.value = 'Test message';
      charCount.textContent = '12';
      charCount.style.color = 'red';
      feedbackForm.style.display = 'none';
      successMessage?.classList.remove('hidden');
      errorMessage?.classList.remove('hidden');
      previewContainer?.classList.remove('hidden');
      
      // Reset form
      (window as any).resetForm();
      
      expect(feedbackForm.style.display).toBe('block');
      expect(messageTextarea.value).toBe('');
      expect(charCount.textContent).toBe('0');
      expect(charCount.style.color).toBe('rgb(107, 114, 128)');
      expect(successMessage?.classList.contains('hidden')).toBe(true);
      expect(errorMessage?.classList.contains('hidden')).toBe(true);
      expect(previewContainer?.classList.contains('hidden')).toBe(true);
    });
  });
});