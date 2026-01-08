import { Request, Response } from 'express';
import { createVerificationSession as createVerificationSessionService, markVerificationSessionCompleted } from '../services/verificationSession.service';
import { CreateVerificationSessionRequestDto, VerificationSessionResponseDto, UpdateVerificationSessionStatusRequestDto } from '../dtos/verificationSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';

/**
 * Create a new verification session
 * POST /api/verification-sessions
 */
export const createVerificationSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateVerificationSessionRequestDto = req.body;
    const session = await createVerificationSessionService(dto);
    
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
    const { session_id }: UpdateVerificationSessionStatusRequestDto = req.body;
    
    if (!session_id) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id is required',
      };
      res.status(400).json(response);
      return;
    }

    const session = await markVerificationSessionCompleted(session_id);
    
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