import { PanCardExtractedData } from "../types/idCardValidation.types";

// Request DTO
export interface PanCardUploadRequestDto {
  session_id: string;
  front_image: string;
  back_image: string;
}

// Response DTO
export interface PanCardUploadResponseDto {
  sessionId: string;
  frontVerification: PanCardExtractedData;
  verificationStatus: boolean;
}
