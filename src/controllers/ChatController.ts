import { ApiResponse } from '../services/api';
import logger, { LogLevel } from '../utils/logger';

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
  message: string;         // Thông báo hiển thị cho user
  devMessage?: string;     // Thông báo chi tiết cho developer
  status?: number;
  details?: any;
  timestamp?: number;
}

// Response from the controller
export interface ControllerResponse {
  success: boolean;
  data?: ApiResponse;
  error?: ErrorResponse;
  devInfo?: {
    request?: any;
    response?: any;
    logs?: string[];
    executionTime?: number;
  };
}

// Thông báo thân thiện cho user
const USER_FRIENDLY_MESSAGES = {
  [ErrorType.NETWORK_ERROR]: 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối internet của bạn và thử lại sau.',
  [ErrorType.SERVER_ERROR]: 'Hệ thống đang được bảo trì. Vui lòng thử lại sau ít phút.',
  [ErrorType.TIMEOUT_ERROR]: 'Máy chủ đang phản hồi chậm. Vui lòng thử lại sau.',
  [ErrorType.AUTH_ERROR]: 'Phiên làm việc của bạn đã hết hạn. Vui lòng làm mới trang và đăng nhập lại.',
  [ErrorType.RATE_LIMIT_ERROR]: 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.',
  [ErrorType.VALIDATION_ERROR]: 'Thông tin bạn nhập không hợp lệ. Vui lòng kiểm tra lại.',
  [ErrorType.UNKNOWN_ERROR]: 'Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.'
};

/**
 * Process API response and handle errors
 * @param response Fetch API response
 * @returns Processed response data
 */
async function processResponse(response: Response): Promise<ApiResponse> {
  if (!response.ok) {
    const errorResponse: ErrorResponse = {
      type: ErrorType.UNKNOWN_ERROR, // Default type, will be overridden
      message: USER_FRIENDLY_MESSAGES[ErrorType.UNKNOWN_ERROR], // Default message, will be overridden
      timestamp: Date.now()
    };
    
    // Handle different HTTP error codes
    if (response.status === 401 || response.status === 403) {
      errorResponse.type = ErrorType.AUTH_ERROR;
      errorResponse.message = USER_FRIENDLY_MESSAGES[ErrorType.AUTH_ERROR];
      errorResponse.devMessage = `Authentication error: HTTP ${response.status}`;
      errorResponse.status = response.status;
      
      logger.error(`Authentication error: HTTP ${response.status}`, 'ChatController.processResponse', {
        type: ErrorType.AUTH_ERROR,
        details: {
          status: response.status,
          url: response.url,
          headers: Object.fromEntries([...response.headers])
        }
      });
      
      throw errorResponse;
    } else if (response.status === 429) {
      errorResponse.type = ErrorType.RATE_LIMIT_ERROR;
      errorResponse.message = USER_FRIENDLY_MESSAGES[ErrorType.RATE_LIMIT_ERROR];
      errorResponse.devMessage = `Rate limit exceeded: HTTP ${response.status}`;
      errorResponse.status = response.status;
      
      logger.warning(`Rate limit exceeded: HTTP ${response.status}`, 'ChatController.processResponse', {
        type: ErrorType.RATE_LIMIT_ERROR,
        details: {
          status: response.status,
          url: response.url
        }
      });
      
      throw errorResponse;
    } else if (response.status >= 500) {
      errorResponse.type = ErrorType.SERVER_ERROR;
      errorResponse.message = USER_FRIENDLY_MESSAGES[ErrorType.SERVER_ERROR];
      errorResponse.devMessage = `Server error: HTTP ${response.status}`;
      errorResponse.status = response.status;
      
      logger.error(`Server error: HTTP ${response.status}`, 'ChatController.processResponse', {
        type: ErrorType.SERVER_ERROR,
        details: {
          status: response.status,
          url: response.url
        }
      });
      
      throw errorResponse;
    } else if (response.status === 400) {
      errorResponse.type = ErrorType.VALIDATION_ERROR;
      errorResponse.message = USER_FRIENDLY_MESSAGES[ErrorType.VALIDATION_ERROR];
      errorResponse.devMessage = `Invalid request data: HTTP ${response.status}`;
      errorResponse.status = response.status;
      
      logger.warning(`Invalid request data: HTTP ${response.status}`, 'ChatController.processResponse', {
        type: ErrorType.VALIDATION_ERROR,
        details: {
          status: response.status,
          url: response.url
        }
      });
      
      throw errorResponse;
    } else {
      errorResponse.type = ErrorType.UNKNOWN_ERROR;
      errorResponse.message = USER_FRIENDLY_MESSAGES[ErrorType.UNKNOWN_ERROR];
      errorResponse.devMessage = `HTTP error! status: ${response.status}`;
      errorResponse.status = response.status;
      
      logger.error(`HTTP error! status: ${response.status}`, 'ChatController.processResponse', {
        type: ErrorType.UNKNOWN_ERROR,
        details: {
          status: response.status,
          url: response.url
        }
      });
      
      throw errorResponse;
    }
  }

  try {
    // First try to read as text to examine content
    const textResponse = await response.text();
    
    // Log raw response for debugging
    logger.info('Raw API response received', 'ChatController.processResponse', {
      details: {
        responseLength: textResponse.length,
        responsePreview: textResponse.length > 500 ? 
          textResponse.substring(0, 500) + '...' : textResponse
      }
    });
    
    // Check for empty response
    if (!textResponse || textResponse.trim() === '') {
      logger.warning('Server returned empty response with status 200', 'ChatController.processResponse', {
        details: {
          status: response.status,
          url: response.url
        }
      });
      
      return {
        text: "Máy chủ không trả về nội dung. Vui lòng thử lại sau.",
        raw: { emptyResponse: true, status: response.status }
      };
    }
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(textResponse);
      return jsonData;
    } catch (error) {
      const errorStack = (error as Error).stack || '';
      
      logger.error('Failed to parse JSON response from API', 'ChatController.processResponse', {
        details: {
          error: (error as Error).message,
          responseText: textResponse.length > 1000 ? 
            textResponse.substring(0, 1000) + '...' : textResponse
        },
        stackTrace: errorStack
      });
      
      // If response is not valid JSON but has content, try to create basic response
      if (textResponse && textResponse.trim()) {
        return {
          text: textResponse,
          raw: textResponse
        };
      }
      
      throw {
        type: ErrorType.UNKNOWN_ERROR,
        message: 'Máy chủ không phản hồi đúng định dạng. Vui lòng thử lại sau.',
        devMessage: 'Failed to parse JSON response from API',
        details: { error, responseText: textResponse.length > 200 ? 
          textResponse.substring(0, 200) + '...' : textResponse },
        timestamp: Date.now()
      };
    }
  } catch (error) {
    // If error is already an ErrorResponse, just re-throw it
    if ((error as ErrorResponse).type) {
      throw error;
    }
    
    const errorStack = (error as Error).stack || '';
    
    logger.error('Failed to process API response', 'ChatController.processResponse', {
      details: error,
      stackTrace: errorStack
    });
    
    throw {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'Máy chủ không phản hồi đúng định dạng. Vui lòng thử lại sau.',
      devMessage: 'Failed to process API response',
      details: error,
      timestamp: Date.now()
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
  const startTime = Date.now();
  const logs: string[] = [`Request started at ${new Date(startTime).toISOString()}`];
  const requestId = generateRequestId();

  // Log request start
  logger.info(`Starting chat request to ${url.split('?')[0]}`, 'ChatController.sendChatMessage', {
    context: {
      sessionId,
      requestId
    },
    details: {
      promptLength: prompt.length,
      timeout
    }
  });

  try {
    // Validate inputs
    if (!prompt.trim()) {
      const error = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Vui lòng nhập nội dung tin nhắn.',
        devMessage: 'Empty message provided by user',
        timestamp: Date.now()
      };
      
      logger.warning('Empty message provided by user', 'ChatController.sendChatMessage', {
        context: {
          sessionId,
          requestId
        },
        type: ErrorType.VALIDATION_ERROR
      });
      
      return {
        success: false,
        error,
        devInfo: {
          logs,
          executionTime: Date.now() - startTime
        }
      };
    }

    if (!sessionId) {
      const error = {
        type: ErrorType.VALIDATION_ERROR,
        message: USER_FRIENDLY_MESSAGES[ErrorType.VALIDATION_ERROR],
        devMessage: 'Session ID is required but was not provided',
        timestamp: Date.now()
      };
      
      logger.warning('Session ID is required but was not provided', 'ChatController.sendChatMessage', {
        context: {
          requestId
        },
        type: ErrorType.VALIDATION_ERROR
      });
      
      return {
        success: false,
        error,
        devInfo: {
          logs,
          executionTime: Date.now() - startTime
        }
      };
    }

    logs.push(`Sending request to ${url}`);
    
    // Prepare request data
    const requestData = {
      message: prompt,
      sessionId
    };
    
    // Log fetch attempt
    logger.info('Sending fetch request', 'ChatController.sendChatMessage', {
      context: {
        sessionId,
        requestId
      },
      details: {
        url: url.split('?')[0],
        method: 'POST'
      }
    });

    try {
      // Send the request
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        signal: controller.signal
      });

      logs.push(`Received response with status ${response.status}`);
      
      // Log response received
      logger.info(`Received response with status ${response.status}`, 'ChatController.sendChatMessage', {
        context: {
          sessionId,
          requestId
        },
        details: {
          status: response.status,
          ok: response.ok
        }
      });

      // Process the response
      const data = await processResponse(response);

      // Clean up the timeout
      clearTimeout(timeoutId);

      // Return successful response
      return {
        success: true,
        data,
        devInfo: {
          request: requestData,
          response: data,
          logs,
          executionTime: Date.now() - startTime
        }
      };
    } catch (error) {
      // Handle fetch errors
      if ((error as DOMException).name === 'AbortError') {
        logs.push(`Request timed out after ${timeout}ms`);
        
        const timeoutError = {
          type: ErrorType.TIMEOUT_ERROR,
          message: USER_FRIENDLY_MESSAGES[ErrorType.TIMEOUT_ERROR],
          devMessage: `Request timed out after ${timeout}ms`,
          timestamp: Date.now()
        };
        
        logger.error(`Request timed out after ${timeout}ms`, 'ChatController.sendChatMessage', {
          context: {
            sessionId,
            requestId
          },
          type: ErrorType.TIMEOUT_ERROR,
          details: {
            timeout,
            url: url.split('?')[0]
          }
        });
        
        return {
          success: false,
          error: timeoutError,
          devInfo: {
            request: requestData,
            logs,
            executionTime: Date.now() - startTime
          }
        };
      } else {
        // Handle network errors
        const errorMessage = (error as Error).message;
        logs.push(`Network error: ${errorMessage}`);
        
        const isServerError = (error as ErrorResponse).type === ErrorType.SERVER_ERROR;
        const errorType = isServerError ? ErrorType.SERVER_ERROR : ErrorType.NETWORK_ERROR;
        const errorMessage2 = isServerError 
          ? USER_FRIENDLY_MESSAGES[ErrorType.SERVER_ERROR]
          : USER_FRIENDLY_MESSAGES[ErrorType.NETWORK_ERROR];
        const devMessage = isServerError
          ? (error as ErrorResponse).devMessage || `Server error: ${errorMessage}`
          : `Network error: ${errorMessage}`;
        
        const networkError = {
          type: errorType,
          message: errorMessage2,
          devMessage,
          timestamp: Date.now(),
          details: error
        };
        
        const errorStack = (error as Error).stack || '';
        
        logger.error(devMessage, 'ChatController.sendChatMessage', {
          context: {
            sessionId,
            requestId
          },
          type: errorType,
          details: error,
          stackTrace: errorStack
        });
        
        return {
          success: false,
          error: networkError,
          devInfo: {
            request: requestData,
            logs,
            executionTime: Date.now() - startTime
          }
        };
      }
    }
  } catch (error) {
    // Handle any uncaught errors
    clearTimeout(timeoutId);
    const errorMessage = (error as Error).message;
    logs.push(`Unexpected error: ${errorMessage}`);
    
    const errorStack = (error as Error).stack || '';
    
    logger.error(`Unexpected error in sendChatMessage: ${errorMessage}`, 'ChatController', {
      context: {
        sessionId,
        requestId
      },
      type: ErrorType.UNKNOWN_ERROR,
      details: error,
      stackTrace: errorStack
    });

    return {
      success: false,
      error: {
        type: ErrorType.UNKNOWN_ERROR,
        message: USER_FRIENDLY_MESSAGES[ErrorType.UNKNOWN_ERROR],
        devMessage: `Unexpected error: ${errorMessage}`,
        timestamp: Date.now(),
        details: error
      },
      devInfo: {
        logs,
        executionTime: Date.now() - startTime
      }
    };
  }
}

/**
 * Generate a unique request ID
 * @returns Unique request ID string
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
} 