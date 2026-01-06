import { createVerificationSession as createSessionRepo } from '../repositories/verificationSession.repository';
import { VerificationSession } from '../types';
import { CreateVerificationSessionRequestDto } from '../dtos/verificationSession.dto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new verification session
 * Uses single atomic query with RETURNING clause and SQL-level transformations
 */
export const createVerificationSession = async (dto: CreateVerificationSessionRequestDto): Promise<VerificationSession> => {
  const sessionUid = uuidv4();
  const status = 'pending';
  
  // Single atomic query - INSERT with RETURNING and SQL transformations
  return await createSessionRepo({
    session_uid: sessionUid,
    external_txn_id: dto.external_txn_id,
    status,
  });
};
