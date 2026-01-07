/**
 * Response DTO from HyperVerge liveness check API
 */
export interface LivenessCheckResponseDto {
  isLive: boolean;
  liveFaceValue: string;
  liveFaceConfidence: string;
  action: string;
}
