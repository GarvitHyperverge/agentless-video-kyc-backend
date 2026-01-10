import sql from '../config/supabase';
import { AuditSession } from '../types';

/**
 * Gets an audit session user by username
 */
export const getAuditSessionByUsername = async (
  username: string
): Promise<AuditSession | null> => {
  const [auditSession] = await sql<AuditSession[]>`
    SELECT 
      id,
      username,
      password,
      created_at
    FROM audit_session
    WHERE username = ${username}
    LIMIT 1
  `;
  
  return auditSession || null;
};
