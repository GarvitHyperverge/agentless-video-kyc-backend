import sql from '../config/supabase';
import { VerificationSession } from '../types';
import { CreateVerificationSessionRequestDto } from '../dtos/verificationSession.dto';
import { v4 as uuidv4 } from 'uuid';
import { 
  createVerificationSession as createVerificationSessionRepo, 
  updateVerificationSessionStatus as updateVerificationSessionStatusRepo,
  updateVerificationSessionAuditStatus as updateVerificationSessionAuditStatusRepo
} from '../repositories/verificationSession.repository';
import { createBusinessPartnerPanData } from '../repositories/businessPartnerPanData.repository';

/**
 * Create a new verification session with PAN data
 * Uses transaction to ensure both records are created atomically
 */
export const createVerificationSession = async (dto: CreateVerificationSessionRequestDto, clientName: string): Promise<VerificationSession> => {
  const sessionId = uuidv4();
  const status = 'pending';
  const auditStatus = 'pending';
  
  return await sql.begin(async (tx) => {
    const session = await createVerificationSessionRepo(
      {
        session_uid: sessionId,
        external_txn_id: dto.external_txn_id,
        status: status,
        client_name: clientName,
        audit_status: auditStatus,
      },
      tx
    );
    
    await createBusinessPartnerPanData(
      {
        session_uid: sessionId,
        pan_number: dto.pan_number,
        full_name: dto.full_name,
        father_name: dto.father_name,
        date_of_birth: dto.date_of_birth,
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

/**
 * Update verification session audit_status to pass or fail
 */
export const updateVerificationSessionAuditStatus = async (
  sessionUid: string,
  auditStatus: 'pass' | 'fail'
): Promise<VerificationSession> => {
  return await updateVerificationSessionAuditStatusRepo(sessionUid, auditStatus);
};
