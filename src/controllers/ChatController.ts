import { ApiResponse } from '../services/api';

// Define all possible error types
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Error response structure
export interface ErrorResponse {
  type: ErrorType;
  message: string;
  status?: number;
  details?: any;
}

// Response from the controller
export interface ControllerResponse {
  success: boolean;
  data?: ApiResponse;
  error?: ErrorResponse;
}

/**
 * Process API response and handle errors
 * @param response Fetch API response
 * @returns Processed response data
 */
async function processResponse(response: Response): Promise<ApiResponse> {
  if (!response.ok) {
    // Handle different HTTP error codes
    if (response.status === 401 || response.status === 403) {
      throw {
        type: ErrorType.AUTH_ERROR,
        message: 'Authentication error',
        status: response.status
      };
    } else if (response.status === 429) {
      throw {
        type: ErrorType.RATE_LIMIT_ERROR,
        message: 'Rate limit exceeded',
        status: response.status
      };
    } else if (response.status >= 500) {
      throw {
        type: ErrorType.SERVER_ERROR,
        message: 'Server error',
        status: response.status
      };
    } else if (response.status === 400) {
      throw {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Invalid request data',
        status: response.status
      };
    } else {
      throw {
        type: ErrorType.UNKNOWN_ERROR,
        message: `HTTP error! status: ${response.status}`,
        status: response.status
      };
    }
  }

  try {
    return await response.json();
  } catch (error) {
    throw {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'Failed to parse response',
      details: error
    };
  }
}

/**
 * Send a message to the webhook endpoint
 * @param url Webhook URL
 * @param prompt User message
 * @param sessionId Session identifier
 * @param timeout Request timeout in milliseconds
 * @returns Controller response with data or error
 */
export async function sendChatMessage(
  url: string,
  prompt: string,
  sessionId: string,
  timeout: number = 30000
): Promise<ControllerResponse> {
  // Create AbortController for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Validate inputs
    if (!prompt.trim()) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Message cannot be empty'
        }
      };
    }

    if (!sessionId) {
      return {
        success: false,
        error: {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Session ID is required'
        }
      };
    }

    // Make the request with timeout
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        sessionId
      }),
      signal: controller.signal
    });

    const data = await processResponse(response);
    
    return {
      success: true,
      data
    };
  } catch (error: any) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: {
          type: ErrorType.TIMEOUT_ERROR,
          message: 'Request timed out'
        }
      };
    }

    if (error instanceof TypeError && error.message.includes('network')) {
      return {
        success: false,
        error: {
          type: ErrorType.NETWORK_ERROR,
          message: 'Network connection error',
          details: error.message
        }
      };
    }

    // Return structured error response
    return {
      success: false,
      error: error.type ? error : {
        type: ErrorType.UNKNOWN_ERROR,
        message: error.message || 'Unknown error occurred',
        details: error
      }
    };
  } finally {
    // Clear the timeout
    clearTimeout(timeoutId);
  }
} 