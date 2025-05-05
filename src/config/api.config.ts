/**
 * API Configuration
 */

export const API_CONFIG = {
  // Webhook URL for n8n server
  WEBHOOK_URL: 'https://aiservice.fastdo.vn/webhook/e58a00a7-224c-4e1c-a2ad-b58c822dc35d',
  
  // Request timeout in milliseconds (30 seconds)
  REQUEST_TIMEOUT: 30000,
  
  // Maximum retries for failed requests
  MAX_RETRIES: 2,
  
  // Retry delay in milliseconds
  RETRY_DELAY: 1000,
  
  // Headers for API requests
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

export default API_CONFIG; 