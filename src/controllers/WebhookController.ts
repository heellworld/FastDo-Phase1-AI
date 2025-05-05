import { sendChatMessage, ControllerResponse, ErrorType, ErrorResponse } from './ChatController';
import API_CONFIG from '../config/api.config';
import { ApiResponse } from '../services/api';

/**
 * Maximum number of retry attempts for failed requests
 */
const MAX_RETRIES = API_CONFIG.MAX_RETRIES;

/**
 * Delay between retry attempts in milliseconds
 */
const RETRY_DELAY = API_CONFIG.RETRY_DELAY;

/**
 * Sleep function for delay
 * @param ms Milliseconds to sleep
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Interface for retry options
 */
interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: ErrorType[];
}

/**
 * Send a message to the n8n webhook with retry logic
 * @param prompt User message
 * @param sessionId Session identifier
 * @param options Retry options
 * @returns Promise with the API response or error
 */
export async function sendWebhookMessage(
  prompt: string,
  sessionId: string,
  options: RetryOptions = {}
): Promise<ControllerResponse> {
  const {
    maxRetries = MAX_RETRIES,
    retryDelay = RETRY_DELAY,
    retryableErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.TIMEOUT_ERROR
    ]
  } = options;

  let lastResponse: ControllerResponse | null = null;
  let retries = 0;
  
  // Attempt the request with retries
  while (retries <= maxRetries) {
    lastResponse = await sendChatMessage(
      API_CONFIG.WEBHOOK_URL,
      prompt,
      sessionId,
      API_CONFIG.REQUEST_TIMEOUT
    );
    
    // If successful or not a retryable error, return immediately
    if (
      lastResponse.success || 
      !lastResponse.error ||
      !retryableErrors.includes(lastResponse.error.type)
    ) {
      return lastResponse;
    }
    
    // Log retry attempt
    console.warn(`Retry attempt ${retries + 1}/${maxRetries + 1} for error: ${lastResponse.error.type}`);
    
    // If we've reached max retries, break out
    if (retries >= maxRetries) {
      break;
    }
    
    // Wait before retrying
    await sleep(retryDelay * (retries + 1));
    retries++;
  }
  
  // Return the last response if all retries failed
  return lastResponse || {
    success: false,
    error: {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'Failed to process webhook request after multiple attempts'
    }
  };
}

/**
 * Log webhook errors to console or monitoring service
 * @param error Error response
 */
export function logWebhookError(error: ErrorResponse): void {
  // For now, just log to console
  // In production, you might want to send this to a logging service
  console.error(`[WebhookError] ${error.type}: ${error.message}`, error);
  
  // Add any additional error tracking logic here
}

/**
 * Format the webhook response for client display
 * @param data API response data
 * @returns Formatted response
 */
export function formatWebhookResponse(data: ApiResponse): ApiResponse {
  // Process the response data if needed
  // For example, combining multiple fields or formatting the text
  
  return {
    text: data.text || data.message || "No response text",
    image: data.image || data.imageUrl || data.url
  };
} 