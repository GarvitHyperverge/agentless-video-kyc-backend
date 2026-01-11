import { getSessionMetadataBySessionUid } from '../repositories/sessionMetadata.repository';

/**
 * Get location (latitude, longitude) from session metadata
 * @param sessionId - Session unique identifier
 * @returns Object with latitude and longitude as strings
 * @throws Error if session metadata is not found
 */
export const getSessionLocation = async (sessionId: string): Promise<{ latitude: string; longitude: string }> => {
  const sessionMetadata = await getSessionMetadataBySessionUid(sessionId);
  
  if (!sessionMetadata) {
    throw new Error('Session metadata not found - location data required');
  }
  
  return {
    latitude: sessionMetadata.latitude.toString(),
    longitude: sessionMetadata.longitude.toString(),
  };
};
