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
    this.apiUrl = 'https://ai-worker.emily-cogsdill.workers.dev';
    this.apiKey = env.AI_WORKER_API_SECRET_KEY;
    console.log('🤖 AI Client Debug - Constructor - API URL:', this.apiUrl);
    console.log('🤖 AI Client Debug - Constructor - API Key present:', !!this.apiKey);
    console.log('🤖 AI Client Debug - Constructor - Environment keys:', Object.keys(env));
  }

  /**
   * Make a chat completion request to the AI worker API
   * NOTE: This method converts to the simplified v1/chat endpoint format
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    console.log('🤖 AI Client Debug - Converting ChatCompletionRequest to v1/chat format');
    
    // Extract the user message from the messages array
    const userMessage = request.messages.find(msg => msg.role === 'user')?.content || '';
    const systemMessage = request.messages.find(msg => msg.role === 'system')?.content;
    
    let input = userMessage;
    if (systemMessage) {
      input = `${systemMessage}\n\nUser input: ${userMessage}`;
    }
    
    try {
      // Use the simpleChat method which already handles the v1/chat endpoint
      const responseText = await this.simpleChat(input);
      
      // Convert the simple response back to ChatCompletionResponse format
      const response: ChatCompletionResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: 'ai-worker', // Let AI worker handle model selection
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: responseText
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: input.length, // Rough estimate
          completion_tokens: responseText.length, // Rough estimate
          total_tokens: input.length + responseText.length
        }
      };
      
      console.log('🤖 AI Client Debug - Converted response:', JSON.stringify(response, null, 2));
      return response;
    } catch (error) {
      console.log('🤖 AI Client Debug - Caught error in chatCompletion:', error);
      throw error;
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
      useSimpleEndpoint?: boolean;
    } = {}
  ): Promise<string> {
    // For simple use cases, use the simpler /api/v1/chat endpoint
    if (options.useSimpleEndpoint !== false && options.systemPrompt && !options.model) {
      try {
        return await this.simpleChat(message, options.systemPrompt);
      } catch (error) {
        console.log('🤖 AI Client Debug - Simple chat failed, falling back to full endpoint:', error);
        // Fall through to use the full chat completion endpoint
      }
    }

    // Combine system prompt and user message into single user message for full endpoint
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

    // Handle specific error cases
    if (response.status === 401) {
      errorMessage = 'Authentication failed. Please check your API key.';
      errorCode = 'invalid_api_key';
      errorType = 'authentication_error';
    } else if (response.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
      errorCode = 'rate_limit_exceeded';
      errorType = 'rate_limit_error';
      
      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        errorMessage += ` Retry after ${retryAfter} seconds.`;
      }
    }

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
   * Simple chat endpoint for basic completions
   */
  async simpleChat(message: string, systemPrompt?: string): Promise<string> {
    const url = `${this.apiUrl}/api/v1/chat`;
    
    try {
      console.log('🤖 AI Client Debug - Simple chat request to:', url);
      
      // Combine system prompt with user message if provided
      let combinedMessage = message;
      if (systemPrompt) {
        combinedMessage = `${systemPrompt}\n\nUser input: ${message}`;
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Anonymous-Comment-Box-AI-Client/1.0',
        },
        body: JSON.stringify({
          input: combinedMessage
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      console.log('🤖 AI Client Debug - Simple chat response status:', response.status);

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const data = await response.json() as any;
      console.log('🤖 AI Client Debug - Simple chat response data:', JSON.stringify(data, null, 2));
      
      if (data.error) {
        throw new AIClientError(
          data.error,
          response.status,
          'simple_chat_error',
          'api_error'
        );
      }

      // Extract response text from the complex structure (same as chat endpoint)
      let responseText = 'No response received';
      
      if (data.output && Array.isArray(data.output)) {
        console.log('🤖 AI Client - Found output array with', data.output.length, 'items');
        
        // Look for the assistant message in the output array
        const assistantMessage = data.output.find((item: any) => 
          item.type === 'message' && item.role === 'assistant'
        );
        
        if (assistantMessage && assistantMessage.content && Array.isArray(assistantMessage.content)) {
          console.log('🤖 AI Client - Assistant content array has', assistantMessage.content.length, 'items');
          
          // Extract the main text response
          const textContent = assistantMessage.content.find((content: any) => content.type === 'output_text');
          if (textContent && textContent.text) {
            responseText = textContent.text;
            console.log('🤖 AI Client - Extracted response text:', responseText);
          }
        }
      }
      
      return responseText;
    } catch (error) {
      if (error instanceof AIClientError) {
        throw error;
      }
      
      const errorMessage = `Failed to connect to AI worker API: ${error instanceof Error ? error.message : String(error)}`;
      throw new AIClientError(
        errorMessage,
        undefined,
        'connection_error',
        'network_error'
      );
    }
  }

  /**
   * Health check method to verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.simpleChat('Hello', 'Respond with a simple greeting.');
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