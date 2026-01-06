import { PanCardExtractedData } from "../services/idCardValidation.service";

// Request DTO
export interface PanCardUploadRequestDto {
  session_id: string;
  front_image: string;
}

// Response DTO
export interface PanCardUploadResponseDto {
  sessionId: string;
  frontImagePath: string;
  frontVerification: PanCardExtractedData;
}
