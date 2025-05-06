import logger, { LogLevel } from './logger';

/**
 * This file is used to test and verify the logging system.
 * Run this file directly to see log outputs and verify log file creation.
 */

// Simple function to generate a test error
function generateTestError(): Error {
  try {
    throw new Error('This is a test error');
  } catch (error) {
    return error as Error;
  }
}

// Test all log levels
function testAllLogLevels(): void {
  console.log('Testing all log levels...');
  
  // Test info level
  logger.info('This is an informational message', 'TestModule', {
    details: {
      action: 'test',
      environment: 'development'
    },
    context: {
      sessionId: 'test-session-123',
      requestId: 'test-req-456'
    }
  });
  
  // Test warning level
  logger.warning('This is a warning message', 'TestModule', {
    details: {
      action: 'test',
      status: 'warning'
    },
    context: {
      sessionId: 'test-session-123',
      requestId: 'test-req-456'
    }
  });
  
  // Test error level
  const error = generateTestError();
  logger.error('This is an error message', 'TestModule', {
    details: {
      action: 'test',
      status: 'error'
    },
    stackTrace: error.stack,
    context: {
      sessionId: 'test-session-123',
      requestId: 'test-req-456'
    }
  });
  
  // Test critical level
  logger.critical('This is a critical error message', 'TestModule', {
    details: {
      action: 'test',
      status: 'critical'
    },
    stackTrace: error.stack,
    context: {
      sessionId: 'test-session-123',
      requestId: 'test-req-456'
    }
  });
  
  console.log('All log levels tested.');
}

// Test ChatController error scenario
function testChatControllerError(): void {
  console.log('Testing ChatController error scenario...');
  
  // Simulate a server error
  logger.error('Server error: HTTP 500', 'ChatController.processResponse', {
    type: 'SERVER_ERROR',
    details: {
      status: 500,
      url: 'https://api.example.com/webhook'
    }
  });
  
  // Simulate a timeout error
  logger.error('Request timed out after 30000ms', 'ChatController.sendChatMessage', {
    context: {
      sessionId: 'user-session-789',
      requestId: 'req-abcdef123'
    },
    type: 'TIMEOUT_ERROR',
    details: {
      timeout: 30000,
      url: 'https://api.example.com/webhook'
    }
  });
  
  console.log('ChatController error scenarios tested.');
}

// Test WebhookController error scenario
function testWebhookControllerError(): void {
  console.log('Testing WebhookController error scenario...');
  
  // Simulate retry attempt
  logger.warning('Retry attempt 2/3 for error: NETWORK_ERROR', 'WebhookController', {
    context: {
      sessionId: 'user-session-789',
      requestId: 'req-abcdef123'
    },
    type: 'NETWORK_ERROR',
    details: {
      attempt: 2,
      maxRetries: 3
    }
  });
  
  // Simulate maximum retries reached
  logger.error('Maximum retries (3) reached for request req-abcdef123', 'WebhookController', {
    context: {
      sessionId: 'user-session-789',
      requestId: 'req-abcdef123'
    },
    type: 'NETWORK_ERROR',
    details: {
      retries: 3,
      executionTime: 15000
    }
  });
  
  console.log('WebhookController error scenarios tested.');
}

// Run tests
function runTests(): void {
  console.log('Starting logger tests...');
  
  testAllLogLevels();
  testChatControllerError();
  testWebhookControllerError();
  
  console.log('All logger tests completed. Check the logs directory for the output files.');
}

// Execute tests
runTests(); 