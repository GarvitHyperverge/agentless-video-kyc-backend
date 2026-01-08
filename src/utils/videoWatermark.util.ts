import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Watermark video with location and timestamp
 * @param inputPath - Path to input video file
 * @param outputPath - Path to save watermarked video
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Promise that resolves when watermarking is complete
 */
export async function watermarkVideo(
  inputPath: string,
  outputPath: string,
  latitude: string,
  longitude: string
): Promise<void> {
  // Generate server timestamp
  const timestamp = new Date().toISOString();
  
  // Format timestamp for display (e.g., "8/1/2026 18:13:59")
  const date = new Date(timestamp);
  const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const day = date.getDate();
  const year = date.getFullYear();
  const formattedDate = `${month}/${day}/${year}`;
  
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const displayTimestamp = `${formattedDate} ${formattedTime}`;

  // Create watermark text with location and timestamp
  // Escape special characters for FFmpeg drawtext filter
  const watermarkText = `Location: ${latitude}, ${longitude} | Time: ${displayTimestamp}`;
  const escapedText = watermarkText.replace(/:/g, '\\:').replace(/'/g, "\\'");

  return new Promise<void>((resolve, reject) => {
    const ffmpegCommand = ffmpeg(inputPath)
      .videoFilters([
        {
          filter: 'drawtext',
          options: {
            text: escapedText,
            fontsize: 20,
            fontcolor: 'white',
            x: 10,
            y: 10,
            box: 1,
            boxcolor: 'black@0.5',
            boxborderw: 5,
          },
        },
      ])
      .outputOptions([
        '-c:a copy',                  
      ])
      .output(outputPath)
      .on('start', (commandLine: string) => {
        console.log('FFmpeg watermark command:', commandLine);
      })
      .on('end', () => {
        console.log('Video watermarked successfully');
        resolve();
      })
      .on('error', (err: Error, stdout: string | null, stderr: string | null) => {
        console.error('FFmpeg watermarking error:', err);
        console.error('FFmpeg stdout:', stdout);
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`Failed to watermark video: ${err.message}`));
      });

    // Add progress handler separately to avoid TypeScript overload issues
    (ffmpegCommand as any).on('progress', (progress: {
      frames: number;
      currentFps: number;
      currentKbps: number;
      targetSize: number;
      timemark: string;
      percent?: number;
    }) => {
      if (progress.percent !== undefined) {
        console.log('Watermarking progress: ' + Math.round(progress.percent) + '% done');
      } else if (progress.timemark) {
        console.log('Watermarking progress: ' + progress.timemark);
      }
    });

    ffmpegCommand.run();
  });
}
