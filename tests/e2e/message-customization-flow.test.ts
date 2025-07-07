import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockHTML, 
  simulateUserInteraction, 
  assertElementVisible, 
  assertElementHidden,
  assertRateLimitDisplay,
  createMockPreviewResponse,
  createMockRateLimitStatus,
  setupMockAPIs,
  simulateAPIError,
  simulateRateLimitError,
  waitFor,
  MOCK_PERSONA_OPTIONS
} from '../utils/test-helpers';

// E2E test helper to simulate complete user journeys
class MessageCustomizationE2E {
  private mockAPIs: ReturnType<typeof setupMockAPIs>;

  constructor() {
    this.mockAPIs = setupMockAPIs();
  }

  async simulateCompletePreviewFlow(
    message: string, 
    persona: string = 'none', 
    customPersona?: string
  ) {
    // User types message
    simulateUserInteraction.typeInTextarea('message', message);
    
    // User selects persona
    if (persona !== 'none') {
      simulateUserInteraction.selectPersona(persona);
    }
    
    // User enters custom persona if needed
    if (customPersona) {
      simulateUserInteraction.typeInTextarea('customPersona', customPersona);
    }
    
    // User clicks preview
    simulateUserInteraction.clickButton('previewBtn');
    
    // Wait for API response
    await waitFor(10);
    
    return this.getFormState();
  }

  async simulateCompleteSubmissionFlow(
    message: string, 
    persona: string = 'none', 
    customPersona?: string,
    shouldPreviewFirst: boolean = false
  ) {
    // Optionally preview first
    if (shouldPreviewFirst) {
      await this.simulateCompletePreviewFlow(message, persona, customPersona);
    } else {
      // Just set up the form
      simulateUserInteraction.typeInTextarea('message', message);
      if (persona !== 'none') {
        simulateUserInteraction.selectPersona(persona);
      }
      if (customPersona) {
        simulateUserInteraction.typeInTextarea('customPersona', customPersona);
      }
    }
    
    // User submits
    simulateUserInteraction.clickButton('submitBtn');
    
    // Wait for submission
    await waitFor(10);
    
    return this.getFormState();
  }

  getFormState() {
    const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
    const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
    const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
    const previewContainer = document.getElementById('messagePreview') as HTMLElement;
    const successMessage = document.getElementById('successMessage') as HTMLElement;
    const errorMessage = document.getElementById('errorMessage') as HTMLElement;
    const rateLimitText = document.getElementById('rateLimitText') as HTMLElement;

    return {
      message: messageTextarea?.value || '',
      selectedPersona: personaSelect?.value || 'none',
      customPersona: customPersonaTextarea?.value || '',
      isPreviewVisible: previewContainer?.style.display !== 'none',
      isSuccessVisible: !successMessage?.classList.contains('hidden'),
      isErrorVisible: !errorMessage?.classList.contains('hidden'),
      rateLimitText: rateLimitText?.textContent || '',
      errorText: document.getElementById('errorText')?.textContent || '',
    };
  }

  setupRateLimit(remaining: number) {
    // Mock API to return specific rate limit
    this.mockAPIs.mockRateLimitStatus.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ remaining, reset: Date.now() + 60000, limit: 10 })
    });
    
    // Update preview/submit responses to reflect rate limit
    this.mockAPIs.mockPreviewSuccess.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        ...createMockPreviewResponse(),
        rateLimitRemaining: Math.max(0, remaining - 1)
      })
    });
  }

  simulateNetworkError() {
    this.mockAPIs.mockPreviewSuccess.mockRejectedValue(new Error('Network error'));
    this.mockAPIs.mockSubmitSuccess.mockRejectedValue(new Error('Network error'));
  }

  resetAPIs() {
    this.mockAPIs = setupMockAPIs();
  }
}

describe('Message Customization E2E Flow Tests', () => {
  let e2e: MessageCustomizationE2E;

  beforeEach(() => {
    createMockHTML();
    e2e = new MessageCustomizationE2E();
  });

  describe('Complete Preview Flow', () => {
    it('should complete full preview flow with preset persona', async () => {
      const result = await e2e.simulateCompletePreviewFlow(
        'This is my test feedback message',
        'internet-random'
      );

      expect(result.message).toBe('This is my test feedback message');
      expect(result.selectedPersona).toBe('internet-random');
      expect(result.isPreviewVisible).toBe(true);
      expect(result.rateLimitText).toBe('Requests remaining: 9/10');

      // Verify preview content
      const originalMessageText = document.getElementById('originalMessageText');
      const transformedMessageText = document.getElementById('transformedMessageText');
      
      expect(originalMessageText?.textContent).toBe('This is my test feedback message');
      expect(transformedMessageText?.textContent).toContain('This is my test feedback message');
    });

    it('should complete full preview flow with custom persona', async () => {
      // Add custom option to select
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);

      const result = await e2e.simulateCompletePreviewFlow(
        'Please make this sound professional',
        'custom',
        'Transform this to sound like a formal business proposal'
      );

      expect(result.selectedPersona).toBe('custom');
      expect(result.customPersona).toBe('Transform this to sound like a formal business proposal');
      expect(result.isPreviewVisible).toBe(true);
      
      // Custom persona input should be visible
      assertElementVisible('customPersonaGroup');
    });

    it('should show persona descriptions when selecting different options', async () => {
      const descriptionElement = document.getElementById('personaDescription');
      
      // Test each persona option
      for (const option of MOCK_PERSONA_OPTIONS) {
        simulateUserInteraction.selectPersona(option.key);
        expect(descriptionElement?.textContent).toBe(option.description);
      }
    });

    it('should clear preview when form inputs change', async () => {
      // First generate a preview
      await e2e.simulateCompletePreviewFlow('Original message', 'super-nice');
      
      let state = e2e.getFormState();
      expect(state.isPreviewVisible).toBe(true);
      
      // Change message - should clear preview
      simulateUserInteraction.typeInTextarea('message', 'Changed message');
      
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      expect(previewContainer.style.display).toBe('none');
      
      // Change persona - should also clear any existing preview
      await e2e.simulateCompletePreviewFlow('Another message', 'internet-random');
      simulateUserInteraction.selectPersona('extremely-serious');
      
      expect(previewContainer.style.display).toBe('none');
    });

    it('should handle preview errors gracefully', async () => {
      e2e.simulateNetworkError();
      
      const result = await e2e.simulateCompletePreviewFlow(
        'This will fail',
        'internet-random'
      );

      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toBe('Network error');
      expect(result.isPreviewVisible).toBe(false);
    });
  });

  describe('Complete Submission Flow', () => {
    it('should complete submission without preview', async () => {
      const result = await e2e.simulateCompleteSubmissionFlow(
        'Direct submission message',
        'super-nice',
        undefined,
        false
      );

      expect(result.isSuccessVisible).toBe(true);
      expect(result.isErrorVisible).toBe(false);
      
      // Form should be hidden on success
      const form = document.getElementById('feedbackForm') as HTMLElement;
      expect(form.style.display).toBe('none');
    });

    it('should complete preview-then-submit flow', async () => {
      const result = await e2e.simulateCompleteSubmissionFlow(
        'Preview then submit message',
        'extremely-serious',
        undefined,
        true
      );

      expect(result.isSuccessVisible).toBe(true);
      expect(result.rateLimitText).toBe('Requests remaining: 8/10'); // Both preview and submit consumed
    });

    it('should submit with custom persona after preview', async () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);

      const result = await e2e.simulateCompleteSubmissionFlow(
        'Custom persona submission',
        'custom',
        'Make this sound like a friendly email',
        true
      );

      expect(result.isSuccessVisible).toBe(true);
      expect(result.selectedPersona).toBe('custom');
      expect(result.customPersona).toBe('Make this sound like a friendly email');
    });

    it('should handle submission errors gracefully', async () => {
      e2e.simulateNetworkError();
      
      const result = await e2e.simulateCompleteSubmissionFlow(
        'This submission will fail',
        'none'
      );

      expect(result.isErrorVisible).toBe(true);
      expect(result.isSuccessVisible).toBe(false);
      expect(result.errorText).toBe('Network error');
      
      // Form should still be visible on error
      const form = document.getElementById('feedbackForm') as HTMLElement;
      expect(form.style.display).not.toBe('none');
    });
  });

  describe('Rate Limiting User Experience', () => {
    it('should track rate limit through multiple preview operations', async () => {
      e2e.setupRateLimit(10);
      
      // Make multiple preview requests
      for (let i = 0; i < 3; i++) {
        await e2e.simulateCompletePreviewFlow(
          `Message ${i + 1}`,
          'internet-random'
        );
        
        // Each should consume rate limit
        const expectedRemaining = 10 - (i + 1);
        assertRateLimitDisplay(expectedRemaining, 10);
      }
    });

    it('should prevent operations when rate limit is exhausted', async () => {
      e2e.setupRateLimit(0); // No remaining requests
      
      const result = await e2e.simulateCompletePreviewFlow(
        'This should be blocked',
        'super-nice'
      );

      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
      expect(result.isPreviewVisible).toBe(false);
      
      // Buttons should be disabled
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
    });

    it('should show rate limit warnings when approaching limit', async () => {
      e2e.setupRateLimit(2); // Only 2 requests remaining
      
      await e2e.simulateCompletePreviewFlow(
        'Warning test message',
        'barely-literate'
      );
      
      // Should show warning
      const warningElement = document.getElementById('rateLimitWarning');
      expect(warningElement?.style.display).toBe('block');
      expect(warningElement?.textContent).toContain('Only 1 requests remaining');
      
      // Rate limit bar should be red
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(239, 68, 68)'); // Red
    });

    it('should handle mixed success/rate-limit scenarios', async () => {
      e2e.setupRateLimit(1); // Only 1 request remaining
      
      // First operation should succeed
      let result = await e2e.simulateCompletePreviewFlow(
        'First message',
        'internet-random'
      );
      expect(result.isPreviewVisible).toBe(true);
      
      // Second operation should be rate limited
      result = await e2e.simulateCompletePreviewFlow(
        'Second message',
        'super-nice'
      );
      expect(result.isErrorVisible).toBe(true);
      expect(result.errorText).toContain('Rate limit exceeded');
    });
  });

  describe('Custom Persona Workflows', () => {
    beforeEach(() => {
      // Add custom option to all tests in this group
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
    });

    it('should complete custom persona workflow with validation', async () => {
      // Start with custom persona selected but no description
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.selectPersona('custom');
      
      // Should show custom input
      assertElementVisible('customPersonaGroup');
      
      // Try preview without custom description - should fail
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      let state = e2e.getFormState();
      expect(state.isErrorVisible).toBe(true);
      expect(state.errorText).toContain('Custom persona description is required');
      
      // Add custom description and try again
      simulateUserInteraction.typeInTextarea('customPersona', 'Make it sound like Shakespeare');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      state = e2e.getFormState();
      expect(state.isPreviewVisible).toBe(true);
      expect(state.isErrorVisible).toBe(false);
    });

    it('should enforce custom persona character limits', async () => {
      const longCustomPersona = 'a'.repeat(501); // Over 500 character limit
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.selectPersona('custom');
      simulateUserInteraction.typeInTextarea('customPersona', longCustomPersona);
      
      // Character count should show over limit
      const charCount = document.getElementById('customPersonaCharCount');
      expect(charCount?.textContent).toBe('501');
      expect(charCount?.style.color).toBe('rgb(239, 68, 68)'); // Red
      
      // Preview should fail
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const state = e2e.getFormState();
      expect(state.isErrorVisible).toBe(true);
      expect(state.errorText).toContain('Custom persona description too long');
    });

    it('should switch between custom and preset personas seamlessly', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Persona switching test');
      
      // Start with custom
      simulateUserInteraction.selectPersona('custom');
      assertElementVisible('customPersonaGroup');
      simulateUserInteraction.typeInTextarea('customPersona', 'Custom description');
      
      // Switch to preset
      simulateUserInteraction.selectPersona('internet-random');
      assertElementHidden('customPersonaGroup');
      
      // Custom text should be preserved (for user convenience)
      const customTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      expect(customTextarea.value).toBe('Custom description');
      
      // Switch back to custom
      simulateUserInteraction.selectPersona('custom');
      assertElementVisible('customPersonaGroup');
      expect(customTextarea.value).toBe('Custom description');
    });

    it('should handle very long custom persona descriptions gracefully', async () => {
      const maxLengthPersona = 'a'.repeat(500); // Exactly at limit
      
      const result = await e2e.simulateCompletePreviewFlow(
        'Test with max length custom persona',
        'custom',
        maxLengthPersona
      );

      expect(result.isPreviewVisible).toBe(true);
      expect(result.isErrorVisible).toBe(false);
      expect(result.customPersona).toBe(maxLengthPersona);
    });
  });

  describe('Error Recovery Flows', () => {
    it('should allow retry after preview error', async () => {
      // First attempt fails
      e2e.simulateNetworkError();
      
      let result = await e2e.simulateCompletePreviewFlow(
        'This will fail first',
        'super-nice'
      );
      
      expect(result.isErrorVisible).toBe(true);
      expect(result.isPreviewVisible).toBe(false);
      
      // Fix the error and retry
      e2e.resetAPIs();
      
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      result = e2e.getFormState();
      expect(result.isPreviewVisible).toBe(true);
      expect(result.isErrorVisible).toBe(false);
    });

    it('should allow retry after submission error', async () => {
      // Preview succeeds, submission fails
      await e2e.simulateCompletePreviewFlow('Test message', 'internet-random');
      
      e2e.simulateNetworkError();
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      let state = e2e.getFormState();
      expect(state.isErrorVisible).toBe(true);
      expect(state.isSuccessVisible).toBe(false);
      expect(state.isPreviewVisible).toBe(true); // Preview should still be visible
      
      // Fix error and retry
      e2e.resetAPIs();
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      state = e2e.getFormState();
      expect(state.isSuccessVisible).toBe(true);
      expect(state.isErrorVisible).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      // Preview succeeds but rate limit is hit on submission
      await e2e.simulateCompletePreviewFlow('Test message', 'super-nice');
      
      // Mock rate limit error for submission
      simulateRateLimitError();
      
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      const state = e2e.getFormState();
      expect(state.isErrorVisible).toBe(true);
      expect(state.errorText).toContain('Rate limit exceeded');
      expect(state.isPreviewVisible).toBe(true); // Preview should remain
    });

    it('should clear errors when starting new operations', async () => {
      // Generate an error
      e2e.simulateNetworkError();
      await e2e.simulateCompletePreviewFlow('Error message', 'none');
      
      let state = e2e.getFormState();
      expect(state.isErrorVisible).toBe(true);
      
      // Fix API and start new operation
      e2e.resetAPIs();
      simulateUserInteraction.typeInTextarea('message', 'New message');
      simulateUserInteraction.clickButton('previewBtn');
      
      // Error should be cleared when starting new operation
      const errorMessage = document.getElementById('errorMessage');
      expect(errorMessage?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Form Reset and State Management', () => {
    it('should reset form after successful submission', async () => {
      await e2e.simulateCompleteSubmissionFlow(
        'Message for reset test',
        'extremely-serious',
        undefined,
        true
      );
      
      // Should show success
      let state = e2e.getFormState();
      expect(state.isSuccessVisible).toBe(true);
      
      // Click reset button
      const resetBtn = document.querySelector('.reset-btn') as HTMLButtonElement;
      resetBtn?.click();
      
      // Form should be reset and visible
      const form = document.getElementById('feedbackForm') as HTMLElement;
      expect(form.style.display).toBe('block');
      
      state = e2e.getFormState();
      expect(state.message).toBe('');
      expect(state.selectedPersona).toBe('none');
      expect(state.customPersona).toBe('');
      expect(state.isSuccessVisible).toBe(false);
      expect(state.isPreviewVisible).toBe(false);
    });

    it('should maintain consistent state throughout complex interactions', async () => {
      // Complex interaction sequence
      simulateUserInteraction.typeInTextarea('message', 'First message');
      simulateUserInteraction.selectPersona('internet-random');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Change message and persona
      simulateUserInteraction.typeInTextarea('message', 'Updated message');
      simulateUserInteraction.selectPersona('super-nice');
      
      // Preview again
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Submit
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      const state = e2e.getFormState();
      expect(state.isSuccessVisible).toBe(true);
      
      // Rate limit should reflect both operations (2 previews + 1 submit = 3 total)
      expect(state.rateLimitText).toBe('Requests remaining: 7/10');
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should maintain proper focus flow through the form', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as unknown as HTMLSelectElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
      
      // Test tab order
      messageTextarea.focus();
      expect(document.activeElement).toBe(messageTextarea);
      
      personaSelect.focus();
      expect(document.activeElement).toBe(personaSelect);
      
      previewBtn.focus();
      expect(document.activeElement).toBe(previewBtn);
      
      submitBtn.focus();
      expect(document.activeElement).toBe(submitBtn);
    });

    it('should provide loading feedback during operations', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Loading test');
      simulateUserInteraction.clickButton('previewBtn');
      
      // Should show loading state immediately
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      await waitFor(10);
      
      // Should return to normal state
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Message');
    });

    it('should handle keyboard interactions properly', async () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      
      // Type message
      messageTextarea.focus();
      messageTextarea.value = 'Keyboard test message';
      messageTextarea.dispatchEvent(new Event('input'));
      
      // Use keyboard to trigger preview (Enter on button)
      previewBtn.focus();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      previewBtn.dispatchEvent(enterEvent);
      previewBtn.click(); // Simulate the click that would result from Enter
      
      await waitFor(10);
      
      const state = e2e.getFormState();
      expect(state.isPreviewVisible).toBe(true);
    });

    it('should provide clear visual feedback for rate limiting', async () => {
      e2e.setupRateLimit(2); // Low remaining count
      
      await e2e.simulateCompletePreviewFlow('Rate limit visual test', 'none');
      
      // Rate limit bar should be red and warning should be visible
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      const rateLimitWarning = document.getElementById('rateLimitWarning');
      
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(239, 68, 68)');
      expect(rateLimitWarning?.style.display).toBe('block');
      
      // When completely exhausted, buttons should be disabled
      e2e.setupRateLimit(0);
      simulateUserInteraction.clickButton('previewBtn');
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
    });
  });
});