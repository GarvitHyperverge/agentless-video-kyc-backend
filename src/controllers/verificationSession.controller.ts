import { Request, Response } from 'express';
import { createVerificationSession as createVerificationSessionService, markVerificationSessionCompleted, updateVerificationSessionAuditStatus as updateVerificationSessionAuditStatusService } from '../services/verificationSession.service';
import { 
  CreateVerificationSessionRequestDto, 
  CreateVerificationSessionResponseDto,
  UpdateVerificationSessionStatusRequestDto,
  MarkVerificationSessionCompletedResponseDto,
  UpdateAuditStatusRequestDto,
  UpdateAuditStatusResponseDto
} from '../dtos/verificationSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { ApiClient } from '../types';
import { config } from '../config';

/**
 * Create a new verification session
 * POST /api/verification-sessions
 */
export const createVerificationSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateVerificationSessionRequestDto = req.body;
    const apiClient = (req as any).apiClient as ApiClient;
    
    if (!apiClient) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'API client information not found. Ensure HMAC authentication is properly configured.',
      };
      res.status(500).json(response);
      return;
    }

    const clientName = apiClient.client_name;
    
    // The service will handle checking for existing pending sessions and expiration logic
    const sessionWithToken = await createVerificationSessionService(dto, clientName);
    
    // Set JWT as HTTP-only cookie using configuration
    res.cookie(config.cookie.sessionTokenName, sessionWithToken.token, {
      httpOnly: config.cookie.httpOnly,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite,
      maxAge: config.cookie.maxAge,
      path: config.cookie.path,
    });
    
    const response: ApiResponseDto<CreateVerificationSessionResponseDto> = {
      success: true,
      data: {}, // Token is now in cookie, not in response body
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to create verification session',
    };
    res.status(400).json(response);
  }
};

/**
 * Mark verification session as completed
 * PATCH /api/verification-sessions/complete
 */
export const markVerificationSessionCompletedController = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get sessionId from JWT middleware (already validated)
    const sessionId = (req as any).sessionId as string;

    const session = await markVerificationSessionCompleted(sessionId);
    
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