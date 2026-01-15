import jwt from 'jsonwebtoken';
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
