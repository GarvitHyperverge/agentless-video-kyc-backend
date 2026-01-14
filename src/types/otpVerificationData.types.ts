export interface OtpVerificationData {
  id: number;
  session_uid: string;
  otp: number | null;
  extracted_otp: number | null;
  confidence: number | null;
  match: boolean;
  reason: string | null;
  created_at: Date;
  updated_at: Date;
}
