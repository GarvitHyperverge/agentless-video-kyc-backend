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
  const apiClient = await getApiClientByApiKey(apiKey);

  if (!apiClient) {
    sendAuthError(res, 'Invalid API key or client is disabled');
    return null;
  }

  return apiClient;
};

/**
 * Validate timestamp to prevent replay attacks
 */
const validateTimestamp = (timestamp: string, res: Response): boolean => {
  // Parse timestamp string from header to integer (base 10)
  const requestTimestamp = parseInt(timestamp, 10);

  if (isNaN(requestTimestamp)) {
    sendAuthError(res, 'Invalid timestamp format');
    return false;
  }

  const currentTime = Date.now();
  const timeDifference = Math.abs(currentTime - requestTimestamp);

  if (timeDifference > config.hmacTimestampTolerance) {
    sendAuthError(res, 'Request timestamp is outside acceptable tolerance window');
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
    const signatureBuffer = Buffer.from(receivedSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedHmac, 'hex');

    // Ensure both buffers are the same length before comparison
    if (signatureBuffer.length !== expectedBuffer.length) {
      sendAuthError(res, 'Invalid HMAC signature');
      return false;
    }

    // comparison
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      sendAuthError(res, 'Invalid HMAC signature');
      return false;
    }

    return true;
  } catch (error) {
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
    // Extract and validate headers
    const headers = extractAuthHeaders(req);
    if (!validateHeaders(headers, res)) {
      return;
    }

    // Get and validate API client
    const apiClient = await getAndValidateApiClient(headers.apiKey, res);
    if (!apiClient) {
      return;
    }

    // Get API secret from the database record
    // Note: api_secret_hash column stores the actual secret
    const apiSecret = apiClient.api_secret_hash;

    // Validate timestamp
    if (!validateTimestamp(headers.timestamp, res)) {
      return;
    }

    // Get request body as string
    const requestBody = JSON.stringify(req.body);

    // Compute expected HMAC
    const expectedHmac = computeHmac(apiSecret, requestBody, headers.timestamp);

    // Validate HMAC signature
    if (!validateHmacSignature(headers.hmacSignature, expectedHmac, res)) {
      return;
    }

    // Attach API client to request for use in controllers
    (req as any).apiClient = apiClient;

    // Authentication successful
    next();
  } catch (error: any) {
    sendAuthError(res, error.message || 'Authentication failed', 500);
  }
};
