import fs from 'fs';
import path from 'path';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';

const OTP_VIDEOS_DIR = path.join(__dirname, '../../assets/otpVideos');

// Ensure directory exists
if (!fs.existsSync(OTP_VIDEOS_DIR)) {
  fs.mkdirSync(OTP_VIDEOS_DIR, { recursive: true });
}

/**
 * Save base64 video to file
 */
const saveBase64Video = (base64Data: string, filename: string): string => {
  // Remove data URL prefix if present (e.g., "data:video/mp4;base64," or "data:video/webm;base64,")
  const base64Video = base64Data.replace(/^data:video\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Video, 'base64');
  const filePath = path.join(OTP_VIDEOS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
};

/**
 * Upload OTP video
 */
export const uploadOtpVideo = async (
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> => {
  const videoFilename = `${dto.session_id}_otpVid.webm`;

  // Save video to otpVideos folder
  const videoPath = saveBase64Video(dto.video, videoFilename);

  return {
    sessionId: dto.session_id,
    videoPath,
  };
};
