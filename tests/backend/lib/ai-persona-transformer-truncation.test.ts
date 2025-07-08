import { describe, it, expect } from 'vitest';
import { ValidationLimits } from '../../../src/types/api';
import { exceedsWordLimit, truncateToWords } from '../../../src/lib/text-utils';

describe('AI Persona Transformer Truncation Logic', () => {
  it('should use the correct word limit from ValidationLimits', () => {
    expect(ValidationLimits.MESSAGE_MAX_WORDS).toBe(1000);
  });

  it('should detect when messages exceed word limit', () => {
    const words1000 = new Array(1000).fill('word').join(' ');
    const words1001 = new Array(1001).fill('word').join(' ');
    
    expect(exceedsWordLimit(words1000, ValidationLimits.MESSAGE_MAX_WORDS)).toBe(false);
    expect(exceedsWordLimit(words1001, ValidationLimits.MESSAGE_MAX_WORDS)).toBe(true);
  });

  it('should truncate to exactly the word limit', () => {
    const words1500 = new Array(1500).fill('word').join(' ');
    const truncated = truncateToWords(words1500, ValidationLimits.MESSAGE_MAX_WORDS);
    
    expect(truncated.split(' ')).toHaveLength(ValidationLimits.MESSAGE_MAX_WORDS);
  });

  it('should handle realistic message content', () => {
    const realisticMessage = 'This is a realistic message that contains various types of content including punctuation, numbers like 123, and different sentence structures. '.repeat(100);
    
    if (exceedsWordLimit(realisticMessage, ValidationLimits.MESSAGE_MAX_WORDS)) {
      const truncated = truncateToWords(realisticMessage, ValidationLimits.MESSAGE_MAX_WORDS);
      expect(exceedsWordLimit(truncated, ValidationLimits.MESSAGE_MAX_WORDS)).toBe(false);
    }
  });
});