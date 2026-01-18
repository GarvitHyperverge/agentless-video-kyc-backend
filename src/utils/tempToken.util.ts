import jwt from 'jsonwebtoken';
import { config } from '../config';

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
      expiresIn: config.tempTokenExpiration || 60, // Expiration in seconds (default: 60 seconds = 1 minute)
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
      throw new Error('TOKEN_EXPIRED'); 
    }
    return null;
  }
};
