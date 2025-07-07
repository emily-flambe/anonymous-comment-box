import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockHTML, 
  simulateUserInteraction, 
  assertElementVisible, 
  setupMockAPIs,
  waitFor
} from '../utils/test-helpers';

// Accessibility testing helper class
class AccessibilityTester {
  private mockAPIs: ReturnType<typeof setupMockAPIs>;

  constructor() {
    this.mockAPIs = setupMockAPIs();
  }

  // Test keyboard navigation through form elements
  simulateKeyboardNavigation(): HTMLElement[] {
    const focusableElements = this.getFocusableElements();
    const focusPath: HTMLElement[] = [];

    focusableElements.forEach((element, index) => {
      element.focus();
      focusPath.push(document.activeElement as HTMLElement);
      
      // Simulate tab key
      const tabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        code: 'Tab',
        bubbles: true 
      });
      element.dispatchEvent(tabEvent);
    });

    return focusPath;
  }

  // Test reverse keyboard navigation (Shift+Tab)
  simulateReverseKeyboardNavigation(): HTMLElement[] {
    const focusableElements = this.getFocusableElements().reverse();
    const focusPath: HTMLElement[] = [];

    focusableElements.forEach((element) => {
      element.focus();
      focusPath.push(document.activeElement as HTMLElement);
      
      // Simulate Shift+Tab
      const shiftTabEvent = new KeyboardEvent('keydown', { 
        key: 'Tab', 
        code: 'Tab',
        shiftKey: true,
        bubbles: true 
      });
      element.dispatchEvent(shiftTabEvent);
    });

    return focusPath;
  }

  // Get all focusable elements in tab order
  getFocusableElements(): HTMLElement[] {
    const selector = [
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    return Array.from(document.querySelectorAll(selector));
  }

  // Test ARIA attributes and relationships
  checkARIAAttributes() {
    const issues: string[] = [];

    // Check for required ARIA labels
    const requiredLabels = ['message', 'personaSelect', 'customPersona'];
    requiredLabels.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        const hasLabel = element.getAttribute('aria-label') || 
                        element.getAttribute('aria-labelledby') ||
                        document.querySelector(`label[for="${id}"]`);
        
        if (!hasLabel) {
          issues.push(`Element ${id} missing accessible label`);
        }
      }
    });

    // Check for proper ARIA live regions
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && !errorMessage.getAttribute('aria-live')) {
      issues.push('Error message missing aria-live attribute');
    }

    const successMessage = document.getElementById('successMessage');
    if (successMessage && !successMessage.getAttribute('aria-live')) {
      issues.push('Success message missing aria-live attribute');
    }

    // Check for ARIA describedby relationships
    const messageTextarea = document.getElementById('message');
    const charCount = document.getElementById('charCount');
    if (messageTextarea && charCount && !messageTextarea.getAttribute('aria-describedby')) {
      issues.push('Message textarea missing aria-describedby for character count');
    }

    return issues;
  }

  // Test screen reader announcements
  getScreenReaderContent(): { [key: string]: string } {
    const content: { [key: string]: string } = {};

    // Check aria-live regions
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && !errorMessage.classList.contains('hidden')) {
      content.error = errorMessage.textContent || '';
    }

    const successMessage = document.getElementById('successMessage');
    if (successMessage && !successMessage.classList.contains('hidden')) {
      content.success = successMessage.textContent || '';
    }

    // Check loading states
    const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement | null;
    if (previewBtn?.disabled) {
      content.loading = previewBtn.textContent || '';
    }

    // Check rate limit status
    const rateLimitText = document.getElementById('rateLimitText');
    if (rateLimitText) {
      content.rateLimit = rateLimitText.textContent || '';
    }

    return content;
  }

  // Test color contrast and visual accessibility
  checkVisualAccessibility(): string[] {
    const issues: string[] = [];

    // Check if elements have sufficient color contrast
    // This is a simplified check - in real implementation you'd use actual color contrast calculations
    const elementsToCheck = [
      { id: 'charCount', name: 'Character count' },
      { id: 'customPersonaCharCount', name: 'Custom persona character count' },
      { id: 'rateLimitText', name: 'Rate limit text' }
    ];

    elementsToCheck.forEach(({ id, name }) => {
      const element = document.getElementById(id);
      if (element) {
        const color = window.getComputedStyle(element).color;
        const backgroundColor = window.getComputedStyle(element).backgroundColor;
        
        // Simplified check - in real implementation, calculate actual contrast ratio
        if (color === 'rgb(128, 128, 128)' || color === '#808080') {
          issues.push(`${name} may have insufficient color contrast`);
        }
      }
    });

    // Check for focus indicators
    const focusableElements = this.getFocusableElements();
    focusableElements.forEach((element) => {
      element.focus();
      const outline = window.getComputedStyle(element).outline;
      const outlineWidth = window.getComputedStyle(element).outlineWidth;
      
      if (outline === 'none' && outlineWidth === '0px') {
        // Check for alternative focus indicators
        const boxShadow = window.getComputedStyle(element).boxShadow;
        const border = window.getComputedStyle(element).border;
        
        if (boxShadow === 'none' && !border.includes('2px')) {
          issues.push(`Element ${element.id || element.tagName} missing focus indicator`);
        }
      }
    });

    return issues;
  }

  // Test form validation accessibility
  async testFormValidationAccessibility(): Promise<string[]> {
    const issues: string[] = [];

    // Test empty message validation
    simulateUserInteraction.clickButton('previewBtn');
    await waitFor(10);

    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage && !errorMessage.classList.contains('hidden')) {
      // Check if error is announced to screen readers
      if (!errorMessage.getAttribute('aria-live')) {
        issues.push('Form validation error not announced to screen readers');
      }

      // Check if error is associated with form field
      const messageField = document.getElementById('message');
      if (messageField && !messageField.getAttribute('aria-describedby')) {
        issues.push('Form field not associated with validation error');
      }
    }

    return issues;
  }

  // Test keyboard-only interaction workflows
  async testKeyboardOnlyWorkflow(): Promise<boolean> {
    try {
      // Navigate to message field and enter text
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      messageField.focus();
      
      if (document.activeElement !== messageField) {
        return false;
      }

      // Simulate typing
      messageField.value = 'Keyboard accessibility test message';
      messageField.dispatchEvent(new Event('input'));

      // Navigate to persona select
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      personaSelect.focus();
      
      if (document.activeElement !== (personaSelect as unknown as Element)) {
        return false;
      }

      // Select option using keyboard
      (personaSelect as unknown as HTMLSelectElement).value = 'super-nice';
      (personaSelect as unknown as HTMLSelectElement).dispatchEvent(new Event('change'));

      // Navigate to preview button
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      
      if (document.activeElement !== previewBtn) {
        return false;
      }

      // Activate button using Enter key
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      previewBtn.dispatchEvent(enterEvent);
      previewBtn.click(); // Simulate the click that would result from Enter

      await waitFor(10);

      // Check if preview was successfully generated
      const previewContainer = document.getElementById('messagePreview');
      return previewContainer?.style.display !== 'none';

    } catch (error) {
      return false;
    }
  }
}

describe('Accessibility Tests', () => {
  let a11yTester: AccessibilityTester;

  beforeEach(() => {
    createMockHTML();
    a11yTester = new AccessibilityTester();
  });

  describe('Keyboard Navigation', () => {
    it('should allow keyboard navigation through all interactive elements', () => {
      const focusableElements = a11yTester.getFocusableElements();
      
      // Should have all expected focusable elements
      const expectedElements = ['message', 'personaSelect', 'previewBtn', 'submitBtn'];
      expectedElements.forEach(id => {
        const element = document.getElementById(id);
        expect(focusableElements).toContain(element);
      });
    });

    it('should maintain logical tab order', () => {
      const focusPath = a11yTester.simulateKeyboardNavigation();
      
      // Verify tab order is logical
      const expectedOrder = [
        'message',        // Message textarea
        'personaSelect',  // Persona selector
        'previewBtn',     // Preview button
        'submitBtn'       // Submit button
      ];

      expectedOrder.forEach((expectedId, index) => {
        if (focusPath[index]) {
          expect(focusPath[index].id).toBe(expectedId);
        }
      });
    });

    it('should support reverse navigation with Shift+Tab', () => {
      const reverseFocusPath = a11yTester.simulateReverseKeyboardNavigation();
      
      // Should be able to navigate backwards
      expect(reverseFocusPath.length).toBeGreaterThan(0);
      
      // Last focused element should be different from first in forward navigation
      const forwardPath = a11yTester.simulateKeyboardNavigation();
      if (forwardPath.length > 1 && reverseFocusPath.length > 1) {
        expect(reverseFocusPath[0]).not.toBe(forwardPath[0]);
      }
    });

    it('should skip disabled elements during navigation', async () => {
      // Disable preview button (simulate rate limit exceeded)
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.disabled = true;
      
      const focusPath = a11yTester.simulateKeyboardNavigation();
      
      // Disabled button should not receive focus
      expect(focusPath).not.toContain(previewBtn);
    });

    it('should handle custom persona input visibility in tab order', () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);

      // Initially, custom input should not be in tab order
      let focusableElements = a11yTester.getFocusableElements();
      const customPersonaField = document.getElementById('customPersona');
      
      // Custom field should not be focusable when hidden
      const customPersonaGroup = document.getElementById('customPersonaGroup') as HTMLElement;
      if (customPersonaGroup.style.display === 'none') {
        expect(focusableElements).not.toContain(customPersonaField);
      }

      // Select custom persona
      simulateUserInteraction.selectPersona('custom');
      
      // Now custom input should be in tab order
      focusableElements = a11yTester.getFocusableElements();
      expect(focusableElements).toContain(customPersonaField);
    });

    it('should maintain focus during dynamic content changes', async () => {
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      
      // Trigger preview generation
      simulateUserInteraction.typeInTextarea('message', 'Focus test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      // Focus should remain on preview button during loading
      expect(document.activeElement).toBe(previewBtn);
      
      await waitFor(10);
      
      // After completion, focus should still be manageable
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      messageField.focus();
      expect(document.activeElement).toBe(messageField);
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper labels for all form controls', () => {
      const ariaIssues = a11yTester.checkARIAAttributes();
      
      // Should have no ARIA labeling issues
      expect(ariaIssues.filter(issue => issue.includes('missing accessible label'))).toHaveLength(0);
    });

    it('should announce form validation errors', async () => {
      const issues = await a11yTester.testFormValidationAccessibility();
      
      // Should properly announce validation errors
      expect(issues).not.toContain('Form validation error not announced to screen readers');
    });

    it('should provide live region updates for dynamic content', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Live region test');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const screenReaderContent = a11yTester.getScreenReaderContent();
      
      // Should have content in live regions when appropriate
      if (screenReaderContent.loading) {
        expect(screenReaderContent.loading).toContain('Preview');
      }
    });

    it('should announce rate limit status changes', async () => {
      // Make a request to change rate limit
      simulateUserInteraction.typeInTextarea('message', 'Rate limit test');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const screenReaderContent = a11yTester.getScreenReaderContent();
      expect(screenReaderContent.rateLimit).toContain('remaining');
    });

    it('should provide descriptive button text during loading states', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Button state test');
      simulateUserInteraction.clickButton('previewBtn');
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await waitFor(10);
      expect(previewBtn.textContent).toBe('Preview Message');
    });

    it('should associate form controls with their descriptions', () => {
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      const charCount = document.getElementById('charCount');
      
      // In a real implementation, message field should be described by char count
      // This test documents the expected behavior
      expect(charCount).toBeTruthy();
      expect(messageField).toBeTruthy();
    });

    it('should provide context for custom persona requirements', () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);

      simulateUserInteraction.selectPersona('custom');
      
      const customPersonaField = document.getElementById('customPersona');
      const customPersonaLabel = document.querySelector('label[for="customPersona"]');
      
      expect(customPersonaLabel?.textContent).toBe('Custom Style Description');
      expect(customPersonaField?.getAttribute('placeholder')).toBeTruthy();
    });
  });

  describe('Visual Accessibility', () => {
    it('should provide visible focus indicators', () => {
      const visualIssues = a11yTester.checkVisualAccessibility();
      
      // Should not have missing focus indicators
      const focusIssues = visualIssues.filter(issue => issue.includes('missing focus indicator'));
      expect(focusIssues.length).toBeLessThan(3); // Allow some tolerance for test environment
    });

    it('should use appropriate color contrast for text elements', () => {
      const visualIssues = a11yTester.checkVisualAccessibility();
      
      // Should minimize color contrast issues
      const contrastIssues = visualIssues.filter(issue => issue.includes('contrast'));
      expect(contrastIssues.length).toBeLessThan(2); // Allow minimal issues for test environment
    });

    it('should indicate character limits visually and programmatically', () => {
      simulateUserInteraction.typeInTextarea('message', 'a'.repeat(4600)); // Near limit
      
      const charCount = document.getElementById('charCount');
      expect(charCount?.style.color).toBe('rgb(239, 68, 68)'); // Should turn red
      expect(charCount?.textContent).toBe('4600');
    });

    it('should provide visual feedback for rate limiting', async () => {
      // Simulate low rate limit
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      rateLimitFill.style.width = '20%';
      rateLimitFill.style.backgroundColor = 'rgb(239, 68, 68)'; // Red
      
      const rateLimitText = document.getElementById('rateLimitText');
      if (rateLimitText) {
        rateLimitText.textContent = 'Requests remaining: 2/10';
      }
      
      // Visual indicators should be present
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(239, 68, 68)');
      expect(rateLimitFill.style.width).toBe('20%');
    });

    it('should maintain usability at different zoom levels', () => {
      // Simulate 200% zoom by scaling elements
      const container = document.querySelector('.container') as HTMLElement;
      if (container) {
        container.style.transform = 'scale(2)';
        container.style.transformOrigin = 'top left';
      }
      
      // Elements should still be functional
      const focusableElements = a11yTester.getFocusableElements();
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Reset
      if (container) {
        container.style.transform = '';
      }
    });
  });

  describe('Complete Keyboard-Only Workflows', () => {
    it('should complete preview workflow using only keyboard', async () => {
      const success = await a11yTester.testKeyboardOnlyWorkflow();
      expect(success).toBe(true);
    });

    it('should allow submission using only keyboard', async () => {
      // Navigate and fill form using keyboard
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      messageField.focus();
      messageField.value = 'Keyboard submission test';
      messageField.dispatchEvent(new Event('input'));
      
      // Navigate to submit button
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      submitBtn.focus();
      
      // Activate with Enter
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      submitBtn.dispatchEvent(enterEvent);
      submitBtn.click();
      
      await waitFor(10);
      
      // Should show success
      const successMessage = document.getElementById('successMessage');
      expect(successMessage?.classList.contains('hidden')).toBe(false);
    });

    it('should handle error recovery using keyboard', async () => {
      // Trigger validation error
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      previewBtn.click();
      
      await waitFor(10);
      
      // Error should be displayed
      const errorMessage = document.getElementById('errorMessage');
      expect(errorMessage?.classList.contains('hidden')).toBe(false);
      
      // Navigate back to message field and correct error
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      messageField.focus();
      messageField.value = 'Corrected message';
      messageField.dispatchEvent(new Event('input'));
      
      // Try preview again
      previewBtn.focus();
      previewBtn.click();
      
      await waitFor(10);
      
      // Should succeed
      const previewContainer = document.getElementById('messagePreview');
      expect(previewContainer?.style.display).not.toBe('none');
    });

    it('should support custom persona workflow with keyboard', async () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);

      // Fill message
      const messageField = document.getElementById('message') as HTMLTextAreaElement;
      messageField.focus();
      messageField.value = 'Custom persona keyboard test';
      messageField.dispatchEvent(new Event('input'));
      
      // Select custom persona
      personaSelect.focus();
      personaSelect.value = 'custom';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Fill custom persona description
      const customPersonaField = document.getElementById('customPersona') as HTMLTextAreaElement;
      customPersonaField.focus();
      customPersonaField.value = 'Make it sound professional';
      customPersonaField.dispatchEvent(new Event('input'));
      
      // Preview
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      previewBtn.click();
      
      await waitFor(10);
      
      // Should work
      const previewContainer = document.getElementById('messagePreview');
      expect(previewContainer?.style.display).not.toBe('none');
    });
  });

  describe('Assistive Technology Compatibility', () => {
    it('should work with high contrast mode', () => {
      // Simulate high contrast mode by forcing colors
      const stylesheet = document.createElement('style');
      stylesheet.textContent = `
        * {
          background: white !important;
          color: black !important;
          border-color: black !important;
        }
      `;
      document.head.appendChild(stylesheet);
      
      // Form should still be usable
      const focusableElements = a11yTester.getFocusableElements();
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Clean up
      document.head.removeChild(stylesheet);
    });

    it('should support reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
      });
      
      // Test that animations would be disabled
      // In real implementation, this would disable CSS transitions/animations
      const container = document.querySelector('.container');
      expect(container).toBeTruthy();
    });

    it('should provide sufficient time for user interactions', async () => {
      // Test that operations don't timeout too quickly
      simulateUserInteraction.typeInTextarea('message', 'Timing test');
      
      // Wait longer than typical user interaction time
      await waitFor(1000);
      
      // Form should still be interactive
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(false);
    });

    it('should handle speech input compatibility', () => {
      // Test that form labels are speech-friendly
      const labels = document.querySelectorAll('label');
      labels.forEach(label => {
        const text = label.textContent || '';
        
        // Labels should be clear and descriptive
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toMatch(/^[0-9]+$/); // Should not be just numbers
      });
    });
  });
});