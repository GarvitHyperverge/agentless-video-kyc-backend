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
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION || '900', 10), // JWT expiration time in seconds (default: 15 minutes = 900 seconds)
  auditAccessTokenExpiration: parseInt(process.env.AUDIT_ACCESS_TOKEN_EXPIRATION || '120', 10), // Access token expiration in seconds (default: 2 minutes = 120 seconds)
  auditRefreshTokenExpiration: parseInt(process.env.AUDIT_REFRESH_TOKEN_EXPIRATION || '604800', 10), // Refresh token expiration in seconds (default: 7 days = 604800 seconds)
  tempTokenExpiration: parseInt(process.env.TEMP_TOKEN_EXPIRATION || '60', 10), // Temp token expiration in seconds (default: 1 minute = 60 seconds)
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
    path: '/api', 
    maxAge: 2 * 60 * 1000, // 2 minutes in milliseconds (matches access token expiration)
  },
  auditRefreshCookie: {
    tokenName: process.env.AUDIT_REFRESH_COOKIE_TOKEN_NAME || 'auditRefreshToken',
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: false, // false in development
    sameSite: 'lax' as const, // CSRF protection
    path: '/api', 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (matches refresh token expiration)
  },
  vosk: {
    host: process.env.VOSK_HOST || 'localhost',
    port: parseInt(process.env.VOSK_PORT || '2700', 10),
    protocol: process.env.VOSK_PROTOCOL || 'ws',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true',
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    database: parseInt(process.env.REDIS_DATABASE || '0', 10),
  },
};
