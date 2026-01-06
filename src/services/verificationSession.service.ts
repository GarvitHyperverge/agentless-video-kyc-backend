import sql from '../config/supabase';
import { VerificationSession } from '../types';
import { CreateVerificationSessionRequestDto } from '../dtos/verificationSession.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new verification session with PAN data
 * Uses transaction to ensure both records are created atomically
 */
export const createVerificationSession = async (dto: CreateVerificationSessionRequestDto): Promise<VerificationSession> => {
  const sessionUid = uuidv4();
  const status = 'pending';
  
  // Use transaction to create both records atomically
  return await sql.begin(async (tx) => {
    // Create verification session
    const [session] = await tx<VerificationSession[]>`
      INSERT INTO verification_session (session_uid, external_txn_id, status)
      VALUES (${sessionUid}, ${dto.external_txn_id}, ${status})
      RETURNING 
        session_uid,
        COALESCE(external_txn_id, '') as external_txn_id,
        status,
        created_at,
        updated_at
    `;
    
    if (!session) {
      throw new Error('Failed to create verification session');
    }
    
    // Create business partner PAN data
    await tx`
      INSERT INTO business_partner_pan_data (
        session_uid,
        pan_number,
        full_name,
        father_name,
        date_of_birth,
        source_party
      )
      VALUES (
        ${sessionUid},
        ${dto.pan_number},
        ${dto.full_name},
        ${dto.father_name},
        ${dto.date_of_birth}::date,
        ${dto.source_party}
      )
    `;
    
    return session;
  });
};
