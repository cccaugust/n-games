// 効果音（Web Audio）と英語の読み上げ（Web Speech API）
// 端末が対応していなくても落ちないように、すべて try で守る。

let actx = null;
function ctx() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}

function tone(freq, start, dur, type = 'square', vol = 0.18) {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const Sound = {
  enabled: true,
  click() { if (!this.enabled) return; tone(520, 0, 0.08, 'square', 0.12); },
  correct() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.16, 'square', 0.16));
  },
  wrong() {
    if (!this.enabled) return;
    tone(196, 0, 0.18, 'sawtooth', 0.16);
    tone(146, 0.1, 0.22, 'sawtooth', 0.14);
  },
  capture() {
    if (!this.enabled) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.08, 0.22, 'triangle', 0.18));
  },
  levelup() {
    if (!this.enabled) return;
    [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.1, 0.28, 'square', 0.18));
  },
  unlock() { ctx(); }, // ユーザー操作で一度呼んでオーディオを有効化
};

// ---- 読み上げ ----
let enVoice = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  enVoice = voices.find(v => /en[-_]US/i.test(v.lang)) ||
            voices.find(v => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export const Speech = {
  enabled: true,
  supported: 'speechSynthesis' in window,
  speak(text) {
    if (!this.enabled || !this.supported) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.85;
      u.pitch = 1.0;
      if (enVoice) u.voice = enVoice;
      window.speechSynthesis.speak(u);
    } catch { /* noop */ }
  },
};
