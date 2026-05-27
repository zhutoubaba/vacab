export interface SpeechOptions {
  rate?: number;
  lang?: string;
}

export const speechService = {
  /**
   * Speaks the provided text using the Web Speech Synthesis API.
   * Cancels any active speech before starting to ensure immediate response and standard audio-pacing.
   * 
   * @param {string} text - The words or sentences to be spoken.
   * @param {SpeechOptions} [options={}] - Custom voice configurations including speed rate and language.
   * @returns {void}
   */
  speak(text: string, options: SpeechOptions = {}): void {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser.');
      return;
    }

    // Cancel any current utterances immediately
    window.speechSynthesis.cancel();

    // Skip speaking if empty
    if (!text || !text.trim()) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'en-US';
    utterance.rate = options.rate !== undefined ? options.rate : 1.0;

    window.speechSynthesis.speak(utterance);
  },

  /**
   * Cancels any active or queued speech synthesis.
   */
  cancel(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
};
