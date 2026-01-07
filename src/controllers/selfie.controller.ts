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

    // Check if liveness and face match both passed
    if (!result.isLive || !result.faceMatch) {
      const errors: string[] = [];
      if (!result.isLive) errors.push('Liveness check failed');
      if (!result.faceMatch) errors.push('Face match failed');
      
      const response: ApiResponseDto<SelfieUploadResponseDto> = {
        success: false,
        data: result,
        error: errors.join(', '),
      };
      res.status(400).json(response);
      return;
    }

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
