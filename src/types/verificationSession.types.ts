export interface VerificationSession {
  session_uid: string;
  external_txn_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}