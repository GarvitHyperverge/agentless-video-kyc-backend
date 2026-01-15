import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyJwt, JwtPayload } from '../utils/jwt.util';
import { getVerificationSessionByUid, updateVerificationSessionStatus } from '../repositories/verificationSession.repository';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { config } from '../config';

/**
 * Send authentication error response
 */
const sendAuthError = (res: Response, error: string, statusCode: number = 401): void => {
  const response: ApiResponseDto<never> = {
    success: false,
    error,
  };
  res.status(statusCode).json(response);
};

/**
 * Extract JWT token from cookies only
 * Cookie name is configured in config.cookie.sessionTokenName
 */
const extractToken = (req: Request): string | null => {
  // Get token from cookie
  if (req.cookies && req.cookies[config.cookie.sessionTokenName]) {
    return req.cookies[config.cookie.sessionTokenName];
  }

  return null;
};

/**
 * Middleware to authenticate requests using JWT from cookies
 * 
 * Expected:
 * - Cookie: sessionToken=<jwt_token> (cookie name from config)
 * 
 * Validates:
 * 1. Token is present in cookie
 * 2. Token signature is valid
 * 3. Token is not expired
 * 4. Session exists in database
 * 5. Session is not completed
 * 
 * Attaches to request:
 * - req.sessionId: The session ID from JWT
 * - req.session: The verification session object
 */
export const jwtAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from cookie
    const token = extractToken(req);

    if (!token) {
      sendAuthError(res, `Missing authentication token. Expected cookie: ${config.cookie.sessionTokenName}`);
      return;
    }

    // Verify JWT token
    let payload: JwtPayload | null;
    let isExpired = false;
    
    try {
      payload = verifyJwt(token);
    } catch (error: any) {
      if (error.message === 'TOKEN_EXPIRED') {
        isExpired = true;
        payload = null;
      } else {
        sendAuthError(res, 'Invalid JWT token');
        return;
      }
    }

    // If token is expired, try to extract sessionId and update session status
    if (isExpired) {
      try {
        // Decode without verification to get sessionId from expired token
        const decoded = jwt.decode(token) as { sessionId?: string } | null;
        
        if (decoded && decoded.sessionId) {
          // Check if session exists and is still pending
          const session = await getVerificationSessionByUid(decoded.sessionId);
          
          if (session && session.status === 'pending') {
            // Update status to incomplete
            await updateVerificationSessionStatus(decoded.sessionId, 'incomplete');
            console.log(`Session ${decoded.sessionId} marked as incomplete due to token expiration`);
          }
        }
      } catch (updateError) {
        console.error('Error updating session status on token expiration:', updateError);
      }
      
      sendAuthError(res, 'JWT token has expired. Session marked as incomplete.');
      return;
    }

    if (!payload) {
      sendAuthError(res, 'Invalid JWT token');
      return;
    }

    // Validate session exists in database
    const session = await getVerificationSessionByUid(payload.sessionId);

    if (!session) {
      sendAuthError(res, 'Session not found');
      return;
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      sendAuthError(res, 'Verification session is already completed');
      return;
    }

    // Attach session info to request for use in controllers
    (req as any).sessionId = payload.sessionId;
    (req as any).session = session;

    // Authentication successful
    next();
  } catch (error: any) {
    sendAuthError(res, error.message || 'Authentication failed', 500);
  }
};
