import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { supabaseS3 } from '../config/supabase';

const BUCKET_NAME = 'kyc-media';
const URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Generate a presigned URL for an S3 object
 * @param key - S3 object key (path)
 * @returns Presigned URL string or null if S3 is not configured
 */
export const getPresignedUrl = async (key: string): Promise<string | null> => {
  if (!supabaseS3) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(supabaseS3, command, { expiresIn: URL_EXPIRY_SECONDS });
    return url;
  } catch (error: any) {
    console.error(`Error generating presigned URL for key ${key}:`, error);
    return null;
  }
};

/**
 * Generate presigned URLs for multiple S3 objects in parallel
 * @param keys - Array of S3 object keys (paths)
 * @returns Array of presigned URLs (null for failed generations)
 */
export const getPresignedUrls = async (keys: string[]): Promise<(string | null)[]> => {
  return Promise.all(keys.map(key => getPresignedUrl(key)));
};
