import type { GoogleTTSConfig } from '../types';

class GoogleTTSService {
  private config: GoogleTTSConfig | null = null;

  initialize(config: GoogleTTSConfig) {
    this.config = config;
  }

  async synthesizeText(text: string): Promise<string> {
    if (!this.config) {
      throw new Error('Google TTS service not initialized');
    }

    try {
      // Note: In a real implementation, you'd use the Google Cloud TTS API
      // For demo purposes, we'll use the Web Speech API as fallback
      return await this.synthesizeWithWebAPI(text);
    } catch (error) {
      console.error('Google TTS error:', error);
      throw new Error('Failed to synthesize speech');
    }
  }

  private async synthesizeWithWebAPI(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config?.languageCode || 'th-TH';
      utterance.rate = this.config?.rate || 1;
      utterance.pitch = this.config?.pitch || 1;

      // Find Thai voice
      const voices = speechSynthesis.getVoices();
      const thaiVoice = voices.find(voice => voice.lang.startsWith('th'));
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      utterance.onend = () => resolve('Speech synthesis completed');
      utterance.onerror = (error) => reject(error);

      speechSynthesis.speak(utterance);
    });
  }

  async synthesizeToAudio(): Promise<Blob> {
    if (!this.config) {
      throw new Error('Google TTS service not initialized');
    }

    // This would typically call the Google Cloud TTS API
    // For demo purposes, return empty blob
    return new Blob([''], { type: 'audio/wav' });
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test if speech synthesis is available
      if (!('speechSynthesis' in window)) {
        return false;
      }

      // Test synthesis with a short text
      await this.synthesizeText('ทดสอบ');
      return true;
    } catch (error) {
      console.error('Google TTS connection test failed:', error);
      return false;
    }
  }

  stopSpeech(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!('speechSynthesis' in window)) {
      return [];
    }

    return speechSynthesis.getVoices().filter(voice => 
      voice.lang.startsWith('th') || voice.lang.startsWith('en')
    );
  }

  getUsage(): { charactersUsed: number; estimatedCost: number } {
    // This would typically be tracked through API responses
    return {
      charactersUsed: 0,
      estimatedCost: 0,
    };
  }
}

export const googleTTSService = new GoogleTTSService();