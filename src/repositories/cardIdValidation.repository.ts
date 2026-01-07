import sql from '../config/supabase';
import { CardIdValidationModel } from '../models/cardIdValidation.model';
import { CardIdValidation } from '../types/cardIdValidation.types';

/**
 * Creates card ID validation data in the database
 */
export const createCardIdValidation = async (
  data: Omit<CardIdValidationModel, 'id' | 'created_at'>
): Promise<CardIdValidation> => {
  const [cardIdValidation] = await sql<CardIdValidation[]>`
    INSERT INTO card_id_validation (
      session_uid,
      id_number,
      full_name,
      date_of_birth,
      father_name
    )
    VALUES (
      ${data.session_uid},
      ${data.id_number},
      ${data.full_name},
      ${data.date_of_birth},
      ${data.father_name}
    )
    RETURNING 
      id,
      session_uid,
      id_number,
      full_name,
      date_of_birth,
      father_name,
      created_at
  `;
  
  if (!cardIdValidation) {
    throw new Error('Failed to create card ID validation data');
  }
  
  return cardIdValidation;
};
