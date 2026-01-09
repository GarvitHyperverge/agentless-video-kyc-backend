import { Request, Response } from 'express';
import { uploadPanCardImages as uploadPanCardImagesService } from '../services/panCard.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { PanCardUploadRequestDto, PanCardUploadResponseDto } from '../dtos/panCard.dto';

/**
 * Upload PAN card image
 * POST /api/pan-card
 */
export const uploadPanCardImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: PanCardUploadRequestDto = req.body;

    if (!dto.session_id || !dto.front_image) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'session_id and front_image are required',
      };
      res.status(400).json(response);
      return;
    }

    const result = await uploadPanCardImagesService(dto);

    // Only return success: true if verificationStatus is true
    if (!result.verificationStatus) {
      const response: ApiResponseDto<PanCardUploadResponseDto> = {
        success: false,
        error: 'PAN card verification failed: extracted data does not match business partner data',
        data: result,
      };
      res.status(200).json(response);
      return;
    }

    const response: ApiResponseDto<PanCardUploadResponseDto> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to upload PAN card image',
    };
    res.status(500).json(response);
  }
};
