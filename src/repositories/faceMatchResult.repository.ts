import sql from '../config/supabase';
import { FaceMatchResultModel } from '../models/faceMatchResult.model';
import { FaceMatchResult } from '../types/faceMatchResult.types';

/**
 * Creates face match result data in the database
 */
export const createFaceMatchResult = async (
  data: Omit<FaceMatchResultModel, 'id' | 'created_at'>
): Promise<FaceMatchResult> => {
  const [faceMatchResult] = await sql<FaceMatchResult[]>`
    INSERT INTO face_match_result (
      session_uid,
      match_value,
      match_confidence,
      action
    )
    VALUES (
      ${data.session_uid},
      ${data.match_value},
      ${data.match_confidence},
      ${data.action}
    )
    RETURNING 
      id,
      session_uid,
      match_value,
      match_confidence,
      action,
      created_at
  `;
  
  if (!faceMatchResult) {
    throw new Error('Failed to create face match result data');
  }
  
  return faceMatchResult;
};
