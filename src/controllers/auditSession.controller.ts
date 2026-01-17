import { Request, Response } from 'express';
import { login as loginService } from '../services/auditSession.service';
import { LoginRequestDto } from '../dtos/auditSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { LoginResponseDto } from '../dtos/auditSession.dto';
import { generateAuditJwt } from '../utils/jwt.util';
import { config } from '../config';

/**
 * Login endpoint for audit sessions
 * POST /api/audit/login
 * Sets JWT token as HTTP-only cookie on successful login
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

    // Generate JWT token for audit session
    const token = generateAuditJwt(dto.username);

    // Set JWT as HTTP-only cookie
    res.cookie(config.auditCookie.tokenName, token, {
      httpOnly: config.auditCookie.httpOnly,
      secure: config.auditCookie.secure,
      sameSite: config.auditCookie.sameSite,
      path: config.auditCookie.path,
      maxAge: config.auditCookie.maxAge,
    });

    // Login successful - return success message with username
    const response: ApiResponseDto<LoginResponseDto> = {
      success: true,
      data: {
        success: true,
        message: 'Login successful',
        username: loginResult.username!,
      },
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

/**
 * Logout endpoint for audit sessions
 * POST /api/audit/logout
 * Clears the JWT token cookie on the server side
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {

    res.clearCookie(config.auditCookie.tokenName, {
      httpOnly: config.auditCookie.httpOnly,
      secure: config.auditCookie.secure,
      sameSite: config.auditCookie.sameSite,
      path: config.auditCookie.path,
    });

    // Logout successful - return success message
    const response: ApiResponseDto<{ success: true; message: string }> = {
      success: true,
      data: {
        success: true,
        message: 'Logout successful',
      },
    };
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Logout failed',
    };
    res.status(500).json(response);
  }
};
