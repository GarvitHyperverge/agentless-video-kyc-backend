// Request DTOs
export interface CreateVerificationSessionRequestDto {
  external_txn_id: string;
  pan_number: string;
  full_name: string;
  father_name: string;
  date_of_birth: string;
}

export interface UpdateVerificationSessionStatusRequestDto {
  // session_id is extracted from JWT token, not needed in request body
}

export interface UpdateAuditStatusRequestDto {
  session_id: string;
  audit_status: 'pass' | 'fail';
}

// Response DTOs
export interface CreateVerificationSessionResponseDto {
  temp_token: string;
}

export interface MarkVerificationSessionCompletedResponseDto {
  session_uid: string;
  external_txn_id: string;
  status: string;
  client_name: string;
  audit_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateAuditStatusResponseDto {
  session_uid: string;
  external_txn_id: string;
  status: string;
  client_name: string;
  audit_status: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivateSessionRequestDto {
  temp_token: string;
}

export interface ActivateSessionResponseDto {
  session_id: string;
}
