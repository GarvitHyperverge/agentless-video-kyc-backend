export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  hyperverge: {
    appId: process.env.APP_ID || '',
    appKey: process.env.APP_KEY || '',
    baseUrl: process.env.HYPERVERGE_BASE_URL || 'https://ind-verify.hyperverge.co',
  },
};
