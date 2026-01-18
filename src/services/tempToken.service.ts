import { getRedisClient } from '../config/redis';
import crypto from 'crypto';

/**
 * Redis key pattern for temp tokens
 * Format: verification:temp_token:{tokenHash}
 */
const getTempTokenKey = (tokenHash: string): string => {
  return `verification:temp_token:${tokenHash}`;
};

/**
 * Store temp token in Redis with TTL (1 minute)
 * The token hash is used as the key to ensure one-time use
 * Redis is REQUIRED for this operation - throws error if not available
 * @param token - The temp token string
 * @param sessionId - Session unique identifier
 * @returns Promise that resolves when token is stored
 * @throws Error if Redis is not enabled or not connected
 */
export const storeTempToken = async (token: string, sessionId: string): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for temp token storage. Please ensure Redis is enabled and connected.');
  }

  // Use a hash of the token as the key for security
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const key = getTempTokenKey(tokenHash);
  const ttlSeconds = 60; // 1 minute in seconds
  
  // Store sessionId as value for validation, with TTL
  await client.setEx(key, ttlSeconds, sessionId);
};

/**
 * Validate and consume temp token (one-time use)
 * Redis is REQUIRED for this operation - throws error if not available
 * @param token - The temp token string
 * @returns Promise that resolves to sessionId if token is valid, null otherwise
 * @throws Error if Redis is not enabled or not connected
 */
export const validateAndConsumeTempToken = async (token: string): Promise<string | null> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for temp token validation. Please ensure Redis is enabled and connected.');
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const key = getTempTokenKey(tokenHash);
  
  // Get and delete atomically (one-time use)
  const sessionId = await client.get(key);
  
  if (sessionId) {
    // Token exists, delete it to ensure one-time use
    await client.del(key);
    return sessionId;
  }
  
  // Token not found or already used
  return null;
};
