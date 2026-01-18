import { Request, Response, NextFunction } from 'express';
import { verifyAuditJwt, AuditJwtPayload } from '../utils/auditJwt.util';
import { getAuditSessionByUsername } from '../repositories/auditSession.repository';
import { validateAuditSession } from '../services/auditSession.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { config } from '../config';

/**
 * Send authentication error response
 * Always sends generic message to prevent information leakage
 */
const sendAuthError = (res: Response, statusCode: number = 401): void => {
  const response: ApiResponseDto<never> = {
    success: false,
    error: 'Authentication failed',
  };
  res.status(statusCode).json(response);
};

/**
 * Extract JWT token from cookies for audit sessions
 * Cookie name is configured in config.auditCookie.tokenName
 */
const extractToken = (req: Request): string | null => {
  // Get token from cookie
  if (req.cookies && req.cookies[config.auditCookie.tokenName]) {
    return req.cookies[config.auditCookie.tokenName];
  }

  return null;
};

/**
 * Middleware to authenticate audit requests using JWT from cookies with Redis-backed session management
 * 
 * Expected:
 * - Cookie: auditToken=<jwt_token> (cookie name from config)
 * 
 * Validates:
 * 1. Token is present in cookie
 * 2. Token signature is valid
 * 3. Token is not expired
 * 4. JTI exists in Redis (session is active - not revoked)
 * 5. User exists in database
 * 
 * Attaches to request:
 * - req.auditUsername: The username from JWT
 * - req.auditUser: The audit user object
 * - req.auditJti: The JWT ID (JTI) for session revocation
 */
export const auditJwtAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from cookie
    const token = extractToken(req);

    if (!token) {
      console.log('[Audit JWT Auth] Token not found in cookie');
      sendAuthError(res);
      return;
    }

    // Verify JWT token
    let payload: AuditJwtPayload | null;
    
    try {
      payload = verifyAuditJwt(token);
    } catch (error: any) {
      if (error.message === 'TOKEN_EXPIRED') {
        console.log('[Audit JWT Auth] Token expired');
        sendAuthError(res);
        return;
      } else {
        console.log('[Audit JWT Auth] Invalid token signature:', error.message);
        sendAuthError(res);
        return;
      }
    }

    if (!payload) {
      console.log('[Audit JWT Auth] Token verification returned null');
      sendAuthError(res);
      return;
    }

    // Validate JTI exists in payload (required for Redis session management)
    if (!payload.jti) {
      console.log('[Audit JWT Auth] Token missing JTI');
      sendAuthError(res);
      return;
    }

    // Check if session is active in Redis (JTI-based session validation)
    // This allows instant session revocation via Redis deletion
    try {
      const usernameFromRedis = await validateAuditSession(payload.jti);
      
      if (!usernameFromRedis) {
        // Session not found in Redis - token revoked or expired
        console.log('[Audit JWT Auth] Session not found in Redis (revoked or expired)');
        sendAuthError(res);
        return;
      }
      
    } catch (redisError: any) {
      // Redis is required for session validation
      console.error('[Audit JWT Auth] Redis session validation failed:', redisError);
      sendAuthError(res, 503);
      return;
    }

    // Validate user exists in database
    const auditUser = await getAuditSessionByUsername(payload.username);

    if (!auditUser) {
      console.log('[Audit JWT Auth] User not found in database:', payload.username);
      sendAuthError(res);
      return;
    }

    // Attach user info to request for use in controllers
    (req as any).auditUsername = payload.username;
    (req as any).auditUser = auditUser;
    (req as any).auditJti = payload.jti; // Attach JTI for logout/session revocation

    // Authentication successful
    next();
  } catch (error: any) {
    console.error('[Audit JWT Auth] Unexpected error:', error);
    console.error('[Audit JWT Auth] Error stack:', error.stack);
    sendAuthError(res, 500);
  }
};
