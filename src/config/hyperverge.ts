import https from 'https';

/**
 * HTTPS agent that bypasses SSL certificate verification (for development)
 * Used for all HyperVerge API calls
 */
export const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
