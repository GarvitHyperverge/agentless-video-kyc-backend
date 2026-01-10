import sql from '../config/supabase';
import { SessionMetadataModel } from '../models';
import { SessionMetadata } from '../types';

/**
 * Creates a new session metadata record in the database
 * Uses RETURNING clause for atomic operation with SQL-level transformations
 * 
 * @param data - Session metadata data (excludes auto-generated fields: id, created_at, updated_at)
 * @returns Promise<SessionMetadata> - The created session metadata with domain type transformations applied
 * 
 * Note: id, created_at and updated_at are automatically set by the database
 */
export const createSessionMetadata = async (
  data: Omit<SessionMetadataModel, 'id' | 'created_at' | 'updated_at'>
): Promise<SessionMetadata> => {
  const [sessionMetadata] = await sql<SessionMetadata[]>`
    INSERT INTO session_metadata (
      session_uid,
      latitude,
      longitude,
      camera_permission,
      microphone_permission,
      location_permission,
      ip_address,
      device_type
    )
    VALUES (
      ${data.session_uid},
      ${data.latitude},
      ${data.longitude},
      ${data.camera_permission},
      ${data.microphone_permission},
      ${data.location_permission},
      ${data.ip_address},
      ${data.device_type}
    )
    RETURNING 
      id,
      session_uid,
      latitude,
      longitude,
      camera_permission,
      microphone_permission,
      location_permission,
      ip_address::text as ip_address,
      device_type,
      created_at,
      updated_at
  `;
  
  if (!sessionMetadata) {
    throw new Error('Failed to create session metadata');
  }
  
  return sessionMetadata;
};

/**
 * Get session metadata by session_uid
 */
export const getSessionMetadataBySessionUid = async (
  sessionUid: string
): Promise<SessionMetadata | null> => {
  const [sessionMetadata] = await sql<SessionMetadata[]>`
    SELECT 
      id,
      session_uid,
      latitude,
      longitude,
      camera_permission,
      microphone_permission,
      location_permission,
      ip_address::text as ip_address,
      device_type,
      created_at,
      updated_at
    FROM session_metadata
    WHERE session_uid = ${sessionUid}
    LIMIT 1
  `;
  
  return sessionMetadata || null;
};
