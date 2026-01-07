// Request DTO
export interface OtpVideoUploadRequestDto {
  session_id: string;
  otp: string;
  video: string;
}

// Response DTO
export interface OtpVideoUploadResponseDto {
  sessionId: string;
  videoPath: string;
}
