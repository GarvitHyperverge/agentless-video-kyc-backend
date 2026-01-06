import sql from '../config/supabase';
import { BusinessPartnerPanDataModel } from '../models/businessPartnerPanData.model';
import { BusinessPartnerPanData } from '../types/businessPartnerPanData.types';

/**
 * Creates business partner PAN data in the database
 * Uses RETURNING clause for atomic operation
 * 
 * @param data - Business partner PAN data (excludes auto-generated fields: id, received_at, created_at)
 * @returns Promise<BusinessPartnerPanData> - The created PAN data record
 * 
 * Note: id, received_at, and created_at are automatically set by the database
 */
export const createBusinessPartnerPanData = async (
  data: Omit<BusinessPartnerPanDataModel, 'id' | 'received_at' | 'created_at'>
): Promise<BusinessPartnerPanData> => {
  const [panData] = await sql<BusinessPartnerPanData[]>`
    INSERT INTO business_partner_pan_data (
      session_uid,
      pan_number,
      full_name,
      father_name,
      date_of_birth,
      source_party
    )
    VALUES (
      ${data.session_uid},
      ${data.pan_number},
      ${data.full_name},
      ${data.father_name},
      ${data.date_of_birth},
      ${data.source_party}
    )
    RETURNING 
      id,
      session_uid,
      pan_number,
      full_name,
      father_name,
      date_of_birth,
      source_party,
      received_at,
      created_at
  `;
  
  if (!panData) {
    throw new Error('Failed to create business partner PAN data');
  }
  
  return panData;
};
