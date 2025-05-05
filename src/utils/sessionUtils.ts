import { v4 as uuidv4 } from 'uuid';

/**
 * Gets the session ID from localStorage or creates a new one if none exists
 */
export function getOrCreateSessionId(): string {
  const sessionId = localStorage.getItem('sessionId');
  
  if (sessionId) {
    return sessionId;
  }
  
  const newSessionId = uuidv4();
  localStorage.setItem('sessionId', newSessionId);
  return newSessionId;
}

/**
 * Clears the current session
 */
export function clearSession(): void {
  localStorage.removeItem('sessionId');
}

/**
 * Resets the session with a new ID
 */
export function resetSession(): string {
  const newSessionId = uuidv4();
  localStorage.setItem('sessionId', newSessionId);
  return newSessionId;
} 