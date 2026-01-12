import sql from '../config/supabase';
import { VerificationInputModel } from '../models';
import { VerificationInput } from '../types';

/**
 * Creates a new verification input in the database
 * Note: id and created_at are automatically set by the database
 */
export const createVerificationInput = async (
  data: Omit<VerificationInputModel, 'id' | 'created_at'>,
  tx?: typeof sql
): Promise<VerificationInput> => {
  const query = tx || sql;
  const [input] = await query<VerificationInput[]>`
    INSERT INTO verification_inputs (session_uid, input_type, input_value)
    VALUES (${data.session_uid}, ${data.input_type}, ${data.input_value})
    RETURNING 
      id,
      session_uid,
      input_type,
      input_value,
      created_at
  `;
  
  if (!input) {
    throw new Error('Failed to create verification input');
  }
  
  return input;
};

/**
 * Gets verification inputs by session_uid
 */
export const getVerificationInputsBySessionUid = async (
  sessionUid: string,
  tx?: typeof sql
): Promise<VerificationInput[]> => {
  const query = tx || sql;
  const inputs = await query<VerificationInput[]>`
    SELECT 
      id,
      session_uid,
      input_type,
      input_value,
      created_at
    FROM verification_inputs
    WHERE session_uid = ${sessionUid}
    ORDER BY created_at ASC
  `;
  
  return inputs || [];
};

