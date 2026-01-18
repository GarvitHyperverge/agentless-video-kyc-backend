import { getRedisClient } from '../config/redis';

/**
 * Redis key pattern for refresh tokens
 * Format: audit:refresh_token:{username}:{tokenId}
 */
const getRefreshTokenKey = (username: string, tokenId: string): string => {
  return `audit:refresh_token:${username}:${tokenId}`;
};

/**
 * Store refresh token in Redis with TTL (7 days)
 * @param username - Audit user username
 * @param tokenId - Unique token identifier
 * @returns Promise that resolves when token is stored
 */
export const storeRefreshToken = async (username: string, tokenId: string): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is not enabled or not connected');
  }

  const key = getRefreshTokenKey(username, tokenId);
  const ttlSeconds = 7 * 24 * 60 * 60; // 7 days in seconds
  
  // Store username as value for validation, with TTL
  await client.setEx(key, ttlSeconds, username);
};

/**
 * Validate if refresh token exists in Redis
 * @param username - Audit user username
 * @param tokenId - Unique token identifier
 * @returns Promise that resolves to true if token exists, false otherwise
 */
export const validateRefreshToken = async (username: string, tokenId: string): Promise<boolean> => {
  const client = getRedisClient();
  
  if (!client) {
    return false;
  }

  const key = getRefreshTokenKey(username, tokenId);
  const storedUsername = await client.get(key);
  
  // Token is valid if it exists in Redis and username matches
  return storedUsername === username;
};

/**
 * Revoke a specific refresh token from Redis
 * @param username - Audit user username
 * @param tokenId - Unique token identifier
 * @returns Promise that resolves when token is revoked
 */
export const revokeRefreshToken = async (username: string, tokenId: string): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    // If Redis is not available, silently continue (token may already be expired)
    return;
  }

  const key = getRefreshTokenKey(username, tokenId);
  await client.del(key);
};

/**
 * Revoke all refresh tokens for a specific user
 * @param username - Audit user username
 * @returns Promise that resolves when all tokens are revoked
 */
export const revokeAllRefreshTokens = async (username: string): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    // If Redis is not available, silently continue
    return;
  }

  // Pattern to match all refresh tokens for this user
  const pattern = `audit:refresh_token:${username}:*`;
  
  // Get all keys matching the pattern
  const keys = await client.keys(pattern);
  
  // Delete all matching keys
  if (keys.length > 0) {
    await client.del(keys);
  }
};
