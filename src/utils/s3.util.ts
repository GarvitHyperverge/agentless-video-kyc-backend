import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { supabaseS3 } from '../config/supabase';
import { BUCKET_NAME } from '../config/s3';
import { Readable } from 'stream';

/**
 * Upload buffers to S3 in parallel
 * Works with 1 or many buffers - just pass an array
 * @param uploads - Array of upload configurations (can be single item or multiple)
 * @returns Array of S3 keys where files were uploaded
 * @throws Error if S3 is not configured or any upload fails
 */
export const uploadBuffersToS3 = async (
  uploads: Array<{ key: string; buffer: Buffer; contentType: string }>
): Promise<string[]> => {
  if (!supabaseS3) {
    throw new Error('S3 storage not configured');
  }

  const commands = uploads.map(({ key, buffer, contentType }) =>
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Store in const to help TypeScript understand supabaseS3 is not null
  const s3Client = supabaseS3;
  await Promise.all(commands.map(command => s3Client.send(command)));
  
  const keys = uploads.map(u => u.key);
  console.log(`Files uploaded to S3: ${keys.join(', ')}`);

  return keys;
};

/**
 * Download file from S3 as buffer (in-memory, no temp file)
 * @param key - S3 object key (path)
 * @returns Buffer containing the file data
 * @throws Error if S3 is not configured or download fails
 */
export const downloadBufferFromS3 = async (key: string): Promise<Buffer> => {
  if (!supabaseS3) {
    throw new Error('S3 client not configured');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await supabaseS3.send(command);
  
  if (!response.Body) {
    throw new Error(`Failed to download file from S3: ${key}`);
  }

  // Convert stream to buffer
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  
  return Buffer.concat(chunks);
};
