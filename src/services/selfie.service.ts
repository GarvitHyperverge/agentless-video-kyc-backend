import fs from 'fs';
import path from 'path';
import { checkLiveness } from './livenessCheck.service';
import { matchFace } from './faceMatch.service';
import { createSelfieValidation } from '../repositories/selfieValidation.repository';
import { createFaceMatchResult } from '../repositories/faceMatchResult.repository';
import { SelfieUploadResponseDto } from '../dtos/selfie.dto';

const SELFIE_DIR = path.join(__dirname, '../../assets/selfie');
const PAN_DIR = path.join(__dirname, '../../assets/pan');

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
 * Upload selfie and check liveness
 */
export const uploadSelfie = async (
  sessionId: string,
  image: string
): Promise<SelfieUploadResponseDto> => {
  const selfieFilename = `${sessionId}_selfie.png`;

  // Save selfie to selfie folder
  const selfiePath = saveBase64Image(image, selfieFilename);

  // Check liveness using HyperVerge API
  const livenessResult = await checkLiveness(selfiePath, `${sessionId}_liveness`);

  // Save liveness result to database
  await createSelfieValidation({
    session_uid: sessionId,
    live_face_value: livenessResult.liveFaceValue,
    live_face_confidence: livenessResult.liveFaceConfidence,
    action: livenessResult.action,
  });

  // Match face with PAN card
  const panCardImagePath = path.join(PAN_DIR, `${sessionId}_pan_front.png`);
  
  // Check if PAN card image exists
  if (!fs.existsSync(panCardImagePath)) {
    throw new Error('PAN card image not found for this session');
  }

  // Match selfie with PAN card face
  const faceMatchResult = await matchFace(selfiePath, panCardImagePath, `${sessionId}_faceMatch`);

  // Save face match result to database
  await createFaceMatchResult({
    session_uid: sessionId,
    match_value: faceMatchResult.match ? 'yes' : 'no',
    match_confidence: faceMatchResult.confidence,
    action: faceMatchResult.action,
  });

  return {
    sessionId,
    selfiePath,
    isLive: livenessResult.isLive,
    faceMatch: faceMatchResult.match,
  };
};
