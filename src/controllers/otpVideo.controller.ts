import { Request, Response } from 'express';
import { uploadOtpVideo as uploadOtpVideoService } from '../services/otpVideo.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';

/**
 * Upload OTP video
 * POST /api/otp-video-upload
 */
export const uploadOtpVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, otp, video }: OtpVideoUploadRequestDto = req.body;

    if (!session_id || !otp || !video) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id, otp, and video are required',
      };
      res.status(400).json(response);
      return;
    }
    console.log('session_id', session_id);
    const result = await uploadOtpVideoService(session_id, otp, video);

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
    res.status(500).json(response);
  }
};
