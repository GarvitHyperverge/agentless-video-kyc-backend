export interface SessionMetadata {
  id: number;
  session_uid: string;
  latitude: number;
  longitude: number;
  camera_permission: boolean;
  microphone_permission: boolean;
  location_permission: boolean;
  ip_address: string;
  device_type: string;
  created_at: Date;
  updated_at: Date;
}
