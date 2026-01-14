import sql from '../config/supabase';
import { OtpVerificationDataModel } from '../models';
import { OtpVerificationData } from '../types';

/**
 * Creates or updates OTP verification data in the database
 */
export const createOrUpdateOtpVerificationData = async (
  data: Omit<OtpVerificationDataModel, 'id' | 'created_at' | 'updated_at'>,
  tx?: typeof sql
): Promise<OtpVerificationData> => {
  const query = tx || sql;
  const [result] = await query<OtpVerificationData[]>`
    INSERT INTO otp_verification_data (
      session_uid,
      otp,
      extracted_otp,
      confidence,
      match,
      reason
    )
    VALUES (
      ${data.session_uid},
      ${data.otp},
      ${data.extracted_otp},
      ${data.confidence},
      ${data.match},
      ${data.reason}
    )
    ON CONFLICT (session_uid)
    DO UPDATE SET
      otp = EXCLUDED.otp,
      extracted_otp = EXCLUDED.extracted_otp,
      confidence = EXCLUDED.confidence,
      match = EXCLUDED.match,
      reason = EXCLUDED.reason,
      updated_at = now()
    RETURNING 
      id,
      session_uid,
      otp,
      extracted_otp,
      confidence,
      match,
      reason,
      created_at,
      updated_at
  `;
  
  if (!result) {
    throw new Error('Failed to create or update OTP verification data');
  }
  
  return result;
};
