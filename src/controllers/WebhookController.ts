import { sendChatMessage, ControllerResponse, ErrorType, ErrorResponse } from './ChatController';
import API_CONFIG from '../config/api.config';
import { ApiResponse } from '../services/api';
import logger, { LogLevel } from '../utils/logger';

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
  isDevMode?: boolean;
}

// Thông báo thân thiện cho user khi xảy ra lỗi retry
const USER_RETRY_MESSAGES = {
  [ErrorType.NETWORK_ERROR]: 'Kết nối mạng không ổn định. Hệ thống đang thử kết nối lại...',
  [ErrorType.SERVER_ERROR]: 'Máy chủ đang tạm thời quá tải. Hệ thống đang thử kết nối lại...',
  [ErrorType.TIMEOUT_ERROR]: 'Máy chủ phản hồi chậm. Hệ thống đang thử kết nối lại...',
  [ErrorType.AUTH_ERROR]: 'Xảy ra lỗi xác thực. Hệ thống đang thử lại...',
  [ErrorType.RATE_LIMIT_ERROR]: 'Đã vượt quá giới hạn yêu cầu. Hệ thống đang thử lại...',
  [ErrorType.VALIDATION_ERROR]: 'Thông tin không hợp lệ. Hệ thống đang thử lại...',
  [ErrorType.UNKNOWN_ERROR]: 'Đang thử kết nối lại với máy chủ...'
};

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
    ],
    isDevMode = false
  } = options;

  let lastResponse: ControllerResponse | null = null;
  let retries = 0;
  const startTime = Date.now();
  const logs: string[] = [`WebhookController: Started at ${new Date(startTime).toISOString()}`];
  const requestId = generateRequestId();
  
  // Log the start of the request
  logger.info(`Started webhook request (ID: ${requestId})`, 'WebhookController', {
    context: {
      sessionId,
      requestId,
      path: 'webhook'
    },
    details: { prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') }
  });
  
  // Validate input parameters
  if (!prompt || !prompt.trim()) {
    logs.push('WebhookController: Empty prompt provided');
    
    // Log the validation error
    logger.warning('Empty prompt provided', 'WebhookController', {
      context: {
        sessionId,
        requestId
      }
    });
    
    return {
      success: false,
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Vui lòng nhập nội dung tin nhắn.',
        devMessage: 'Empty prompt provided',
        timestamp: Date.now()
      },
      devInfo: isDevMode ? {
        request: { prompt, sessionId },
        logs,
        executionTime: Date.now() - startTime
      } : undefined
    };
  }
  
  if (!sessionId) {
    logs.push('WebhookController: Missing sessionId');
    
    // Log the validation error
    logger.warning('Missing sessionId', 'WebhookController', {
      context: {
        requestId
      }
    });
    
    return {
      success: false,
      error: {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Phiên làm việc không hợp lệ. Vui lòng làm mới trang.',
        devMessage: 'Missing sessionId',
        timestamp: Date.now()
      },
      devInfo: isDevMode ? {
        request: { prompt, sessionId },
        logs,
        executionTime: Date.now() - startTime
      } : undefined
    };
  }
  
  // Attempt the request with retries
  while (retries <= maxRetries) {
    logs.push(`WebhookController: Attempt ${retries + 1}/${maxRetries + 1}`);
    
    try {
      lastResponse = await sendChatMessage(
        API_CONFIG.WEBHOOK_URL,
        prompt,
        sessionId,
        API_CONFIG.REQUEST_TIMEOUT
      );
      
      // Log response status and check for empty content issues
      if (lastResponse.data && Object.keys(lastResponse.data).length === 0) {
        logs.push('WebhookController: Received empty object as response data');
        logger.warning('Received empty object as response data', 'WebhookController', {
          context: {
            sessionId,
            requestId
          }
        });
      } else if (!lastResponse.data && lastResponse.success) {
        logs.push('WebhookController: Marked as success but no data returned');
        logger.error('Marked as success but no data returned', 'WebhookController', {
          context: {
            sessionId,
            requestId
          }
        });
        
        lastResponse.success = false;
        lastResponse.error = {
          type: ErrorType.UNKNOWN_ERROR,
          message: 'Máy chủ không trả về nội dung. Vui lòng thử lại sau.',
          devMessage: 'Server returned success but no data',
          timestamp: Date.now()
        };
      }
      
      // Nếu thành công hoặc không phải lỗi có thể retry, trả về kết quả ngay
      if (
        lastResponse.success || 
        !lastResponse.error ||
        !retryableErrors.includes(lastResponse.error.type)
      ) {
        logs.push(`WebhookController: Request ${lastResponse.success ? 'successful' : 'failed with non-retryable error'}`);
        
        // Log success or non-retryable error
        if (lastResponse.success) {
          logger.info(`Request successful (ID: ${requestId})`, 'WebhookController', {
            context: {
              sessionId,
              requestId
            },
            details: {
              executionTime: Date.now() - startTime
            }
          });
        } else if (lastResponse.error) {
          logWebhookError(lastResponse.error, isDevMode, { 
            sessionId, 
            requestId,
            context: `Non-retryable error after attempt ${retries + 1}` 
          });
        }
        
        // Thêm devInfo nếu isDevMode là true
        if (isDevMode && lastResponse.devInfo) {
          lastResponse.devInfo.logs = [...lastResponse.devInfo.logs || [], ...logs];
          lastResponse.devInfo.executionTime = Date.now() - startTime;
        }
        
        return lastResponse;
      }
      
      // Nếu retry thất bại nhưng vẫn còn lượt thử, thay đổi message hiển thị cho user
      if (retries < maxRetries && lastResponse.error) {
        // Ghi log đầy đủ cho dev
        logs.push(`WebhookController: Retry attempt ${retries + 1}/${maxRetries} for error: ${lastResponse.error.type}`);
        
        // Log the retry attempt
        logger.warning(`Retry attempt ${retries + 1}/${maxRetries} for error: ${lastResponse.error.type}`, 'WebhookController', {
          context: {
            sessionId,
            requestId
          },
          type: lastResponse.error.type,
          details: lastResponse.error
        });
        
        // Cập nhật thông báo cho user trong thời gian retry
        const errorType = lastResponse.error.type as ErrorType;
        lastResponse.error.message = USER_RETRY_MESSAGES[errorType] || USER_RETRY_MESSAGES[ErrorType.UNKNOWN_ERROR];
        
        if (isDevMode && lastResponse.devInfo) {
          lastResponse.devInfo.logs = logs;
        }
      }
    } catch (error) {
      const errorMessage = (error as Error).message;
      logs.push(`WebhookController: Unexpected error during request: ${errorMessage}`);
      
      // Log the unexpected error
      logger.error(`Unexpected error during request: ${errorMessage}`, 'WebhookController', {
        context: {
          sessionId,
          requestId
        },
        stackTrace: (error as Error).stack || '',
        details: error
      });
      
      // Create a generic error response
      lastResponse = {
        success: false,
        error: {
          type: ErrorType.UNKNOWN_ERROR,
          message: USER_RETRY_MESSAGES[ErrorType.UNKNOWN_ERROR],
          devMessage: `Unexpected error: ${errorMessage}`,
          timestamp: Date.now()
        },
        devInfo: isDevMode ? {
          request: { prompt, sessionId },
          logs,
          executionTime: Date.now() - startTime
        } : undefined
      };
    }
    
    // Nếu đạt giới hạn retries, dừng lại
    if (retries >= maxRetries) {
      logs.push(`WebhookController: Maximum retries (${maxRetries}) reached`);
      
      // Log the maximum retries reached
      if (lastResponse?.error) {
        logger.error(`Maximum retries (${maxRetries}) reached for request ${requestId}`, 'WebhookController', {
          context: {
            sessionId,
            requestId
          },
          type: lastResponse.error.type,
          details: lastResponse.error
        });
      }
      break;
    }
    
    // Chờ trước khi thử lại
    const waitTime = retryDelay * (retries + 1);
    logs.push(`WebhookController: Waiting ${waitTime}ms before next attempt`);
    await sleep(waitTime);
    retries++;
  }
  
  // Return lại response cuối cùng nếu tất cả retries thất bại
  if (lastResponse) {
    if (isDevMode && lastResponse.devInfo) {
      lastResponse.devInfo.logs = [...lastResponse.devInfo.logs || [], ...logs];
      lastResponse.devInfo.executionTime = Date.now() - startTime;
    }
    
    return lastResponse;
  }
  
  // Nếu không có response nào (rất hiếm gặp)
  const fallbackError = {
    success: false,
    error: {
      type: ErrorType.UNKNOWN_ERROR,
      message: 'Kết nối đến máy chủ không thành công. Vui lòng thử lại sau.',
      devMessage: 'Failed to process webhook request after multiple attempts - no response',
      timestamp: Date.now()
    },
    devInfo: isDevMode ? {
      request: { prompt, sessionId, options },
      logs,
      executionTime: Date.now() - startTime
    } : undefined
  };
  
  // Log the critical failure
  logger.critical('Failed to process webhook request after multiple attempts - no response', 'WebhookController', {
    context: {
      sessionId,
      requestId
    },
    details: {
      retries,
      executionTime: Date.now() - startTime
    }
  });
  
  return fallbackError;
}

/**
 * Generate a unique request ID
 * @returns Unique request ID string
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Log webhook errors to file and console
 * @param error Error response
 * @param isDevMode Whether to show more detailed logs
 * @param context Additional context information
 */
export function logWebhookError(
  error: ErrorResponse, 
  isDevMode: boolean = false, 
  context: { sessionId?: string; requestId?: string; context?: string } = {}
): void {
  const { type, message, devMessage, details, timestamp } = error;
  const errorMessage = devMessage || message;
  
  // Log to file system
  const logLevel = 
    type === ErrorType.VALIDATION_ERROR ? LogLevel.WARNING : 
    (type === ErrorType.NETWORK_ERROR || type === ErrorType.TIMEOUT_ERROR) ? LogLevel.WARNING : 
    LogLevel.ERROR;
  
  logger.log({
    level: logLevel,
    timestamp: new Date(timestamp || Date.now()).toISOString(),
    message: errorMessage,
    type,
    category: 'WebhookController',
    details: details || error,
    context: {
      sessionId: context.sessionId,
      requestId: context.requestId,
      path: 'webhook'
    }
  });
  
  // For backward compatibility
  if (isDevMode) {
    console.error(`[WebhookError] ${type}: ${errorMessage}`, error);
  } else {
    console.error(`[WebhookError] ${type}: ${message}`);
  }
}

/**
 * Diagnostic function to analyze API response issues
 * @param data Response data
 * @param isDevMode Whether to log detailed output
 * @param context Additional context information
 */
export function diagnosticCheck(
  data: any, 
  isDevMode: boolean = false,
  context: { sessionId?: string; requestId?: string } = {}
): string[] {
  const issues: string[] = [];
  const requestId = context.requestId || generateRequestId();
  
  if (!data) {
    issues.push('Response data is null or undefined');
    
    logger.error('Response data is null or undefined', 'WebhookController.diagnosticCheck', {
      context: {
        sessionId: context.sessionId,
        requestId
      }
    });
    
    return issues;
  }
  
  // Check response structure
  if (typeof data !== 'object') {
    issues.push(`Response data is not an object, received: ${typeof data}`);
    
    logger.error(`Response data is not an object, received: ${typeof data}`, 'WebhookController.diagnosticCheck', {
      context: {
        sessionId: context.sessionId,
        requestId
      },
      details: {
        dataType: typeof data,
        dataPreview: typeof data === 'string' ? data.substring(0, 100) : data
      }
    });
    
    if (isDevMode) console.log('Response value:', data);
  }
  
  // Check for required fields
  if (!data.text && !data.message) {
    issues.push('Response missing required text/message field');
    
    logger.warning('Response missing required text/message field', 'WebhookController.diagnosticCheck', {
      context: {
        sessionId: context.sessionId,
        requestId
      },
      details: {
        dataKeys: typeof data === 'object' ? Object.keys(data) : 'not an object'
      }
    });
  }
  
  // Analyze actual content of response for common issues
  try {
    if (typeof data === 'string') {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(data);
        if (isDevMode) console.log('String response parsed as JSON:', parsed);
        
        // Check if parsed result has expected fields
        if (!parsed.text && !parsed.message) {
          issues.push('Parsed JSON response missing required text/message field');
          
          logger.warning('Parsed JSON response missing required text/message field', 'WebhookController.diagnosticCheck', {
            context: {
              sessionId: context.sessionId,
              requestId
            },
            details: {
              parsedKeys: Object.keys(parsed)
            }
          });
        }
      } catch (e) {
        issues.push('Response is a string but not valid JSON');
        
        logger.error('Response is a string but not valid JSON', 'WebhookController.diagnosticCheck', {
          context: {
            sessionId: context.sessionId,
            requestId
          },
          details: {
            stringPreview: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
            parseError: (e as Error).message
          }
        });
        
        if (isDevMode) console.log('Raw string response:', data.substring(0, 100) + (data.length > 100 ? '...' : ''));
      }
    } else if (data.error || data.errors) {
      issues.push('Response contains error field');
      
      logger.warning('Response contains error field', 'WebhookController.diagnosticCheck', {
        context: {
          sessionId: context.sessionId,
          requestId
        },
        details: {
          error: data.error || data.errors
        }
      });
      
      if (isDevMode) console.log('Error in response:', data.error || data.errors);
    }
    
    // Check if data has unexpected structure
    if (data.body && (data.body.text || data.body.message)) {
      issues.push('Data seems to be nested inside "body" property');
      
      logger.warning('Data seems to be nested inside "body" property', 'WebhookController.diagnosticCheck', {
        context: {
          sessionId: context.sessionId,
          requestId
        },
        details: {
          body: data.body
        }
      });
    }
  } catch (e) {
    issues.push(`Error analyzing response: ${(e as Error).message}`);
    
    logger.error(`Error analyzing response: ${(e as Error).message}`, 'WebhookController.diagnosticCheck', {
      context: {
        sessionId: context.sessionId,
        requestId
      },
      stackTrace: (e as Error).stack || '',
      details: e
    });
  }
  
  if (isDevMode && issues.length > 0) {
    console.error('[Response Diagnostic Issues]', issues);
    console.log('[Full Response Data]', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    logger.warning(`Found ${issues.length} issues with response`, 'WebhookController.diagnosticCheck', {
      context: {
        sessionId: context.sessionId,
        requestId
      },
      details: {
        issues,
        response: JSON.stringify(data, null, 2).substring(0, 1000) + '...'
      }
    });
  }
  
  return issues;
}

/**
 * Format the webhook response for client display
 * @param data API response data
 * @param isDevMode Whether to include developer information
 * @param context Additional context information
 * @returns Formatted response
 */
export function formatWebhookResponse(
  data: ApiResponse, 
  isDevMode: boolean = false,
  context: { sessionId?: string; requestId?: string } = {}
): ApiResponse {
  const requestId = context.requestId || generateRequestId();
  
  // Run diagnostic check on response
  if (isDevMode) {
    const issues = diagnosticCheck(data, isDevMode, context);
    if (issues.length > 0) {
      console.warn('[Response Issues Detected]', issues);
    }
  }

  // Đảm bảo nội dung trả về luôn có định dạng đúng
  const formattedResponse: ApiResponse = {
    text: data.text || data.message || "Không có phản hồi từ máy chủ. Vui lòng thử lại sau.",
    image: data.image || data.imageUrl || data.url
  };
  
  // Log the formatted response
  logger.info('Formatted webhook response', 'WebhookController.formatWebhookResponse', {
    context: {
      sessionId: context.sessionId,
      requestId
    },
    details: {
      hasText: !!formattedResponse.text,
      hasImage: !!formattedResponse.image,
      textLength: formattedResponse.text?.length
    }
  });
  
  // Thêm thông tin debug cho developer nếu cần
  if (isDevMode) {
    formattedResponse.raw = data.raw || data;
  }
  
  return formattedResponse;
} 