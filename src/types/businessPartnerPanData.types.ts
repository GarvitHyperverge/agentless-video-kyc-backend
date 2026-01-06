export interface BusinessPartnerPanData {
  id: number;
  session_uid: string;
  pan_number: string;
  full_name: string;
  father_name: string;
  date_of_birth: Date;
  source_party: string;
  received_at: Date;
  created_at: Date;
}
