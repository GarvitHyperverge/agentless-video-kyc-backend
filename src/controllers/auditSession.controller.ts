import { Request, Response } from 'express';
import { login as loginService } from '../services/auditSession.service';
import { LoginRequestDto } from '../dtos/auditSession.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { LoginResponseDto } from '../dtos/auditSession.dto';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auditJwt.util';
import { storeAuditSession, revokeAuditSession } from '../services/auditSession.service';
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

    // Generate both access and refresh tokens (access token now includes JTI)
    const { token: accessToken, jti } = generateAccessToken(dto.username);
    const { token: refreshToken } = generateRefreshToken(dto.username);

    // Store access token session in Redis with JTI for route protection and session revocation
    try {
      await storeAuditSession(jti, dto.username, config.auditAccessTokenExpiration);
    } catch (error: any) {
      console.error('[Audit Login] Failed to store access token session in Redis:', error);
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

    // Generate new access token (with JTI for Redis session management)
    const { token: newAccessToken, jti } = generateAccessToken(payload.username);
    
    // Store new access token session in Redis with JTI
    try {
      await storeAuditSession(jti, payload.username, config.auditAccessTokenExpiration);
    } catch (error: any) {
      console.error('[Audit Refresh] Failed to store access token session in Redis:', error);
      // Continue anyway - session revocation won't work but token is still valid
    }

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
 * Revokes access token session (JTI) and refresh token from Redis and clears both token cookies
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Extract access token from cookie to get JTI for revocation
    const accessToken = req.cookies?.[config.auditCookie.tokenName];
    
    if (accessToken) {
      try {
        const { verifyAuditJwt } = await import('../utils/auditJwt.util');
        const payload = verifyAuditJwt(accessToken);
        if (payload && payload.jti) {
          // Revoke access token session from Redis using JTI
          await revokeAuditSession(payload.jti);
        }
      } catch (error: any) {
        // If token is invalid/expired, continue with logout anyway
        console.log('[Audit Logout] Could not verify access token for revocation:', error.message);
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
