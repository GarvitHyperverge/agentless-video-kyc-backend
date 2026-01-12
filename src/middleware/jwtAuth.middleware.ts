import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyJwt, JwtPayload } from '../utils/jwt.util';
import { getVerificationSessionByUid, updateVerificationSessionStatus } from '../repositories/verificationSession.repository';
import { ApiResponseDto } from '../dtos/apiResponse.dto';

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
 * Extract JWT token from Authorization header
 * Expected format: "Bearer <token>"
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
};

/**
 * Middleware to authenticate requests using JWT
 * 
 * Expected header:
 * - Authorization: Bearer <jwt_token>
 * 
 * Validates:
 * 1. Token is present and valid format
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
    // Extract token from Authorization header
    const token = extractToken(req);

    if (!token) {
      sendAuthError(res, 'Missing or invalid Authorization header. Expected format: Bearer <token>');
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
