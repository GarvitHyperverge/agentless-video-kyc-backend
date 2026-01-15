import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import { ApiResponseDto } from '../dtos/apiResponse.dto';
import { getApiClientByApiKey } from '../repositories/apiClient.repository';
import { ApiClient, HmacAuthHeaders } from '../types';

/**
 * Extract HMAC authentication headers from request
 */
const extractAuthHeaders = (req: Request): HmacAuthHeaders | null => {
  const apiKey = req.headers['x-api-key'] as string;
  const hmacSignature = req.headers['x-hmac-signature'] as string;
  const timestamp = req.headers['x-timestamp'] as string;

  if (!apiKey || !hmacSignature || !timestamp) {
    return null;
  }

  return { apiKey, hmacSignature, timestamp };
};

/**
 * Validate that all required headers are present
 * 
 * Type Predicate (`headers is HmacAuthHeaders`): Tells TypeScript that when this function
 * returns true, the parameter type is narrowed from `HmacAuthHeaders | null` to `HmacAuthHeaders`.
 * This allows safe access to header properties after validation without optional chaining.
 */
const validateHeaders = (headers: HmacAuthHeaders | null, res: Response): headers is HmacAuthHeaders => {
  if (!headers) {
    sendAuthError(res, 'Missing required authentication headers');
    return false;
  }

  if (!headers.apiKey) {
    sendAuthError(res, 'x-api-key header is required');
    return false;
  }

  if (!headers.hmacSignature) {
    sendAuthError(res, 'x-hmac-signature header is required');
    return false;
  }

  if (!headers.timestamp) {
    sendAuthError(res, 'x-timestamp header is required');
    return false;
  }

  return true;
};

/**
 * Get and validate API client from database
 */
const getAndValidateApiClient = async (
  apiKey: string,
  res: Response
): Promise<ApiClient | null> => {
  console.log('[HMAC Auth] Querying database for API key:', apiKey);
  const apiClient = await getApiClientByApiKey(apiKey);

  if (!apiClient) {
    console.log('[HMAC Auth] ❌ API client not found in database');
    sendAuthError(res, 'Invalid API key or client is disabled');
    return null;
  }

  console.log('[HMAC Auth] API client found:', {
    clientName: apiClient.client_name,
    hasSecret: !!apiClient.api_secret_hash,
  });

  return apiClient;
};

/**
 * Validate timestamp to prevent replay attacks
 */
const validateTimestamp = (timestamp: string, res: Response): boolean => {
  // Parse timestamp string from header to integer (base 10)
  const requestTimestamp = parseInt(timestamp, 10);

  if (isNaN(requestTimestamp)) {
    console.log('[HMAC Auth] ❌ Invalid timestamp format:', timestamp);
    sendAuthError(res, 'Invalid timestamp format');
    return false;
  }

  const currentTime = Date.now();
  const timeDifference = Math.abs(currentTime - requestTimestamp);
  const toleranceMs = config.hmacTimestampTolerance;

  console.log('[HMAC Auth] Timestamp validation:', {
    requestTimestamp,
    currentTime,
    timeDifference,
    toleranceMs,
    timeDifferenceSeconds: Math.round(timeDifference / 1000),
    toleranceSeconds: Math.round(toleranceMs / 1000),
  });

  if (timeDifference > toleranceMs) {
    console.log('[HMAC Auth] ❌ Timestamp outside tolerance window');
    sendAuthError(res, `Request timestamp is outside acceptable tolerance window. Difference: ${Math.round(timeDifference / 1000)}s, Tolerance: ${Math.round(toleranceMs / 1000)}s`);
    return false;
  }

  return true;
};

/**
 * Compute HMAC signature
 * Formula: SHA256(secret + request_body + timestamp)
 */
const computeHmac = (apiSecret: string, requestBody: string, timestamp: string): string => {
  const message = apiSecret + requestBody + timestamp;
  return crypto
    .createHash('sha256')
    .update(message)
    .digest('hex');
};

/**
 * Validate HMAC signature using constant-time comparison
 */
const validateHmacSignature = (
  receivedSignature: string,
  expectedHmac: string,
  res: Response
): boolean => {
  try {
    console.log('[HMAC Auth] Validating signature format...');
    const signatureBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    console.log('[HMAC Auth] Signature buffer lengths:', {
      received: signatureBuffer.length,
      expected: expectedBuffer.length,
    });

    // Ensure both buffers are the same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      console.log('[HMAC Auth] ❌ Signature buffer length mismatch');
      sendAuthError(res, 'Invalid HMAC signature (length mismatch)');
      return false;
    }

    // comparison
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      console.log('[HMAC Auth] ❌ Signature mismatch');
      sendAuthError(res, 'Invalid HMAC signature');
      return false;
    }

    console.log('[HMAC Auth] ✅ Signature match');
    return true;
  } catch (error: any) {
    console.error('[HMAC Auth] ❌ Error validating signature:', error.message);
    sendAuthError(res, 'Invalid HMAC signature format');
    return false;
  }
};

/**
 * Send authentication error response
 */
const sendAuthError = (res: Response, error: string, statusCode: number = 401): void => {
  const response: ApiResponseDto<never> = {
    success: false,
    error,
  };
  res.status(statusCode).json(response);
};

/**
 * Middleware to authenticate requests using API Key and HMAC signature
 * 
 * Expected headers:
 * - x-api-key: API Key identifying the client
 * - x-hmac-signature: HMAC signature (hash(secret + request_body + timestamp))
 * - x-timestamp: Unix timestamp in milliseconds
 */
export const hmacAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('[HMAC Auth] Starting authentication process');
    
    // Extract and validate headers
    console.log('[HMAC Auth] Extracting headers...');
    const headers = extractAuthHeaders(req);
    console.log('[HMAC Auth] Headers extracted:', {
      hasApiKey: !!headers?.apiKey,
      hasHmacSignature: !!headers?.hmacSignature,
      hasTimestamp: !!headers?.timestamp,
      apiKey: headers?.apiKey,
      timestamp: headers?.timestamp,
    });
    
    if (!validateHeaders(headers, res)) {
      console.log('[HMAC Auth] ❌ Header validation failed');
      return;
    }
    console.log('[HMAC Auth] ✅ Headers validated');

    // Get and validate API client
    console.log('[HMAC Auth] Looking up API client for key:', headers.apiKey);
    const apiClient = await getAndValidateApiClient(headers.apiKey, res);
    if (!apiClient) {
      console.log('[HMAC Auth] ❌ API client not found or invalid');
      return;
    }
    console.log('[HMAC Auth] ✅ API client found:', {
      clientName: apiClient.client_name,
    });

    // Get API secret from the database record
    // Note: api_secret_hash column stores the actual secret
    const apiSecret = apiClient.api_secret_hash;
    console.log('[HMAC Auth] API secret retrieved (length):', apiSecret?.length || 0);

    // Get request body as string
    const requestBody = JSON.stringify(req.body);
    console.log('[HMAC Auth] Request body stringified:', requestBody);

    // Compute expected HMAC
    console.log('[HMAC Auth] Computing expected HMAC...');
    const message = apiSecret + requestBody + headers.timestamp;
    console.log('[HMAC Auth] HMAC message (secret + body + timestamp):', {
      messageLength: message.length,
      messagePreview: message.substring(0, 50) + '...',
    });
    const expectedHmac = computeHmac(apiSecret, requestBody, headers.timestamp);
    console.log('[HMAC Auth] Expected HMAC:', expectedHmac);
    console.log('[HMAC Auth] Received HMAC:', headers.hmacSignature);

    // Validate HMAC signature
    if (!validateHmacSignature(headers.hmacSignature, expectedHmac, res)) {
      console.log('[HMAC Auth] ❌ HMAC signature validation failed');
      console.log('[HMAC Auth] Expected:', expectedHmac);
      console.log('[HMAC Auth] Received:', headers.hmacSignature);
      console.log('[HMAC Auth] Match:', expectedHmac === headers.hmacSignature);
      return;
    }
    console.log('[HMAC Auth] ✅ HMAC signature validated');

    // Validate timestamp
    console.log('[HMAC Auth] Validating timestamp:', headers.timestamp);
    if (!validateTimestamp(headers.timestamp, res)) {
      console.log('[HMAC Auth] ❌ Timestamp validation failed');
      return;
    }
    console.log('[HMAC Auth] ✅ Timestamp validated');

    // Attach API client to request for use in controllers
    (req as any).apiClient = apiClient;

    // Authentication successful
    console.log('[HMAC Auth] ✅ Authentication successful');
    next();
  } catch (error: any) {
    console.error('[HMAC Auth] ❌ Unexpected error:', error);
    console.error('[HMAC Auth] Error stack:', error.stack);
    sendAuthError(res, error.message || 'Authentication failed', 500);
  }
};
