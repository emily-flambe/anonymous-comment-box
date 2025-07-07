import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Persona Selection Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;
  let mockSessionStorage: any;

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
    mockSessionStorage = {
      storage: {},
      getItem: vi.fn((key: string) => mockSessionStorage.storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockSessionStorage.storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockSessionStorage.storage[key];
      }),
      clear: vi.fn(() => {
        mockSessionStorage.storage = {};
      }),
      length: 0,
      key: vi.fn()
    };
    
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn()
    };
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
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

  describe('Persona Dropdown', () => {
    it('should have all persona options', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const options = Array.from(personaSelect.options).map(opt => opt.value);
      
      expect(options).toContain('');
      expect(options).toContain('internet-random');
      expect(options).toContain('barely-literate');
      expect(options).toContain('extremely-serious');
      expect(options).toContain('super-nice');
      expect(options).toContain('custom');
    });

    it('should have default empty selection', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      expect(personaSelect.value).toBe('');
    });

    it('should save persona selection to session storage', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('selectedPersona', 'internet-random');
    });

    it('should clear session storage when no persona selected', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      // First select a persona
      personaSelect.value = 'super-nice';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Then clear selection
      personaSelect.value = '';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(mockSessionStorage.setItem).toHaveBeenLastCalledWith('selectedPersona', '');
    });
  });

  describe('Persona Descriptions', () => {
    it('should display correct description for internet-random persona', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Casual internet slang');
      expect(personaDescription?.innerHTML).toContain('abbreviations');
      expect(personaDescription?.innerHTML).toContain('Example:');
      expect(personaDescription?.innerHTML).toContain('ngl this idea slaps');
    });

    it('should display correct description for barely-literate persona', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'barely-literate';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Simple vocabulary');
      expect(personaDescription?.innerHTML).toContain('poor grammar');
    });

    it('should display correct description for extremely-serious persona', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'extremely-serious';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Formal, academic language');
      expect(personaDescription?.innerHTML).toContain('professional vocabulary');
    });

    it('should display correct description for super-nice persona', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'super-nice';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Overly polite');
      expect(personaDescription?.innerHTML).toContain('encouraging');
      expect(personaDescription?.innerHTML).toContain('positive language');
    });

    it('should clear description when no persona selected', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      // First select a persona
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Then clear
      personaSelect.value = '';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.textContent).toBe('');
      expect(personaDescription?.classList.contains('empty')).toBe(true);
    });
  });

  describe('Custom Persona', () => {
    it('should show custom persona textarea when custom is selected', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaGroup = document.getElementById('customPersonaGroup');
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(customPersonaGroup?.classList.contains('hidden')).toBe(false);
    });

    it('should display custom persona description prompt', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(personaDescription?.innerHTML).toContain('Enter a custom style description above');
    });

    it('should save custom persona text to session storage', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      customPersonaTextarea.value = 'Write like a pirate';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('customPersona', 'Write like a pirate');
    });

    it('should clear custom persona when switching to preset', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount');
      
      // Select custom and add text
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      customPersonaTextarea.value = 'Custom style';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      // Switch to preset
      personaSelect.value = 'super-nice';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(customPersonaTextarea.value).toBe('');
      expect(customPersonaCount?.textContent).toBe('0');
      expect(document.getElementById('customPersonaGroup')?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Session Restoration', () => {
    it('should restore persona selection from session storage', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      // Set storage before page load
      mockSessionStorage.storage['selectedPersona'] = 'barely-literate';
      
      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));
      
      // Give time for async operations
      setTimeout(() => {
        expect(personaSelect.value).toBe('barely-literate');
      }, 0);
    });

    it('should restore custom persona text from session storage', () => {
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount');
      
      // Set storage before page load
      mockSessionStorage.storage['selectedPersona'] = 'custom';
      mockSessionStorage.storage['customPersona'] = 'Write like Shakespeare';
      
      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));
      
      // Give time for async operations
      setTimeout(() => {
        expect(customPersonaTextarea.value).toBe('Write like Shakespeare');
        expect(customPersonaCount?.textContent).toBe('21');
      }, 0);
    });
  });

  describe('Persona Integration with API Calls', () => {
    it('should include selected persona in preview request', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'test msg fr fr no cap',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBe('internet-random');
      expect(body.customPersona).toBeUndefined();
    });

    it('should include custom persona in preview request', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      messageTextarea.value = 'Test message';
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      customPersonaTextarea.value = 'Write like a robot';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'BEEP BOOP TEST MESSAGE PROCESSED',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.customPersona).toBe('Write like a robot');
      expect(body.persona).toBeUndefined();
    });

    it('should include selected persona in submit request', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      messageTextarea.value = 'Test feedback';
      personaSelect.value = 'super-nice';
      personaSelect.dispatchEvent(new Event('change'));
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBe('super-nice');
    });

    it('should not include persona fields when none selected', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      messageTextarea.value = 'Test feedback';
      personaSelect.value = '';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });
      
      const submitEvent = new Event('submit');
      submitEvent.preventDefault = vi.fn();
      feedbackForm.dispatchEvent(submitEvent);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      
      expect(body.persona).toBeUndefined();
      expect(body.customPersona).toBeUndefined();
    });
  });

  describe('Persona Selection Edge Cases', () => {
    it('should handle rapid persona changes', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const personaDescription = document.getElementById('personaDescription');
      
      const personas = ['internet-random', 'barely-literate', 'extremely-serious', 'super-nice', 'custom', ''];
      
      // Rapidly change personas
      personas.forEach(persona => {
        personaSelect.value = persona;
        personaSelect.dispatchEvent(new Event('change'));
      });
      
      // Should end with empty description
      expect(personaDescription?.textContent).toBe('');
      expect(personaDescription?.classList.contains('empty')).toBe(true);
    });

    it('should preserve message when changing personas', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      messageTextarea.value = 'Important feedback message';
      
      // Change personas multiple times
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      personaSelect.value = 'super-nice';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Message should remain unchanged
      expect(messageTextarea.value).toBe('Important feedback message');
    });
  });
});