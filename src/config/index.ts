export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.SUPABASE_DATABASE_URL || '',
  hyperverge: {
    appId: process.env.HYPERVERGE_APP_ID || '',
    appKey: process.env.HYPERVERGE_APP_KEY || '',
    baseUrl: process.env.HYPERVERGE_BASE_URL || 'https://ind-verify.hyperverge.co',
  },
  
  // HMAC timestamp tolerance in milliseconds (default: 5 minutes)
  // Prevents replay attacks by rejecting requests with timestamps outside this window
  hmacTimestampTolerance: parseInt(process.env.HMAC_TIMESTAMP_TOLERANCE || '300000', 10),
  supabase: {
    projectRef: process.env.SUPABASE_PROJECT_REF || '',
    region: process.env.SUPABASE_REGION || 'ap-south-1',
    s3AccessKey: process.env.SUPABASE_S3_ACCESS_KEY || '',
    s3SecretKey: process.env.SUPABASE_S3_SECRET_KEY || '',
  },
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiration: process.env.JWT_EXPIRATION || '15m', // JWT expiration time (e.g., '15m', '1h', '7d')
  cookie: {
    sessionTokenName: process.env.COOKIE_SESSION_TOKEN_NAME || 'sessionToken',
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: false, // false in development
    sameSite: 'lax' as const, // CSRF protection
    path: '/api', // Only sent to /api/* paths (where JWT middleware is used)
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds (matches JWT expiration)
  },
  vosk: {
    host: process.env.VOSK_HOST || '127.0.0.1', // Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues on macOS
    port: parseInt(process.env.VOSK_PORT || '2700', 10),
    protocol: process.env.VOSK_PROTOCOL || 'ws',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
};
