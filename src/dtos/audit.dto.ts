import { VerificationSession } from '../types/verificationSession.types';
import { BusinessPartnerPanData } from '../types/businessPartnerPanData.types';
import { CardIdValidation } from '../types/cardIdValidation.types';
import { FaceMatchResult } from '../types/faceMatchResult.types';
import { SelfieValidation } from '../types/selfieValidation.types';
import { SessionMetadata } from '../types/sessionMetadata.types';

// Response DTO for pending sessions list
export interface PendingSessionsResponseDto {
  sessions: VerificationSession[];
  total: number;
}

// Complete session details DTO
export interface SessionDetailsDto {
  session: VerificationSession;
  businessPartnerPanData: BusinessPartnerPanData | null;
  cardIdValidation: CardIdValidation | null;
  faceMatchResult: FaceMatchResult | null;
  selfieValidation: SelfieValidation | null;
  sessionMetadata: SessionMetadata | null;
}
