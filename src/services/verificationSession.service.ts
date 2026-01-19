import sql from '../config/supabase';
import { VerificationSession } from '../types';
import { CreateVerificationSessionRequestDto } from '../dtos/verificationSession.dto';
import { v4 as uuidv4 } from 'uuid';
import { 
  createVerificationSession as createVerificationSessionRepo, 
  updateVerificationSessionStatus as updateVerificationSessionStatusRepo,
  updateVerificationSessionAuditStatus as updateVerificationSessionAuditStatusRepo,
  getPendingSessionByClientNameAndExternalTxnId,
  getVerificationSessionByUid
} from '../repositories/verificationSession.repository';
import { createBusinessPartnerPanData } from '../repositories/businessPartnerPanData.repository';
import { generateJwt } from '../utils/jwt.util';
import { config } from '../config';
import { generateTempToken, verifyTempToken } from '../utils/tempToken.util';
import { storeTempToken, validateAndConsumeTempToken } from './tempToken.service';
import { storeSession } from './session.service';

/**
 * Create a new verification session with PAN data
 * Checks if a pending session already exists for the same external_txn_id and client_name.
 * If it exists and is older than 15 minutes, marks it as incomplete and creates a new session.
 * If it exists and is less than 15 minutes old, throws an error.
 * Uses transaction to ensure both records are created atomically
 * Returns session with temp token (token is returned in response body)
 */
export const createVerificationSession = async (dto: CreateVerificationSessionRequestDto, clientName: string): Promise<VerificationSession & { tempToken: string }> => {
  // Check if a pending session already exists for this client_name and external_txn_id
  const existingPendingSession = await getPendingSessionByClientNameAndExternalTxnId(
    clientName,
    dto.external_txn_id
  );

  if (existingPendingSession) {
    // Calculate age of existing session
    const sessionAge = Date.now() - existingPendingSession.created_at.getTime();
    const fifteenMinutesInMs = 15 * 60 * 1000;

    if (sessionAge > fifteenMinutesInMs) {
      // Session is older than 15 minutes - mark as incomplete and create new one
      await updateVerificationSessionStatusRepo(
        existingPendingSession.session_uid,
        'incomplete'
      );
      console.log(`Existing pending session ${existingPendingSession.session_uid} marked as incomplete (age: ${Math.round(sessionAge / 1000 / 60)} minutes)`);
    } else {
      // Session is less than 15 minutes old - cannot create new session
      throw new Error(`A verification session with status PENDING already exists for client_name: ${clientName} and external_txn_id: ${dto.external_txn_id}. Please wait for the existing session to expire (${Math.round((fifteenMinutesInMs - sessionAge) / 1000 / 60)} minutes remaining).`);
    }
  }

  // Create new session
  const sessionId = uuidv4();
  const status = 'pending';
  const auditStatus = 'pending';
  
  const session = await sql.begin(async (tx) => {
    const sessionData = await createVerificationSessionRepo(
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
    
    return sessionData;
  });

  // Generate temp token with sessionId and timestamp matching database created_at
  // Convert database timestamp (Date object) to milliseconds for token
  const sessionTimestamp = session.created_at.getTime();
  const tempToken = generateTempToken(sessionId, sessionTimestamp);
  
  // Store temp token in Redis for one-time use validation (Redis is required)
  await storeTempToken(tempToken, sessionId);

  return {
    ...session,
    tempToken,
  };
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

/**
 * Activate verification session using temp token
 * Validates temp token (one-time use via Redis), checks session validity, and returns session with JWT token
 */
export const activateVerificationSession = async (tempToken: string): Promise<VerificationSession & { token: string }> => {
  // Verify temp token (JWT validation)
  const tempTokenPayload = verifyTempToken(tempToken);
  
  if (!tempTokenPayload) {
    throw new Error('Invalid temp token');
  }

  // Validate and consume temp token from Redis (one-time use) - Redis is required
  const sessionIdFromRedis = await validateAndConsumeTempToken(tempToken);
  
  if (!sessionIdFromRedis) {
    throw new Error('Invalid or already used temp token');
  }

  // Get session from database to verify it exists and is valid
  const session = await getVerificationSessionByUid(tempTokenPayload.sessionId);
  
  if (!session) {
    throw new Error('Invalid session');
  }

  // Check if session is in pending status
  if (session.status !== 'pending') {
    throw new Error(`Session is not in pending status. Current status: ${session.status}`);
  }

  // Generate regular JWT token for session (to be set as cookie) with JTI
  const sessionTimestamp = session.created_at.getTime();
  const { token, jti } = generateJwt(session.session_uid, sessionTimestamp);
  
  // Store session in Redis with JTI for session revocation
  await storeSession(jti, session.session_uid, config.jwtExpiration);

  return {
    ...session,
    token,
  };
};
