import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';

/**
 * JWT Payload interface for verification sessions
 */
export interface JwtPayload {
  sessionId: string;
  timestamp: number;
  jti?: string; // JWT ID - session identifier for Redis session management
}

/**
 * Generate JWT token with sessionId, timestamp, and JTI (JWT ID) for verification sessions
 * JTI is automatically generated for Redis-backed session revocation
 * @param sessionId - Session unique identifier
 * @param timestamp - Optional timestamp (in milliseconds). If not provided, uses current time.
 *                    Use this to ensure JWT timestamp matches database created_at timestamp.
 * @returns JWT token string and JTI
 */
export const generateJwt = (sessionId: string, timestamp?: number): { token: string; jti: string } => {
  const jwtId = crypto.randomBytes(16).toString('hex');
  
  // The jwt library will automatically add jti to the payload from jwtid option
  const payload: JwtPayload = {
    sessionId,
    timestamp: timestamp || Date.now(),
  };

  const token = jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiration || 900, // Expiration in seconds
      jwtid: jwtId, // Set JTI in JWT standard claims - this automatically adds 'jti' to payload
    } as jwt.SignOptions
  );

  return { token, jti: jwtId };
};

/**
 * Verify and decode JWT token for verification sessions
 * @param token - JWT token string
 * @returns Decoded JWT payload or null if invalid
 * @throws Error with message 'TOKEN_EXPIRED' if token is expired
 * Note: When jwtid option is used in sign(), jwt library adds 'jti' to the decoded payload
 */
export const verifyJwt = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { sessionId: string; timestamp: number; jti?: string };
    
    // Extract jti from decoded token (added automatically by jwt library when jwtid option is used)
    const payload: JwtPayload = {
      sessionId: decoded.sessionId,
      timestamp: decoded.timestamp,
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
