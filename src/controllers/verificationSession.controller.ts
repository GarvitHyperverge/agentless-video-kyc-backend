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
    
    const response: ApiResponseDto<CreateVerificationSessionResponseDto> = {
      success: true,
      data: {
        token: sessionWithToken.token,
      },
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
    // Get sessionId from JWT middleware (already validated)
    const sessionId = (req as any).sessionId as string;
    const dto: UpdateAuditStatusRequestDto = req.body;

    if (!dto.audit_status || (dto.audit_status !== 'pass' && dto.audit_status !== 'fail')) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'audit_status must be either "pass" or "fail"',
      };
      res.status(400).json(response);
      return;
    }

    const session = await updateVerificationSessionAuditStatusService(sessionId, dto.audit_status);
    
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