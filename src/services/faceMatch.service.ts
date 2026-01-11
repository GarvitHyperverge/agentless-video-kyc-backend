import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config';
import { httpsAgent } from '../config/hyperverge';
import { FaceMatchResponseDto } from '../dtos/faceMatch.dto';

/**
 * Call HyperVerge API to match faces between selfie and ID card
 */
export const matchFace = async (
  selfieImagePath: string,
  idCardImagePath: string,
  transactionId: string
): Promise<FaceMatchResponseDto> => {
  try {
    const formData = new FormData();
    formData.append('selfie', fs.createReadStream(selfieImagePath));
    formData.append('id', fs.createReadStream(idCardImagePath));

    const apiUrl = `${config.hyperverge.baseUrl}/v1/matchFace`;
    console.log('[matchFace] API URL:', apiUrl);
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

    const result = response.data.result;
    
    // Extract face match data from response
    const match = result?.details?.match?.value === 'yes';
    const confidence = result?.details?.match?.confidence || '';
    const action = result?.summary?.action || '';

    return {
      match,
      confidence,
      action,
    };
  } catch (error: any) {
    console.error('Face Match Error:', error.response?.data || error.message);
    throw error;
  }
};
