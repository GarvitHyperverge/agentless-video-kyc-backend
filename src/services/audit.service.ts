import { getAllSessionsByFilter, getVerificationSessionByUid } from '../repositories/verificationSession.repository';
import { getBusinessPartnerPanDataBySessionUid } from '../repositories/businessPartnerPanData.repository';
import { getCardIdValidationBySessionUid } from '../repositories/cardIdValidation.repository';
import { getFaceMatchResultBySessionUid } from '../repositories/faceMatchResult.repository';
import { getSelfieValidationBySessionUid } from '../repositories/selfieValidation.repository';
import { getSessionMetadataBySessionUid } from '../repositories/sessionMetadata.repository';
import { getVerificationInputsBySessionUid } from '../repositories/verificationInput.repository';
import { PendingSessionsResponseDto, SessionDetailsDto } from '../dtos/audit.dto';
import { getPresignedUrl } from '../utils/s3PresignedUrl.util';

/**
 * Get all verification sessions with optional status filter
 * @param filter - 'pending', 'completed', or 'all'. Defaults to 'pending'
 */
export const getAllPendingSessions = async (filter: 'pending' | 'completed' | 'all' = 'pending'): Promise<PendingSessionsResponseDto> => {
  // Get sessions by filter
  const sessions = await getAllSessionsByFilter(filter);

  return {
    sessions,
    total: sessions.length,
  };
};

/**
 * Get complete session details by session_uid
 * @param sessionUid - Session unique identifier
 */
export const getSessionDetails = async (sessionUid: string): Promise<SessionDetailsDto | null> => {
  // Get session basic info
  const session = await getVerificationSessionByUid(sessionUid);

  if (!session) {
    return null;
  }

  // Get all related data in parallel
  const [
    businessPartnerPanData,
    cardIdValidation,
    faceMatchResult,
    selfieValidation,
    sessionMetadata,
    verificationInputs,
  ] = await Promise.all([
    getBusinessPartnerPanDataBySessionUid(sessionUid),
    getCardIdValidationBySessionUid(sessionUid),
    getFaceMatchResultBySessionUid(sessionUid),
    getSelfieValidationBySessionUid(sessionUid),
    getSessionMetadataBySessionUid(sessionUid),
    getVerificationInputsBySessionUid(sessionUid),
  ]);

  // Generate presigned URLs for media files (already watermarked by frontend)
  // These URLs allow temporary access (1 hour expiry) without exposing S3 credentials
  const [
    panFrontUrl,
    panBackUrl,
    selfieUrl,
    otpVideoUrl,
    sessionRecordingUrl,
  ] = await Promise.all([
    getPresignedUrl(`${sessionUid}/pan_front.png`),
    getPresignedUrl(`${sessionUid}/pan_back.png`),
    getPresignedUrl(`${sessionUid}/selfie.png`),
    getPresignedUrl(`${sessionUid}/otpVideo.webm`),
    getPresignedUrl(`${sessionUid}/sessionRecording.webm`),
  ]);

  const mediaPaths = {
    images: {
      panFront: panFrontUrl,
      panBack: panBackUrl,
      selfie: selfieUrl,
    },
    videos: {
      otpVideo: otpVideoUrl,
      sessionRecording: sessionRecordingUrl,
    },
  };

  return {
    session,
    businessPartnerPanData,
    cardIdValidation,
    faceMatchResult,
    selfieValidation,
    sessionMetadata,
    verificationInputs,
    mediaPaths,
  };
};
