import sql from '../config/supabase';
import { VerificationSessionModel } from '../models';
import { VerificationSession } from '../types';

// Type for transaction - accepts both Sql and TransactionSql
// Using 'any' to avoid complex type inference issues with postgres transactions
type SqlOrTransaction = typeof sql | any;

/**
 * Creates a new verification session in the database
 * Note: created_at and updated_at are automatically set by the database
 */
export const createVerificationSession = async (
  data: Omit<VerificationSessionModel, 'created_at' | 'updated_at'>,
  tx?: SqlOrTransaction
): Promise<VerificationSession> => {
  const query = tx || sql;
  const [session] = await query<VerificationSession[]>`
    INSERT INTO verification_session (session_uid, external_txn_id, status, client_name, audit_status)
    VALUES (${data.session_uid}, ${data.external_txn_id}, ${data.status}, ${data.client_name}, ${data.audit_status})
    RETURNING 
      session_uid,
      external_txn_id,
      status,
      client_name,
      audit_status,
      created_at,
      updated_at
  `;
  
  if (!session) {
    throw new Error('Failed to create verification session');
  }
  
  return session;
};

/**
 * Gets a verification session by session_uid
 */
export const getVerificationSessionByUid = async (
  sessionUid: string,
  tx?: SqlOrTransaction
): Promise<VerificationSession | null> => {
  const query = tx || sql;
  const [session] = await query<VerificationSession[]>`
    SELECT 
      session_uid,
      external_txn_id,
      status,
      client_name,
      audit_status,
      created_at,
      updated_at
    FROM verification_session
    WHERE session_uid = ${sessionUid}
  `;
  
  return session || null;
};

/**
 * Gets a pending verification session by client_name and external_txn_id
 * Returns the session if found, null otherwise
 */
export const getPendingSessionByClientNameAndExternalTxnId = async (
  clientName: string,
  externalTxnId: string,
  tx?: SqlOrTransaction
): Promise<VerificationSession | null> => {
  const query = tx || sql;
  const [session] = await query<VerificationSession[]>`
    SELECT 
      session_uid,
      external_txn_id,
      status,
      client_name,
      audit_status,
      created_at,
      updated_at
    FROM verification_session
    WHERE client_name = ${clientName} 
      AND external_txn_id = ${externalTxnId} 
      AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `;
  
  return session || null;
};

/**
 * Gets all verification sessions with optional status filter
 * @param filter - 'pending', 'completed', or 'all'. Defaults to 'pending'
 */
export const getAllSessionsByFilter = async (filter: 'pending' | 'completed' | 'all' = 'pending'): Promise<VerificationSession[]> => {
  if (filter === 'all') {
    const sessions = await sql<VerificationSession[]>`
      SELECT 
        session_uid,
        external_txn_id,
        status,
        client_name,
        audit_status,
        created_at,
        updated_at
      FROM verification_session
      ORDER BY created_at DESC
    `;
    return sessions || [];
  }

  const sessions = await sql<VerificationSession[]>`
    SELECT 
      session_uid,
      external_txn_id,
      status,
      client_name,
      audit_status,
      created_at,
      updated_at
    FROM verification_session
    WHERE status = ${filter}
    ORDER BY created_at DESC
  `;
  
  return sessions || [];
};

/**
 * Updates the status of a verification session
 */
export const updateVerificationSessionStatus = async (
  sessionId: string,
  status: string,
  tx?: SqlOrTransaction
): Promise<VerificationSession> => {
  const query = tx || sql;
  const [session] = await query<VerificationSession[]>`
    UPDATE verification_session
    SET status = ${status}, updated_at = NOW()
    WHERE session_uid = ${sessionId}
    RETURNING 
      session_uid,
      external_txn_id,
      status,
      client_name,
      audit_status,
      created_at,
      updated_at
  `;
  
  if (!session) {
    throw new Error('Verification session not found');
  }
  
  return session;
};

/**
 * Updates the audit_status of a verification session
 */
export const updateVerificationSessionAuditStatus = async (
  sessionId: string,
  auditStatus: 'pass' | 'fail',
  tx?: SqlOrTransaction
): Promise<VerificationSession> => {
  const query = tx || sql;
  const [session] = await query<VerificationSession[]>`
    UPDATE verification_session
    SET audit_status = ${auditStatus}, updated_at = NOW()
    WHERE session_uid = ${sessionId}
    RETURNING 
      session_uid,
      external_txn_id,
      status,
      client_name,
      audit_status,
      created_at,
      updated_at
  `;
  
  if (!session) {
    throw new Error('Verification session not found');
  }
  
  return session;
};
