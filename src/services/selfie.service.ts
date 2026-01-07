import fs from 'fs';
import path from 'path';
import { SelfieUploadResponseDto } from '../dtos/selfie.dto';

const SELFIE_DIR = path.join(__dirname, '../../assets/selfie');

// Ensure directory exists
if (!fs.existsSync(SELFIE_DIR)) {
  fs.mkdirSync(SELFIE_DIR, { recursive: true });
}

/**
 * Save base64 image to file
 */
const saveBase64Image = (base64Data: string, filename: string): string => {
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Image, 'base64');
  const filePath = path.join(SELFIE_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

/**
 * Upload selfie
 */
export const uploadSelfie = async (
  sessionId: string,
  selfie: string
): Promise<SelfieUploadResponseDto> => {
  const selfieFilename = `${sessionId}_selfie.png`;

  // Save selfie to selfie folder
  const selfiePath = saveBase64Image(selfie, selfieFilename);

  return {
    sessionId,
    selfiePath,
  };
};
