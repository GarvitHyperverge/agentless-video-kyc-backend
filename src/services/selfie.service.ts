import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { checkLiveness } from './livenessCheck.service';
import { matchFace } from './faceMatch.service';
import { createSelfieValidation } from '../repositories/selfieValidation.repository';
import { createFaceMatchResult } from '../repositories/faceMatchResult.repository';
import { SelfieUploadRequestDto, SelfieUploadResponseDto } from '../dtos/selfie.dto';
import { uploadBuffersToS3, downloadFromS3 } from '../utils/s3.util';
import { watermarkAndUploadImages } from '../utils/watermarkPipeline.util';
import { TEMP_DIR, saveImageBuffer } from '../utils/file.util';

const unlink = promisify(fs.unlink);


/**
 * Upload selfie and check liveness and match face with PAN card (Fast Response: Raw upload, checks, then watermark in background)
 * Flow:
 * 1. Upload raw selfie to S3 (blocking - must succeed)
 * 2. Save selfie to temp folder for processing
 * 3. Check liveness using HyperVerge API (blocking)
 * 4. Download PAN card from S3 for face matching (blocking)
 * 5. Match face with PAN card (blocking)
 * 6. Save results to database (blocking)
 * 7. Return success to frontend immediately
 * 8. Watermark selfie and upload watermarked version in background
 * 9. Keep both versions (raw and watermarked) in S3 only
 */
export const uploadSelfie = async (
  dto: SelfieUploadRequestDto
): Promise<SelfieUploadResponseDto> => {
  // S3 storage keys
  const rawStorageKey = `${dto.session_id}/raw/selfie.png`;
  const panCardStorageKey = `${dto.session_id}/raw/pan_front.png`; // Download from S3

  // Step 1: Upload raw selfie to S3 first (must succeed before continuing)
  try {
    // Get image buffer from multer file
    const buffer = dto.image.buffer;
    
    // Get content type from file (default to image/png if not provided)
    const contentType = dto.image.mimetype || 'image/png';

    await uploadBuffersToS3([{ key: rawStorageKey, buffer, contentType }]);
  } catch (s3Error: any) {
    console.error('Error uploading raw selfie to S3:', s3Error);
    throw new Error('Failed to upload raw selfie to S3');
  }

  // Step 2: Save selfie to temp folder (for verification)
  const selfiePath = await saveImageBuffer(dto.image.buffer, `selfie_${dto.session_id}`);

  // Step 3: Check liveness using HyperVerge API (blocking)
  const livenessResult = await checkLiveness(selfiePath, `${dto.session_id}_liveness`);

  // Save liveness result to database
  await createSelfieValidation({
    session_uid: dto.session_id,
    live_face_value: livenessResult.liveFaceValue,
    live_face_confidence: livenessResult.liveFaceConfidence,
    action: livenessResult.action,
  });

  // Step 4: Download PAN card from S3 for face matching (blocking)
  const panCardImagePath = path.join(TEMP_DIR, `pan_${dto.session_id}_${Date.now()}.png`);
  
  try {
    await downloadFromS3(panCardStorageKey, panCardImagePath);
    console.log(`PAN card downloaded from S3: ${panCardStorageKey}`);
  } catch (downloadError: any) {
    // Clean up selfie temp file
    await unlink(selfiePath).catch(console.error);
    throw new Error(`Failed to download PAN card from S3: ${downloadError.message}`);
  }

  // Step 5: Match selfie with PAN card face (blocking)
  let faceMatchResult;
  try {
    faceMatchResult = await matchFace(selfiePath, panCardImagePath, `${dto.session_id}_faceMatch`);
  } catch (faceMatchError: any) {
    // Clean up temp files
    await Promise.all([
      unlink(selfiePath).catch(console.error),
      unlink(panCardImagePath).catch(console.error),
    ]);
    throw faceMatchError;
  }

  // Save face match result to database
  await createFaceMatchResult({
    session_uid: dto.session_id,
    match_value: faceMatchResult.match ? 'yes' : 'no',
    match_confidence: faceMatchResult.confidence,
    action: faceMatchResult.action,
  });

  // Clean up PAN card temp file (selfie temp file will be cleaned up in background)
  await unlink(panCardImagePath).catch(console.error);

  // Step 6: Process watermarking and watermarked upload in background (fire-and-forget)
  // Don't await - let it run in the background
  const watermarkedStorageKey = `${dto.session_id}/watermarked/selfie.png`;
  
  watermarkAndUploadImages(
    [{ inputPath: selfiePath, s3Key: watermarkedStorageKey }],
    dto.session_id
  )
    .catch((error) => {
      console.error('Error in background watermarking process:', error);
    })
    .finally(() => {
      // Clean up selfie temp file after watermarking (whether successful or not)
      unlink(selfiePath).catch(console.error);
    });

  // Step 7: Return success immediately with raw S3 path
  // Watermarking will happen in background and update S3 separately
  return {
    sessionId: dto.session_id,
    selfiePath: rawStorageKey,
    isLive: livenessResult.isLive,
    faceMatch: faceMatchResult.match,
  };
};
