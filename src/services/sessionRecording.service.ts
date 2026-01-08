import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { SessionRecordingUploadRequestDto, SessionRecordingUploadResponseDto } from '../dtos/sessionRecording.dto';

const writeFile = promisify(fs.writeFile);

// Directory path for session recordings
const SESSION_VIDEOS_DIR = path.join(process.cwd(), 'assets', 'sessionVid');

// Helper function to check if directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!fs.existsSync(dirPath)) {
    await fs.promises.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Upload session recording video
 */
export async function uploadSessionRecording(
  dto: SessionRecordingUploadRequestDto
): Promise<SessionRecordingUploadResponseDto> {
  // Ensure directory exists
  await ensureDirectoryExists(SESSION_VIDEOS_DIR);

  // Validate session_id
  if (!dto.session_id || dto.session_id.trim() === '') {
    throw new Error('session_id is required');
  }

  // Validate video file
  if (!dto.video || !dto.video.buffer) {
    throw new Error('Video file is required');
  }

  // Check file size (max 100MB)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (dto.video.buffer.length > MAX_FILE_SIZE) {
    const fileSizeMB = (dto.video.buffer.length / 1024 / 1024).toFixed(2);
    throw new Error(
      `Video file too large: ${fileSizeMB}MB. Maximum size is 100MB.`
    );
  }

  if (dto.video.buffer.length === 0) {
    throw new Error('Video blob is empty');
  }

  // Generate filename: {session_id}_session_recording.webm
  const filename = `${dto.session_id}_session_recording.webm`;
  const filePath = path.join(SESSION_VIDEOS_DIR, filename);

  // Save video file
  await writeFile(filePath, dto.video.buffer);

  // Return relative path for API response
  const relativePath = `/assets/sessionVid/${filename}`;

  return {
    sessionId: dto.session_id,
    videoPath: relativePath,
    message: 'Session recording uploaded successfully',
  };
}
