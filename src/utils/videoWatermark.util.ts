import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';

/**
 * Watermark video with location and timestamp using FFmpeg
 * 
 * This function overlays text on a video file containing:
 * - Location coordinates (latitude, longitude)
 * - Server-side timestamp (prevents client-side manipulation)
 * 
 * HOW WATERMARKING WORKS:
 * 1. FFmpeg reads the input video file frame by frame
 * 2. The 'drawtext' filter draws text on each video frame
 * 3. The text is rendered with a semi-transparent background for visibility
 * 4. The watermarked video is written to the output path
 * 5. Audio stream is copied without re-encoding (faster processing)
 * 
 * @param inputPath - Path to input video file (unwatermarked)
 * @param outputPath - Path to save watermarked video
 * @param latitude - Latitude coordinate from client
 * @param longitude - Longitude coordinate from client
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
  
  // Format timestamp for display (e.g., "day/month/year hours(24):minutes:seconds")
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const year = date.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;
  
  // Format time in 24-hour format (HH:MM:SS)
  const formattedTime = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const displayTimestamp = `${formattedDate} ${formattedTime}`;

  // Create watermark text with location and timestamp
  // Escape special characters for FFmpeg drawtext filter
  const watermarkText = `Location: ${latitude}, ${longitude} | Time: ${displayTimestamp}`;
  
  // Escape special characters for FFmpeg drawtext filter
  // FFmpeg uses ':' and ''' as delimiters, so they must be escaped with backslashes
  // Example: "Location: 28.5, 77.2" becomes "Location\: 28.5, 77.2"
  const escapedText = watermarkText.replace(/:/g, '\\:').replace(/'/g, "\\'");

  return new Promise<void>((resolve, reject) => {
    // Create FFmpeg command instance pointing to input video
    const ffmpegCommand = ffmpeg(inputPath)

      // The drawtext filter overlays text on each frame of the video
      // It processes the video frame-by-frame and draws the text on top
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
    // This fires periodically during video processing to show progress
    (ffmpegCommand as any).on('progress', (progress: {
      frames: number;        // Number of frames processed
      currentFps: number;     // Current frames per second processing rate
      currentKbps: number;    // Current encoding bitrate
      targetSize: number;     // Target file size
      timemark: string;       // Current timestamp in video (e.g., "00:00:05.23")
      percent?: number;       // Percentage complete (if available)
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
