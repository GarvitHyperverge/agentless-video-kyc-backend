import { SessionRecordingUploadRequestDto, SessionRecordingUploadResponseDto } from '../dtos/sessionRecording.dto';
import { uploadBuffersToS3 } from '../utils/s3.util';


/**
 * Upload session recording video
 * Flow:
 * 1. Upload video to S3 (blocking - must succeed)
 * 2. Return success to frontend immediately
 */
export async function uploadSessionRecording(
  dto: SessionRecordingUploadRequestDto
): Promise<SessionRecordingUploadResponseDto> {
  // S3 storage keys
  const videoStorageKey = `${dto.session_id}/sessionRecording.webm`;

  // Step 1: Upload video to S3 (must succeed before continuing)
  try {
    await uploadBuffersToS3([{ key: videoStorageKey, buffer: dto.video.buffer, contentType: 'video/webm' }]);
  } catch (s3Error: any) {
    console.error('Error uploading session recording to S3:', s3Error);
    throw new Error('Failed to upload session recording to S3');
  }

  // Step 2: Return success immediately with S3 path
  return {
    sessionId: dto.session_id,
    videoPath: videoStorageKey,
    message: 'Session recording uploaded successfully',
  };
}
