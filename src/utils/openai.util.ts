import axios from 'axios';
import https from 'https';
import { config } from '../config';

/**
 * HTTPS agent that bypasses SSL certificate verification (for development)
 * Used for OpenAI API calls
 */
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/**
 * OpenAI API client function
 * Makes a chat completion request to OpenAI
 * @param params - OpenAI client parameters (prompt, input)
 * @returns Promise<string> - The content from the assistant's response
 */
export async function openAIClient(prompt:string): Promise<string> {
  const apiKey = config.openai.apiKey
  const model = config.openai.model 

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Build messages array from prompt and input
  const messages = [
    { role: 'system', content:prompt },
  ];

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model,
        response_format: { type: 'json_object' },
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
        httpsAgent,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    console.log('OpenAI response:', content);
    return content;
  } catch (error: any) {
    // Bubble error 
    throw error;
  }
}
