import { Request, Response } from 'express';
import { uploadOtpVideo as uploadOtpVideoService } from '../services/otpVideo.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';

/**
 * Upload OTP video
 * POST /api/otp-video/upload
 */
export const uploadOtpVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, otp } = req.body;
    const video = req.file;

    // Validate required fields
    if (!session_id) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id is required',
      };
      res.status(400).json(response);
      return;
    }

    if (!otp) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'otp is required',
      };
      res.status(400).json(response);
      return;
    }

    if (!video) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'video file is required',
      };
      res.status(400).json(response);
      return;
    }

    const result = await uploadOtpVideoService({
      session_id,
      otp,
      video,
    });

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
