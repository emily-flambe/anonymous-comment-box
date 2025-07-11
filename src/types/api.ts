// API Request/Response types for message customization feature

export interface PreviewRequest {
  message: string;           // Original message (max 2000 chars)
  persona?: string;          // Preset persona key
  customPersona?: string;    // Custom persona description (max 500 chars)
  sessionId: string;         // For rate limiting
}

export interface PreviewResponse {
  transformedMessage: string;
  originalMessage: string;
  persona: string;
  rateLimitRemaining: number;
  rateLimitReset: number;    // Unix timestamp
  fallbackUsed?: boolean;
  error?: string;
  emailPreview?: string;     // Full email format preview including headers
}

export interface RateLimitStatus {
  remaining: number;
  reset: number;            // Unix timestamp
  limit: number;
}

export interface SubmitRequest {
  message: string;
  persona?: string;          // NEW: Preset persona key
  customPersona?: string;    // NEW: Custom persona description
  sessionId: string;
}

export interface SubmitResponse {
  success: boolean;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  code?: string;
  details?: any;
}

// Persona-related types
export interface PersonaOption {
  key: string;
  name: string;
  description: string;
  example?: string;
}

// Common validation schemas
export const ValidationLimits = {
  MESSAGE_MIN_LENGTH: 1,
  MESSAGE_MAX_LENGTH: 2000, // Character limit for input validation
  MESSAGE_MAX_WORDS: 1000, // Word limit for truncation
  CUSTOM_PERSONA_MAX_LENGTH: 500,
  RATE_LIMIT_MAX_REQUESTS: 10,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
} as const;