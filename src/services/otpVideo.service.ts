import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';
import { createVerificationInput } from '../repositories/verificationInput.repository';
import { uploadBuffersToS3 } from '../utils/s3.util';
import { extractAudioFromVideo } from '../utils/audio.util';
import { transcribeAudio } from './vosk.service';
import { confirmOtpMatchWithChatGPT } from './openaiOtpMatch.service';

/**
 * Upload OTP video
 * Flow:
 * 1. Extract audio from video and transcribe using Vosk
 * 2. Upload video to S3 
 * 3. Store OTP in database
 * 4. Return success to frontend 
 */
export async function uploadOtpVideo(
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> {
  // S3 storage keys
  const videoStorageKey = `${dto.session_id}/otpVideo.webm`;
  let transcribedText = '';
  // Step 1: Extract audio from video and transcribe using Vosk
  try {
    console.log(`Extracting audio from video for session: ${dto.session_id} for OTP: ${dto.otp}`);
    const audioBuffer = await extractAudioFromVideo(dto.video.buffer);
    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      console.warn('No audio extracted from video - video may have no audio track');
      throw new Error('No audio data extracted from video');
    }
    console.log(`Transcribing audio with Vosk for session: ${dto.session_id} for OTP: ${dto.otp}`);
    const transcriptionResult = await transcribeAudio(audioBuffer);
    transcribedText = transcriptionResult.text;
    console.log(`Transcribed text: ${transcribedText}`);
  } catch (transcriptionError: any) {
    console.error(`Failed to transcribe audio with Vosk`,transcriptionError);
    throw new Error(`Failed to transcribe audio with Vosk`);
  }

  // Step 2: Ask ChatGPT if transcript OTP matches the provided OTP 
  try {
    const match = await confirmOtpMatchWithChatGPT({
      otp: dto.otp,
      transcript: transcribedText,
    });
  } catch (otpMatchError: any) {
    console.error('[OTP Match] Failed to verify:',otpMatchError);
    throw new Error('Failed to verify OTP');
  }

  // Step 3: Store OTP in verification_inputs table
  try {
    await createVerificationInput({
      session_uid: dto.session_id,
      input_type: 'OTP',
      input_value: dto.otp,
    });
    console.log(`OTP stored for session: ${dto.session_id}`);
  } catch (otpStorageError: any) {
    console.error('Error storing OTP in database:', otpStorageError);
    throw new Error('Failed to store OTP in database');
  }
  // Step 4: Upload video to S3 
  try {
    await uploadBuffersToS3([{ key: videoStorageKey, buffer: dto.video.buffer, contentType: 'video/webm' }]);
  } catch (s3Error: any) {
    console.error('Error uploading OTP video to S3:', s3Error);
    throw new Error('Failed to upload OTP video to S3');
  }

  // Step 5: Return success with S3 path
  return {
    sessionId: dto.session_id,
    videoPath: videoStorageKey,
    message: 'OTP video uploaded successfully',
  };
}
