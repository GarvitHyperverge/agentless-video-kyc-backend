import fs from 'fs';
import path from 'path';
import { verifyIdCard } from './idCardValidation.service';
import { createCardIdValidation } from '../repositories/cardIdValidation.repository';
import { getBusinessPartnerPanDataBySessionUid } from '../repositories/businessPartnerPanData.repository';
import { compareAllFields } from './fieldMatch.service';
import { PanCardUploadRequestDto, PanCardUploadResponseDto } from '../dtos/panCard.dto';

const PAN_DIR = path.join(__dirname, '../../assets/pan');

// Ensure directory exists
if (!fs.existsSync(PAN_DIR)) {
  fs.mkdirSync(PAN_DIR, { recursive: true });
}

/**
 * Save base64 image to file
 */
const saveBase64Image = (base64Data: string, filename: string): string => {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  const filePath = path.join(PAN_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

/**
 * Upload and verify PAN card front and back images
 */
export const uploadPanCardImages = async (
  dto: PanCardUploadRequestDto
): Promise<PanCardUploadResponseDto> => {
  const frontFilename = `${dto.session_id}_pan_front.png`;
  const backFilename = `${dto.session_id}_pan_back.png`;

  // Save front and back images to assets folder
  const frontImagePath = saveBase64Image(dto.front_image, frontFilename);
  const backImagePath = saveBase64Image(dto.back_image, backFilename);

  // Verify front image with HyperVerge API
  const frontVerification = await verifyIdCard({
    imagePath: frontImagePath,
    transactionId: `${dto.session_id}_front`,
    documentId: 'pan',
    countryId: 'ind',
    expectedDocumentSide: 'front',
  });

  // Save extracted data to database
  await createCardIdValidation({
    session_uid: dto.session_id,
    id_number: frontVerification.idNumber,
    full_name: frontVerification.fullName,
    date_of_birth: frontVerification.dateOfBirth,
    father_name: frontVerification.fatherName,
  });

  // Get business partner data for comparison
  const businessPartnerData = await getBusinessPartnerPanDataBySessionUid(dto.session_id);

  if (!businessPartnerData) {
    throw new Error('Business partner PAN data not found for this session');
  }

  console.log("I AM HERE")
  // Compare fields using HyperVerge matchFields API
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

  return {
    sessionId: dto.session_id,
    frontVerification,
    verificationStatus: comparisonResult.allMatched,
  };
};
