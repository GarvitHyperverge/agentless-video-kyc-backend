import { Request, Response } from 'express';
import { createVerificationSession as createVerificationSessionService, markVerificationSessionCompleted, updateVerificationSessionAuditStatus as updateVerificationSessionAuditStatusService, activateVerificationSession as activateVerificationSessionService } from '../services/verificationSession.service';
import { revokeSession } from '../services/session.service';
import { 
  CreateVerificationSessionRequestDto, 
  CreateVerificationSessionResponseDto,
  MarkVerificationSessionCompletedResponseDto,
  UpdateAuditStatusRequestDto,
  UpdateAuditStatusResponseDto,
  ActivateSessionRequestDto,
  ActivateSessionResponseDto,
  LogoutResponseDto
} from '../dtos/verificationSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { ApiClient } from '../types';
import { config } from '../config';

/**
 * Create a new verification session
 * POST /api/verification-sessions
 * Returns a short-lived temp token (1 minute) in response body
 */
export const createVerificationSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateVerificationSessionRequestDto = req.body;
    const apiClient = (req as any).apiClient as ApiClient;
    
    if (!apiClient) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Error creating verification session',
      };
      console.log('[Verification Session] API client information not found. Ensure HMAC authentication is properly configured.');
      res.status(500).json(response);
      return;
    }

    const clientName = apiClient.client_name;
    
    // The service will handle checking for existing pending sessions and expiration logic
    const sessionWithToken = await createVerificationSessionService(dto, clientName);
    
    // Return temp token in response body (not as cookie)
    // sessionId is embedded in the temp token JWT payload, not exposed separately
    const response: ApiResponseDto<CreateVerificationSessionResponseDto> = {
      success: true,
      data: {
        temp_token: sessionWithToken.tempToken,
      }, 
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to create verification session',
    };
    console.log('[Verification Session] Error creating verification session:', error);
    res.status(400).json(response);
  }
};

/**
 * Activate verification session using temp token
 * POST /api/verification-sessions/activate
 * Validates temp token (one-time use), sets session cookie, and allows user to proceed
 */
export const activateVerificationSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: ActivateSessionRequestDto = req.body;
    
    if (!dto.temp_token || dto.temp_token.trim() === '') {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'temp_token is required',
      };
      res.status(400).json(response);
      return;
    }

    // Validate temp token and get session (Redis is required)
    const sessionWithToken = await activateVerificationSessionService(dto.temp_token);
    
    // Set JWT as HTTP-only cookie using configuration
    res.cookie(config.cookie.sessionTokenName, sessionWithToken.token, {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: config.cookie.maxAge,
      path: config.cookie.path,
    });
    
    const response: ApiResponseDto<ActivateSessionResponseDto> = {
      success: true,
      data: {
        session_id: sessionWithToken.session_uid,
      },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to activate verification session',
    };
    console.log('[Verification Session] Error activating verification session:', error);
    
    // Handle specific error cases
    if (error.message === 'TOKEN_EXPIRED') {
      res.status(401).json(response);
    } else if (error.message === 'Invalid or already used temp token' || error.message === 'Invalid session') {
      res.status(400).json(response);
    } else if (error.message.includes('Redis is required')) {
      res.status(503).json(response); // Service Unavailable
    } else {
      res.status(400).json(response);
    }
  }
};

/**
 * Mark verification session as completed
 * PATCH /api/verification-sessions/complete
 * Clears the JWT token cookie on the server side
 */
export const markVerificationSessionCompletedController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get sessionId from JWT middleware (already validated)
    const sessionId = (req as any).sessionId as string;

    const session = await markVerificationSessionCompleted(sessionId);
    
    res.clearCookie(config.cookie.sessionTokenName, {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.path,
    });
    
    const response: ApiResponseDto<MarkVerificationSessionCompletedResponseDto> = {
      success: true,
      data: session,
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to update verification session status',
    };
    res.status(400).json(response);
  }
};

/**
 * Logout - Revoke session from Redis
 * POST /api/verification-sessions/logout
 * This revokes the session instantly by deleting it from Redis
 * JWT still exists but is useless after revocation
 */
export const logoutSession = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get JTI from JWT middleware (already validated)
    const jti = (req as any).jti as string;
    const sessionId = (req as any).sessionId as string;

    if (!jti) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Session identifier not found',
      };
      res.status(400).json(response);
      return;
    }

    // Revoke session from Redis (delete JTI)
    await revokeSession(jti);
    
    // Clear cookie
    res.clearCookie(config.cookie.sessionTokenName, {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      path: config.cookie.path,
    });
    
    const response: ApiResponseDto<LogoutResponseDto> = {
      success: true,
      data: {
        message: 'Session revoked successfully',
        session_id: sessionId,
      },
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to revoke session',
    };
    console.log('[Verification Session] Error revoking session:', error);
    res.status(400).json(response);
  }
};

/**
 * Update verification session audit_status
 * PATCH /api/verification-sessions/audit-status
 */
export const updateAuditStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: UpdateAuditStatusRequestDto = req.body;

    // Validate required fields
    if (!dto.session_id || dto.session_id.trim() === '') {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id is required',
      };
      res.status(400).json(response);
      return;
    }

    if (!dto.audit_status || (dto.audit_status !== 'pass' && dto.audit_status !== 'fail')) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'audit_status must be either "pass" or "fail"',
      };
      res.status(400).json(response);
      return;
    }

    const session = await updateVerificationSessionAuditStatusService(dto.session_id, dto.audit_status);
    
    const response: ApiResponseDto<UpdateAuditStatusResponseDto> = {
      success: true,
      data: session,
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to update audit status',
    };
    res.status(400).json(response);
  }
};