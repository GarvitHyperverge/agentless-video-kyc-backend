// Request DTO
export interface OtpVideoUploadRequestDto {
  session_id: string;
  otp: string;
  video: Express.Multer.File;
}

// Response DTO
export interface OtpVideoUploadResponseDto {
  sessionId: string;
  videoPath: string;
  message: string;
}
