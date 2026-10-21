/**
 * Audio and Web Speech API utility for authentic Japanese pronunciation
 */

let synth: SpeechSynthesis | null = null;
let jaVoice: SpeechSynthesisVoice | null = null;

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  synth = window.speechSynthesis;
  
  const loadVoices = () => {
    if (!synth) return;
    const voices = synth.getVoices();
    // Prioritize natural Japanese voice
    jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP' || v.lang.startsWith('ja')) || null;
  };

  loadVoices();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }
}

export function playJapaneseSpeech(text: string, rate: number = 0.9): Promise<void> {
  return new Promise((resolve) => {
    if (!synth) {
      playChime(440, 'triangle');
      resolve();
      return;
    }

    try {
      synth.cancel(); // Stop current playing speech to avoid overlap
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate; // slightly slower for educational clarity
      utterance.pitch = 1.05;
      if (jaVoice) {
        utterance.voice = jaVoice;
      }
      utterance.onend = () => resolve();
      utterance.onerror = () => {
        playChime(520, 'sine');
        resolve();
      };

      synth.speak(utterance);
    } catch {
      playChime(520, 'sine');
      resolve();
    }
  });
}

// Web Audio API tone generator for tactile feedback
export function playChime(frequency: number = 600, type: OscillatorType = 'sine', duration: number = 0.15) {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio context may be restricted by autoplay policy until interaction
  }
}

export function playSuccessSound() {
  playChime(587.33, 'sine', 0.1); // D5
  setTimeout(() => playChime(880, 'triangle', 0.2), 80); // A5
}

export function playErrorSound() {
  playChime(311.13, 'sawtooth', 0.15); // Eb4
  setTimeout(() => playChime(261.63, 'sawtooth', 0.25), 100); // C4
}
