import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { checkLiveness } from './livenessCheck.service';
import { matchFace } from './faceMatch.service';
import { createSelfieValidation } from '../repositories/selfieValidation.repository';
import { createFaceMatchResult } from '../repositories/faceMatchResult.repository';
import { getSessionMetadataBySessionUid } from '../repositories/sessionMetadata.repository';
import { SelfieUploadRequestDto, SelfieUploadResponseDto } from '../dtos/selfie.dto';
import { supabaseS3 } from '../config/supabase';
import { watermarkImage } from '../utils/imageWatermark.util';
import { Readable } from 'stream';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);

// Directory path for temporary files only
const TEMP_DIR = path.join(process.cwd(), 'assets', 'temp');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Save base64 image to temp file
 */
const saveBase64Image = async (base64Data: string, filename: string): Promise<string> => {
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  const filePath = path.join(TEMP_DIR, `temp_${filename}_${Date.now()}.png`);
  await writeFile(filePath, buffer);
  return filePath;
};

/**
 * Download file from S3 to temp file
 */
const downloadFromS3 = async (bucket: string, key: string, outputPath: string): Promise<void> => {
  if (!supabaseS3) {
    throw new Error('S3 client not configured');
  }

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await supabaseS3.send(command);
  
  if (!response.Body) {
    throw new Error(`Failed to download file from S3: ${key}`);
  }

  // Convert stream to buffer and write to file
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  
  const buffer = Buffer.concat(chunks);
  await writeFile(outputPath, buffer);
};

/**
 * Process watermarking and watermarked upload in background (fire-and-forget)
 */
async function processWatermarkingInBackground(
  selfiePath: string,
  sessionId: string,
  latitude: string,
  longitude: string
): Promise<void> {
  try {
    // S3 storage keys
    const watermarkedStorageKey = `${sessionId}/watermarked/selfie.png`;
    const BUCKET_NAME = 'kyc-media';

    // Generate watermarked file path
    const watermarkedPath = path.join(TEMP_DIR, `watermarked_selfie_${sessionId}_${Date.now()}.png`);

    // Watermark the selfie with location and timestamp
    await watermarkImage(selfiePath, watermarkedPath, latitude, longitude);
    console.log('Selfie watermarked successfully');

    // Upload watermarked version to S3
    if (supabaseS3) {
      try {
        const watermarkedBuffer = await readFile(watermarkedPath);

        const watermarkedCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: watermarkedStorageKey,
          Body: watermarkedBuffer,
          ContentType: 'image/png',
        });

        await supabaseS3.send(watermarkedCommand);
        console.log(`Watermarked selfie uploaded to S3: ${watermarkedStorageKey}`);

        // Delete local watermarked file after successful S3 upload
        await unlink(watermarkedPath).catch(console.error);
      } catch (watermarkedUploadError: any) {
        console.error('Error uploading watermarked selfie to S3:', watermarkedUploadError);
        // Delete local watermarked file
        await unlink(watermarkedPath).catch(console.error);
      }
    }
  } catch (error: any) {
    console.error('Error in background watermarking process:', error);
    // Don't throw - this is background processing, errors are logged only
  } finally {
    // Clean up selfie temp file after watermarking (whether successful or not)
    await unlink(selfiePath).catch(console.error);
  }
}

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
  // Ensure temp directory exists
  await ensureDirectoryExists(TEMP_DIR);

  // Get location from session metadata (needed for background watermarking)
  const sessionMetadata = await getSessionMetadataBySessionUid(dto.session_id);
  if (!sessionMetadata) {
    throw new Error('Session metadata not found - location data required');
  }
  const latitude = sessionMetadata.latitude.toString();
  const longitude = sessionMetadata.longitude.toString();

  // S3 storage keys
  const rawStorageKey = `${dto.session_id}/raw/selfie.png`;
  const panCardStorageKey = `${dto.session_id}/raw/pan_front.png`; // Download from S3
  const BUCKET_NAME = 'kyc-media';

  // Step 1: Upload raw selfie to S3 first (must succeed before continuing)
  if (!supabaseS3) {
    throw new Error('S3 storage not configured - cannot store selfie');
  }

  try {
    // Decode base64 image
    const base64Image = dto.image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Image, 'base64');

    const rawCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: rawStorageKey,
      Body: buffer,
      ContentType: 'image/png',
    });

    await supabaseS3.send(rawCommand);
    console.log(`Raw selfie uploaded to S3: ${rawStorageKey}`);
  } catch (s3Error: any) {
    console.error('Error uploading raw selfie to S3:', s3Error);
    throw new Error('Failed to upload raw selfie to S3');
  }

  // Step 2: Save selfie to temp folder (for verification)
  const selfiePath = await saveBase64Image(dto.image, `selfie_${dto.session_id}`);

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
    await downloadFromS3(BUCKET_NAME, panCardStorageKey, panCardImagePath);
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
  // The background function will clean up the selfie temp file after watermarking
  processWatermarkingInBackground(
    selfiePath,
    dto.session_id,
    latitude,
    longitude
  ).catch((error) => {
    console.error('Background watermarking process error:', error);
    // Clean up selfie temp file if background process fails
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
