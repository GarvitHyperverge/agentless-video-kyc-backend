import sql from '../config/supabase';
import { ApiClientModel } from '../models';
import { ApiClient } from '../types';

/**
 * Gets an API client by API key
 * Only returns clients with ACTIVE status
 */
export const getApiClientByApiKey = async (
  apiKey: string
): Promise<ApiClient | null> => {
  const [client] = await sql<ApiClient[]>`
    SELECT 
      id,
      client_name,
      api_key,
      api_secret_hash,
      status,
      created_at,
      updated_at
    FROM api_clients
    WHERE api_key = ${apiKey} AND status = 'ACTIVE'
    LIMIT 1
  `;
  
  return client || null;
};
