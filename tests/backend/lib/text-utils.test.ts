import { describe, it, expect } from 'vitest';
import { countWords, truncateToWords, exceedsWordLimit } from '../../../src/lib/text-utils';

describe('text-utils', () => {
  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('This is a test message')).toBe(5);
      expect(countWords('Single')).toBe(1);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(countWords('Hello,   world!   This  is   a   test.')).toBe(6);
      expect(countWords('Word1 Word2\nWord3\tWord4')).toBe(4);
      expect(countWords(null as any)).toBe(0);
      expect(countWords(undefined as any)).toBe(0);
    });

    it('should handle contractions and hyphenated words', () => {
      expect(countWords("don't can't won't")).toBe(3);
      expect(countWords('well-known state-of-the-art')).toBe(2);
    });
  });

  describe('truncateToWords', () => {
    it('should truncate text to specified word count', () => {
      const text = 'This is a test message with more than five words';
      expect(truncateToWords(text, 5)).toBe('This is a test message');
      expect(truncateToWords(text, 10)).toBe(text); // Should return original if under limit
      expect(truncateToWords(text, 0)).toBe('');
    });

    it('should handle edge cases', () => {
      expect(truncateToWords('', 5)).toBe('');
      expect(truncateToWords('Single', 1)).toBe('Single');
      expect(truncateToWords('Single', 0)).toBe('');
      expect(truncateToWords(null as any, 5)).toBe('');
    });

    it('should preserve exact word boundaries', () => {
      const text = 'Word1 Word2 Word3 Word4 Word5';
      expect(truncateToWords(text, 3)).toBe('Word1 Word2 Word3');
    });
  });

  describe('exceedsWordLimit', () => {
    it('should check if text exceeds word limit', () => {
      expect(exceedsWordLimit('This is a test', 5)).toBe(false);
      expect(exceedsWordLimit('This is a test', 4)).toBe(false);
      expect(exceedsWordLimit('This is a test', 3)).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(exceedsWordLimit('', 0)).toBe(false);
      expect(exceedsWordLimit('', 1)).toBe(false);
      expect(exceedsWordLimit('Single', 1)).toBe(false);
      expect(exceedsWordLimit('Single', 0)).toBe(true);
    });
  });

  describe('1000 word limit validation', () => {
    it('should correctly identify messages over 1000 words', () => {
      // Generate a message with exactly 1000 words
      const words1000 = new Array(1000).fill('word').join(' ');
      expect(countWords(words1000)).toBe(1000);
      expect(exceedsWordLimit(words1000, 1000)).toBe(false);
      
      // Generate a message with 1001 words  
      const words1001 = new Array(1001).fill('word').join(' ');
      expect(countWords(words1001)).toBe(1001);
      expect(exceedsWordLimit(words1001, 1000)).toBe(true);
    });

    it('should truncate to exactly 1000 words', () => {
      const words1500 = new Array(1500).fill('word').join(' ');
      const truncated = truncateToWords(words1500, 1000);
      expect(countWords(truncated)).toBe(1000);
    });
  });
});