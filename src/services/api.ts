import { ControllerResponse, ErrorResponse } from '../controllers/ChatController';
import { sendWebhookMessage, formatWebhookResponse, logWebhookError } from '../controllers/WebhookController';

export interface ApiResponse {
  text?: string;
  message?: string;
  image?: string;
  imageUrl?: string;
  url?: string;
  raw?: any;
}

/**
 * Send a message to the chatbot
 * @param prompt The user's message
 * @param sessionId The session ID for conversation context
 * @returns Promise with the API response
 * @throws Error if the request fails
 */
export async function sendMessage(prompt: string, sessionId: string): Promise<ApiResponse> {
  try {
    // Use the webhook controller to send the message with retry logic
    const response: ControllerResponse = await sendWebhookMessage(prompt, sessionId, { isDevMode: true });

    // Handle errors
    if (!response.success || !response.data) {
      if (response.error) {
        // Log the error with detailed info
        logWebhookError(response.error, true);
        console.error('[API Error Details]', response.devInfo);
        throw new Error(response.error.message);
      }
      throw new Error('Failed to get response from server');
    }

    // Format the response for client display
    return formatWebhookResponse(response.data, true);
  } catch (error: any) {
    console.error('[SendMessage Error]', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unexpected error: ${JSON.stringify(error)}`);
  }
}

/**
 * Get the error details from an error response
 * @param error The error object
 * @returns ErrorResponse or null if not available
 */
export function getErrorDetails(error: any): ErrorResponse | null {
  if (error && error.type) {
    return error as ErrorResponse;
  }
  return null;
} 