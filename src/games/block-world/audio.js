/**
 * サウンド（WebAudio でその場で合成。音声ファイルは使わない）
 */
class AudioSys {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicEnabled = true;
    this.master = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.noiseBuf = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      // やわらかいディレイ
      const delay = this.ctx.createDelay(1.0);
      delay.delayTime.value = 0.38;
      const fb = this.ctx.createGain(); fb.gain.value = 0.35;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      this.musicGain.connect(this.master);
      this.musicGain.connect(delay); delay.connect(fb); fb.connect(lp); lp.connect(delay); delay.connect(this.master);
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) {
      console.warn('audio init failed', e);
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  get t() { return this.ctx.currentTime; }

  noise(dur, freq, q, gain, type = 'bandpass', attack = 0.005) {
    if (!this.ctx || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.t);
    g.gain.linearRampToValueAtTime(gain, this.t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, this.t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(this.t, Math.random() * 0.5);
    src.stop(this.t + dur + 0.05);
  }

  tone(freq, dur, type = 'square', gain = 0.12, slide = 0, dest = null) {
    if (!this.ctx || !this.enabled) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), this.t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, this.t);
    g.gain.linearRampToValueAtTime(gain, this.t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, this.t + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(); o.stop(this.t + dur + 0.05);
  }

  /* ---------- ブロック音 ---------- */
  dig(kind) {
    switch (kind) {
      case 'wood': this.noise(0.12, 500 + Math.random() * 200, 1.2, 0.25); break;
      case 'grass': this.noise(0.1, 900 + Math.random() * 300, 0.8, 0.18); break;
      case 'gravel': this.noise(0.1, 700 + Math.random() * 200, 0.9, 0.22); break;
      case 'sand': this.noise(0.12, 1800 + Math.random() * 400, 0.7, 0.14); break;
      case 'glass': this.tone(1800 + Math.random() * 400, 0.1, 'triangle', 0.08, 400); break;
      case 'wool': this.noise(0.12, 400, 0.6, 0.14, 'lowpass'); break;
      case 'snow': this.noise(0.1, 2400, 0.6, 0.12); break;
      case 'water': this.noise(0.25, 900, 0.5, 0.15, 'lowpass'); break;
      default: this.noise(0.09, 1400 + Math.random() * 300, 1.5, 0.22); break;
    }
  }
  breakBlock(kind) {
    if (kind === 'glass') { this.tone(2400, 0.25, 'triangle', 0.14, -800); this.noise(0.25, 3000, 1, 0.15); return; }
    this.dig(kind);
    this.noise(0.2, kind === 'wood' ? 350 : 800, 0.8, 0.3, 'lowpass');
  }
  place(kind) { this.dig(kind); this.tone(kind === 'wood' ? 220 : 160, 0.07, 'sine', 0.12, -60); }
  step(kind) {
    const f = { grass: 1000, sand: 1600, wood: 500, gravel: 800, snow: 2200, wool: 400, stone: 1300 }[kind] || 1200;
    this.noise(0.07, f, 1.0, 0.07);
  }
  jump() { this.noise(0.06, 1200, 1, 0.05); }
  land() { this.noise(0.12, 700, 0.8, 0.14, 'lowpass'); }
  splash() { this.noise(0.4, 1200, 0.5, 0.25, 'lowpass', 0.02); this.tone(300, 0.2, 'sine', 0.08, -150); }
  hurt() { this.tone(220, 0.18, 'sawtooth', 0.14, -120); this.noise(0.15, 500, 1, 0.12); }
  pop() { this.tone(900 + Math.random() * 300, 0.09, 'sine', 0.12, 600); }
  eat() { this.noise(0.08, 900, 1, 0.1); setTimeout(() => this.noise(0.08, 700, 1, 0.1), 120); setTimeout(() => this.noise(0.1, 600, 1, 0.1), 260); }
  craft() { this.tone(660, 0.08, 'square', 0.08); setTimeout(() => this.tone(990, 0.12, 'square', 0.08), 90); }
  click() { this.tone(1400, 0.04, 'square', 0.05); }
  punch() { this.noise(0.08, 300, 1, 0.2, 'lowpass'); }
  levelUp() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'triangle', 0.1), i * 90)); }

  /* ---------- モブの声 ---------- */
  mob(type) {
    if (!this.ctx || !this.enabled) return;
    if (type === 'pig') { this.tone(180, 0.18, 'sawtooth', 0.07, 60); setTimeout(() => this.tone(220, 0.14, 'sawtooth', 0.06, -80), 150); }
    else if (type === 'sheep') { this.tone(330, 0.5, 'sawtooth', 0.05, -40); }
    else if (type === 'chicken') { this.tone(900, 0.07, 'square', 0.04, 300); setTimeout(() => this.tone(1100, 0.08, 'square', 0.04, -300), 100); }
    else if (type === 'zombie') { this.tone(90, 0.6, 'sawtooth', 0.09, -30); this.noise(0.6, 250, 1, 0.08, 'lowpass', 0.1); }
  }

  /* ---------- 音楽（ゆったりしたアンビエント） ---------- */
  startMusic() {
    this.stopMusic();
    if (!this.ctx || !this.musicEnabled) return;
    const scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3, 659.3];
    const bass = [130.8, 98.0, 110.0, 146.8];
    let step = 0;
    const tick = () => {
      if (!this.musicEnabled || !this.enabled) { this.musicTimer = setTimeout(tick, 2000); return; }
      if (step % 4 === 0) {
        const b = bass[Math.floor(step / 4) % bass.length];
        this.tone(b, 3.5, 'sine', 0.12, 0, this.musicGain);
        this.tone(b * 1.5, 3.5, 'sine', 0.05, 0, this.musicGain);
      }
      if (Math.random() < 0.8) {
        const f = scale[Math.floor(Math.random() * scale.length)];
        this.tone(f, 1.6 + Math.random(), 'triangle', 0.06, 0, this.musicGain);
        if (Math.random() < 0.3) setTimeout(() => this.tone(f * 1.5, 1.2, 'triangle', 0.04, 0, this.musicGain), 350);
      }
      step++;
      this.musicTimer = setTimeout(tick, 1400 + Math.random() * 1400);
    };
    tick();
  }
  stopMusic() { if (this.musicTimer) { clearTimeout(this.musicTimer); this.musicTimer = null; } }
}

export const audio = new AudioSys();
