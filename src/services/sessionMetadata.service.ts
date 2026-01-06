import { SessionMetadata } from '../types';
import { CreateSessionMetadataRequestDto } from '../dtos/sessionMetadata.dto';
import { createSessionMetadata as createSessionMetadataRepo } from '../repositories/sessionMetadata.repository';

/**
 * Create a new session metadata record
 */
export const createSessionMetadata = async (dto: CreateSessionMetadataRequestDto): Promise<SessionMetadata> => {
  const sessionMetadata = await createSessionMetadataRepo({
    session_uid: dto.session_uid,
    latitude: dto.latitude,
    longitude: dto.longitude,
    camera_permission: dto.camera_permission,
    microphone_permission: dto.microphone_permission,
    location_permission: dto.location_permission,
    ip_address: dto.ip_address,
    device_type: dto.device_type,
  });
  
  return sessionMetadata;
};
