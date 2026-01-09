import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { OtpVideoUploadRequestDto, OtpVideoUploadResponseDto } from '../dtos/otpVideo.dto';
import { watermarkVideo } from '../utils/videoWatermark.util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Directory path for OTP videos
const OTP_VIDEOS_DIR = path.join(process.cwd(), 'assets', 'otpVideos');
const TEMP_DIR = path.join(process.cwd(), 'assets', 'temp');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload OTP video with watermark
 */
export async function uploadOtpVideo(
  dto: OtpVideoUploadRequestDto
): Promise<OtpVideoUploadResponseDto> {
  // Ensure directories exist
  await ensureDirectoryExists(OTP_VIDEOS_DIR);
  await ensureDirectoryExists(TEMP_DIR);

  // Generate filename: {session_id}_otpVid.webm
  const filename = `${dto.session_id}_otpVid.webm`;
  const tempFilePath = path.join(TEMP_DIR, `temp_${dto.session_id}_${Date.now()}.webm`);
  const finalFilePath = path.join(OTP_VIDEOS_DIR, filename);

  try {
    // Save video to temp file first
    await writeFile(tempFilePath, dto.video.buffer);

    // Watermark the video with location and timestamp
    await watermarkVideo(
      tempFilePath,
      finalFilePath,
      dto.latitude,
      dto.longitude
    );

    // Clean up temp file
    await unlink(tempFilePath).catch(console.error);
  } catch (error) {
    // Clean up temp file on error
    await unlink(tempFilePath).catch(console.error);
    throw error;
  }

  // Return relative path for API response
  const relativePath = `/assets/otpVideos/${filename}`;

  return {
    sessionId: dto.session_id,
    videoPath: relativePath,
    message: 'OTP video uploaded and watermarked successfully',
  };
}
