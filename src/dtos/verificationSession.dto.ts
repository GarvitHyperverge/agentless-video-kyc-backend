// Request DTO
export interface CreateVerificationSessionRequestDto {
  external_txn_id: string;
  pan_number: string;
  full_name: string;
  father_name: string;
  date_of_birth: string;
}

// Response DTO
export interface VerificationSessionResponseDto {
  session_uid: string;
  external_txn_id: string;
  status: string;
  client_name: string;
  audit_status: string;
  created_at: Date;
  updated_at: Date;
}

// Update status request DTO
export interface UpdateVerificationSessionStatusRequestDto {
  session_id: string;
}

// Update audit status request DTO
export interface UpdateAuditStatusRequestDto {
  session_id: string;
  audit_status: 'pass' | 'fail';
}
