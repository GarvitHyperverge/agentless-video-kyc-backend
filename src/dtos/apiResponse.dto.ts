// Common API Response DTO
export interface ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: string;
}
