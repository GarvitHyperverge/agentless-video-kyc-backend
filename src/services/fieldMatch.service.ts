import axios from 'axios';
import { config } from '../config';
import { httpsAgent } from '../config/hyperverge';
import { FieldMatchResponseDto } from '../dtos/fieldMatch.dto';

/**
 * Compare all fields between extracted data and business partner data
 * using HyperVerge matchFields API in a single call
 */
export const compareAllFields = async (
  transactionId: string,
  extractedData: {
    fullName: string;
    dateOfBirth: string;
    fatherName: string;
    idNumber: string;
  },
  businessPartnerData: {
    full_name: string;
    date_of_birth: string;
    father_name: string;
    pan_number: string;
  }
): Promise<FieldMatchResponseDto> => {
  try {
    const requestBody = {
      name: {
        value1: extractedData.fullName,
        value2: businessPartnerData.full_name,
      },
      dob: {
        value1: extractedData.dateOfBirth,
        value2: businessPartnerData.date_of_birth,
      },
      pan_no: {
        value1: extractedData.idNumber,
        value2: businessPartnerData.pan_number,
      },
    };

    const apiUrl = "https://ind-verify.hyperverge.co/api/matchFields"    ;
    console.log('[compareAllFields] API URL:', apiUrl);
    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          appId: config.hyperverge.appId,
          appKey: config.hyperverge.appKey,
          transactionId: transactionId,
        },
        httpsAgent,
      }
    );

    const result = response.data.result;

    // API returns direct boolean values: { name: true, dob: true, pan_no: true }
    const nameMatch = result?.name || false;
    const dobMatch = result?.dob || false;
    const idMatch = result?.pan_no || false;
    
    // All fields must match
    const allMatched = nameMatch && dobMatch && idMatch;
    
    const responseDto = {
      allMatched,
      results: {
        name: {
          value1: extractedData.fullName,
          value2: businessPartnerData.full_name,
          match: nameMatch,
        },
        dateOfBirth: {
          value1: extractedData.dateOfBirth,
          value2: businessPartnerData.date_of_birth,
          match: dobMatch,
        },
        fatherName: {
          value1: extractedData.fatherName,
          value2: businessPartnerData.father_name,
          match: true, // Not compared via API
        },
        idNumber: {
          value1: extractedData.idNumber,
          value2: businessPartnerData.pan_number,
          match: idMatch,
        },
      },
    };
    return responseDto;
  } catch (error: any) {
    throw error;
  }
};
