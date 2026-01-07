import { IdCardExtractionResponseDto } from "./idCardExtraction.dto";

// Request DTO
export interface PanCardUploadRequestDto {
  session_id: string;
  front_image: string;
  back_image: string;
}

// Response DTO
export interface PanCardUploadResponseDto {
  sessionId: string;
  frontVerification: IdCardExtractionResponseDto;
  verificationStatus: boolean;
}
