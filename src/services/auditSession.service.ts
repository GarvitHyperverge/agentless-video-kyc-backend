import { getAuditSessionByUsername } from '../repositories/auditSession.repository';
import { LoginRequestDto, LoginResponseDto } from '../dtos/auditSession.dto';

/**
 * Login service for audit sessions
 * Checks if username exists and matches password
 */
export const login = async (dto: LoginRequestDto): Promise<LoginResponseDto> => {
  // Get user by username
  const auditSession = await getAuditSessionByUsername(dto.username);

  // Check if username exists
  if (!auditSession) {
    return {
      success: false,
      message: 'Invalid username or password',
    };
  }

  // Check if password matches
  if (auditSession.password !== dto.password) {
    return {
      success: false,
      message: 'Invalid username or password',
    };
  }

  // Login successful
  return {
    success: true,
    message: 'Login successful',
    username: auditSession.username,
  };
};
