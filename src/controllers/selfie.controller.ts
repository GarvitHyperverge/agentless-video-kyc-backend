import { Request, Response } from 'express';
import { uploadSelfie as uploadSelfieService } from '../services/selfie.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { SelfieUploadRequestDto, SelfieUploadResponseDto } from '../dtos/selfie.dto';

/**
 * Upload selfie
 * POST /api/selfie/upload
 */
export const uploadSelfie = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id } = req.body;
    const imageFile = req.file;

    // Validate required fields
    if (!session_id) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id is required',
      };
      res.status(400).json(response);
      return;
    }

    if (!imageFile || !imageFile.buffer) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'image file is required',
      };
      res.status(400).json(response);
      return;
    }

    if (imageFile.buffer.length === 0) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'Image file is empty',
      };
      res.status(400).json(response);
      return;
    }

    const dto: SelfieUploadRequestDto = {
      session_id,
      image: imageFile,
    };

    const result = await uploadSelfieService(dto);

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
