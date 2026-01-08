import { Request, Response, NextFunction } from 'express';
import { getVerificationSessionByUid } from '../repositories/verificationSession.repository';
import { ApiResponseDto } from '../dtos/apiResponse.dto';

/**
 * Middleware to validate that a session exists and is not completed
 */
export const validateSessionMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Try to get session ID from body first
    const sessionId = req.body.session_id ;

    if (!sessionId) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id is required',
      };
      res.status(400).json(response);
      return;
    }

    // Get session from database
    const session = await getVerificationSessionByUid(sessionId);

    if (!session) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Verification session not found',
      };
      res.status(404).json(response);
      return;
    }

    // Check if session is already completed
    if (session.status === 'completed') {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Verification session is already completed',
      };
      res.status(400).json(response);
      return;
    }

    next();
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to validate session',
    };
    res.status(500).json(response);
  }
};
