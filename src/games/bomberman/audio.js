// ===== Audio System using Web Audio API =====

let audioCtx = null;
let soundEnabled = true;

// Initialize audio context
export function initAudio() {
  if (audioCtx) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
}

// Resume audio context (required after user interaction)
export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

// Toggle sound
export function toggleSound(enabled) {
  soundEnabled = enabled;
}

export function isSoundEnabled() {
  return soundEnabled;
}

// Play a simple tone
function playTone(frequency, duration, type = 'sine', volume = 0.3) {
  if (!soundEnabled || !audioCtx) return;
  resumeAudio();

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio playback failed:', e);
  }
}

// Play noise (for explosions)
function playNoise(duration, volume = 0.3) {
  if (!soundEnabled || !audioCtx) return;
  resumeAudio();

  try {
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(audioCtx.currentTime);
    noise.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Noise playback failed:', e);
  }
}

// Sound effects
export function playSound(type) {
  switch (type) {
    case 'place_bomb':
      playTone(200, 0.1, 'sine', 0.2);
      setTimeout(() => playTone(150, 0.1, 'sine', 0.15), 50);
      break;

    case 'explosion':
      playNoise(0.4, 0.4);
      playTone(80, 0.3, 'sawtooth', 0.3);
      setTimeout(() => playTone(60, 0.2, 'sawtooth', 0.2), 100);
      break;

    case 'block_break':
      playTone(400, 0.08, 'square', 0.15);
      playTone(300, 0.08, 'square', 0.1);
      break;

    case 'item_get':
      playTone(523, 0.1, 'sine', 0.25); // C5
      setTimeout(() => playTone(659, 0.1, 'sine', 0.25), 80); // E5
      setTimeout(() => playTone(784, 0.15, 'sine', 0.25), 160); // G5
      break;

    case 'player_death':
      playTone(400, 0.15, 'sawtooth', 0.3);
      setTimeout(() => playTone(300, 0.15, 'sawtooth', 0.25), 150);
      setTimeout(() => playTone(200, 0.2, 'sawtooth', 0.2), 300);
      setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.15), 450);
      break;

    case 'enemy_death':
      playTone(600, 0.08, 'square', 0.2);
      playTone(800, 0.1, 'square', 0.15);
      break;

    case 'stage_clear':
      const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
      notes.forEach((note, i) => {
        setTimeout(() => playTone(note, 0.2, 'sine', 0.3), i * 150);
      });
      break;

    case 'game_over':
      playTone(392, 0.3, 'sine', 0.3); // G4
      setTimeout(() => playTone(349, 0.3, 'sine', 0.25), 300); // F4
      setTimeout(() => playTone(330, 0.3, 'sine', 0.2), 600); // E4
      setTimeout(() => playTone(262, 0.5, 'sine', 0.3), 900); // C4
      break;

    case 'move':
      playTone(200, 0.03, 'sine', 0.05);
      break;

    case 'kick':
      playTone(300, 0.08, 'square', 0.2);
      playTone(400, 0.08, 'square', 0.15);
      break;

    case 'menu_select':
      playTone(440, 0.08, 'sine', 0.2);
      break;

    case 'menu_confirm':
      playTone(523, 0.1, 'sine', 0.25);
      setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 80);
      break;

    case 'countdown':
      playTone(440, 0.15, 'sine', 0.3);
      break;

    case 'time_warning':
      playTone(880, 0.1, 'square', 0.25);
      setTimeout(() => playTone(880, 0.1, 'square', 0.2), 150);
      break;

    case 'door_open':
      playTone(392, 0.15, 'sine', 0.25);
      setTimeout(() => playTone(523, 0.15, 'sine', 0.25), 100);
      setTimeout(() => playTone(659, 0.2, 'sine', 0.25), 200);
      break;

    default:
      console.warn('Unknown sound type:', type);
  }
}
