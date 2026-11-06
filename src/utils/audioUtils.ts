/**
 * Audio helper utilities to handle Gemini TTS PCM audio and convert to standard WAV format.
 */

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Creates a WAV file Blob with proper header from raw 16-bit PCM buffer at 24000Hz.
 */
export function pcmToWavBlob(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Blob {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM audio data
  const uint8View = new Uint8Array(buffer, headerSize);
  uint8View.set(pcmData);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Converts a base64 PCM string to a playable object URL
 */
export function convertPcmBase64ToWavUrl(base64: string, sampleRate = 24000): string {
  const arrayBuffer = base64ToArrayBuffer(base64);
  const pcmBytes = new Uint8Array(arrayBuffer);
  const blob = pcmToWavBlob(pcmBytes, sampleRate);
  return URL.createObjectURL(blob);
}

/**
 * Formats time in seconds to mm:ss format
 */
export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts 16-bit PCM base64 string to an MP3 Blob in the browser
 */
export async function convertPcmBase64ToMp3Blob(base64: string, sampleRate = 24000): Promise<Blob> {
  const arrayBuffer = base64ToArrayBuffer(base64);
  const pcmBytes = new Uint8Array(arrayBuffer);
  const sampleCount = Math.floor(pcmBytes.length / 2);
  const int16Samples = new Int16Array(pcmBytes.buffer, pcmBytes.byteOffset, sampleCount);

  // Use window.lamejs (loaded from /lame.min.js)
  const lame = typeof window !== "undefined" ? (window as any).lamejs : null;
  if (lame && lame.Mp3Encoder) {
    try {
      const encoder = new lame.Mp3Encoder(1, sampleRate, 128);
      const maxBlock = 1152;
      const mp3Chunks: Uint8Array[] = [];

      for (let i = 0; i < int16Samples.length; i += maxBlock) {
        const chunk = int16Samples.subarray(i, i + maxBlock);
        const encodedChunk = encoder.encodeBuffer(chunk);
        if (encodedChunk.length > 0) {
          mp3Chunks.push(new Uint8Array(encodedChunk));
        }
      }
      const finalFlush = encoder.flush();
      if (finalFlush.length > 0) {
        mp3Chunks.push(new Uint8Array(finalFlush));
      }
      return new Blob(mp3Chunks, { type: "audio/mp3" });
    } catch (err) {
      console.warn("lamejs MP3 conversion error, falling back to WAV:", err);
    }
  }

  // Fallback: return WAV blob
  return pcmToWavBlob(pcmBytes, sampleRate);
}

/**
 * Generates a meaningful audio filename in the format:
 * sada-voice-<first-words>-<date>.wav / .mp3
 */
export function generateAudioFilename(titleOrText: string, extension: "wav" | "mp3"): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const words = (titleOrText || "audio")
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join("-")
    .replace(/[^\w\u0600-\u06FF\-]/g, "") // Keep alphanumeric, Arabic characters, and hyphens
    .slice(0, 30);
  const cleanWords = words || "speech";
  return `sada-voice-${cleanWords}-${today}.${extension}`;
}

