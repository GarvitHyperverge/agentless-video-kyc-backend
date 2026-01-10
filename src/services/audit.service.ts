import { getAllSessionsByFilter } from '../repositories/verificationSession.repository';
import { PendingSessionsResponseDto } from '../dtos/audit.dto';

/**
 * Get all verification sessions with optional status filter
 * @param filter - 'pending', 'completed', or 'all'. Defaults to 'pending'
 */
export const getAllPendingSessions = async (filter: 'pending' | 'completed' | 'all' = 'pending'): Promise<PendingSessionsResponseDto> => {
  // Get sessions by filter
  const sessions = await getAllSessionsByFilter(filter);

  return {
    sessions,
    total: sessions.length,
  };
};
