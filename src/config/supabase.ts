import postgres from 'postgres';
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import https from 'https';
import { config } from './index';

// PostgreSQL client for database queries
const sql = postgres(config.databaseUrl);

// Create https agent that bypasses SSL certificate verification (for development)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

// S3 client for Supabase Storage operations (S3-compatible API)
export const supabaseS3 = config.supabase.projectRef && 
                          config.supabase.s3AccessKey && 
                          config.supabase.s3SecretKey
  ? new S3Client({
      forcePathStyle: true, // REQUIRED for Supabase
      region: config.supabase.region,
      endpoint: `https://${config.supabase.projectRef}.storage.supabase.co/storage/v1/s3`,
      credentials: {
        accessKeyId: config.supabase.s3AccessKey,
        secretAccessKey: config.supabase.s3SecretKey,
      },
      requestHandler: new NodeHttpHandler({
        httpsAgent: httpsAgent,
      }),
    })
  : null;

// Function to check database connection
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
};

export default sql;