export interface ApiClientModel {
  id: string;
  client_name: string;
  api_key: string;
  api_secret_hash: string; // Stores the API secret (raw or encrypted)
  status: string; // ACTIVE / DISABLED
  created_at: Date;
  updated_at: Date;
}
