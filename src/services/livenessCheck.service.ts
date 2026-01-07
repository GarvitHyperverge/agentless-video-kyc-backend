import fs from 'fs';
import https from 'https';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config';
import { LivenessCheckResponseDto } from '../dtos/livenessCheck.dto';

// Create https agent that bypasses SSL certificate verification (for development)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

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

    const response = await axios.post(
      `${config.hyperverge.baseUrl}/checkLiveness`,
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
