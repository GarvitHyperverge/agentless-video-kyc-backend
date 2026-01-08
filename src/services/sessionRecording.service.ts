import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { SessionRecordingUploadRequestDto, SessionRecordingUploadResponseDto } from '../dtos/sessionRecording.dto';
import { watermarkVideo } from '../utils/videoWatermark.util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Directory path for session recordings
const SESSION_VIDEOS_DIR = path.join(process.cwd(), 'assets', 'sessionVid');
const TEMP_DIR = path.join(process.cwd(), 'assets', 'temp');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload session recording video with watermark
 */
export async function uploadSessionRecording(
  dto: SessionRecordingUploadRequestDto
): Promise<SessionRecordingUploadResponseDto> {
  // Ensure directories exist
  await ensureDirectoryExists(SESSION_VIDEOS_DIR);
  await ensureDirectoryExists(TEMP_DIR);

  // Validate session_id
  if (!dto.session_id || dto.session_id.trim() === '') {
    throw new Error('session_id is required');
  }

  // Validate video file
  if (!dto.video || !dto.video.buffer) {
    throw new Error('Video file is required');
  }

  if (dto.video.buffer.length === 0) {
    throw new Error('Video blob is empty');
  }

  // Generate filename: {session_id}_session_recording.webm
  const filename = `${dto.session_id}_session_recording.webm`;
  const tempFilePath = path.join(TEMP_DIR, `temp_${dto.session_id}_${Date.now()}.webm`);
  const finalFilePath = path.join(SESSION_VIDEOS_DIR, filename);

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
  const relativePath = `/assets/sessionVid/${filename}`;

  return {
    sessionId: dto.session_id,
    videoPath: relativePath,
    message: 'Session recording uploaded and watermarked successfully',
  };
}
