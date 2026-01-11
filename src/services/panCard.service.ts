import { promisify } from 'util';
import fs from 'fs';
import { verifyIdCard } from './idCardValidation.service';
import { createCardIdValidation } from '../repositories/cardIdValidation.repository';
import { getBusinessPartnerPanDataBySessionUid } from '../repositories/businessPartnerPanData.repository';
import { compareAllFields } from './fieldMatch.service';
import { PanCardUploadRequestDto, PanCardUploadResponseDto } from '../dtos/panCard.dto';
import { uploadBuffersToS3 } from '../utils/s3.util';
import { watermarkAndUploadImages } from '../utils/watermarkPipeline.util';
import { saveImageBuffer } from '../utils/file.util';

const unlink = promisify(fs.unlink);


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
  // S3 storage keys
  const frontRawStorageKey = `${dto.session_id}/raw/pan_front.png`;
  const backRawStorageKey = `${dto.session_id}/raw/pan_back.png`;

  // Step 1: Upload raw images to S3 first (must succeed before continuing)
  try {
    // Get image buffers from multer files
    const frontBuffer = dto.front_image.buffer;
    const backBuffer = dto.back_image.buffer;
    
    // Get content types from files (default to image/png if not provided)
    const frontContentType = dto.front_image.mimetype || 'image/png';
    const backContentType = dto.back_image.mimetype || 'image/png';

    await uploadBuffersToS3([
      { key: frontRawStorageKey, buffer: frontBuffer, contentType: frontContentType },
      { key: backRawStorageKey, buffer: backBuffer, contentType: backContentType },
    ]);
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
  const frontWatermarkedStorageKey = `${dto.session_id}/watermarked/pan_front.png`;
  const backWatermarkedStorageKey = `${dto.session_id}/watermarked/pan_back.png`;
  
  watermarkAndUploadImages(
    [
      { inputPath: frontImagePath, s3Key: frontWatermarkedStorageKey },
      { inputPath: backImagePath, s3Key: backWatermarkedStorageKey },
    ],
    dto.session_id
  )
    .catch((error) => {
      console.error('Error in background watermarking process:', error);
    })
    .finally(() => {
      // Clean up temp image files after watermarking (whether successful or not)
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
