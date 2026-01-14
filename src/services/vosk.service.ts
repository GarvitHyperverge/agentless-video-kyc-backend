import WebSocket from 'ws';
import { config } from '../config';

export interface VoskTranscriptionResult {
  text: string;
  partial?: string;
}

export interface VoskRecognitionOptions {
  sampleRate?: number;
  words?: boolean;
}

/**
 * Connect to Vosk WebSocket server and transcribe audio
 * @param audioBuffer - Audio data buffer (PCM format)
 * @param options - Recognition options (sample rate, words)
 * @returns Promise with transcription result
 */
export const transcribeAudio = async (
  audioBuffer: Buffer,
  options: VoskRecognitionOptions = {}
): Promise<VoskTranscriptionResult> => {
  const { host, port, protocol } = config.vosk;
  const wsUrl = `${protocol}://${host}:${port}`;

  // Validate audio buffer
  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('Audio buffer is empty');
  }

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let text = '';
    let lastPartial = '';

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Vosk transcription timeout'));
    }, 300000); // 5 minutes

    ws.on('open', () => {
      // Skip config - audio is already 16kHz mono s16le, Vosk defaults work
      // Send audio directly in chunks
      const CHUNK_SIZE = 4000;
      let offset = 0;
      
      const sendNextChunk = () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        
        if (offset < audioBuffer.length) {
          // Step 1: Send all audio chunks first
          const chunk = audioBuffer.slice(offset, Math.min(offset + CHUNK_SIZE, audioBuffer.length));
          ws.send(chunk, { binary: true });
          offset += CHUNK_SIZE;
          setTimeout(sendNextChunk, 20);
        } else {
          // Step 2: All chunks sent - send empty buffer as "end of stream" signal
          console.log('[Vosk] All audio chunks sent, signaling end of stream...');
          ws.send(new Uint8Array(0), { binary: true });
          // Step 3: Don't close yet - wait for server to send final result
        }
      };
      
      sendNextChunk();
    });

    ws.on('message', (data: WebSocket.Data) => {
      const msg = data.toString();
      console.log('[Vosk] Message:', msg);
      try {
        const message = JSON.parse(msg);
        // Track final text (preferred)
        if (message.text) {
          text = message.text;
          console.log('[Vosk] Received final result:', text);
          // Got final text - now we can close the connection
          // Wait a moment to ensure message is processed, then close
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, 100);
        }
        // Track last non-empty partial as fallback
        if (message.partial && message.partial.trim()) {
          lastPartial = message.partial;
        }
      } catch (error) {
        // Ignore parse errors
      }
    });

    ws.on('error', (error: Error) => {
      clearTimeout(timeout);
      reject(new Error(`Vosk error: ${error.message}`));
    });

    ws.on('close', (code: number, reason: Buffer) => {
      clearTimeout(timeout);
      
      // Use final text if available, otherwise use last partial as fallback
      const finalText = text || lastPartial;
      if (finalText) {
        // Success - show positive message instead of close code
        console.log('[Vosk] Transcription completed successfully');
        resolve({ text: finalText });
      } else if (code === 1000) {
        // Normal closure - server finished processing
        console.log('[Vosk] Transcription completed successfully');
        resolve({ text: lastPartial || '' });
      } else {
        // Error case - show close code for debugging
        console.log(`[Vosk] Closed: ${code} ${reason ? reason.toString() : ''}`);
        reject(new Error(`Connection closed with code ${code}`));
      }
    });
  });
};

