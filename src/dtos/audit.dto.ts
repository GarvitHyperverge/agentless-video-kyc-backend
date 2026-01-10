import { VerificationSession } from '../types/verificationSession.types';

// Response DTO for pending sessions list
export interface PendingSessionsResponseDto {
  sessions: VerificationSession[];
  total: number;
}
