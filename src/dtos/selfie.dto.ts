// Request DTO
export interface SelfieUploadRequestDto {
  session_id: string;
  image: Express.Multer.File;
}

// Response DTO
export interface SelfieUploadResponseDto {
  sessionId: string;
  selfiePath: string;
  isLive: boolean;
  faceMatch: boolean;
}
