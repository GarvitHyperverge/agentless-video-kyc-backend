export interface VerificationInput {
  id: number;
  session_uid: string;
  input_type: string;
  input_value: string | null;
  created_at: Date;
}
