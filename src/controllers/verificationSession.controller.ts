import { Request, Response } from 'express';
import { createVerificationSession as createVerificationSessionService, markVerificationSessionCompleted, updateVerificationSessionAuditStatus as updateVerificationSessionAuditStatusService } from '../services/verificationSession.service';
import { CreateVerificationSessionRequestDto, VerificationSessionResponseDto, UpdateVerificationSessionStatusRequestDto, UpdateAuditStatusRequestDto } from '../dtos/verificationSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { hasVerificationSessionByClientNameExternalTxnIdAndStatus } from '../repositories/verificationSession.repository';
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
    
    // Check if a pending session already exists for this client_name and external_txn_id combination
    const hasPendingSession = await hasVerificationSessionByClientNameExternalTxnIdAndStatus(
      clientName,
      dto.external_txn_id,
      'pending'
    );

    if (hasPendingSession) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: `A verification session with status PENDING already exists for client_name: ${clientName} and external_txn_id: ${dto.external_txn_id}`,
      };
      res.status(400).json(response);
      return;
    }

    const session = await createVerificationSessionService(dto, clientName);
    
    const response: ApiResponseDto<VerificationSessionResponseDto> = {
      success: true,
      data: session,
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
    const dto: UpdateVerificationSessionStatusRequestDto = req.body;
    
    if (!dto.session_id) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id is required',
      };
      res.status(400).json(response);
      return;
    }

    const session = await markVerificationSessionCompleted(dto.session_id);
    
    const response: ApiResponseDto<VerificationSessionResponseDto> = {
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
    
    if (!dto.session_id) {
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
    
    const response: ApiResponseDto<VerificationSessionResponseDto> = {
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