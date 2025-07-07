import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Session Management Tests', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;
  let mockLocalStorage: any;
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
    
    // Setup localStorage mock
    mockLocalStorage = {
      storage: {},
      getItem: vi.fn((key: string) => mockLocalStorage.storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage.storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage.storage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage.storage = {};
      }),
      length: 0,
      key: vi.fn()
    };
    
    // Setup sessionStorage mock
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
    
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });
    
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
      writable: true
    });
    
    window.fetch = vi.fn();
    
    // Mock Date.now for consistent session ID generation
    vi.spyOn(Date, 'now').mockReturnValue(1234567890);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    
    // Load the script
    const script = fs.readFileSync(
      path.resolve(__dirname, '../../src/static/script.js'),
      'utf-8'
    );
    
    const scriptElement = document.createElement('script');
    scriptElement.textContent = script;
    document.body.appendChild(scriptElement);
  });

  describe('Session ID Generation', () => {
    it('should generate session ID when not present in localStorage', () => {
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('sessionId', expect.stringMatching(/^session_/));
    });

    it('should use existing session ID from localStorage', () => {
      // Reset and set existing session ID
      mockLocalStorage.storage = { sessionId: 'existing_session_123' };
      
      // Reload script
      const script = fs.readFileSync(
        path.resolve(__dirname, '../../src/static/script.js'),
        'utf-8'
      );
      
      const scriptElement = document.createElement('script');
      scriptElement.textContent = script;
      document.body.appendChild(scriptElement);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('sessionId', 'existing_session_123');
    });

    it('should generate session ID with expected format', () => {
      // Mock specific values for predictable generation
      vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
      vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
      
      // Generate session ID by calling the function directly
      const sessionId = (window as any).generateSessionId();
      
      expect(sessionId).toMatch(/^session_[a-z0-9]+[a-z0-9]+$/);
      expect(sessionId).toContain('session_');
    });

    it('should generate unique session IDs', () => {
      const sessionIds = new Set();
      
      // Generate multiple session IDs
      for (let i = 0; i < 100; i++) {
        vi.spyOn(Math, 'random').mockReturnValue(Math.random());
        vi.spyOn(Date, 'now').mockReturnValue(Date.now() + i);
        
        const sessionId = (window as any).generateSessionId();
        sessionIds.add(sessionId);
      }
      
      // All should be unique
      expect(sessionIds.size).toBe(100);
    });
  });

  describe('Session Persistence', () => {
    it('should persist persona selection in sessionStorage', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('selectedPersona', 'internet-random');
    });

    it('should persist custom persona text in sessionStorage', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      customPersonaTextarea.value = 'Write like a pirate';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('customPersona', 'Write like a pirate');
    });

    it('should restore persona selection on page load', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      // Set saved persona
      mockSessionStorage.storage['selectedPersona'] = 'super-nice';
      
      // Trigger restore
      (window as any).restoreSessionState();
      
      expect(personaSelect.value).toBe('super-nice');
    });

    it('should restore custom persona text on page load', () => {
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      const customPersonaCount = document.getElementById('customPersonaCount');
      
      // Set saved custom persona
      mockSessionStorage.storage['selectedPersona'] = 'custom';
      mockSessionStorage.storage['customPersona'] = 'Speak like Shakespeare';
      
      // Trigger restore
      (window as any).restoreSessionState();
      
      expect(customPersonaTextarea.value).toBe('Speak like Shakespeare');
      expect(customPersonaCount?.textContent).toBe('20');
    });

    it('should handle missing session data gracefully', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      // Clear session storage
      mockSessionStorage.storage = {};
      
      // Trigger restore
      (window as any).restoreSessionState();
      
      // Should maintain default empty selection
      expect(personaSelect.value).toBe('');
    });
  });

  describe('Session ID in API Requests', () => {
    it('should include session ID in preview requests', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      // Set session ID
      mockLocalStorage.storage['sessionId'] = 'test_session_123';
      
      messageTextarea.value = 'Test message';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          originalMessage: 'Test message',
          transformedMessage: 'transformed message',
          rateLimitRemaining: 9,
          rateLimitReset: Date.now() + 60000
        })
      });
      
      previewBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const headers = fetchCall[1].headers;
      
      expect(body.sessionId).toBe('test_session_123');
      expect(headers['X-Session-ID']).toBe('test_session_123');
    });

    it('should include session ID in submit requests', async () => {
      const feedbackForm = document.getElementById('feedbackForm') as HTMLFormElement;
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      
      // Set session ID
      mockLocalStorage.storage['sessionId'] = 'test_session_456';
      
      messageTextarea.value = 'Test feedback';
      
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
      const headers = fetchCall[1].headers;
      
      expect(body.sessionId).toBe('test_session_456');
      expect(headers['X-Session-ID']).toBe('test_session_456');
    });

    it('should include session ID in rate limit status requests', async () => {
      // Set session ID
      mockLocalStorage.storage['sessionId'] = 'test_session_789';
      
      (window.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          remaining: 8,
          reset: Date.now() + 60000
        })
      });
      
      // Trigger rate limit initialization
      await (window as any).initializeRateLimit();
      
      const fetchCall = (window.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      
      expect(headers['X-Session-ID']).toBe('test_session_789');
    });
  });

  describe('Session State Cleanup', () => {
    it('should clear session state when form is reset', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      
      // Set some session state
      personaSelect.value = 'internet-random';
      personaSelect.dispatchEvent(new Event('change'));
      
      customPersonaTextarea.value = 'Test persona';
      customPersonaTextarea.dispatchEvent(new Event('input'));
      
      // Reset form
      (window as any).resetForm();
      
      // Persona selection should not be cleared (by design)
      expect(personaSelect.value).toBe('internet-random');
      
      // But form fields should be cleared
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      expect(messageTextarea.value).toBe('');
    });

    it('should maintain session ID after form reset', () => {
      const originalSessionId = mockLocalStorage.storage['sessionId'];
      
      // Reset form
      (window as any).resetForm();
      
      // Session ID should remain unchanged
      expect(mockLocalStorage.storage['sessionId']).toBe(originalSessionId);
    });
  });

  describe('Cross-Tab Session Consistency', () => {
    it('should read session ID from localStorage on initialization', () => {
      mockLocalStorage.storage['sessionId'] = 'existing_session_cross_tab';
      
      // Simulate new tab loading
      const script = fs.readFileSync(
        path.resolve(__dirname, '../../src/static/script.js'),
        'utf-8'
      );
      
      const newScriptElement = document.createElement('script');
      newScriptElement.textContent = script;
      document.body.appendChild(newScriptElement);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('sessionId');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('sessionId', 'existing_session_cross_tab');
    });

    it('should handle localStorage corruption gracefully', () => {
      // Simulate corrupted localStorage
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('localStorage corrupted');
      });
      
      expect(() => {
        const script = fs.readFileSync(
          path.resolve(__dirname, '../../src/static/script.js'),
          'utf-8'
        );
        
        const scriptElement = document.createElement('script');
        scriptElement.textContent = script;
        document.body.appendChild(scriptElement);
      }).not.toThrow();
    });
  });

  describe('Session Data Types', () => {
    it('should handle various persona selection types', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      
      const testCases = ['', 'internet-random', 'barely-literate', 'extremely-serious', 'super-nice', 'custom'];
      
      testCases.forEach(persona => {
        personaSelect.value = persona;
        personaSelect.dispatchEvent(new Event('change'));
        
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith('selectedPersona', persona);
      });
    });

    it('should handle various custom persona text types', () => {
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      const testTexts = [
        '',
        'Simple text',
        'Text with "quotes"',
        'Text with\nnewlines',
        'Text with special chars: !@#$%^&*()',
        'Unicode text: 你好 🌍',
        'Very long text: ' + 'a'.repeat(500)
      ];
      
      testTexts.forEach(text => {
        customPersonaTextarea.value = text;
        customPersonaTextarea.dispatchEvent(new Event('input'));
        
        expect(mockSessionStorage.setItem).toHaveBeenCalledWith('customPersona', text);
      });
    });
  });

  describe('Session Lifecycle', () => {
    it('should initialize session on DOMContentLoaded', () => {
      const spy = vi.spyOn(window as any, 'restoreSessionState');
      
      // Trigger DOMContentLoaded
      document.dispatchEvent(new Event('DOMContentLoaded'));
      
      expect(spy).toHaveBeenCalled();
    });

    it('should handle session initialization errors', () => {
      // Mock sessionStorage to throw errors
      mockSessionStorage.getItem.mockImplementationOnce(() => {
        throw new Error('sessionStorage error');
      });
      
      expect(() => {
        (window as any).restoreSessionState();
      }).not.toThrow();
    });

    it('should preserve session across page refreshes', () => {
      // Set initial state
      mockLocalStorage.storage['sessionId'] = 'persistent_session';
      mockSessionStorage.storage['selectedPersona'] = 'super-nice';
      mockSessionStorage.storage['customPersona'] = 'Custom style';
      
      // Simulate page refresh by reloading script
      const script = fs.readFileSync(
        path.resolve(__dirname, '../../src/static/script.js'),
        'utf-8'
      );
      
      const scriptElement = document.createElement('script');
      scriptElement.textContent = script;
      document.body.appendChild(scriptElement);
      
      // Trigger restoration
      (window as any).restoreSessionState();
      
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      
      expect(personaSelect.value).toBe('super-nice');
      expect(customPersonaTextarea.value).toBe('Custom style');
    });
  });
});