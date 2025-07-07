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
    this.apiUrl = 'https://ai.emilycogsdill.com';
    this.apiKey = env.AI_WORKER_API_SECRET_KEY;
  }

  /**
   * Make a chat completion request to the AI worker API
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = `${this.apiUrl}/api/chat`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const data = await response.json() as ChatCompletionResponse;
      return data;
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error;
      }
      
      // Handle network errors or other fetch errors
      throw new AIClientError(
        `Failed to connect to AI worker API: ${error instanceof Error ? error.message : String(error)}`,
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
    const messages: ChatMessage[] = [];
    
    // Add system prompt if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }
    
    // Add user message
    messages.push({
      role: 'user',
      content: message,
    });

    const request: ChatCompletionRequest = {
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      model: options.model,
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