import { Request, Response } from 'express';
import { uploadSessionRecording as uploadSessionRecordingService } from '../services/sessionRecording.service';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { SessionRecordingUploadResponseDto } from '../dtos/sessionRecording.dto';

/**
 * Upload session recording
 * POST /api/session-recording/upload
 */
export const uploadSessionRecording = async (req: Request, res: Response): Promise<void> => {
  try {
    const { session_id, latitude, longitude } = req.body;
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

    if (!latitude || !longitude) {
      const response: ApiResponseDto<never> = {
        success: false,
        error: 'latitude and longitude are required',
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

    const result = await uploadSessionRecordingService({
      session_id,
      latitude,
      longitude,
      video,
    });

    const response: ApiResponseDto<SessionRecordingUploadResponseDto> = {
      success: true,
      data: result,
    };

    res.status(201).json(response);
  } catch (error: any) {
    const response: ApiResponseDto<never> = {
      success: false,
      error: error.message || 'Failed to upload session recording',
    };

    // Determine appropriate status code
    let statusCode = 500;
    if (error.message?.includes('required') || error.message?.includes('too large') || error.message?.includes('empty')) {
      statusCode = 400;
    }

    res.status(statusCode).json(response);
  }
};
