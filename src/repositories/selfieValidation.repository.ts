import sql from '../config/supabase';
import { SelfieValidationModel } from '../models';
import { SelfieValidation } from '../types';

/**
 * Creates selfie validation data in the database
 */
export const createSelfieValidation = async (
  data: Omit<SelfieValidationModel, 'id' | 'created_at'>
): Promise<SelfieValidation> => {
  const [selfieValidation] = await sql<SelfieValidation[]>`
    INSERT INTO selfie_validation_fields (
      session_uid,
      live_face_value,
      live_face_confidence,
      action
    )
    VALUES (
      ${data.session_uid},
      ${data.live_face_value},
      ${data.live_face_confidence},
      ${data.action}
    )
    RETURNING 
      id,
      session_uid,
      live_face_value,
      live_face_confidence,
      action,
      created_at
  `;
  
  if (!selfieValidation) {
    throw new Error('Failed to create selfie validation data');
  }
  
  return selfieValidation;
};

/**
 * Get selfie validation by session_uid
 */
export const getSelfieValidationBySessionUid = async (
  sessionUid: string
): Promise<SelfieValidation | null> => {
  const [selfieValidation] = await sql<SelfieValidation[]>`
    SELECT 
      id,
      session_uid,
      live_face_value,
      live_face_confidence,
      action,
      created_at
    FROM selfie_validation_fields
    WHERE session_uid = ${sessionUid}
    LIMIT 1
  `;
  
  return selfieValidation || null;
};
