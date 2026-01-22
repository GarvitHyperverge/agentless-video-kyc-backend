import WebSocket from 'ws';
import { config } from '../config';

export interface VoskTranscriptionResult {
  text: string;
}
/**
 * Connect to Vosk WebSocket server and transcribe audio
 * @param audioBuffer - Audio data buffer (PCM format)
 * @returns Promise with transcription result
 */
export const transcribeAudio = async (audioBuffer: Buffer): Promise<VoskTranscriptionResult> => {
  const { host, port, protocol } = config.vosk;
  const wsUrl = `${protocol}://${host}:${port}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let text = '';

    ws.on('open', () => {
      const CHUNK_SIZE = 4000;
      let offset = 0;
      
      const sendNextChunk = () => {
        if (ws.readyState !== WebSocket.OPEN) return;
        
        if (offset < audioBuffer.length) {
          // Send audio chunks
          const chunk = audioBuffer.slice(offset, Math.min(offset + CHUNK_SIZE, audioBuffer.length));
          ws.send(chunk, { binary: true });
          offset += CHUNK_SIZE;
          setTimeout(sendNextChunk, 20);
        } else {
          // All chunks sent - send empty buffer to signal end of stream
          // Vosk will only send final text AFTER receiving this empty buffer
          console.log('[Vosk] All audio chunks sent, signaling end of stream...');
          ws.send(new Uint8Array(0), { binary: true });
        }
      };
      
      sendNextChunk();
    });

    ws.on('message', (data: WebSocket.Data) => {
      const msg = data.toString();
      console.log('[Vosk] Message:', msg);
      try {
        const message = JSON.parse(msg);
        if ('text' in message) {
          text = message.text;
          console.log('[Vosk] Received final result:', text);
          // Got final text - close connection after a brief delay
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
          }, 1000);
        }
      } catch (error) {
        console.error('[Vosk] Error parsing message:', error);
      }
    });

    ws.on('error', (error: Error) => {
      reject(new Error(`Vosk error: ${error.message}`));
    });

    ws.on('close', (code: number, reason: Buffer) => {
      if (text && text.trim()) {
        console.log('[Vosk] Transcription completed successfully');
        resolve({ text });
      } else {
        console.log(`[Vosk] Closed: ${code} ${reason ? reason.toString() : ''}`);
        console.log('[Vosk] Empty text received, returning "Can\'t analyse"');
        resolve({ text: "Can't analyse" });
      }
    });
  });
};

