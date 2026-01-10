import { Request, Response } from 'express';
import { login as loginService } from '../services/auditSession.service';
import { LoginRequestDto } from '../dtos/auditSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { LoginResponseDto } from '../dtos/auditSession.dto';

/**
 * Login endpoint for audit sessions
 * POST /api/audit/login
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: LoginRequestDto = req.body;

    // Validate required fields
    if (!dto.username || !dto.password) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Username and password are required',
      };
      res.status(400).json(response);
      return;
    }

    // Attempt login
    const loginResult = await loginService(dto);

    if (!loginResult.success) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: loginResult.message,
      };
      res.status(401).json(response);
      return;
    }

    // Login successful
    const response: ApiResponseDto<LoginResponseDto> = {
      success: true,
      data: loginResult,
    };
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Login failed',
    };
    res.status(500).json(response);
  }
};
