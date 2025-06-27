// Mock helper functions for API responses
export function createMockResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function createMockPreviewResponse(originalMessage: string, transformedMessage: string, persona: string = 'none') {
  return {
    transformedMessage,
    originalMessage,
    persona,
    rateLimitRemaining: 9,
    rateLimitReset: Date.now() + 60000
  };
}

export function createMockRateLimitStatus(remaining: number = 10, limit: number = 10) {
  return {
    remaining,
    reset: Date.now() + 60000,
    limit
  };
}

export async function waitFor(conditionFn: () => boolean, timeout: number = 1000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (conditionFn()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}