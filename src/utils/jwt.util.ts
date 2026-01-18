import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sessionId: string;
  timestamp: number;
}

/**
 * Generate JWT token with sessionId and timestamp
 * @param sessionId - Session unique identifier
 * @param timestamp - Optional timestamp (in milliseconds). If not provided, uses current time.
 *                    Use this to ensure JWT timestamp matches database created_at timestamp.
 * @returns JWT token string
 */
export const generateJwt = (sessionId: string, timestamp?: number): string => {
  const payload: JwtPayload = {
    sessionId,
    timestamp: timestamp || Date.now(),
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiration,
    } as jwt.SignOptions
  );

  return token;
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
