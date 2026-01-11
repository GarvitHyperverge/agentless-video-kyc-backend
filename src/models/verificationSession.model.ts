export interface VerificationSessionModel {
  session_uid: string;
  external_txn_id: string ;
  status: string;
  client_name: string;
  created_at: Date;
  updated_at: Date;
}
