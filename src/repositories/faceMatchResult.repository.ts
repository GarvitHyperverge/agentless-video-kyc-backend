import sql from '../config/supabase';
import { FaceMatchResultModel } from '../models';
import { FaceMatchResult } from '../types';

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

/**
 * Get face match result by session_uid
 */
export const getFaceMatchResultBySessionUid = async (
  sessionUid: string
): Promise<FaceMatchResult | null> => {
  const [faceMatchResult] = await sql<FaceMatchResult[]>`
    SELECT 
      id,
      session_uid,
      match_value,
      match_confidence,
      action,
      created_at
    FROM face_match_result
    WHERE session_uid = ${sessionUid}
    LIMIT 1
  `;
  
  return faceMatchResult || null;
};
