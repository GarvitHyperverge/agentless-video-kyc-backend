import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';

/**
 * Extract audio from video buffer and convert to PCM format for Vosk
 * @param videoBuffer - Video file buffer
 * @returns Promise<Buffer> - PCM audio buffer
 */
export const extractAudioFromVideo = async (
  videoBuffer: Buffer
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    // FFmpeg expects a stream, not a buffer. 
    // Readable.from() converts your buffer into the stream format FFmpeg needs.
    const videoStream = Readable.from(videoBuffer);
    const outputStream = new PassThrough();

    // Convert video to PCM audio using ffmpeg
    ffmpeg(videoStream)
      .inputFormat('webm')
      .outputOptions([
        '-vn', // No video
        '-acodec pcm_s16le', // Signed 16-bit little-endian PCM codec
        '-ar 16000', // Sample rate: 16000 Hz (explicit)
        '-ac 1', // Channels: mono (1 channel)
        '-f s16le', // Format: raw PCM signed 16-bit little-endian (no container)
      ])
      .on('error', (err) => {
        console.error('[Audio Extract] FFmpeg error:', err);
        reject(err);
      })
      .on('end', () => {
        console.log('[Audio Extract] Audio extraction completed - Format: PCM s16le, 16kHz, mono');
        outputStream.end();
      })
      .pipe(outputStream, { end: false });

    // Collect audio chunks
    const chunks: Buffer[] = [];
    outputStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    // Combine chunks and return
    outputStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    // Handle errors
    outputStream.on('error', reject);
    videoStream.on('error', reject);
  });
};
