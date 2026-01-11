import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { SessionRecordingUploadRequestDto, SessionRecordingUploadResponseDto } from '../dtos/sessionRecording.dto';
import { watermarkVideo } from '../utils/videoWatermark.util';
import { supabaseS3 } from '../config/supabase';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

// Directory path for temporary files only
const TEMP_DIR = path.join(process.cwd(), 'assets', 'temp');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Process watermarking and watermarked upload in background (fire-and-forget)
 */
async function processWatermarkingInBackground(
  tempFilePath: string,
  sessionId: string,
  latitude: string,
  longitude: string
): Promise<void> {
  try {
    // S3 storage keys
    const watermarkedStorageKey = `${sessionId}/watermarked/sessionRecording.webm`;
    const BUCKET_NAME = 'kyc-media';

    // Generate watermarked file path
    const watermarkedFilePath = path.join(TEMP_DIR, `watermarked_${sessionId}_${Date.now()}.webm`);

    // Watermark the video with location and timestamp
    await watermarkVideo(
      tempFilePath,
      watermarkedFilePath,
      latitude,
      longitude
    );
    console.log('Session recording watermarked successfully');

    // Upload watermarked version to S3
    if (supabaseS3) {
      try {
        const watermarkedBuffer = await readFile(watermarkedFilePath);
        
        const watermarkedCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: watermarkedStorageKey,
          Body: watermarkedBuffer,
          ContentType: 'video/webm',
        });

        await supabaseS3.send(watermarkedCommand);
        console.log(`Watermarked session recording uploaded to S3: ${watermarkedStorageKey}`);

        // Delete local watermarked file after successful S3 upload
        await unlink(watermarkedFilePath).catch(console.error);
      } catch (watermarkedUploadError: any) {
        console.error('Error uploading watermarked session recording to S3:', watermarkedUploadError);
        // Delete local watermarked file
        await unlink(watermarkedFilePath).catch(console.error);
      }
    }
  } catch (error: any) {
    console.error('Error in background watermarking process:', error);
    // Don't throw - this is background processing, errors are logged only
  } finally {
    // Clean up temp file
    await unlink(tempFilePath).catch(console.error);
  }
}

/**
 * Upload session recording video with watermark (Fast Response: Raw upload first, watermark in background)
 * Flow:
 * 1. Upload raw video to S3 (blocking - must succeed)
 * 2. Return success to frontend immediately
 * 3. Watermark video locally (background)
 * 4. Upload watermarked version to S3 (background)
 * 5. Keep both versions (raw and watermarked) in S3
 */
export async function uploadSessionRecording(
  dto: SessionRecordingUploadRequestDto
): Promise<SessionRecordingUploadResponseDto> {
  // Ensure temp directory exists
  await ensureDirectoryExists(TEMP_DIR);

  // Generate file paths (all temporary)
  const tempFilePath = path.join(TEMP_DIR, `temp_${dto.session_id}_${Date.now()}.webm`);

  // S3 storage keys
  const rawStorageKey = `${dto.session_id}/raw/sessionRecording.webm`;
  const BUCKET_NAME = 'kyc-media';

  try {
    // Step 1: Save raw video to temp file
    await writeFile(tempFilePath, dto.video.buffer);

    // Step 2: Upload raw video to S3 first (must succeed before returning)
    if (!supabaseS3) {
      // Clean up temp file
      await unlink(tempFilePath).catch(console.error);
      throw new Error('S3 storage not configured - cannot store video');
    }

    try {
      const rawCommand = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: rawStorageKey,
        Body: dto.video.buffer, // Use original buffer directly
        ContentType: 'video/webm',
      });

      await supabaseS3.send(rawCommand);
      console.log(`Raw session recording uploaded to S3: ${rawStorageKey}`);
    } catch (rawUploadError: any) {
      // Clean up temp file on error
      await unlink(tempFilePath).catch(console.error);
      console.error('Error uploading raw session recording to S3:', rawUploadError);
      throw new Error('Failed to upload raw session recording to S3');
    }

    // Step 3: Process watermarking and watermarked upload in background (fire-and-forget)
    // Don't await - let it run in the background
    processWatermarkingInBackground(
      tempFilePath,
      dto.session_id,
      dto.latitude,
      dto.longitude
    ).catch((error) => {
      console.error('Background watermarking process error:', error);
    });

    // Return success immediately with raw S3 path
    // Watermarking will happen in background and update S3 separately
    return {
      sessionId: dto.session_id,
      videoPath: rawStorageKey,
      message: 'Session recording uploaded successfully - watermarking in progress',
    };
  } catch (error: any) {
    // Clean up temp file on error
    await unlink(tempFilePath).catch(console.error);
    throw error;
  }
}
