import { getRedisClient } from '../config/redis';
import { getAuditSessionByUsername } from '../repositories/auditSession.repository';
import { LoginRequestDto, LoginResponseDto } from '../dtos/auditSession.dto';

/**
 * Login service for audit sessions
 * Validates username and password
 */
export const login = async (dto: LoginRequestDto): Promise<LoginResponseDto> => {
  // Get audit user from database
  const auditUser = await getAuditSessionByUsername(dto.username);

  if (!auditUser) {
    return {
      success: false,
      message: 'Invalid username or password',
    };
  }

  // Verify password (simple string comparison)
  if (dto.password !== auditUser.password) {
    return {
      success: false,
      message: 'Invalid username or password',
    };
  }

  // Login successful
  return {
    success: true,
    message: 'Login successful',
    username: auditUser.username,
  };
};

/**
 * Redis key pattern for audit access token sessions
 * Format: audit:session:<jti>
 */
const getAuditSessionKey = (jti: string): string => {
  return `audit:session:${jti}`;
};

/**
 * Store audit access token session in Redis with TTL matching access token expiration
 * Redis is REQUIRED for this operation - throws error if not available
 * @param jti - JWT ID (session identifier)
 * @param username - Audit user username
 * @param ttlSeconds - Time to live in seconds (should match access token expiration)
 * @returns Promise that resolves when session is stored
 * @throws Error if Redis is not enabled or not connected
 */
export const storeAuditSession = async (jti: string, username: string, ttlSeconds: number = 2 * 60): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for audit session storage. Please ensure Redis is enabled and connected.');
  }

  const key = getAuditSessionKey(jti);
  
  // Store username as value for validation, with TTL matching access token expiration
  await client.setEx(key, ttlSeconds, username);
};

/**
 * Validate if audit access token session exists in Redis
 * Redis is REQUIRED for this operation - throws error if not available
 * @param jti - JWT ID (session identifier)
 * @returns Promise that resolves to username if session exists, null otherwise
 * @throws Error if Redis is not enabled or not connected
 */
export const validateAuditSession = async (jti: string): Promise<string | null> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for audit session validation. Please ensure Redis is enabled and connected.');
  }

  const key = getAuditSessionKey(jti);
  const username = await client.get(key);
  
  return username;
};

/**
 * Revoke (delete) audit access token session from Redis
 * Redis is REQUIRED for this operation - throws error if not available
 * @param jti - JWT ID (session identifier)
 * @returns Promise that resolves when session is revoked
 * @throws Error if Redis is not enabled or not connected
 */
export const revokeAuditSession = async (jti: string): Promise<void> => {
  const client = getRedisClient();
  
  if (!client) {
    throw new Error('Redis is required for audit session revocation. Please ensure Redis is enabled and connected.');
  }

  const key = getAuditSessionKey(jti);
  await client.del(key);
};
