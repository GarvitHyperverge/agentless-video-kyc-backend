import { Request, Response } from 'express';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { VerificationSession } from '../types';
import { AuditSession } from '../types';

/**
 * Check authentication status
 * GET /api/auth/check
 * Validates JWT + Redis session and returns auth status
 * This endpoint is called by frontend on page load to check if user is authenticated
 */
export const checkAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // JWT middleware already validated the session
    // If we reach here, user is authenticated
    const sessionId = (req as any).sessionId as string;
    const session = (req as any).session as VerificationSession;
    const jti = (req as any).jti as string;

    const response: ApiResponseDto<{
      authenticated: boolean;
      session_id: string;
      status: string;
    }> = {
      success: true,
      data: {
        authenticated: true,
        session_id: sessionId,
        status: session.status,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    // If JWT middleware rejected, this won't be reached
    const response: ApiResponseDto<{
      authenticated: boolean;
    }> = {
      success: false,
      data: {
        authenticated: false,
      },
    };

    res.status(401).json(response);
  }
};

/**
 * Check audit authentication status
 * GET /api/auth/audit/check
 * Validates audit JWT + Redis session and returns auth status
 * This endpoint is called by audit frontend on page load to check if user is authenticated
 */
export const checkAuditAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    // Audit JWT middleware already validated the session
    // If we reach here, user is authenticated
    const username = (req as any).auditUsername as string;
    const auditUser = (req as any).auditUser as AuditSession;
    const jti = (req as any).auditJti as string;

    const response: ApiResponseDto<{
      authenticated: boolean;
      username: string;
    }> = {
      success: true,
      data: {
        authenticated: true,
        username: username,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    // If audit JWT middleware rejected, this won't be reached
    // But handle just in case
    const response: ApiResponseDto<{
      authenticated: boolean;
    }> = {
      success: false,
      data: {
        authenticated: false,
      },
    };

    res.status(401).json(response);
  }
};
