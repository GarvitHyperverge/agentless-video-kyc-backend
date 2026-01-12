import { VerificationSession } from '../types/verificationSession.types';
import { BusinessPartnerPanData } from '../types/businessPartnerPanData.types';
import { CardIdValidation } from '../types/cardIdValidation.types';
import { FaceMatchResult } from '../types/faceMatchResult.types';
import { SelfieValidation } from '../types/selfieValidation.types';
import { SessionMetadata } from '../types/sessionMetadata.types';
import { VerificationInput } from '../types/verificationInput.types';

// Response DTO for pending sessions list
export interface PendingSessionsResponseDto {
  sessions: VerificationSession[];
  total: number;
}

// Media paths structure - contains presigned URLs for accessing raw media files
// URLs expire after 1 hour for security
export interface MediaPaths {
  images: {
    panFront?: string | null; // Presigned URL for PAN card front image
    panBack?: string | null; // Presigned URL for PAN card back image
    selfie?: string | null; // Presigned URL for selfie image
  };
  videos: {
    otpVideo?: string | null; // Presigned URL for OTP video
    sessionRecording?: string | null; // Presigned URL for session recording video
  };
}

// Complete session details DTO
export interface SessionDetailsDto {
  session: VerificationSession;
  businessPartnerPanData: BusinessPartnerPanData | null;
  cardIdValidation: CardIdValidation | null;
  faceMatchResult: FaceMatchResult | null;
  selfieValidation: SelfieValidation | null;
  sessionMetadata: SessionMetadata | null;
  verificationInputs: VerificationInput[];
  mediaPaths: MediaPaths;
}
