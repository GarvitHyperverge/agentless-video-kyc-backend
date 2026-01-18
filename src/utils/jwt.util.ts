import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sessionId: string;
  timestamp: number;
  jti?: string; // JWT ID - session identifier for Redis session management
}

/**
 * Generate JWT token with sessionId, timestamp, and JTI (JWT ID)
 * @param sessionId - Session unique identifier
 * @param jti - Optional JWT ID (JTI). If not provided, a new UUID will be generated.
 *              This JTI is used for Redis-backed session revocation.
 * @param timestamp - Optional timestamp (in milliseconds). If not provided, uses current time.
 *                    Use this to ensure JWT timestamp matches database created_at timestamp.
 * @returns JWT token string and JTI
 */
export const generateJwt = (sessionId: string, jti?: string, timestamp?: number): { token: string; jti: string } => {
  const jwtId = jti || crypto.randomBytes(16).toString('hex');
  
  const payload: JwtPayload = {
    sessionId,
    timestamp: timestamp || Date.now(),
    jti: jwtId,
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiration || '15m',
      jwtid: jwtId, // Set JTI in JWT standard claims
    } as jwt.SignOptions
  );

  return { token, jti: jwtId };
};

/**
 * Parse JWT expiration string to seconds
 * Examples: '15m' -> 900, '1h' -> 3600, '7d' -> 604800
 * @param expiration - JWT expiration string (e.g., '15m', '1h', '7d')
 * @returns TTL in seconds
 */
const parseJwtExpirationToSeconds = (expiration: string | undefined): number => {
  if (!expiration) {
    // Default to 15 minutes if not provided
    return 15 * 60;
  }

  const match = expiration.match(/^(\d+)([smhd])$/i);
  if (!match || !match[1] || !match[2]) {
    // Default to 15 minutes if invalid format
    return 15 * 60;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 60 * 60;
    case 'd':
      return value * 24 * 60 * 60;
    default:
      return 15 * 60; // Default to 15 minutes
  }
};

/**
 * Get JWT expiration TTL in seconds
 * @returns TTL in seconds based on config.jwtExpiration
 */
export const getJwtExpirationSeconds = (): number => {
  return parseJwtExpirationToSeconds(config.jwtExpiration);
};

/**
 * Verify and decode JWT token
 * @param token - JWT token string
 * @returns Decoded JWT payload or null if invalid
 * @throws Error with message 'TOKEN_EXPIRED' if token is expired
 */
export const verifyJwt = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    return decoded;
  } catch (error: any) {
    // Check if token is expired specifically
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED'); // Special error for expiration
    }
    return null;
  }
};

/**
 * Audit JWT Payload interface
 */
export interface AuditJwtPayload {
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Generate access token for audit sessions (short-lived, 2 minutes)
 * @param username - Audit user username
 * @returns JWT access token string
 */
export const generateAccessToken = (username: string): string => {
  const payload: AuditJwtPayload = {
    username,
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.auditAccessTokenExpiration || '2m', // Default 2 minutes for access tokens
    } as jwt.SignOptions
  );

  return token;
};

/**
 * Generate refresh token for audit sessions (long-lived, 7 days)
 * Includes a tokenId in the payload for Redis storage/validation
 * @param username - Audit user username
 * @param tokenId - Unique token identifier (optional, will be generated if not provided)
 * @returns JWT refresh token string and tokenId
 */
export const generateRefreshToken = (username: string, tokenId?: string): { token: string; tokenId: string } => {
  const refreshTokenId = tokenId || crypto.randomBytes(16).toString('hex');
  
  const payload: AuditJwtPayload & { tokenId: string } = {
    username,
    tokenId: refreshTokenId,
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.auditRefreshTokenExpiration || '7d', // Default 7 days for refresh tokens
    } as jwt.SignOptions
  );

  return { token, tokenId: refreshTokenId };
};

/**
 * Verify refresh token and extract payload including tokenId
 * @param token - JWT refresh token string
 * @returns Decoded refresh token payload with tokenId or null if invalid
 * @throws Error with message 'TOKEN_EXPIRED' if token is expired
 */
export const verifyRefreshToken = (token: string): (AuditJwtPayload & { tokenId: string }) | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuditJwtPayload & { tokenId: string };
    return decoded;
  } catch (error: any) {
    // Check if token is expired specifically
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED'); // Special error for expiration
    }
    return null;
  }
};

/**
 * Verify and decode audit JWT token
 * @param token - JWT token string
 * @returns Decoded audit JWT payload or null if invalid
 * @throws Error with message 'TOKEN_EXPIRED' if token is expired
 */
export const verifyAuditJwt = (token: string): AuditJwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuditJwtPayload;
    return decoded;
  } catch (error: any) {
    // Check if token is expired specifically
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED'); // Special error for expiration
    }
    return null;
  }
};

/**
 * Temp Token Payload interface
 */
export interface TempTokenPayload {
  sessionId: string;
  timestamp: number;
}

/**
 * Generate short-lived temp token for session activation
 * @param sessionId - Session unique identifier
 * @param timestamp - Optional timestamp (in milliseconds). If not provided, uses current time.
 * @returns Temp JWT token string
 */
export const generateTempToken = (sessionId: string, timestamp?: number): string => {
  const payload: TempTokenPayload = {
    sessionId,
    timestamp: timestamp || Date.now(),
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.tempTokenExpiration || '1m', // Default 1 minute for temp tokens
    } as jwt.SignOptions
  );

  return token;
};

/**
 * Verify and decode temp token
 * @param token - Temp JWT token string
 * @returns Decoded temp token payload or null if invalid
 * @throws Error with message 'TOKEN_EXPIRED' if token is expired
 */
export const verifyTempToken = (token: string): TempTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TempTokenPayload;
    return decoded;
  } catch (error: any) {
    // Check if token is expired specifically
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED'); // Special error for expiration
    }
    return null;
  }
};
