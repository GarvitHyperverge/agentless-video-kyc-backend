import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config';
import { httpsAgent } from '../config/hyperverge';
import { LivenessCheckResponseDto } from '../dtos/livenessCheck.dto';

/**
 * Call HyperVerge API to check liveness of selfie
 */
export const checkLiveness = async (
  imagePath: string,
  transactionId: string
): Promise<LivenessCheckResponseDto> => {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    formData.append('returnCroppedImageURL', 'yes');

    const apiUrl = `${config.hyperverge.baseUrl}/v1/checkLiveness`;
    console.log('[checkLiveness] API URL:', apiUrl);
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
    
    const liveFaceValue = result?.details?.liveFace?.value || '';
    const liveFaceConfidence = result?.details?.liveFace?.confidence || '';
    const action = result?.summary?.action || '';
    
    // isLive is true if liveFaceValue is 'yes' or action is 'pass'
    const isLive = liveFaceValue.toLowerCase() === 'yes' || action.toLowerCase() === 'pass';

    return {
      isLive,
      liveFaceValue,
      liveFaceConfidence,
      action,
    };
  } catch (error: any) {
    console.error('Liveness Check Error:', error.response?.data || error.message);
    throw error;
  }
};
