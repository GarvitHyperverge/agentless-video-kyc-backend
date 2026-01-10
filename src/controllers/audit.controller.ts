import { Request, Response } from 'express';
import { getAllPendingSessions } from '../services/audit.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { PendingSessionsResponseDto } from '../dtos/audit.dto';

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
