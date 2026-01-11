import { promisify } from 'util';
import * as fs from 'fs';
import { SessionRecordingUploadRequestDto, SessionRecordingUploadResponseDto } from '../dtos/sessionRecording.dto';
import { uploadBuffersToS3 } from '../utils/s3.util';
import { watermarkAndUploadVideo } from '../utils/watermarkPipeline.util';
import { saveVideoBuffer } from '../utils/file.util';

const unlink = promisify(fs.unlink);


/**
 * Upload session recording video with watermark (Fast Response: Raw upload first, watermark in background)
 * Flow:
 * 1. Upload raw video to S3 (blocking - must succeed)
 * 2. Save raw video to temp file (for watermarking)
 * 3. Return success to frontend immediately
 * 4. Watermark video locally (background)
 * 5. Upload watermarked version to S3 (background)
 * 6. Keep both versions (raw and watermarked) in S3
 */
export async function uploadSessionRecording(
  dto: SessionRecordingUploadRequestDto
): Promise<SessionRecordingUploadResponseDto> {
  // S3 storage keys
  const rawStorageKey = `${dto.session_id}/raw/sessionRecording.webm`;

  // Step 1: Upload raw video to S3 first (must succeed before continuing)
  try {
    await uploadBuffersToS3([{ key: rawStorageKey, buffer: dto.video.buffer, contentType: 'video/webm' }]);
  } catch (s3Error: any) {
    console.error('Error uploading raw session recording to S3:', s3Error);
    throw new Error('Failed to upload raw session recording to S3');
  }

  // Step 2: Save raw video to temp file (for watermarking)
  const tempFilePath = await saveVideoBuffer(dto.video.buffer, `${dto.session_id}`);

  // Step 3: Process watermarking and watermarked upload in background (fire-and-forget)
  // Don't await - let it run in the background
  const watermarkedStorageKey = `${dto.session_id}/watermarked/sessionRecording.webm`;
  const filePathToCleanup = tempFilePath; // Store in const for closure
  
  watermarkAndUploadVideo(
    tempFilePath,
    dto.session_id,
    watermarkedStorageKey
  )
    .catch((error) => {
      console.error('Error in background watermarking process:', error);
    })
    .finally(() => {
      // Clean up temp file after watermarking (whether successful or not)
      unlink(filePathToCleanup).catch(console.error);
    });

  // Step 4: Return success immediately with raw S3 path
  // Watermarking will happen in background and update S3 separately
  return {
    sessionId: dto.session_id,
    videoPath: rawStorageKey,
    message: 'Session recording uploaded successfully - watermarking in progress',
  };
}
