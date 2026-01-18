import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

/**
 * Audit JWT Payload interface
 */
export interface AuditJwtPayload {
  username: string;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID - session identifier for Redis session management
}


/**
 * Generate access token for audit sessions (short-lived, 2 minutes)
 * Includes JTI for Redis-backed session revocation
 * @param username - Audit user username
 * @param jti - Optional JWT ID (JTI). If not provided, a new UUID will be generated.
 *              This JTI is used for Redis-backed session revocation.
 * @returns JWT access token string and JTI
 */
export const generateAccessToken = (username: string, jti?: string): { token: string; jti: string } => {
  const jwtId = jti || crypto.randomBytes(16).toString('hex');
  
  // Note: Don't include jti in payload - use jwtid option instead
  // The jwt library will automatically add jti to the payload from jwtid option
  const payload: AuditJwtPayload = {
    username,
    // jti will be automatically added by jwt.sign() when jwtid option is used
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.auditAccessTokenExpiration || 120, // Expiration in seconds (default: 120 seconds = 2 minutes)
      jwtid: jwtId, // Set JTI in JWT standard claims - this automatically adds 'jti' to payload
    } as jwt.SignOptions
  );

  return { token, jti: jwtId };
};

/**
 * Generate refresh token for audit sessions (long-lived, 7 days)
 * Includes a tokenId in the payload for Redis storage/validation
 * @param username - Audit user username
 * @param tokenId - Unique token identifier (optional, will be generated if not provided)
 * @returns JWT refresh token string and tokenId
 */
export const generateRefreshToken = (username: string, tokenId?: string): { token: string} => {
  const refreshTokenId = tokenId || crypto.randomBytes(16).toString('hex');
  
  const payload: AuditJwtPayload & { tokenId: string } = {
    username,
    tokenId: refreshTokenId,
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.auditRefreshTokenExpiration || 604800, // Expiration in seconds (default: 604800 seconds = 7 days)
    } as jwt.SignOptions
  );

  return { token };
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
 * Note: When jwtid option is used in sign(), jwt library adds 'jti' to the decoded payload
 */
export const verifyAuditJwt = (token: string): AuditJwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { username: string; jti?: string };
    
    const payload: AuditJwtPayload = {
      username: decoded.username,
    };
    
    // Only include jti if it exists (from jwtid option)
    if (decoded.jti) {
      payload.jti = decoded.jti;
    }
    
    return payload;
  } catch (error: any) {
    // Check if token is expired specifically
    if (error.name === 'TokenExpiredError') {
      throw new Error('TOKEN_EXPIRED'); // Special error for expiration
    }
    return null;
  }
};
