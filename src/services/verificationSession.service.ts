import sql from '../config/supabase';
import { VerificationSession } from '../types';
import { CreateVerificationSessionRequestDto } from '../dtos/verificationSession.dto';
import { v4 as uuidv4 } from 'uuid';
import { 
  createVerificationSession as createVerificationSessionRepo, 
  updateVerificationSessionStatus as updateVerificationSessionStatusRepo,
  getVerificationSessionByExternalTxnIdAndStatus
} from '../repositories/verificationSession.repository';
import { createBusinessPartnerPanData } from '../repositories/businessPartnerPanData.repository';

/**
 * Create a new verification session with PAN data
 * Uses transaction to ensure both records are created atomically
 * 
 * Business Validation: Checks if a pending session already exists for the given external_txn_id
 * If a pending session exists, throws an error to prevent duplicate sessions
 */
export const createVerificationSession = async (dto: CreateVerificationSessionRequestDto): Promise<VerificationSession> => {
  // Check if a pending session already exists for this external_txn_id
  const existingPendingSession = await getVerificationSessionByExternalTxnIdAndStatus(
    dto.external_txn_id,
    'pending'
  );

  if (existingPendingSession) {
    throw new Error(`A verification session with status PENDING already exists for external_txn_id: ${dto.external_txn_id}`);
  }

  const sessionUid = uuidv4();
  const status = 'pending';
  
  return await sql.begin(async (tx) => {
    const session = await createVerificationSessionRepo(
      {
        session_uid: sessionUid,
        external_txn_id: dto.external_txn_id,
        status: status,
      },
      tx
    );
    
    await createBusinessPartnerPanData(
      {
        session_uid: sessionUid,
        pan_number: dto.pan_number,
        full_name: dto.full_name,
        father_name: dto.father_name,
        date_of_birth: dto.date_of_birth,
        source_party: dto.source_party,
      },
      tx
    );
    
    return session;
  });
};

/**
 * Mark verification session status as completed
 */
export const markVerificationSessionCompleted = async (sessionUid: string): Promise<VerificationSession> => {
  return await updateVerificationSessionStatusRepo(sessionUid, 'completed');
};
