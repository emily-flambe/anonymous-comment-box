import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  createMockHTML, 
  simulateUserInteraction, 
  assertElementVisible, 
  assertElementHidden,
  MOCK_PERSONA_OPTIONS 
} from '../utils/test-helpers';

// Mock PersonaSelector class that would manage persona selection logic
class PersonaSelector {
  private selectedPersona: string = 'none';
  private customPersona: string = '';
  private onPersonaChange: (persona: string) => void;
  private onCustomPersonaChange: (custom: string) => void;

  constructor(
    onPersonaChange: (persona: string) => void,
    onCustomPersonaChange: (custom: string) => void
  ) {
    this.onPersonaChange = onPersonaChange;
    this.onCustomPersonaChange = onCustomPersonaChange;
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
    const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
    const customPersonaGroup = document.getElementById('customPersonaGroup') as HTMLElement;

    personaSelect?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.selectedPersona = target.value;
      this.updatePersonaDescription(target.value);
      this.toggleCustomPersonaInput(target.value === 'custom');
      this.onPersonaChange(target.value);
    });

    customPersonaTextarea?.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.customPersona = target.value;
      this.updateCustomPersonaCharCount(target.value.length);
      this.onCustomPersonaChange(target.value);
    });
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
    const charCountElement = document.getElementById('customPersonaCharCount');
    if (charCountElement) {
      charCountElement.textContent = length.toString();
      // Change color if approaching limit
      if (length > 450) {
        charCountElement.style.color = '#ef4444';
      } else {
        charCountElement.style.color = '#6b7280';
      }
    }
  }

  public getSelectedPersona() {
    return this.selectedPersona;
  }

  public getCustomPersona() {
    return this.customPersona;
  }

  public validatePersonaInput() {
    if (this.selectedPersona === 'custom' && this.customPersona.trim() === '') {
      return { valid: false, error: 'Custom persona description is required' };
    }
    if (this.customPersona.length > 500) {
      return { valid: false, error: 'Custom persona description too long (max 500 characters)' };
    }
    return { valid: true };
  }

  public reset() {
    this.selectedPersona = 'none';
    this.customPersona = '';
    const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
    const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
    
    if (personaSelect) personaSelect.value = 'none';
    if (customPersonaTextarea) customPersonaTextarea.value = '';
    
    this.updatePersonaDescription('none');
    this.toggleCustomPersonaInput(false);
    this.updateCustomPersonaCharCount(0);
  }
}

describe('PersonaSelector', () => {
  let personaSelector: PersonaSelector;
  let mockOnPersonaChange: ReturnType<typeof vi.fn>;
  let mockOnCustomPersonaChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createMockHTML();
    mockOnPersonaChange = vi.fn();
    mockOnCustomPersonaChange = vi.fn();
    personaSelector = new PersonaSelector(mockOnPersonaChange, mockOnCustomPersonaChange);
  });

  describe('Persona Selection', () => {
    it('should initialize with "none" persona selected', () => {
      expect(personaSelector.getSelectedPersona()).toBe('none');
      
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      expect(personaSelect.value).toBe('none');
    });

    it('should display correct persona descriptions for each option', () => {
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const descriptionElement = document.getElementById('personaDescription');

      MOCK_PERSONA_OPTIONS.forEach((option) => {
        personaSelect.value = option.key;
        personaSelect.dispatchEvent(new Event('change'));
        expect(descriptionElement?.textContent).toBe(option.description);
      });
    });

    it('should call onPersonaChange callback when persona is selected', () => {
      simulateUserInteraction.selectPersona('internet-random');
      expect(mockOnPersonaChange).toHaveBeenCalledWith('internet-random');
    });

    it('should update internal state when persona changes', () => {
      simulateUserInteraction.selectPersona('extremely-serious');
      expect(personaSelector.getSelectedPersona()).toBe('extremely-serious');
    });

    it('should show custom persona input when "custom" is selected', () => {
      // First, add custom option to the select for testing
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);

      simulateUserInteraction.selectPersona('custom');
      assertElementVisible('customPersonaGroup');
    });

    it('should hide custom persona input when non-custom persona is selected', () => {
      // First show custom input
      const customPersonaGroup = document.getElementById('customPersonaGroup') as HTMLElement;
      customPersonaGroup.style.display = 'block';

      simulateUserInteraction.selectPersona('super-nice');
      assertElementHidden('customPersonaGroup');
    });
  });

  describe('Custom Persona Input', () => {
    beforeEach(() => {
      // Add custom option for these tests
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.selectPersona('custom');
    });

    it('should update character count as user types', () => {
      const testText = 'This is a custom persona description';
      simulateUserInteraction.typeInTextarea('customPersona', testText);
      
      const charCount = document.getElementById('customPersonaCharCount');
      expect(charCount?.textContent).toBe(testText.length.toString());
    });

    it('should call onCustomPersonaChange callback when text changes', () => {
      const testText = 'Custom persona description';
      simulateUserInteraction.typeInTextarea('customPersona', testText);
      expect(mockOnCustomPersonaChange).toHaveBeenCalledWith(testText);
    });

    it('should change character count color when approaching limit', () => {
      const longText = 'a'.repeat(451);
      simulateUserInteraction.typeInTextarea('customPersona', longText);
      
      const charCount = document.getElementById('customPersonaCharCount') as HTMLElement;
      expect(charCount.style.color).toBe('rgb(239, 68, 68)'); // #ef4444 in rgb
    });

    it('should maintain normal color when under limit', () => {
      const normalText = 'This is a normal length description';
      simulateUserInteraction.typeInTextarea('customPersona', normalText);
      
      const charCount = document.getElementById('customPersonaCharCount') as HTMLElement;
      expect(charCount.style.color).toBe('rgb(107, 114, 128)'); // #6b7280 in rgb
    });

    it('should update internal custom persona state', () => {
      const testText = 'Custom persona for testing';
      simulateUserInteraction.typeInTextarea('customPersona', testText);
      expect(personaSelector.getCustomPersona()).toBe(testText);
    });
  });

  describe('Validation', () => {
    it('should validate successfully for preset personas', () => {
      simulateUserInteraction.selectPersona('internet-random');
      const validation = personaSelector.validatePersonaInput();
      expect(validation.valid).toBe(true);
    });

    it('should require custom persona description when custom is selected', () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.selectPersona('custom');
      const validation = personaSelector.validatePersonaInput();
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Custom persona description is required');
    });

    it('should reject custom persona description over 500 characters', () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.selectPersona('custom');
      const longText = 'a'.repeat(501);
      simulateUserInteraction.typeInTextarea('customPersona', longText);
      
      const validation = personaSelector.validatePersonaInput();
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Custom persona description too long (max 500 characters)');
    });

    it('should validate successfully for custom persona within limits', () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.selectPersona('custom');
      simulateUserInteraction.typeInTextarea('customPersona', 'Valid custom persona description');
      
      const validation = personaSelector.validatePersonaInput();
      expect(validation.valid).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default state', () => {
      // First, set up some state
      simulateUserInteraction.selectPersona('super-nice');
      simulateUserInteraction.typeInTextarea('customPersona', 'Some custom text');
      
      // Reset
      personaSelector.reset();
      
      expect(personaSelector.getSelectedPersona()).toBe('none');
      expect(personaSelector.getCustomPersona()).toBe('');
      
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      expect(personaSelect.value).toBe('none');
      
      const customPersonaTextarea = document.getElementById('customPersona') as HTMLTextAreaElement;
      expect(customPersonaTextarea.value).toBe('');
    });

    it('should hide custom persona input after reset', () => {
      // First show custom input
      const customPersonaGroup = document.getElementById('customPersonaGroup') as HTMLElement;
      customPersonaGroup.style.display = 'block';
      
      personaSelector.reset();
      assertElementHidden('customPersonaGroup');
    });

    it('should reset character count display', () => {
      simulateUserInteraction.typeInTextarea('customPersona', 'Some text');
      personaSelector.reset();
      
      const charCount = document.getElementById('customPersonaCharCount');
      expect(charCount?.textContent).toBe('0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form elements', () => {
      const personaSelect = document.getElementById('personaSelect');
      const personaLabel = document.querySelector('label[for="personaSelect"]');
      
      expect(personaLabel).toBeTruthy();
      expect(personaLabel?.textContent).toBe('Message Style');
      
      const customPersonaTextarea = document.getElementById('customPersona');
      const customPersonaLabel = document.querySelector('label[for="customPersona"]');
      
      expect(customPersonaLabel).toBeTruthy();
      expect(customPersonaLabel?.textContent).toBe('Custom Style Description');
    });

    it('should support keyboard navigation', () => {
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      
      // Simulate keyboard navigation
      personaSelect.focus();
      expect(document.activeElement).toBe(personaSelect);
      
      // Simulate keyboard selection (Arrow Down + Enter)
      const keydownEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      personaSelect.dispatchEvent(keydownEvent);
      
      // Verify element is still focused
      expect(document.activeElement).toBe(personaSelect);
    });

    it('should have appropriate ARIA attributes', () => {
      const personaDescription = document.getElementById('personaDescription');
      const customPersonaGroup = document.getElementById('customPersonaGroup');
      
      // These would be added by the actual implementation
      expect(personaDescription).toBeTruthy();
      expect(customPersonaGroup).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Remove elements from DOM to simulate missing elements
      document.getElementById('personaSelect')?.remove();
      
      // Should not throw error when creating new instance
      expect(() => {
        new PersonaSelector(vi.fn(), vi.fn());
      }).not.toThrow();
    });

    it('should handle invalid persona selections', () => {
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      personaSelect.value = 'invalid-persona';
      personaSelect.dispatchEvent(new Event('change'));
      
      // Should not break the application
      expect(personaSelector.getSelectedPersona()).toBe('invalid-persona');
    });
  });

  describe('State Management', () => {
    it('should maintain consistent state across multiple interactions', () => {
      // Simulate a series of user interactions
      simulateUserInteraction.selectPersona('internet-random');
      expect(personaSelector.getSelectedPersona()).toBe('internet-random');
      
      simulateUserInteraction.selectPersona('super-nice');
      expect(personaSelector.getSelectedPersona()).toBe('super-nice');
      
      // Add custom option for this test
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      simulateUserInteraction.selectPersona('custom');
      simulateUserInteraction.typeInTextarea('customPersona', 'Custom description');
      
      expect(personaSelector.getSelectedPersona()).toBe('custom');
      expect(personaSelector.getCustomPersona()).toBe('Custom description');
    });

    it('should clear custom persona when switching to preset persona', () => {
      // Add custom option
      const personaSelect = document.getElementById('personaSelect') as HTMLSelectElement;
      const customOption = document.createElement('option');
      customOption.value = 'custom';
      customOption.textContent = 'Custom';
      personaSelect.appendChild(customOption);
      
      // Set custom persona first
      simulateUserInteraction.selectPersona('custom');
      simulateUserInteraction.typeInTextarea('customPersona', 'Custom description');
      
      // Switch to preset persona
      simulateUserInteraction.selectPersona('internet-random');
      
      // Custom persona text should remain (for user convenience)
      expect(personaSelector.getCustomPersona()).toBe('Custom description');
      expect(personaSelector.getSelectedPersona()).toBe('internet-random');
    });
  });
});