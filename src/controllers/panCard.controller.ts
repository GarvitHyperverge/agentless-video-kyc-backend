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
    const { session_id } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    const frontImage = files?.front_image?.[0];
    const backImage = files?.back_image?.[0];

    // Validate required fields
    if (!frontImage || !backImage) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'front_image and back_image files are required',
      };
      res.status(400).json(response);
      return;
    }

    if (!frontImage.buffer || frontImage.buffer.length === 0) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'front_image file is empty',
      };
      res.status(400).json(response);
      return;
    }

    if (!backImage.buffer || backImage.buffer.length === 0) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'back_image file is empty',
      };
      res.status(400).json(response);
      return;
    }

    const dto: PanCardUploadRequestDto = {
      session_id,
      front_image: frontImage,
      back_image: backImage,
    };

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
