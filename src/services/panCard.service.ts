import fs from 'fs';
import path from 'path';
import { verifyIdCard } from './idCardValidation.service';
import { PanCardUploadResponseDto } from '../dtos/panCard.dto';

const ASSETS_DIR = path.join(__dirname, '../../assets');

/**
 * Save base64 image to file
 */
const saveBase64Image = (base64Data: string, filename: string): string => {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  const filePath = path.join(ASSETS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

/**
 * Upload and verify PAN card front image
 */
export const uploadPanCardImages = async (
  sessionId: string,
  frontImage: string
): Promise<PanCardUploadResponseDto> => {
  const frontFilename = `${sessionId}_pan_front.png`;

  // Save image to assets folder
  const frontImagePath = saveBase64Image(frontImage, frontFilename);

  // Verify front image with HyperVerge API
  const frontVerification = await verifyIdCard({
    imagePath: frontImagePath,
    transactionId: `${sessionId}_front`,
    documentId: 'pan',
    countryId: 'ind',
    expectedDocumentSide: 'front',
  });

  return {
    sessionId,
    frontImagePath,
    frontVerification,
  };
};
