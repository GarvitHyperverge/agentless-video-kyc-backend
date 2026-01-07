import { Request, Response } from 'express';
import { uploadSelfie as uploadSelfieService } from '../services/selfie.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { SelfieUploadRequestDto, SelfieUploadResponseDto } from '../dtos/selfie.dto';

/**
 * Upload selfie
 * POST /api/selfie
 */
export const uploadSelfie = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, image }: SelfieUploadRequestDto = req.body;
    if (!session_id || !image) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id and image are required',
      };
      res.status(400).json(response);
      return;
    }

    const result = await uploadSelfieService(session_id, image);

    const response: ApiResponseDto<SelfieUploadResponseDto> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to upload selfie',
    };
    res.status(500).json(response);
  }
};
