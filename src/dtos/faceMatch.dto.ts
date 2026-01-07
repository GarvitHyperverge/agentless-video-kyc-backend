/**
 * Response DTO from HyperVerge face match API
 */
export interface FaceMatchResponseDto {
  match: boolean;
  confidence: string;
  action: string;
}
