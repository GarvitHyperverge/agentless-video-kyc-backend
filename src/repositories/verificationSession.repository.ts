import sql from '../config/supabase';
import { VerificationSessionModel } from '../models/verificationSession.model';
import { VerificationSession } from '../types';

/**
 * Creates a new verification session in the database
 * Note: created_at and updated_at are automatically set by the database
 */
export const createVerificationSession = async (
  data: Omit<VerificationSessionModel, 'created_at' | 'updated_at'>,
  tx?: typeof sql
): Promise<VerificationSession> => {
  const query = tx || sql;
  const [session] = await query<VerificationSession[]>`
    INSERT INTO verification_session (session_uid, external_txn_id, status)
    VALUES (${data.session_uid}, ${data.external_txn_id}, ${data.status})
    RETURNING 
      session_uid,
      external_txn_id,
      status,
      created_at,
      updated_at
  `;
  
  if (!session) {
    throw new Error('Failed to create verification session');
  }
  
  return session;
};

