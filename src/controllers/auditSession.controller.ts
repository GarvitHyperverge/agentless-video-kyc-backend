import { Request, Response } from 'express';
import { login as loginService } from '../services/auditSession.service';
import { LoginRequestDto } from '../dtos/auditSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { LoginResponseDto } from '../dtos/auditSession.dto';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { storeRefreshToken, revokeAllRefreshTokens, validateRefreshToken } from '../services/auditToken.service';
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

    // Generate both access and refresh tokens
    const accessToken = generateAccessToken(dto.username);
    const { token: refreshToken, tokenId } = generateRefreshToken(dto.username);

    // Store refresh token in Redis
    try {
      await storeRefreshToken(dto.username, tokenId);
    } catch (error: any) {
      console.error('[Audit Login] Failed to store refresh token in Redis:', error);
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Login failed: unable to store session token',
      };
      res.status(500).json(response);
      return;
    }

    // Set access token as HTTP-only cookie
    res.cookie(config.auditCookie.tokenName, accessToken, {
      httpOnly: config.auditCookie.httpOnly,
      secure: config.auditCookie.secure,
      sameSite: config.auditCookie.sameSite,
      path: config.auditCookie.path,
      maxAge: config.auditCookie.maxAge,
    });

    // Set refresh token as HTTP-only cookie
    res.cookie(config.auditRefreshCookie.tokenName, refreshToken, {
      httpOnly: config.auditRefreshCookie.httpOnly,
      secure: config.auditRefreshCookie.secure,
      sameSite: config.auditRefreshCookie.sameSite,
      path: config.auditRefreshCookie.path,
      maxAge: config.auditRefreshCookie.maxAge,
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
 * Refresh token endpoint for audit sessions
 * POST /api/audit/refresh
 * Validates refresh token from cookie and generates new access token
 */
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract refresh token from cookie
    const refreshToken = req.cookies?.[config.auditRefreshCookie.tokenName];

    if (!refreshToken) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Authentication failed',
      };
      res.status(401).json(response);
      return;
    }

    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error: any) {
      if (error.message === 'TOKEN_EXPIRED') {
        const response: ApiResponseDto<never> = {
          success: false,
          error: 'Authentication failed',
        };
        res.status(401).json(response);
        return;
      } else {
        const response: ApiResponseDto<never> = {
          success: false,
          error: 'Authentication failed',
        };
        res.status(401).json(response);
        return;
      }
    }

    if (!payload || !payload.tokenId) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Authentication failed',
      };
      res.status(401).json(response);
      return;
    }

    // Validate refresh token exists in Redis
    const isValid = await validateRefreshToken(payload.username, payload.tokenId);
    
    if (!isValid) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Authentication failed',
      };
      res.status(401).json(response);
      return;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(payload.username);

    // Set new access token as HTTP-only cookie
    res.cookie(config.auditCookie.tokenName, newAccessToken, {
      httpOnly: config.auditCookie.httpOnly,
      secure: config.auditCookie.secure,
      sameSite: config.auditCookie.sameSite,
      path: config.auditCookie.path,
      maxAge: config.auditCookie.maxAge,
    });

    // Return success response
    const response: ApiResponseDto<{ success: true; message: string }> = {
      success: true,
      data: {
        success: true,
        message: 'Token refreshed successfully',
      },
    };
    res.status(200).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Token refresh failed',
    };
    res.status(500).json(response);
  }
};

/**
 * Logout endpoint for audit sessions
 * POST /api/audit/logout
 * Revokes refresh token from Redis and clears both token cookies
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract refresh token from cookie to get username and tokenId
    const refreshToken = req.cookies?.[config.auditRefreshCookie.tokenName];
    
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        if (payload && payload.tokenId) {
          // Revoke the specific refresh token
          await revokeAllRefreshTokens(payload.username);
        }
      } catch (error: any) {
        // If token is invalid/expired, continue with logout anyway
        console.log('[Audit Logout] Could not verify refresh token for revocation:', error.message);
      }
    }

    // Clear access token cookie
    res.clearCookie(config.auditCookie.tokenName, {
      httpOnly: config.auditCookie.httpOnly,
      secure: config.auditCookie.secure,
      sameSite: config.auditCookie.sameSite,
      path: config.auditCookie.path,
    });

    // Clear refresh token cookie
    res.clearCookie(config.auditRefreshCookie.tokenName, {
      httpOnly: config.auditRefreshCookie.httpOnly,
      secure: config.auditRefreshCookie.secure,
      sameSite: config.auditRefreshCookie.sameSite,
      path: config.auditRefreshCookie.path,
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
