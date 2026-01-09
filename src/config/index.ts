export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  hyperverge: {
    appId: process.env.APP_ID || '',
    appKey: process.env.APP_KEY || '',
    baseUrl: process.env.HYPERVERGE_BASE_URL || 'https://ind-verify.hyperverge.co',
  },
  // HMAC timestamp tolerance in milliseconds (default: 5 minutes)
  // Prevents replay attacks by rejecting requests with timestamps outside this window
  hmacTimestampTolerance: parseInt(process.env.HMAC_TIMESTAMP_TOLERANCE || '300000', 10),
};
