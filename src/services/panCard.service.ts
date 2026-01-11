import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyIdCard } from './idCardValidation.service';
import { createCardIdValidation } from '../repositories/cardIdValidation.repository';
import { getBusinessPartnerPanDataBySessionUid } from '../repositories/businessPartnerPanData.repository';
import { getSessionMetadataBySessionUid } from '../repositories/sessionMetadata.repository';
import { compareAllFields } from './fieldMatch.service';
import { PanCardUploadRequestDto, PanCardUploadResponseDto } from '../dtos/panCard.dto';
import { supabaseS3 } from '../config/supabase';
import { watermarkImage } from '../utils/imageWatermark.util';

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
 * Save image buffer to temp file
 */
const saveImageBuffer = async (buffer: Buffer, filename: string): Promise<string> => {
  const filePath = path.join(TEMP_DIR, `temp_${filename}_${Date.now()}.png`);
  await writeFile(filePath, buffer);
  return filePath;
};

/**
 * Process watermarking and watermarked upload in background (fire-and-forget)
 */
async function processWatermarkingInBackground(
  frontImagePath: string,
  backImagePath: string,
  sessionId: string,
  latitude: string,
  longitude: string
): Promise<void> {
  try {
    // S3 storage keys
    const frontWatermarkedStorageKey = `${sessionId}/watermarked/pan_front.png`;
    const backWatermarkedStorageKey = `${sessionId}/watermarked/pan_back.png`;
    const BUCKET_NAME = 'kyc-media';

    // Generate watermarked file paths
    const frontWatermarkedPath = path.join(TEMP_DIR, `watermarked_front_${sessionId}_${Date.now()}.png`);
    const backWatermarkedPath = path.join(TEMP_DIR, `watermarked_back_${sessionId}_${Date.now()}.png`);

    // Watermark the images with location and timestamp
    await Promise.all([
      watermarkImage(frontImagePath, frontWatermarkedPath, latitude, longitude),
      watermarkImage(backImagePath, backWatermarkedPath, latitude, longitude),
    ]);
    console.log('PAN images watermarked successfully');

    // Upload watermarked versions to S3
    if (supabaseS3) {
      try {
        const frontWatermarkedBuffer = await readFile(frontWatermarkedPath);
        const backWatermarkedBuffer = await readFile(backWatermarkedPath);

        const frontWatermarkedCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: frontWatermarkedStorageKey,
          Body: frontWatermarkedBuffer,
          ContentType: 'image/png',
        });

        const backWatermarkedCommand = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: backWatermarkedStorageKey,
          Body: backWatermarkedBuffer,
          ContentType: 'image/png',
        });

        await Promise.all([
          supabaseS3.send(frontWatermarkedCommand),
          supabaseS3.send(backWatermarkedCommand),
        ]);

        console.log(`Watermarked PAN images uploaded to S3: ${frontWatermarkedStorageKey}, ${backWatermarkedStorageKey}`);

        // Delete local watermarked files after successful S3 upload
        await Promise.all([
          unlink(frontWatermarkedPath).catch(console.error),
          unlink(backWatermarkedPath).catch(console.error),
        ]);
      } catch (watermarkedUploadError: any) {
        console.error('Error uploading watermarked PAN images to S3:', watermarkedUploadError);
        // Delete local watermarked files
        await Promise.all([
          unlink(frontWatermarkedPath).catch(console.error),
          unlink(backWatermarkedPath).catch(console.error),
        ]);
      }
    }
  } catch (error: any) {
    console.error('Error in background watermarking process:', error);
    // Don't throw - this is background processing, errors are logged only
  } finally {
    // Clean up temp image files after watermarking (whether successful or not)
    await Promise.all([
      unlink(frontImagePath).catch(console.error),
      unlink(backImagePath).catch(console.error),
    ]);
  }
}

/**
 * Upload and verify PAN card front and back images (Fast Response: Raw upload, checks, then watermark in background)
 * Flow:
 * 1. Upload raw images to S3 (blocking - must succeed)
 * 2. Save images to temp folder for verification
 * 3. Verify front image with HyperVerge API (blocking)
 * 4. Compare fields with business partner data (blocking)
 * 5. Save results to database (blocking)
 * 6. Return success to frontend immediately
 * 7. Watermark images and upload watermarked versions in background
 * 8. Keep both versions (raw and watermarked) in S3 only
 */
export const uploadPanCardImages = async (
  dto: PanCardUploadRequestDto
): Promise<PanCardUploadResponseDto> => {
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
  const frontRawStorageKey = `${dto.session_id}/raw/pan_front.png`;
  const backRawStorageKey = `${dto.session_id}/raw/pan_back.png`;
  const BUCKET_NAME = 'kyc-media';

  // Step 1: Upload raw images to S3 first (must succeed before continuing)
  if (!supabaseS3) {
    throw new Error('S3 storage not configured - cannot store PAN images');
  }

  try {
    // Get image buffers from multer files
    const frontBuffer = dto.front_image.buffer;
    const backBuffer = dto.back_image.buffer;
    
    // Get content types from files (default to image/png if not provided)
    const frontContentType = dto.front_image.mimetype || 'image/png';
    const backContentType = dto.back_image.mimetype || 'image/png';

    // Upload front image
    const frontRawCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: frontRawStorageKey,
      Body: frontBuffer,
      ContentType: frontContentType,
    });

    // Upload back image
    const backRawCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: backRawStorageKey,
      Body: backBuffer,
      ContentType: backContentType,
    });

    await Promise.all([
      supabaseS3.send(frontRawCommand),
      supabaseS3.send(backRawCommand),
    ]);

    console.log(`Raw PAN images uploaded to S3: ${frontRawStorageKey}, ${backRawStorageKey}`);
  } catch (s3Error: any) {
    console.error('Error uploading raw PAN images to S3:', s3Error);
    throw new Error('Failed to upload raw PAN images to S3');
  }

  // Step 2: Save front and back images to temp folder (for verification)
  const frontImagePath = await saveImageBuffer(dto.front_image.buffer, `front_${dto.session_id}`);
  const backImagePath = await saveImageBuffer(dto.back_image.buffer, `back_${dto.session_id}`);

  // Step 3: Verify front image with HyperVerge API (blocking)
  const frontVerification = await verifyIdCard({
    imagePath: frontImagePath,
    transactionId: `${dto.session_id}_front`,
    documentId: 'pan',
    countryId: 'ind',
    expectedDocumentSide: 'front',
  });

  // Step 4: Save extracted data to database (blocking)
  await createCardIdValidation({
    session_uid: dto.session_id,
    id_number: frontVerification.idNumber,
    full_name: frontVerification.fullName,
    date_of_birth: frontVerification.dateOfBirth,
    father_name: frontVerification.fatherName,
  });

  // Step 5: Get business partner data for comparison
  const businessPartnerData = await getBusinessPartnerPanDataBySessionUid(dto.session_id);

  if (!businessPartnerData) {
    // Clean up temp files
    await Promise.all([
      unlink(frontImagePath).catch(console.error),
      unlink(backImagePath).catch(console.error),
    ]);
    throw new Error('Business partner PAN data not found for this session');
  }

  console.log("I AM HERE")
  // Step 6: Compare fields using HyperVerge matchFields API (blocking)
  const comparisonResult = await compareAllFields(
    dto.session_id,
    {
      fullName: frontVerification.fullName,
      dateOfBirth: frontVerification.dateOfBirth,
      fatherName: frontVerification.fatherName,
      idNumber: frontVerification.idNumber,
    },
    {
      full_name: businessPartnerData.full_name,
      date_of_birth: businessPartnerData.date_of_birth,
      father_name: businessPartnerData.father_name,
      pan_number: businessPartnerData.pan_number,
    }
  );

  // Step 7: Process watermarking and watermarked upload in background (fire-and-forget)
  // Don't await - let it run in the background
  // The background function will clean up the temp image files after watermarking
  processWatermarkingInBackground(
    frontImagePath,
    backImagePath,
    dto.session_id,
    latitude,
    longitude
  ).catch((error) => {
    console.error('Background watermarking process error:', error);
    // Clean up temp files if background process fails
    Promise.all([
      unlink(frontImagePath).catch(console.error),
      unlink(backImagePath).catch(console.error),
    ]).catch(console.error);
  });

  // Step 8: Return success immediately with verification results
  // Watermarking will happen in background and update S3 separately
  return {
    sessionId: dto.session_id,
    frontVerification,
    verificationStatus: comparisonResult.allMatched,
  };
};
