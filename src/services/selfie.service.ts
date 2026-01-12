import { checkLiveness } from './livenessCheck.service';
import { matchFace } from './faceMatch.service';
import { createSelfieValidation } from '../repositories/selfieValidation.repository';
import { createFaceMatchResult } from '../repositories/faceMatchResult.repository';
import { SelfieUploadRequestDto, SelfieUploadResponseDto } from '../dtos/selfie.dto';
import { uploadBuffersToS3, downloadBufferFromS3 } from '../utils/s3.util';


/**
 * Upload selfie and check liveness and match face with PAN card
 * Flow:
 * 1. Upload selfie to S3 
 * 2. Check liveness using HyperVerge API with buffer directly (blocking)
 * 3. Download PAN card from S3 as buffer for face matching (blocking)
 * 4. Match face with PAN card using buffers directly (blocking)
 * 5. Save results to database (blocking)
 * 6. Return success to frontend immediately
 */
export const uploadSelfie = async (
  dto: SelfieUploadRequestDto
): Promise<SelfieUploadResponseDto> => {
  // S3 storage keys
  const selfieStorageKey = `${dto.session_id}/selfie.png`;
  const panCardStorageKey = `${dto.session_id}/pan_front.png`; // Download from S3

  // Get image buffer from multer file
  const buffer = dto.image.buffer;
  
  // Get content type from file (default to image/png if not provided)
  const contentType = dto.image.mimetype || 'image/png';

  // Step 1: Upload selfie to S3 (must succeed before continuing)
  try {
    await uploadBuffersToS3([{ key: selfieStorageKey, buffer, contentType }]);
  } catch (s3Error: any) {
    console.error('Error uploading selfie to S3:', s3Error);
    throw new Error('Failed to upload selfie to S3');
  }

  // Step 2: Check liveness using HyperVerge API with buffer directly (blocking)
  const livenessResult = await checkLiveness(buffer, `${dto.session_id}_liveness`);

  // Save liveness result to database
  await createSelfieValidation({
    session_uid: dto.session_id,
    live_face_value: livenessResult.liveFaceValue,
    live_face_confidence: livenessResult.liveFaceConfidence,
    action: livenessResult.action,
  });

  // Step 3: Download PAN card from S3 as buffer for face matching (blocking)
  let panCardBuffer: Buffer;
  try {
    panCardBuffer = await downloadBufferFromS3(panCardStorageKey);
    console.log(`PAN card downloaded from S3: ${panCardStorageKey}`);
  } catch (downloadError: any) {
    throw new Error(`Failed to download PAN card from S3: ${downloadError.message}`);
  }

  // Step 4: Match selfie with PAN card face using buffers directly (blocking)
  const faceMatchResult = await matchFace(buffer, panCardBuffer, `${dto.session_id}_faceMatch`);

  // Save face match result to database
  await createFaceMatchResult({
    session_uid: dto.session_id,
    match_value: faceMatchResult.match ? 'yes' : 'no',
    match_confidence: faceMatchResult.confidence,
    action: faceMatchResult.action,
  });

  // Step 5: Return success immediately with S3 path
  return {
    sessionId: dto.session_id,
    selfiePath: selfieStorageKey,
    isLive: livenessResult.isLive,
    faceMatch: faceMatchResult.match,
  };
};
