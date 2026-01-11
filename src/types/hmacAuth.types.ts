/**
 * HMAC Authentication Headers
 */
export interface HmacAuthHeaders {
  apiKey: string;
  hmacSignature: string;
  timestamp: string;
}
