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
  auditJwtExpiration: process.env.AUDIT_JWT_EXPIRATION || '24h', // Audit JWT expiration time (e.g., '24h', '7d')
  cookie: {
    sessionTokenName: process.env.COOKIE_SESSION_TOKEN_NAME || 'sessionToken',
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: false, // false in development
    sameSite: 'lax' as const, // CSRF protection
    path: '/api', // Only sent to /api/* paths (where JWT middleware is used)
    maxAge: 15 * 60 * 1000, // 15 minutes in milliseconds (matches JWT expiration)
  },
  auditCookie: {
    tokenName: process.env.AUDIT_COOKIE_TOKEN_NAME || 'auditToken',
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: false, // false in development
    sameSite: 'lax' as const, // CSRF protection
    path: '/api/audit', // Only sent to /api/audit/* paths
    maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds (matches audit JWT expiration)
  },
  vosk: {
    // In Docker: use 'vosk-websocket-server' (service name)
    // Outside Docker: set VOSK_HOST=127.0.0.1 or localhost in .env
    host: process.env.VOSK_HOST || 'vosk-websocket-server',
    port: parseInt(process.env.VOSK_PORT || '2700', 10),
    protocol: process.env.VOSK_PROTOCOL || 'ws',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
  },
};
