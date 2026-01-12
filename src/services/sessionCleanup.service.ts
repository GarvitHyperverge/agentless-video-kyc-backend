import sql from '../config/supabase';

/**
 * Mark pending sessions as incomplete if they're older than 15 minutes
 * This is a safety net for sessions that expired without any API calls
 * Uses a single bulk UPDATE query for efficiency
 * @returns Number of sessions updated
 */
export const markExpiredSessionsAsIncomplete = async (): Promise<number> => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  
  // Single bulk UPDATE query - much more efficient than individual updates
  const result = await sql<Array<{ session_uid: string }>>`
    UPDATE verification_session
    SET status = 'incomplete', updated_at = NOW()
    WHERE status = 'pending'
      AND created_at < ${fifteenMinutesAgo}
    RETURNING session_uid
  `;

  const updatedCount = result.length;
  
  if (updatedCount > 0) {
    console.log(`Background cleanup: ${updatedCount} expired sessions marked as incomplete`);
  }

  return updatedCount;
};
