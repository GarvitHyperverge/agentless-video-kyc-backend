import { openAIClient } from '../utils/openai.util';
import { otpMatchPrompt } from '../prompts/otpMatch.prompt';

export interface OtpMatchResult {
  match: boolean;
  confidence: number;
  extractedOtp: number;
  reason: string;
}

/**
 * Ask ChatGPT whether the OTP and transcript refer to the same OTP.
 * Minimal setup: one API call + JSON parse + small local fallback.
 */
export async function confirmOtpMatchWithChatGPT(params: {
  otp: string;
  transcript: string;
}): Promise<OtpMatchResult> {
  const otp = params.otp;
  const transcript= params.transcript;
  
  if (!otp) {
    return { match: false, confidence: 0.0, extractedOtp: -1, reason: 'OTP is empty' };
  }
  if (!transcript) {
    return { match: false, confidence: 0.0, extractedOtp: -1, reason: 'Transcript is empty' };
  }


  // Format prompt with OTP and transcript values
  const formattedPrompt = otpMatchPrompt
    .replace('{otp}', otp)
    .replace('{transcript}', transcript);

  // Call OpenAI client - errors will bubble up to controller
  const content = await openAIClient(formattedPrompt);

  // Parse and validate response
  try {
    const parsed = JSON.parse(content);
    const extractedOtp = Number(parsed.extractedOtp) || -1;
    const confidence = Number(parsed.confidence) || -1;
    const reason = String(parsed.reason ?? '').trim() || 'Unable to verify the OTP from the video recording.';
    // Compute match: true if extractedOtp matches reference OTP and is not the error value
    const match = extractedOtp !== -1 && extractedOtp === Number(otp);
    
    return { 
      match, 
      confidence,
      extractedOtp, 
      reason 
    };
  } catch {
    console.log('Failed to parse OpenAI response for otp match');
    throw new Error('Failed to parse OpenAI response otp match');
  }
}

