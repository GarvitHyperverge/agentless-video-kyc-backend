import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import { watermarkImage, watermarkVideo } from './watermark.util';
import { uploadBuffersToS3 } from './s3.util';
import { supabaseS3 } from '../config/supabase';
import { getSessionLocation } from './sessionMetadata.util';
import { TEMP_DIR } from './file.util';

const unlink = promisify(fs.unlink);

/**
 * Watermark images and upload to S3 in parallel (background processing)
 * Works with 1 or many images - just pass an array
 * @param inputs - Array of input configurations (can be single item or multiple)
 * @param sessionId - Session unique identifier
 * @param contentType - MIME type (default: 'image/png')
 */
export const watermarkAndUploadImages = async (
  inputs: Array<{ inputPath: string; s3Key: string }>,
  sessionId: string,
  contentType: string = 'image/png'
): Promise<void> => {
  // Get location from session metadata
  const { latitude, longitude } = await getSessionLocation(sessionId);
  const watermarkedPaths = inputs.map((_, index) =>
    path.join(TEMP_DIR, `watermarked_${sessionId}_${index}_${Date.now()}.png`)
  );

  try {
    // Watermark all images in parallel
    await Promise.all(
      inputs.map((input, index) => {
        const watermarkedPath = watermarkedPaths[index];
        if (!watermarkedPath) {
          throw new Error(`Failed to generate watermarked path for index ${index}`);
        }
        return watermarkImage(input.inputPath, watermarkedPath, latitude, longitude);
      })
    );
    console.log(`Images watermarked successfully: ${inputs.map(i => i.s3Key).join(', ')}`);

    // Upload watermarked versions to S3
    if (!supabaseS3) {
      // Clean up watermarked files if S3 is not configured
      await Promise.all(
        watermarkedPaths.map(path => unlink(path).catch(console.error))
      );
      return;
    }

    try {
      // Read all watermarked files to buffers
      const buffers = await Promise.all(
        inputs.map((input, index) => {
          const watermarkedPath = watermarkedPaths[index];
          if (!watermarkedPath) {
            throw new Error(`Failed to get watermarked path for index ${index}`);
          }
          return readFile(watermarkedPath);
        })
      );

      // Upload all buffers to S3 at once
      await uploadBuffersToS3(
        inputs.map((input, index) => ({
          key: input.s3Key,
          buffer: buffers[index]!,
          contentType,
        }))
      );

      // Delete local watermarked files after successful S3 upload
      await Promise.all(
        watermarkedPaths.map(path => unlink(path).catch(console.error))
      );
    } catch (watermarkedUploadError: any) {
      console.error('Error uploading watermarked images to S3:', watermarkedUploadError);
      // Delete local watermarked files
      await Promise.all(
        watermarkedPaths.map(path => unlink(path).catch(console.error))
      );
      throw watermarkedUploadError;
    }
  } catch (error: any) {
    console.error('Error in watermark and upload process:', error);
    throw error;
  }
};

/**
 * Watermark a single video and upload to S3 (background processing)
 * @param inputVideoPath - Path to input video file
 * @param sessionId - Session unique identifier
 * @param s3Key - S3 object key (path) for watermarked video
 * @param contentType - MIME type (default: 'video/webm')
 */
export const watermarkAndUploadVideo = async (
  inputVideoPath: string,
  sessionId: string,
  s3Key: string,
  contentType: string = 'video/webm'
): Promise<void> => {
  // Get location from session metadata
  const { latitude, longitude } = await getSessionLocation(sessionId);
  const watermarkedPath = path.join(TEMP_DIR, `watermarked_${sessionId}_${Date.now()}.webm`);

  try {
    // Watermark the video
    await watermarkVideo(inputVideoPath, watermarkedPath, latitude, longitude);
    console.log(`Video watermarked successfully: ${s3Key}`);

    // Upload watermarked version to S3
    if (!supabaseS3) {
      // Clean up watermarked file if S3 is not configured
      await unlink(watermarkedPath).catch(console.error);
      return;
    }

    try {
      // Read watermarked file to buffer and upload
      const buffer = await readFile(watermarkedPath);
      await uploadBuffersToS3([{ key: s3Key, buffer, contentType }]);

      // Delete local watermarked file after successful S3 upload
      await unlink(watermarkedPath).catch(console.error);
    } catch (watermarkedUploadError: any) {
      console.error('Error uploading watermarked video to S3:', watermarkedUploadError);
      // Delete local watermarked file
      await unlink(watermarkedPath).catch(console.error);
      throw watermarkedUploadError;
    }
  } catch (error: any) {
    console.error('Error in watermark and upload process:', error);
    throw error;
  }
};
