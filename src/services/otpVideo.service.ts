import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';

const writeFile = promisify(fs.writeFile);

// Directory path for OTP videos
const OTP_VIDEOS_DIR = path.join(process.cwd(), 'assets', 'otpVideos');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload OTP video
 */
export async function uploadOtpVideo(
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> {
  // Ensure directory exists
  await ensureDirectoryExists(OTP_VIDEOS_DIR);

  // Validate otp
  if (!dto.otp || dto.otp.trim() === '') {
    throw new Error('otp is required');
  }

  // Validate video file
  if (!dto.video || !dto.video.buffer) {
    throw new Error('Video file is required');
  }

  if (dto.video.buffer.length === 0) {
    throw new Error('Video blob is empty');
  }

  // Generate filename: {session_id}_otpVid.webm
  const filename = `${dto.session_id}_otpVid.webm`;
  const filePath = path.join(OTP_VIDEOS_DIR, filename);

  // Save video file
  await writeFile(filePath, dto.video.buffer);

  // Return relative path for API response
  const relativePath = `/assets/otpVideos/${filename}`;

  return {
    sessionId: dto.session_id,
    videoPath: relativePath,
    message: 'OTP video uploaded successfully',
  };
}
