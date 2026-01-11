import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';
import { watermarkVideo } from '../utils/videoWatermark.util';
import { supabaseS3 } from '../config/supabase';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const readFile = promisify(fs.readFile);

// Directory path for OTP videos
const OTP_VIDEOS_DIR = path.join(process.cwd(), 'assets', 'otpVideos');
const TEMP_DIR = path.join(process.cwd(), 'assets', 'temp');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload OTP video with watermark (Option A: Raw first, then watermark)
 * Flow:
 * 1. Upload raw video to S3 (backup)
 * 2. Watermark video locally
 * 3. Upload watermarked version to S3
 * 4. Keep both versions (raw and watermarked) in S3
 */
export async function uploadOtpVideo(
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> {
  // Ensure directories exist
  await ensureDirectoryExists(OTP_VIDEOS_DIR);
  await ensureDirectoryExists(TEMP_DIR);

  // Generate file paths
  const tempFilePath = path.join(TEMP_DIR, `temp_${dto.session_id}_${Date.now()}.webm`);
  const watermarkedFilePath = path.join(OTP_VIDEOS_DIR, `${dto.session_id}_otpVid.webm`);

  // S3 storage keys
  const rawStorageKey = `${dto.session_id}/raw/otpVideo.webm`;
  const watermarkedStorageKey = `${dto.session_id}/watermarked/otpVideo.webm`;
  const BUCKET_NAME = 'kyc-media';

  let rawUploaded = false;
  let watermarkingSucceeded = false;

  try {
    // Step 1: Save raw video to temp file
    await writeFile(tempFilePath, dto.video.buffer);

    // Step 2: Upload raw video to S3 first (backup)
    if (supabaseS3) {
      try {
        const rawCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: rawStorageKey,
          Body: dto.video.buffer, // Use original buffer directly
          ContentType: 'video/webm',
        });

        await supabaseS3.send(rawCommand);
        console.log(`Raw OTP video uploaded to S3: ${rawStorageKey}`);
        rawUploaded = true;
      } catch (rawUploadError: any) {
        console.error('Error uploading raw OTP video to S3:', rawUploadError);
        // If raw upload fails, fail the entire operation (no backup)
        throw new Error('Failed to upload raw video to S3');
      }
    } else {
      console.warn('Supabase S3 client not configured - skipping S3 upload');
    }

    // Step 3: Watermark the video with location and timestamp
    try {
      await watermarkVideo(
        tempFilePath,
        watermarkedFilePath,
        dto.latitude,
        dto.longitude
      );
      watermarkingSucceeded = true;
      console.log('Video watermarked successfully');
    } catch (watermarkError: any) {
      console.error('Error watermarking video:', watermarkError);
      // If watermarking fails, keep raw file in S3 and return raw path
      // Don't throw - we have raw file as backup
    }

    // Step 4: Upload watermarked version to S3 (if watermarking succeeded)
    if (watermarkingSucceeded && supabaseS3) {
      try {
        const watermarkedBuffer = await readFile(watermarkedFilePath);
        
        const watermarkedCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: watermarkedStorageKey,
          Body: watermarkedBuffer,
          ContentType: 'video/webm',
        });

        await supabaseS3.send(watermarkedCommand);
        console.log(`Watermarked OTP video uploaded to S3: ${watermarkedStorageKey}`);

        // Delete local watermarked file after successful S3 upload
        await unlink(watermarkedFilePath).catch(console.error);
      } catch (watermarkedUploadError: any) {
        console.error('Error uploading watermarked video to S3:', watermarkedUploadError);
        // If watermark upload fails, keep raw file in S3
        // Delete local watermarked file
        await unlink(watermarkedFilePath).catch(console.error);
      }
    }

    // Clean up temp file
    await unlink(tempFilePath).catch(console.error);

    // Return appropriate path based on what succeeded
    let videoPath: string;
    if (watermarkingSucceeded && supabaseS3) {
      videoPath = watermarkedStorageKey; // Return watermarked S3 path
    } else if (rawUploaded && supabaseS3) {
      videoPath = rawStorageKey; // Return raw S3 path (watermarking failed)
    } else {
      // Fallback to local path (S3 not configured or failed)
      videoPath = `/assets/otpVideos/${dto.session_id}_otpVid.webm`;
    }

    return {
      sessionId: dto.session_id,
      videoPath: videoPath,
      message: watermarkingSucceeded 
        ? 'OTP video uploaded and watermarked successfully'
        : 'OTP video uploaded but watermarking failed - raw version stored',
    };
  } catch (error: any) {
    // Clean up temp file on error
    await unlink(tempFilePath).catch(console.error);
    
    // If raw was uploaded but watermarking failed, we already handled it above
    // This catch is for critical errors (like raw upload failure)
    throw error;
  }
}
