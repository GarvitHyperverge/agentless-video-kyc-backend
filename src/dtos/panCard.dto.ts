import { IdCardExtractionResponseDto } from "./idCardExtraction.dto";

// Request DTO
export interface PanCardUploadRequestDto {
  session_id: string;
  front_image: Express.Multer.File;
  back_image: Express.Multer.File;
}

// Response DTO
export interface PanCardUploadResponseDto {
  sessionId: string;
  frontVerification: IdCardExtractionResponseDto;
  verificationStatus: boolean;
}
