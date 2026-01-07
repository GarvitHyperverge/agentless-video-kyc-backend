export interface FaceMatchResult {
  id: number;
  session_uid: string;
  match_value: string;
  match_confidence: string;
  action: string;
  created_at: Date;
}
