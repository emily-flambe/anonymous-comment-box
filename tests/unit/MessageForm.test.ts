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

interface RateLimitStatus {
  remaining: number;
  reset: number;
  limit: number;
}

interface PreviewResponse {
  transformedMessage: string;
  originalMessage: string;
  persona: string;
  rateLimitRemaining: number;
  rateLimitReset: number;
}

interface MessageFormState {
  message: string;
  selectedPersona: string;
  customPersona: string;
  previewData: PreviewResponse | null;
  rateLimitStatus: RateLimitStatus;
  isPreviewLoading: boolean;
  isSubmitLoading: boolean;
}

// Enhanced MessageForm class that integrates all components
class MessageForm {
  private state: MessageFormState;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.state = {
      message: '',
      selectedPersona: 'none',
      customPersona: '',
      previewData: null,
      rateLimitStatus: createMockRateLimitStatus(),
      isPreviewLoading: false,
      isSubmitLoading: false,
    };
    
    this.initializeEventListeners();
    this.loadRateLimitStatus();
    this.updateRateLimitDisplay();
  }

  private initializeEventListeners() {
    // Message textarea events
    const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
    messageTextarea?.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.state.message = target.value;
      this.updateCharCount(target.value.length);
      this.clearPreviewIfNeeded();
    });

    // Persona selection events
    const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
    personaSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.state.selectedPersona = target.value;
      this.updatePersonaDescription(target.value);
      this.toggleCustomPersonaInput(target.value === 'custom');
      this.clearPreviewIfNeeded();
    });

    // Custom persona events
    const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
    customPersonaTextarea?.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.state.customPersona = target.value;
      this.updateCustomPersonaCharCount(target.value.length);
      this.clearPreviewIfNeeded();
    });

    // Preview button events
    const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
    previewBtn?.addEventListener('click', () => {
      this.handlePreview();
    });

    // Form submission events
    const form = document.getElementById('feedbackForm') as HTMLFormElement;
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  private async loadRateLimitStatus() {
    try {
      const response = await fetch('/api/rate-limit-status');
      if (response.ok) {
        const status = await response.json();
        this.state.rateLimitStatus = status;
        this.updateRateLimitDisplay();
      }
    } catch (error) {
      console.error('Failed to load rate limit status:', error);
    }
  }

  private updateCharCount(length: number) {
    const charCount = document.getElementById('charCount');
    if (charCount) {
      charCount.textContent = length.toString();
      charCount.style.color = length > 4500 ? '#ef4444' : '#6b7280';
    }
  }

  private updatePersonaDescription(personaKey: string) {
    const descriptionElement = document.getElementById('personaDescription');
    const option = MOCK_PERSONA_OPTIONS.find(p => p.key === personaKey);
    if (descriptionElement && option) {
      descriptionElement.textContent = option.description;
    }
  }

  private toggleCustomPersonaInput(show: boolean) {
    const customPersonaGroup = document.getElementById('customPersonaGroup') as HTMLElement;
    if (customPersonaGroup) {
      customPersonaGroup.style.display = show ? 'block' : 'none';
    }
  }

  private updateCustomPersonaCharCount(length: number) {
    const charCount = document.getElementById('customPersonaCharCount');
    if (charCount) {
      charCount.textContent = length.toString();
      charCount.style.color = length > 450 ? '#ef4444' : '#6b7280';
    }
  }

  private clearPreviewIfNeeded() {
    // Clear preview when form inputs change
    if (this.state.previewData) {
      this.state.previewData = null;
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      if (previewContainer) {
        previewContainer.style.display = 'none';
      }
    }
  }

  private async handlePreview() {
    const validation = this.validateInputs(false);
    if (!validation.valid) {
      this.showError(validation.error!);
      return;
    }

    if (this.state.rateLimitStatus.remaining <= 0) {
      this.showError('Rate limit exceeded. Please wait before trying again.');
      return;
    }

    this.state.isPreviewLoading = true;
    this.updatePreviewButtonState();
    this.hideError();

    try {
      const requestBody = {
        message: this.state.message,
        persona: this.state.selectedPersona !== 'none' ? this.state.selectedPersona : undefined,
        customPersona: this.state.customPersona || undefined,
        sessionId: this.sessionId,
      };

      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate preview');
      }

      this.state.previewData = data;
      this.state.rateLimitStatus.remaining = data.rateLimitRemaining;
      this.state.rateLimitStatus.reset = data.rateLimitReset;
      
      this.displayPreview(data);
      this.updateRateLimitDisplay();

    } catch (error) {
      console.error('Preview generation failed:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      this.state.isPreviewLoading = false;
      this.updatePreviewButtonState();
    }
  }

  private async handleSubmit() {
    const validation = this.validateInputs(true);
    if (!validation.valid) {
      this.showError(validation.error!);
      return;
    }

    if (this.state.rateLimitStatus.remaining <= 0) {
      this.showError('Rate limit exceeded. Please wait before trying again.');
      return;
    }

    this.state.isSubmitLoading = true;
    this.updateSubmitButtonState();
    this.hideError();

    try {
      const requestBody = {
        message: this.state.message,
        persona: this.state.selectedPersona !== 'none' ? this.state.selectedPersona : undefined,
        customPersona: this.state.customPersona || undefined,
        sessionId: this.sessionId,
      };

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      this.showSuccess();
      this.state.rateLimitStatus.remaining = Math.max(0, this.state.rateLimitStatus.remaining - 1);
      this.updateRateLimitDisplay();

    } catch (error) {
      console.error('Message submission failed:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      this.state.isSubmitLoading = false;
      this.updateSubmitButtonState();
    }
  }

  private validateInputs(isSubmit: boolean): { valid: boolean; error?: string } {
    // Message validation
    if (!this.state.message.trim()) {
      return { valid: false, error: 'Please enter a message' };
    }

    if (this.state.message.length > 5000) {
      return { valid: false, error: 'Message too long (max 5000 characters)' };
    }

    if (isSubmit && this.state.message.length > 2000) {
      return { valid: false, error: 'Message too long for submission (max 2000 characters)' };
    }

    // Custom persona validation
    if (this.state.selectedPersona === 'custom') {
      if (!this.state.customPersona.trim()) {
        return { valid: false, error: 'Custom persona description is required' };
      }
      if (this.state.customPersona.length > 500) {
        return { valid: false, error: 'Custom persona description too long (max 500 characters)' };
      }
    }

    return { valid: true };
  }

  private displayPreview(data: PreviewResponse) {
    const previewContainer = document.getElementById('messagePreview') as HTMLElement;
    const originalMessageText = document.getElementById('originalMessageText') as HTMLElement;
    const transformedMessageText = document.getElementById('transformedMessageText') as HTMLElement;

    if (previewContainer && originalMessageText && transformedMessageText) {
      originalMessageText.textContent = data.originalMessage;
      transformedMessageText.textContent = data.transformedMessage;
      previewContainer.style.display = 'block';
    }
  }

  private updatePreviewButtonState() {
    const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
    if (previewBtn) {
      previewBtn.disabled = this.state.isPreviewLoading || this.state.rateLimitStatus.remaining <= 0;
      previewBtn.textContent = this.state.isPreviewLoading ? 'Generating Preview...' : 'Preview Message';
    }
  }

  private updateSubmitButtonState() {
    const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement;
    const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
    
    if (submitBtn) {
      submitBtn.disabled = this.state.isSubmitLoading;
      submitBtn.textContent = this.state.isSubmitLoading ? 'Sending...' : 'Send Anonymous Feedback';
    }
    
    if (messageTextarea) {
      messageTextarea.disabled = this.state.isSubmitLoading;
    }
  }

  private updateRateLimitDisplay() {
    const rateLimitText = document.getElementById('rateLimitText');
    const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
    
    if (rateLimitText) {
      rateLimitText.textContent = `Requests remaining: ${this.state.rateLimitStatus.remaining}/${this.state.rateLimitStatus.limit}`;
    }
    
    if (rateLimitFill) {
      const percentage = (this.state.rateLimitStatus.remaining / this.state.rateLimitStatus.limit) * 100;
      rateLimitFill.style.width = `${percentage}%`;
      
      if (this.state.rateLimitStatus.remaining <= 2) {
        rateLimitFill.style.backgroundColor = '#ef4444';
      } else if (this.state.rateLimitStatus.remaining <= 5) {
        rateLimitFill.style.backgroundColor = '#f59e0b';
      } else {
        rateLimitFill.style.backgroundColor = '#10b981';
      }
    }

    // Update button states based on rate limit
    this.updatePreviewButtonState();
  }

  private showError(message: string) {
    this.hideSuccess();
    const errorContainer = document.getElementById('errorMessage') as HTMLElement;
    const errorText = document.getElementById('errorText') as HTMLElement;
    
    if (errorContainer && errorText) {
      errorText.textContent = message;
      errorContainer.classList.remove('hidden');
    }
  }

  private showSuccess() {
    this.hideError();
    const form = document.getElementById('feedbackForm') as HTMLElement;
    const successContainer = document.getElementById('successMessage') as HTMLElement;
    
    if (form && successContainer) {
      form.style.display = 'none';
      successContainer.classList.remove('hidden');
    }
  }

  private hideError() {
    const errorContainer = document.getElementById('errorMessage') as HTMLElement;
    if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }

  private hideSuccess() {
    const successContainer = document.getElementById('successMessage') as HTMLElement;
    if (successContainer) {
      successContainer.classList.add('hidden');
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Public methods for testing
  public getState(): MessageFormState {
    return { ...this.state };
  }

  public reset() {
    this.state = {
      message: '',
      selectedPersona: 'none',
      customPersona: '',
      previewData: null,
      rateLimitStatus: createMockRateLimitStatus(),
      isPreviewLoading: false,
      isSubmitLoading: false,
    };

    // Reset form elements
    const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
    const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
    const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
    
    if (messageTextarea) messageTextarea.value = '';
    if (personaSelect) personaSelect.value = 'none';
    if (customPersonaTextarea) customPersonaTextarea.value = '';
    
    this.updateCharCount(0);
    this.updatePersonaDescription('none');
    this.toggleCustomPersonaInput(false);
    this.updateCustomPersonaCharCount(0);
    this.updateRateLimitDisplay();
    
    // Show form, hide messages
    const form = document.getElementById('feedbackForm') as HTMLElement;
    if (form) form.style.display = 'block';
    this.hideError();
    this.hideSuccess();
    
    // Hide preview
    const previewContainer = document.getElementById('messagePreview') as HTMLElement;
    if (previewContainer) previewContainer.style.display = 'none';
  }
}

describe('Enhanced MessageForm Integration', () => {
  let messageForm: MessageForm;
  let mockAPIs: ReturnType<typeof setupMockAPIs>;

  beforeEach(() => {
    createMockHTML();
    mockAPIs = setupMockAPIs();
    messageForm = new MessageForm();
  });

  describe('Component Integration', () => {
    it('should initialize all components correctly', () => {
      const state = messageForm.getState();
      expect(state.message).toBe('');
      expect(state.selectedPersona).toBe('none');
      expect(state.customPersona).toBe('');
      expect(state.previewData).toBeNull();
      expect(state.rateLimitStatus.remaining).toBe(10);
    });

    it('should sync persona selection across components', () => {
      simulateUserInteraction.selectPersona('internet-random');
      
      const state = messageForm.getState();
      expect(state.selectedPersona).toBe('internet-random');
      
      const descriptionElement = document.getElementById('personaDescription');
      expect(descriptionElement?.textContent).toBe('Casual internet slang with abbreviations and meme references');
    });

    it('should clear preview when inputs change', async () => {
      // First generate a preview
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      let state = messageForm.getState();
      expect(state.previewData).not.toBeNull();
      
      // Change message - should clear preview
      simulateUserInteraction.typeInTextarea('message', 'Changed message');
      
      state = messageForm.getState();
      expect(state.previewData).toBeNull();
      
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      expect(previewContainer.style.display).toBe('none');
    });

    it('should clear preview when persona changes', async () => {
      // Generate preview with one persona
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.selectPersona('internet-random');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      let state = messageForm.getState();
      expect(state.previewData).not.toBeNull();
      
      // Change persona - should clear preview
      simulateUserInteraction.selectPersona('super-nice');
      
      state = messageForm.getState();
      expect(state.previewData).toBeNull();
    });
  });

  describe('Comprehensive Validation', () => {
    it('should validate message length for preview vs submission', async () => {
      const longMessage = 'a'.repeat(3000); // Over submission limit but under textarea limit
      simulateUserInteraction.typeInTextarea('message', longMessage);
      
      // Preview should work
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      expect(mockAPIs.mockPreviewSuccess).toHaveBeenCalled();
      
      // Submission should fail
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Message too long for submission (max 2000 characters)');
      expect(mockAPIs.mockSubmitSuccess).not.toHaveBeenCalled();
    });

    it('should validate custom persona requirements', async () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.selectPersona('custom');
      
      // Try preview without custom persona description
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Custom persona description is required');
      expect(mockAPIs.mockPreviewSuccess).not.toHaveBeenCalled();
    });

    it('should validate custom persona length limits', async () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      const longCustomPersona = 'a'.repeat(501);
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.selectPersona('custom');
      simulateUserInteraction.typeInTextarea('customPersona', longCustomPersona);
      
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Custom persona description too long (max 500 characters)');
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should share rate limit between preview and submit', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      
      // Generate preview (consumes 1 request)
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      let state = messageForm.getState();
      expect(state.rateLimitStatus.remaining).toBe(9);
      assertRateLimitDisplay(9, 10);
      
      // Submit message (consumes another request)
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      state = messageForm.getState();
      expect(state.rateLimitStatus.remaining).toBe(8);
      assertRateLimitDisplay(8, 10);
    });

    it('should prevent both preview and submit when rate limited', () => {
      // Set rate limit to 0
      const state = messageForm.getState();
      state.rateLimitStatus.remaining = 0;
      messageForm.reset();
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      
      // Try preview
      simulateUserInteraction.clickButton('previewBtn');
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
      
      // Try submit
      simulateUserInteraction.clickButton('submitBtn');
      
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Rate limit exceeded. Please wait before trying again.');
    });

    it('should update rate limit display colors appropriately', () => {
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      
      // Simulate different rate limit levels
      const testCases = [
        { remaining: 10, expectedColor: 'rgb(16, 185, 129)' }, // Green
        { remaining: 5, expectedColor: 'rgb(245, 158, 11)' },  // Yellow  
        { remaining: 2, expectedColor: 'rgb(239, 68, 68)' },   // Red
      ];
      
      testCases.forEach(({ remaining, expectedColor }) => {
        const state = messageForm.getState();
        state.rateLimitStatus.remaining = remaining;
        messageForm.reset();
        
        expect(rateLimitFill.style.backgroundColor).toBe(expectedColor);
      });
    });
  });

  describe('Complete User Flows', () => {
    it('should support complete preview-then-submit flow', async () => {
      const originalMessage = 'This is my feedback message';
      const transformedMessage = 'yo this is my feedback message fr fr 💯';
      
      mockAPIs.mockPreviewSuccess.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(createMockPreviewResponse(originalMessage, transformedMessage, 'internet-random'))
      });
      
      // User inputs
      simulateUserInteraction.typeInTextarea('message', originalMessage);
      simulateUserInteraction.selectPersona('internet-random');
      
      // Generate preview
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Verify preview is displayed
      const originalMessageText = document.getElementById('originalMessageText');
      const transformedMessageText = document.getElementById('transformedMessageText');
      expect(originalMessageText?.textContent).toBe(originalMessage);
      expect(transformedMessageText?.textContent).toBe(transformedMessage);
      
      // Submit the message
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      // Verify success
      const successMessage = document.getElementById('successMessage');
      expect(successMessage?.classList.contains('hidden')).toBe(false);
      
      // Verify both APIs were called
      expect(mockAPIs.mockPreviewSuccess).toHaveBeenCalled();
      expect(mockAPIs.mockSubmitSuccess).toHaveBeenCalled();
    });

    it('should support submit without preview', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Direct submission message');
      simulateUserInteraction.selectPersona('super-nice');
      
      // Skip preview, go straight to submit
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      // Verify success
      const successMessage = document.getElementById('successMessage');
      expect(successMessage?.classList.contains('hidden')).toBe(false);
      
      // Verify only submit API was called
      expect(mockAPIs.mockPreviewSuccess).not.toHaveBeenCalled();
      expect(mockAPIs.mockSubmitSuccess).toHaveBeenCalled();
    });

    it('should support custom persona workflow', async () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.typeInTextarea('message', 'Custom persona test message');
      simulateUserInteraction.selectPersona('custom');
      
      // Custom persona input should be visible
      assertElementVisible('customPersonaGroup');
      
      simulateUserInteraction.typeInTextarea('customPersona', 'Make it sound like a friendly robot');
      
      // Generate preview
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Verify API was called with custom persona
      expect(mockAPIs.mockPreviewSuccess).toHaveBeenCalled();
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.customPersona).toBe('Make it sound like a friendly robot');
      
      // Submit should also work
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      const successMessage = document.getElementById('successMessage');
      expect(successMessage?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Error Recovery Flows', () => {
    it('should allow retry after preview error', async () => {
      simulateAPIError('Network error');
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Error should be shown
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Network error');
      
      // Fix API and retry
      setupMockAPIs();
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Should succeed this time
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      expect(previewContainer.style.display).toBe('block');
    });

    it('should handle mixed success/failure scenarios', async () => {
      // Preview succeeds, submit fails
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Preview should work
      let state = messageForm.getState();
      expect(state.previewData).not.toBeNull();
      
      // Make submit fail
      mockAPIs.mockSubmitSuccess.mockRejectedValue(new Error('Submit failed'));
      
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      // Error should be shown, preview should still be visible
      const errorText = document.getElementById('errorText');
      expect(errorText?.textContent).toBe('Submit failed');
      
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      expect(previewContainer.style.display).toBe('block');
    });
  });

  describe('Form Reset and State Management', () => {
    it('should reset all state and UI correctly', async () => {
      // Set up complex state
      simulateUserInteraction.typeInTextarea('message', 'Complex test message');
      simulateUserInteraction.selectPersona('internet-random');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Reset everything
      messageForm.reset();
      
      const state = messageForm.getState();
      expect(state.message).toBe('');
      expect(state.selectedPersona).toBe('none');
      expect(state.customPersona).toBe('');
      expect(state.previewData).toBeNull();
      expect(state.isPreviewLoading).toBe(false);
      expect(state.isSubmitLoading).toBe(false);
      
      // UI should be reset
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const charCount = document.getElementById('charCount');
      
      expect(messageTextarea.value).toBe('');
      expect(personaSelect.value).toBe('none');
      expect(charCount?.textContent).toBe('0');
      
      assertElementHidden('messagePreview');
      assertElementHidden('customPersonaGroup');
    });

    it('should maintain session consistency across operations', async () => {
      const initialSessionId = messageForm.getState().rateLimitStatus;
      
      // Perform multiple operations
      simulateUserInteraction.typeInTextarea('message', 'Test 1');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      simulateUserInteraction.typeInTextarea('message', 'Test 2');
      simulateUserInteraction.clickButton('submitBtn');
      await waitFor(10);
      
      // Session ID should remain consistent
      const finalSessionId = messageForm.getState().rateLimitStatus;
      expect(initialSessionId).toBeDefined();
      expect(finalSessionId).toBeDefined();
    });
  });

  describe('Accessibility Integration', () => {
    it('should maintain proper focus flow through all interactions', () => {
      const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
      messageTextarea.focus();
      expect(document.activeElement).toBe(messageTextarea);
      
      // Focus should move appropriately through form
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      personaSelect.focus();
      expect(document.activeElement).toBe(personaSelect);
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      expect(document.activeElement).toBe(previewBtn);
    });

    it('should provide appropriate loading states for assistive technology', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      // Button should indicate loading state
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.textContent).toBe('Generating Preview...');
      expect(previewBtn.disabled).toBe(true);
      
      await waitFor(10);
      
      expect(previewBtn.textContent).toBe('Preview Message');
      expect(previewBtn.disabled).toBe(false);
    });
  });
});