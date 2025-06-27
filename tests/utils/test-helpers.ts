import { vi } from 'vitest';

// Mock API response helpers
export const createMockResponse = (data: any, status = 200, ok = true) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
  } as Response);
};

// Rate limit status mock data
export const createMockRateLimitStatus = (remaining = 10, reset = Date.now() + 60000) => ({
  remaining,
  reset,
  limit: 10,
});

// Preview response mock data
export const createMockPreviewResponse = (
  originalMessage = 'Test message',
  transformedMessage = 'Transformed test message',
  persona = 'internet-random'
) => ({
  transformedMessage,
  originalMessage,
  persona,
  rateLimitRemaining: 9,
  rateLimitReset: Date.now() + 60000,
});

// Persona options mock data
export const MOCK_PERSONA_OPTIONS = [
  {
    key: 'none',
    name: 'No transformation',
    description: 'Keep your message as-is',
    example: 'Your message remains unchanged',
  },
  {
    key: 'internet-random',
    name: 'Internet Random',
    description: 'Casual internet slang with abbreviations and meme references',
    example: 'ngl this idea slaps 💯 we should def implement this fr fr',
  },
  {
    key: 'barely-literate',
    name: 'Barely Literate',
    description: 'Poor grammar, simple vocabulary, informal structure',
    example: 'i dont like this thing cuz it dont make sense to me and stuff',
  },
  {
    key: 'extremely-serious',
    name: 'Extremely Serious',
    description: 'Formal, academic language with professional vocabulary',
    example: 'This matter requires immediate attention and systematic remediation',
  },
  {
    key: 'super-nice',
    name: 'Super Nice',
    description: 'Overly polite, encouraging, and positive language',
    example: 'I hope this feedback is helpful! Thank you for considering improvements! 😊',
  },
];

// Mock HTML elements creation
export const createMockHTML = () => {
  document.body.innerHTML = `
    <div class="container">
      <form id="feedbackForm" class="feedback-form">
        <!-- Persona Selector -->
        <div class="form-group persona-selector">
          <label for="personaSelect">Message Style</label>
          <select id="personaSelect" name="persona">
            <option value="none">No transformation</option>
            <option value="internet-random">Internet Random</option>
            <option value="barely-literate">Barely Literate</option>
            <option value="extremely-serious">Extremely Serious</option>
            <option value="super-nice">Super Nice</option>
          </select>
          <div class="persona-description" id="personaDescription">
            Keep your message as-is
          </div>
        </div>

        <!-- Custom Persona Input -->
        <div class="form-group custom-persona-group" id="customPersonaGroup" style="display: none;">
          <label for="customPersona">Custom Style Description</label>
          <textarea 
            id="customPersona" 
            name="customPersona" 
            rows="3" 
            maxlength="500"
            placeholder="Describe how you want your message transformed..."
          ></textarea>
          <div class="char-count">
            <span id="customPersonaCharCount">0</span> / 500 characters
          </div>
        </div>

        <!-- Message Input -->
        <div class="form-group">
          <label for="message">Your Message</label>
          <textarea 
            id="message" 
            name="message" 
            rows="6" 
            maxlength="5000"
            placeholder="Share your thoughts, feedback, or concerns..."
            required
          ></textarea>
          <div class="char-count">
            <span id="charCount">0</span> / 5000 characters
          </div>
        </div>

        <!-- Message Preview -->
        <div class="message-preview" id="messagePreview" style="display: none;">
          <h3>Preview</h3>
          <div class="preview-content">
            <div class="original-message">
              <strong>Original:</strong>
              <p id="originalMessageText"></p>
            </div>
            <div class="transformed-message">
              <strong>Transformed:</strong>
              <p id="transformedMessageText"></p>
            </div>
          </div>
        </div>

        <!-- Rate Limit Display -->
        <div class="rate-limit-display" id="rateLimitDisplay">
          <span id="rateLimitText">Requests remaining: 10/10</span>
          <div class="rate-limit-bar">
            <div class="rate-limit-fill" id="rateLimitFill" style="width: 100%;"></div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="form-actions">
          <button type="button" class="preview-btn" id="previewBtn">
            Preview Message
          </button>
          <button type="submit" class="submit-btn" id="submitBtn">
            Send Anonymous Feedback
          </button>
        </div>
      </form>

      <!-- Success/Error Messages -->
      <div id="successMessage" class="success-message hidden">
        <h2>Message Sent!</h2>
        <p>Your feedback has been queued for anonymous delivery.</p>
        <button onclick="resetForm()" class="reset-btn">Send Another Message</button>
      </div>

      <div id="errorMessage" class="error-message hidden">
        <h2>Something went wrong</h2>
        <p id="errorText">Please try again later.</p>
        <button onclick="resetForm()" class="reset-btn">Try Again</button>
      </div>
    </div>
  `;
};

// Simulate user interactions
export const simulateUserInteraction = {
  selectPersona: (personaKey: string) => {
    const select = document.getElementById('personaSelect') as HTMLSelectElement;
    select.value = personaKey;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  },

  typeInTextarea: (elementId: string, text: string) => {
    const textarea = document.getElementById(elementId) as HTMLTextAreaElement;
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  },

  clickButton: (elementId: string) => {
    const button = document.getElementById(elementId) as HTMLButtonElement;
    button.click();
  },

  submitForm: () => {
    const form = document.getElementById('feedbackForm') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true }));
  },
};

// Assertion helpers
export const assertElementVisible = (elementId: string) => {
  const element = document.getElementById(elementId);
  expect(element).toBeTruthy();
  expect(element?.style.display).not.toBe('none');
  expect(element?.classList.contains('hidden')).toBe(false);
};

export const assertElementHidden = (elementId: string) => {
  const element = document.getElementById(elementId);
  if (element) {
    const isHidden = element.style.display === 'none' || element.classList.contains('hidden');
    expect(isHidden).toBe(true);
  }
};

export const assertRateLimitDisplay = (remaining: number, total = 10) => {
  const rateLimitText = document.getElementById('rateLimitText');
  expect(rateLimitText?.textContent).toBe(`Requests remaining: ${remaining}/${total}`);
  
  const percentage = (remaining / total) * 100;
  const rateLimitFill = document.getElementById('rateLimitFill') as HTMLElement;
  expect(rateLimitFill?.style.width).toBe(`${percentage}%`);
};

// Mock API setup helpers
export const setupMockAPIs = () => {
  // Mock successful preview API
  const mockPreviewSuccess = vi.fn().mockResolvedValue(
    createMockResponse(createMockPreviewResponse())
  );

  // Mock rate limit status API
  const mockRateLimitStatus = vi.fn().mockResolvedValue(
    createMockResponse(createMockRateLimitStatus())
  );

  // Mock submit API
  const mockSubmitSuccess = vi.fn().mockResolvedValue(
    createMockResponse({ success: true, message: 'Message sent successfully' })
  );

  // Setup fetch mock
  (global.fetch as any).mockImplementation((url: string, options?: any) => {
    if (url.includes('/api/preview')) {
      return mockPreviewSuccess();
    } else if (url.includes('/api/rate-limit-status')) {
      return mockRateLimitStatus();
    } else if (url.includes('/api/submit')) {
      return mockSubmitSuccess();
    }
    return Promise.reject(new Error('Unknown API endpoint'));
  });

  return {
    mockPreviewSuccess,
    mockRateLimitStatus,
    mockSubmitSuccess,
  };
};

// Error simulation helpers
export const simulateAPIError = (errorMessage: string, status = 500) => {
  (global.fetch as any).mockRejectedValue(new Error(errorMessage));
};

export const simulateRateLimitError = () => {
  (global.fetch as any).mockResolvedValue(
    createMockResponse(
      { error: 'Rate limit exceeded. Please wait before trying again.' },
      429,
      false
    )
  );
};

// Wait for async operations in tests
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Session storage helpers for rate limiting tests
export const mockSessionStorage = {
  setRateLimitStatus: (status: any) => {
    mockStorage.getItem.mockReturnValue(JSON.stringify(status));
  },
  
  clearRateLimitStatus: () => {
    mockStorage.getItem.mockReturnValue(null);
  },
};

const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};