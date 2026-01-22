import { verifyIdCard } from './idCardValidation.service';
import { createCardIdValidation } from '../repositories/cardIdValidation.repository';
import { getBusinessPartnerPanDataBySessionUid } from '../repositories/businessPartnerPanData.repository';
import { compareAllFields } from './fieldMatch.service';
import { PanCardUploadRequestDto, PanCardUploadResponseDto } from '../dtos/panCard.dto';
import { uploadBuffersToS3 } from '../utils/s3.util';


/**
 * Upload and verify PAN card front and back images
 * Flow:
 * 1. Upload images to S3 
 * 2. Verify front image with HyperVerge API
 * 3. Compare fields with business partner data 
 * 4. Save results to database 
 * 5. Return success to frontend immediately
 */
export const uploadPanCardImages = async (
  dto: PanCardUploadRequestDto
): Promise<PanCardUploadResponseDto> => {
  // S3 storage keys
  const frontStorageKey = `${dto.session_id}/pan_front.png`;
  const backStorageKey = `${dto.session_id}/pan_back.png`;

  // Get image buffers from multer files
  const frontBuffer = dto.front_image.buffer;
  const backBuffer = dto.back_image.buffer;
  
  // Get content types from files (default to image/png if not provided)
  const frontContentType = dto.front_image.mimetype || 'image/png';
  const backContentType = dto.back_image.mimetype || 'image/png';

  // Step 1: Upload images to S3 (must succeed before continuing)
  try {
    await uploadBuffersToS3([
      { key: frontStorageKey, buffer: frontBuffer, contentType: frontContentType },
      { key: backStorageKey, buffer: backBuffer, contentType: backContentType },
    ]);
  } catch (s3Error: any) {
    console.error('Error uploading PAN images to S3:', s3Error);
    throw new Error('Failed to upload PAN images to S3');
  }

  // Step 2: Verify front image with HyperVerge API using buffer directly (blocking)
  const frontVerification = await verifyIdCard({
    imageBuffer: frontBuffer,
    transactionId: `${dto.session_id}_front`,
    documentId: 'pan',
    countryId: 'ind',
    expectedDocumentSide: 'front',
  });

  // Step 3: Save extracted data to database (blocking)
  await createCardIdValidation({
    session_uid: dto.session_id,
    id_number: frontVerification.idNumber,
    full_name: frontVerification.fullName,
    date_of_birth: frontVerification.dateOfBirth,
    father_name: frontVerification.fatherName,
  });

  // Step 4: Get business partner data for comparison
  const businessPartnerData = await getBusinessPartnerPanDataBySessionUid(dto.session_id);

  if (!businessPartnerData) {
    throw new Error('Business partner PAN data not found for this session');
  }

  // Step 5: Compare fields using HyperVerge matchFields API (blocking)
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
  console.log('comparisonResult', comparisonResult);
  // Step 6: Return success immediately with verification results
  return {
    sessionId: dto.session_id,
    frontVerification,
    verificationStatus: comparisonResult.allMatched,
  };
};
