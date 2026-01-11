import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config';
import { httpsAgent } from '../config/hyperverge';
import { VerifyIdCardRequestDto } from '../dtos/idCardValidation.dto';
import { IdCardExtractionResponseDto } from '../dtos/idCardExtraction.dto';

/**
 * Call HyperVerge API to verify an ID card image
 */
export const verifyIdCard = async ({
  imagePath,
  transactionId,
  countryId,
  documentId,
  expectedDocumentSide,
}: VerifyIdCardRequestDto): Promise<IdCardExtractionResponseDto> => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('countryId', countryId);
    formData.append('documentId', documentId);
    formData.append('expectedDocumentSide', expectedDocumentSide);

    const apiUrl = `${config.hyperverge.baseUrl}/v1/readId`;
    console.log('[verifyIdCard] API URL:', apiUrl);
    const response = await axios.post(
      apiUrl,
      formData,
      {
        headers: {
          contentType: 'multipart/form-data',
          appId: config.hyperverge.appId,
          appKey: config.hyperverge.appKey,
          transactionId: transactionId,
        },
        httpsAgent,
      }
    );

    const fields = response.data.result?.details?.[0]?.fieldsExtracted;

    const extractedData: IdCardExtractionResponseDto = {
      fullName: fields?.fullName?.value || '',
      dateOfBirth: fields?.dateOfBirth?.value || '',
      fatherName: fields?.fatherName?.value || '',
      idNumber: fields?.idNumber?.value || '',
    };


    return extractedData;
  } catch (error: any) {
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    throw error;
  }
};
