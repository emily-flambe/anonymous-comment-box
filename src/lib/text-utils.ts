/**
 * Text utility functions for message processing
 */

/**
 * Count words in a text string using a robust algorithm
 * Handles edge cases like contractions, hyphenated words, and punctuation
 */
export function countWords(text: string): number {
  if (!text || typeof text !== 'string') {
    return 0;
  }

  // Remove extra whitespace and normalize
  const normalizedText = text.trim();
  
  if (normalizedText.length === 0) {
    return 0;
  }

  // Split on whitespace and filter out empty strings
  // This handles multiple spaces, tabs, newlines, etc.
  const words = normalizedText
    .split(/\s+/)
    .filter(word => word.length > 0);

  return words.length;
}

/**
 * Truncate text to a maximum number of words
 * Preserves word boundaries and doesn't cut words in half
 */
export function truncateToWords(text: string, maxWords: number): string {
  if (!text || typeof text !== 'string' || maxWords <= 0) {
    return '';
  }

  const words = text.trim().split(/\s+/);
  
  if (words.length <= maxWords) {
    return text;
  }

  // Take only the first maxWords and rejoin with single spaces
  return words.slice(0, maxWords).join(' ');
}

/**
 * Check if text exceeds word limit
 */
export function exceedsWordLimit(text: string, wordLimit: number): boolean {
  return countWords(text) > wordLimit;
}