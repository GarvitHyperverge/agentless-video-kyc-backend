import { promisify } from 'util';
import * as fs from 'fs';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';
import { createVerificationInput } from '../repositories/verificationInput.repository';
import { uploadBuffersToS3 } from '../utils/s3.util';
import { watermarkAndUploadVideo } from '../utils/watermarkPipeline.util';
import { saveVideoBuffer } from '../utils/file.util';

const unlink = promisify(fs.unlink);
/**
 * Upload OTP video with watermark (Fast Response: Raw upload first, watermark in background)
 * Flow:
 * 1. Upload raw video to S3 (blocking - must succeed)
 * 2. Save raw video to temp file (for watermarking)
 * 3. Store OTP in database
 * 4. Return success to frontend immediately
 * 5. Watermark video locally (background)
 * 6. Upload watermarked version to S3 (background)
 * 7. Keep both versions (raw and watermarked) in S3
 */
export async function uploadOtpVideo(
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> {
  // S3 storage keys
  const rawStorageKey = `${dto.session_id}/raw/otpVideo.webm`;

  // Step 1: Upload raw video to S3 first (must succeed before continuing)
  try {
    await uploadBuffersToS3([{ key: rawStorageKey, buffer: dto.video.buffer, contentType: 'video/webm' }]);
  } catch (s3Error: any) {
    console.error('Error uploading raw OTP video to S3:', s3Error);
    throw new Error('Failed to upload raw OTP video to S3');
  }

  // Step 2: Save raw video to temp file (for watermarking)
  const tempFilePath = await saveVideoBuffer(dto.video.buffer, `${dto.session_id}`);

  // Step 3: Store OTP in verification_inputs table
  try {
    await createVerificationInput({
      session_uid: dto.session_id,
      input_type: 'OTP',
      input_value: dto.otp,
    });
    console.log(`OTP stored for session: ${dto.session_id}`);
  } catch (otpStorageError: any) {
    // Log error but don't fail the request - video upload succeeded
    console.error('Error storing OTP in database:', otpStorageError);
  }

  // Step 4: Process watermarking and watermarked upload in background (fire-and-forget)
  // Don't await - let it run in the background
  const watermarkedStorageKey = `${dto.session_id}/watermarked/otpVideo.webm`;
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

  // Step 5: Return success immediately with raw S3 path
  // Watermarking will happen in background and update S3 separately
  return {
    sessionId: dto.session_id,
    videoPath: rawStorageKey,
    message: 'OTP video uploaded successfully - watermarking in progress',
  };
}
