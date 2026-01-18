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
const validateHeaders = (headers: HmacAuthHeaders | null): headers is HmacAuthHeaders => {
  if (!headers) {
    return false;
  }

  if (!headers.apiKey) {
    return false;
  }

  if (!headers.hmacSignature) {
    return false;
  }

  if (!headers.timestamp) {
    return false;
  }

  return true;
};

/**
 * Get and validate API client from database
 */
const getAndValidateApiClient = async (apiKey: string): Promise<ApiClient | null> => {
  const apiClient = await getApiClientByApiKey(apiKey);

  if (!apiClient) {
    console.log('[HMAC Auth] API client not found in database');
    return null;
  }
  return apiClient;
};

/**
 * Validate timestamp to prevent replay attacks
 */
const validateTimestamp = (timestamp: string): boolean => {
  // Parse timestamp string from header to integer (base 10)
  const requestTimestamp = parseInt(timestamp, 10);

  if (isNaN(requestTimestamp)) {
    console.log('[HMAC Auth] Invalid timestamp format:', timestamp);
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
    console.log('[HMAC Auth] Timestamp outside tolerance window');
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
  expectedHmac: string
): boolean => {
  try {
    const signatureBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    // Ensure both buffers are the same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      console.log('[HMAC Auth] Signature buffer length mismatch');
      return false;
    }

    // comparison
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      console.log('[HMAC Auth] Signature mismatch');
      return false;
    }

    console.log('[HMAC Auth] Signature match');
    return true;
  } catch (error: any) {
    console.error('[HMAC Auth] Error validating signature:', error.message);
    return false;
  }
};

/**
 * Send authentication error response
 */
const sendAuthError = (res: Response, statusCode: number = 401): void => {
  const response: ApiResponseDto<never> = {
    success: false,
    error: 'Authentication failed',
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
    const headers = extractAuthHeaders(req);
    console.log('[HMAC Auth] Headers:', headers);
    
    if (!validateHeaders(headers)) {
      console.log('[HMAC Auth] Header validation failed');
      sendAuthError(res);
      return;
    }
    console.log('[HMAC Auth] Headers validated');

    // Get and validate API client
    console.log('[HMAC Auth] Looking up API client for key:', headers.apiKey);
    const apiClient = await getAndValidateApiClient(headers.apiKey);
    if (!apiClient) {
      console.log('[HMAC Auth] API client not found or invalid');
      sendAuthError(res);
      return;
    }
    console.log('[HMAC Auth] API client found:', {
      clientName: apiClient.client_name,
    });

    // Get API secret from the database record
    // Note: api_secret_hash column stores the actual secret
    const apiSecret = apiClient.api_secret_hash;

    // Get request body as string
    const requestBody = JSON.stringify(req.body);
    console.log('[HMAC Auth] Request body stringified:', requestBody);

    // Compute expected HMAC
    const expectedHmac = computeHmac(apiSecret, requestBody, headers.timestamp);
    console.log('[HMAC Auth] Expected HMAC:', expectedHmac);
    console.log('[HMAC Auth] Received HMAC:', headers.hmacSignature);

    // Validate HMAC signature
    if (!validateHmacSignature(headers.hmacSignature, expectedHmac)) {
      console.log('[HMAC Auth] HMAC signature validation failed');
      sendAuthError(res);
      return;
    }
    console.log('[HMAC Auth] HMAC signature validated');

    // Validate timestamp
    console.log('[HMAC Auth] Validating timestamp:', headers.timestamp);
    if (!validateTimestamp(headers.timestamp)) {
      console.log('[HMAC Auth] Timestamp validation failed');
      sendAuthError(res);
      return;
    }
    console.log('[HMAC Auth] Timestamp validated');

    // Attach API client to request for use in controllers
    (req as any).apiClient = apiClient;

    // Authentication successful
    console.log('[HMAC Auth]  Authentication successful');
    next();
  } catch (error: any) {
    console.error('[HMAC Auth] Unexpected error:', error);
    console.error('[HMAC Auth] Error stack:', error.stack);
    sendAuthError(res, 500);
  }
};
