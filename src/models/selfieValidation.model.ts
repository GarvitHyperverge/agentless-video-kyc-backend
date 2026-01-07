export interface SelfieValidationModel {
  id: number;
  session_uid: string;
  live_face_value: string;
  live_face_confidence: string;
  action: string;
  created_at: Date;
}
