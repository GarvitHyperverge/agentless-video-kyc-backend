/**
 * DTOs for session recording upload endpoint
 */

export interface SessionRecordingUploadRequestDto {
  session_id: string;
  latitude: string;
  longitude: string;
  video: Express.Multer.File;
}

export interface SessionRecordingUploadResponseDto {
  sessionId: string;
  videoPath: string;
  message: string;
}
