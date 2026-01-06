// Request DTO
export interface CreateVerificationSessionRequestDto {
  external_txn_id: string;
}

// Response DTO
export interface VerificationSessionResponseDto {
  session_uid: string;
  external_txn_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}
