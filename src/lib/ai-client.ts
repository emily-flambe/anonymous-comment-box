import { Env } from '../types/env';

// TypeScript interfaces for the AI worker API
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ApiError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export class AIClientError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public type?: string
  ) {
    super(message);
    this.name = 'AIClientError';
  }
}

export class AIClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(env: Env) {
    this.apiUrl = 'https://ai-worker-api.emily-cogsdill.workers.dev';
    this.apiKey = env.AI_WORKER_API_SECRET_KEY;
    console.log('🤖 AI Client Debug - Constructor - API URL:', this.apiUrl);
    console.log('🤖 AI Client Debug - Constructor - API Key present:', !!this.apiKey);
    console.log('🤖 AI Client Debug - Constructor - Environment keys:', Object.keys(env));
  }

  /**
   * Make a chat completion request to the AI worker API
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.apiUrl}/api/chat`;
    
    try {
      console.log('🤖 AI Client Debug - Making request to:', url);
      console.log('🤖 AI Client Debug - API Key present:', !!this.apiKey);
      console.log('🤖 AI Client Debug - API Key length:', this.apiKey?.length || 0);
      console.log('🤖 AI Client Debug - Request body:', JSON.stringify(request, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      console.log('🤖 AI Client Debug - Response status:', response.status);
      console.log('🤖 AI Client Debug - Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        console.log('🤖 AI Client Debug - Response not OK, handling error...');
        await this.handleApiError(response);
      }

      const data = await response.json() as ChatCompletionResponse;
      console.log('🤖 AI Client Debug - Response data:', JSON.stringify(data, null, 2));
      return data;
    } catch (error) {
      console.log('🤖 AI Client Debug - Caught error:', error);
      console.log('🤖 AI Client Debug - Error type:', error instanceof Error ? error.constructor.name : typeof error);
      
      if (error instanceof AIClientError) {
        console.log('🤖 AI Client Debug - Re-throwing AIClientError');
        throw error;
      }
      
      // Handle network errors or other fetch errors
      const errorMessage = `Failed to connect to AI worker API: ${error instanceof Error ? error.message : String(error)}`;
      console.log('🤖 AI Client Debug - Creating new AIClientError:', errorMessage);
      throw new AIClientError(
        errorMessage,
        undefined,
        'connection_error',
        'network_error'
      );
    }
  }

  /**
   * Convenience method for single message completion
   */
  async complete(
    message: string,
    options: {
      temperature?: number;
      max_tokens?: number;
      model?: string;
      systemPrompt?: string;
    } = {}
  ): Promise<string> {
    // Combine system prompt and user message into single user message
    let combinedMessage = message;
    if (options.systemPrompt) {
      combinedMessage = `${options.systemPrompt}\n\nUser input: ${message}`;
    }

    const request: ChatCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: combinedMessage,
        },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1024,
      model: options.model ?? '@cf/meta/llama-3.1-8b-instruct',
    };

    const response = await this.chatCompletion(request);
    
    if (!response.choices || response.choices.length === 0) {
      throw new AIClientError(
        'No completion choices returned from API',
        undefined,
        'no_choices',
        'api_error'
      );
    }

    const choice = response.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new AIClientError(
        'Empty completion content returned from API',
        undefined,
        'empty_content',
        'api_error'
      );
    }

    return choice.message.content;
  }

  /**
   * Handle API error responses
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorCode = 'http_error';
    let errorType = 'api_error';

    try {
      const errorData = await response.json() as ApiError;
      if (errorData.error) {
        errorMessage = errorData.error.message || errorMessage;
        errorCode = errorData.error.code || errorCode;
        errorType = errorData.error.type || errorType;
      }
    } catch {
      // If we can't parse the error response, use the default HTTP error message
    }

    throw new AIClientError(errorMessage, response.status, errorCode, errorType);
  }

  /**
   * Health check method to verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.complete('Hello', {
        max_tokens: 10,
        temperature: 0,
      });
      return response.length > 0;
    } catch (error) {
      console.error('AI client health check failed:', error);
      return false;
    }
  }
}

/**
 * Factory function to create an AI client instance
 */
export function createAIClient(env: Env): AIClient {
  return new AIClient(env);
}