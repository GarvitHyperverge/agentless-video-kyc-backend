import { Request, Response } from 'express';
import { getAllPendingSessions, getSessionDetails } from '../services/audit.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { PendingSessionsResponseDto, SessionDetailsDto } from '../dtos/audit.dto';

/**
 * Get verification sessions with optional status filter
 * GET /api/audit/pending-sessions?filter=pending|completed|all
 * Default filter: pending
 */
export const getPendingSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get filter from query params, default to 'pending'
    const filterParam = req.query.filter as string;
    let filter: 'pending' | 'completed' | 'all' = 'pending';

    // Validate and set filter
    if (filterParam === 'completed' || filterParam === 'all') {
      filter = filterParam;
    } else if (filterParam === 'pending') {
      filter = 'pending';
    }
    // If invalid filter, use default 'pending'

    const result: PendingSessionsResponseDto = await getAllPendingSessions(filter);

    const response: ApiResponseDto<PendingSessionsResponseDto> = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to fetch sessions',
    };
    res.status(500).json(response);
  }
};

/**
 * Get complete session details by session_uid
 * GET /api/audit/sessions/:sessionUid
 */
export const getSessionDetailsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionUid } = req.params;

    if (!sessionUid) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Session UID is required',
      };
      res.status(400).json(response);
      return;
    }

    const sessionDetails = await getSessionDetails(sessionUid);

    if (!sessionDetails) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Session not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponseDto<SessionDetailsDto> = {
      success: true,
      data: sessionDetails,
    };

    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to fetch session details',
    };
    res.status(500).json(response);
  }
};
