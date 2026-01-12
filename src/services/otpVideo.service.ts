import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';
import { createVerificationInput } from '../repositories/verificationInput.repository';
import { uploadBuffersToS3 } from '../utils/s3.util';
/**
 * Upload OTP video
 * Flow:
 * 1. Upload video to S3 
 * 2. Store OTP in database
 * 3. Return success to frontend immediately
 */
export async function uploadOtpVideo(
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> {
  // S3 storage keys
  const videoStorageKey = `${dto.session_id}/otpVideo.webm`;

  // Step 1: Upload video to S3 (must succeed before continuing)
  try {
    await uploadBuffersToS3([{ key: videoStorageKey, buffer: dto.video.buffer, contentType: 'video/webm' }]);
  } catch (s3Error: any) {
    console.error('Error uploading OTP video to S3:', s3Error);
    throw new Error('Failed to upload OTP video to S3');
  }

  // Step 2: Store OTP in verification_inputs table
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

  // Step 3: Return success immediately with S3 path
  return {
    sessionId: dto.session_id,
    videoPath: videoStorageKey,
    message: 'OTP video uploaded successfully',
  };
}
