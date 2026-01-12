import { Request, Response } from 'express';
import { uploadOtpVideo as uploadOtpVideoService } from '../services/otpVideo.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';

/**
 * Upload OTP video
 * POST /api/otp-video/upload
 */
export const uploadOtpVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get sessionId from JWT middleware (already validated)
    const sessionId = (req as any).sessionId as string;
    const { otp } = req.body;
    const video = req.file;

    // Validate required fields
    if (!otp || otp.trim() === '') {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'otp is required',
      };
      res.status(400).json(response);
      return;
    }

    if (!video || !video.buffer) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'video file is required',
      };
      res.status(400).json(response);
      return;
    }

    if (video.buffer.length === 0) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Video blob is empty',
      };
      res.status(400).json(response);
      return;
    }

    const dto: OtpVideoUploadRequestDto = {
      session_id: sessionId,
      otp,
      video,
    };

    const result = await uploadOtpVideoService(dto);

    const response: ApiResponseDto<OtpVideoUploadResponseDto> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to upload OTP video',
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message?.includes('required') || error.message?.includes('empty')) {
      statusCode = 400;
    }

    res.status(statusCode).json(response);
  }
};
