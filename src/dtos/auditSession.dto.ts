// Request DTO
export interface LoginRequestDto {
  username: string;
  password: string;
}

// Response DTO
export interface LoginResponseDto {
  success: boolean;
  message: string;
  username?: string;
}
