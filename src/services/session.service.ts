import { getRedisClient } from '../config/redis';

/**
 * Redis key pattern for active sessions
 * Format: session:<jti>
 */
const getSessionKey = (jti: string): string => {
  return `session:${jti}`;
};

/**
 * Store active session in Redis with TTL matching JWT expiration
 * Redis is REQUIRED for this operation - throws error if not available
 * @param jti - JWT ID (session identifier)
 * @param sessionId - Session unique identifier
 * @param ttlSeconds - Time to live in seconds (should match JWT expiration)
 * @returns Promise that resolves when session is stored
 * @throws Error if Redis is not enabled or not connected
 */
export const storeSession = async (jti: string, sessionId: string, ttlSeconds: number = 15 * 60): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for session storage. Please ensure Redis is enabled and connected.');
  }

  const key = getSessionKey(jti);
  
  // Store sessionId as value for validation, with TTL matching JWT expiration
  await client.setEx(key, ttlSeconds, sessionId);
};

/**
 * Validate if session exists in Redis (check if session is active)
 * Redis is REQUIRED for this operation - throws error if not available
 * @param jti - JWT ID (session identifier)
 * @returns Promise that resolves to sessionId if session exists, null otherwise
 * @throws Error if Redis is not enabled or not connected
 */
export const validateSession = async (jti: string): Promise<string | null> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for session validation. Please ensure Redis is enabled and connected.');
  }

  const key = getSessionKey(jti);
  const sessionId = await client.get(key);
  
  return sessionId;
};

/**
 * Revoke (delete) session from Redis (logout)
 * Redis is REQUIRED for this operation - throws error if not available
 * @param jti - JWT ID (session identifier)
 * @returns Promise that resolves when session is revoked
 * @throws Error if Redis is not enabled or not connected
 */
export const revokeSession = async (jti: string): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for session revocation. Please ensure Redis is enabled and connected.');
  }

  const key = getSessionKey(jti);
  await client.del(key);
};
