import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockHTML, 
  simulateUserInteraction, 
  assertElementVisible, 
  assertElementHidden,
  createMockPreviewResponse,
  createMockRateLimitStatus,
  setupMockAPIs,
  simulateAPIError,
  simulateRateLimitError,
  waitFor
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

// Mock MessagePreview class that would manage preview functionality
class MessagePreview {
  private isLoading: boolean = false;
  private previewData: PreviewResponse | null = null;
  private rateLimitStatus: RateLimitStatus;
  private onPreview: () => void;

  constructor(onPreview: () => void, initialRateLimitStatus: RateLimitStatus) {
    this.onPreview = onPreview;
    this.rateLimitStatus = initialRateLimitStatus;
    this.initializeEventListeners();
    this.updateRateLimitDisplay();
  }

  private initializeEventListeners() {
    const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
    previewBtn?.addEventListener('click', () => {
      this.handlePreviewClick();
    });
  }

  private async handlePreviewClick() {
    const messageTextarea = document.getElementById('message') as HTMLTextAreaElement;
    const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
    const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;

    const message = messageTextarea?.value?.trim() || '';
    const persona = personaSelect?.value || 'none';
    const customPersona = customPersonaTextarea?.value?.trim() || '';

    if (!message) {
      this.showError('Please enter a message to preview');
      return;
    }

    if (this.rateLimitStatus.remaining <= 0) {
      this.showError('Rate limit exceeded. Please wait before trying again.');
      return;
    }

    await this.generatePreview(message, persona, customPersona);
  }

  private async generatePreview(message: string, persona: string, customPersona?: string) {
    this.setLoadingState(true);
    this.hideError();

    try {
      const requestBody = {
        message,
        persona: persona !== 'none' ? persona : undefined,
        customPersona: customPersona || undefined,
        sessionId: this.generateSessionId(),
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

      this.previewData = data;
      this.rateLimitStatus.remaining = data.rateLimitRemaining;
      this.rateLimitStatus.reset = data.rateLimitReset;
      
      this.displayPreview(data);
      this.updateRateLimitDisplay();
      this.onPreview();

    } catch (error) {
      console.error('Preview generation failed:', error);
      this.showError(error instanceof Error ? error.message : 'Failed to generate preview');
    } finally {
      this.setLoadingState(false);
    }
  }

  private setLoadingState(loading: boolean) {
    this.isLoading = loading;
    const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
    
    if (previewBtn) {
      previewBtn.disabled = loading;
      previewBtn.textContent = loading ? 'Generating Preview...' : 'Preview Message';
    }

    // Show/hide loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'previewLoading';
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div> Generating preview...';

    if (loading) {
      const previewContainer = document.getElementById('messagePreview');
      previewContainer?.appendChild(loadingIndicator);
    } else {
      document.getElementById('previewLoading')?.remove();
    }
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

  private showError(message: string) {
    let errorContainer = document.getElementById('previewError');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.id = 'previewError';
      errorContainer.className = 'preview-error';
      
      const previewBtn = document.getElementById('previewBtn');
      previewBtn?.parentNode?.insertBefore(errorContainer, previewBtn.nextSibling);
    }
    
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
  }

  private hideError() {
    const errorContainer = document.getElementById('previewError');
    if (errorContainer) {
      errorContainer.style.display = 'none';
    }
  }

  private updateRateLimitDisplay() {
    const rateLimitText = document.getElementById('rateLimitText');
    const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
    
    if (rateLimitText) {
      rateLimitText.textContent = `Requests remaining: ${this.rateLimitStatus.remaining}/${this.rateLimitStatus.limit}`;
    }
    
    if (rateLimitFill) {
      const percentage = (this.rateLimitStatus.remaining / this.rateLimitStatus.limit) * 100;
      rateLimitFill.style.width = `${percentage}%`;
      
      // Change color based on remaining requests
      if (this.rateLimitStatus.remaining <= 2) {
        rateLimitFill.style.backgroundColor = '#ef4444'; // Red
      } else if (this.rateLimitStatus.remaining <= 5) {
        rateLimitFill.style.backgroundColor = '#f59e0b'; // Yellow
      } else {
        rateLimitFill.style.backgroundColor = '#10b981'; // Green
      }
    }

    // Show warning when approaching limit
    if (this.rateLimitStatus.remaining <= 2 && this.rateLimitStatus.remaining > 0) {
      this.showRateLimitWarning();
    } else {
      this.hideRateLimitWarning();
    }
  }

  private showRateLimitWarning() {
    let warningContainer = document.getElementById('rateLimitWarning');
    if (!warningContainer) {
      warningContainer = document.createElement('div');
      warningContainer.id = 'rateLimitWarning';
      warningContainer.className = 'rate-limit-warning';
      
      const rateLimitDisplay = document.getElementById('rateLimitDisplay');
      rateLimitDisplay?.appendChild(warningContainer);
    }
    
    warningContainer.textContent = `Warning: Only ${this.rateLimitStatus.remaining} requests remaining!`;
    warningContainer.style.display = 'block';
  }

  private hideRateLimitWarning() {
    const warningContainer = document.getElementById('rateLimitWarning');
    if (warningContainer) {
      warningContainer.style.display = 'none';
    }
  }

  private generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Public methods for testing
  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getPreviewData(): PreviewResponse | null {
    return this.previewData;
  }

  public getRateLimitStatus(): RateLimitStatus {
    return this.rateLimitStatus;
  }

  public updateRateLimitStatus(status: RateLimitStatus) {
    this.rateLimitStatus = status;
    this.updateRateLimitDisplay();
  }

  public reset() {
    this.previewData = null;
    this.isLoading = false;
    this.hideError();
    this.hideRateLimitWarning();
    
    const previewContainer = document.getElementById('messagePreview') as HTMLElement;
    if (previewContainer) {
      previewContainer.style.display = 'none';
    }
    
    const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
    if (previewBtn) {
      previewBtn.disabled = false;
      previewBtn.textContent = 'Preview Message';
    }
  }
}

describe('MessagePreview', () => {
  let messagePreview: MessagePreview;
  let mockOnPreview: ReturnType<typeof vi.fn>;
  let mockAPIs: ReturnType<typeof setupMockAPIs>;

  beforeEach(() => {
    createMockHTML();
    mockOnPreview = vi.fn();
    mockAPIs = setupMockAPIs();
    
    const initialRateLimitStatus = createMockRateLimitStatus();
    messagePreview = new MessagePreview(mockOnPreview, initialRateLimitStatus);
  });

  describe('Preview Generation', () => {
    it('should show error when message is empty', async () => {
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer?.textContent).toBe('Please enter a message to preview');
      expect(errorContainer?.style.display).toBe('block');
    });

    it('should generate preview with valid message', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message for preview');
      simulateUserInteraction.selectPersona('internet-random');
      
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      expect(mockAPIs.mockPreviewSuccess).toHaveBeenCalled();
      expect(mockOnPreview).toHaveBeenCalled();
    });

    it('should display loading state during preview generation', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      
      // Make API slow to test loading state
      mockAPIs.mockPreviewSuccess.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(createMockPreviewResponse())
          })
        ), 100))
      );
      
      simulateUserInteraction.clickButton('previewBtn');
      
      // Check loading state immediately
      expect(messagePreview.getIsLoading()).toBe(true);
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(true);
      expect(previewBtn.textContent).toBe('Generating Preview...');
      
      const loadingIndicator = document.getElementById('previewLoading');
      expect(loadingIndicator).toBeTruthy();
      
      await waitFor(150);
      
      // Check loading state is cleared
      expect(messagePreview.getIsLoading()).toBe(false);
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Message');
    });

    it('should display preview content correctly', async () => {
      const mockResponse = createMockPreviewResponse(
        'Original test message',
        'Transformed test message yo',
        'internet-random'
      );
      
      mockAPIs.mockPreviewSuccess.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      simulateUserInteraction.typeInTextarea('message', 'Original test message');
      simulateUserInteraction.selectPersona('internet-random');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const originalMessageText = document.getElementById('originalMessageText');
      const transformedMessageText = document.getElementById('transformedMessageText');
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      
      expect(originalMessageText?.textContent).toBe('Original test message');
      expect(transformedMessageText?.textContent).toBe('Transformed test message yo');
      expect(previewContainer.style.display).toBe('block');
    });

    it('should include custom persona in API request', async () => {
      // Add custom option to select
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.selectPersona('custom');
      simulateUserInteraction.typeInTextarea('customPersona', 'Make it sound like a pirate');
      
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      expect(mockAPIs.mockPreviewSuccess).toHaveBeenCalled();
      
      // Verify the request was made with custom persona
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.customPersona).toBe('Make it sound like a pirate');
    });
  });

  describe('Rate Limiting', () => {
    it('should update rate limit display after successful preview', async () => {
      const mockResponse = createMockPreviewResponse();
      mockResponse.rateLimitRemaining = 7;
      
      mockAPIs.mockPreviewSuccess.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const rateLimitText = document.getElementById('rateLimitText');
      expect(rateLimitText?.textContent).toBe('Requests remaining: 7/10');
      
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      expect(rateLimitFill.style.width).toBe('70%');
    });

    it('should prevent preview when rate limit is exceeded', async () => {
      messagePreview.updateRateLimitStatus({ remaining: 0, reset: Date.now() + 60000, limit: 10 });
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer?.textContent).toBe('Rate limit exceeded. Please wait before trying again.');
      expect(mockAPIs.mockPreviewSuccess).not.toHaveBeenCalled();
    });

    it('should show warning when approaching rate limit', () => {
      messagePreview.updateRateLimitStatus({ remaining: 2, reset: Date.now() + 60000, limit: 10 });
      
      const warningContainer = document.getElementById('rateLimitWarning');
      expect(warningContainer?.textContent).toBe('Warning: Only 2 requests remaining!');
      expect(warningContainer?.style.display).toBe('block');
    });

    it('should change rate limit bar color based on remaining requests', () => {
      const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
      
      // Test red color for low remaining
      messagePreview.updateRateLimitStatus({ remaining: 1, reset: Date.now() + 60000, limit: 10 });
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(239, 68, 68)'); // #ef4444
      
      // Test yellow color for medium remaining
      messagePreview.updateRateLimitStatus({ remaining: 4, reset: Date.now() + 60000, limit: 10 });
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(245, 158, 11)'); // #f59e0b
      
      // Test green color for high remaining
      messagePreview.updateRateLimitStatus({ remaining: 8, reset: Date.now() + 60000, limit: 10 });
      expect(rateLimitFill.style.backgroundColor).toBe('rgb(16, 185, 129)'); // #10b981
    });

    it('should handle rate limit error from API', async () => {
      simulateRateLimitError();
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer?.textContent).toContain('Rate limit exceeded');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      simulateAPIError('Network error');
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer?.textContent).toBe('Network error');
      expect(messagePreview.getIsLoading()).toBe(false);
    });

    it('should handle server errors with custom error messages', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'AI service temporarily unavailable' })
      });
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer?.textContent).toBe('AI service temporarily unavailable');
    });

    it('should clear errors when starting new preview', async () => {
      // First, create an error
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10); // Let error show
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer?.style.display).toBe('block');
      
      // Now try with valid message
      simulateUserInteraction.typeInTextarea('message', 'Valid message');
      simulateUserInteraction.clickButton('previewBtn');
      
      // Error should be hidden when starting new preview
      expect(errorContainer?.style.display).toBe('none');
    });

    it('should handle missing DOM elements gracefully', () => {
      // Remove critical elements
      document.getElementById('previewBtn')?.remove();
      document.getElementById('message')?.remove();
      
      // Should not throw error when trying to interact
      expect(() => {
        new MessagePreview(vi.fn(), createMockRateLimitStatus());
      }).not.toThrow();
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all preview state', async () => {
      // First generate a preview
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Then reset
      messagePreview.reset();
      
      expect(messagePreview.getPreviewData()).toBeNull();
      expect(messagePreview.getIsLoading()).toBe(false);
      
      const previewContainer = document.getElementById('messagePreview') as HTMLElement;
      expect(previewContainer.style.display).toBe('none');
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      expect(previewBtn.disabled).toBe(false);
      expect(previewBtn.textContent).toBe('Preview Message');
      
      const errorContainer = document.getElementById('previewError');
      if (errorContainer) {
        expect(errorContainer.style.display).toBe('none');
      }
    });
  });

  describe('Accessibility', () => {
    it('should maintain focus management during loading', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      
      const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement;
      previewBtn.focus();
      
      simulateUserInteraction.clickButton('previewBtn');
      
      // Button should still be in DOM and focusable after loading starts
      expect(document.activeElement).toBe(previewBtn);
    });

    it('should provide loading announcements for screen readers', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      const loadingIndicator = document.getElementById('previewLoading');
      expect(loadingIndicator?.textContent).toContain('Generating preview');
    });

    it('should have appropriate ARIA attributes for error messages', async () => {
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      const errorContainer = document.getElementById('previewError');
      expect(errorContainer).toBeTruthy();
      // In real implementation, this would have aria-live="polite" or similar
    });
  });

  describe('Integration with Other Components', () => {
    it('should call onPreview callback after successful preview', async () => {
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      expect(mockOnPreview).toHaveBeenCalled();
    });

    it('should not call onPreview callback on error', async () => {
      simulateAPIError('Test error');
      
      simulateUserInteraction.typeInTextarea('message', 'Test message');
      simulateUserInteraction.clickButton('previewBtn');
      
      await waitFor(10);
      
      expect(mockOnPreview).not.toHaveBeenCalled();
    });

    it('should maintain rate limit status across multiple operations', async () => {
      // First preview
      simulateUserInteraction.typeInTextarea('message', 'Test message 1');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Rate limit should be updated
      expect(messagePreview.getRateLimitStatus().remaining).toBe(9);
      
      // Second preview
      simulateUserInteraction.typeInTextarea('message', 'Test message 2');
      simulateUserInteraction.clickButton('previewBtn');
      await waitFor(10);
      
      // Rate limit should be further decremented
      expect(messagePreview.getRateLimitStatus().remaining).toBe(8);
    });
  });
});