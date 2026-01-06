import { Request, Response } from 'express';
import { createSessionMetadata as createSessionMetadataService } from '../services/sessionMetadata.service';
import { CreateSessionMetadataRequestDto, SessionMetadataResponseDto } from '../dtos/sessionMetadata.dto';
import { ApiResponseDto } from '../dtos/apiResponse.dto';

/**
 * Create a new session metadata
 * POST /api/session-metadata
 */
export const createSessionMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const dto: CreateSessionMetadataRequestDto = req.body;
    const sessionMetadata = await createSessionMetadataService(dto);
    
    const response: ApiResponseDto<SessionMetadataResponseDto> = {
      success: true,
      data: sessionMetadata,
    };
    
    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to create session metadata',
    };
    res.status(400).json(response);
  }
};
