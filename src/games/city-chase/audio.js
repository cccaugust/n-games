/**
 * シティチェイス - サウンド（WebAudio合成・外部ファイル不要）
 * 効果音: タップ / ヘリ移動 / ビル持ち上げ / 痕跡発見 / サイレン / 逮捕 / 逃走 ほか
 * BGM: 夜の街の緊張感のあるアンビエントループ
 */
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.bgmBus = null;
    this.enabled = true;
    this.noiseBuffer = null;
    this.bgm = null;
    this.sirenNodes = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.85 : 0;
    this.master.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);
    this.bgmBus = ctx.createGain(); this.bgmBus.gain.value = 0.32; this.bgmBus.connect(this.master);
    const len = ctx.sampleRate * 1.5;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  get ready() { return !!this.ctx && this.enabled; }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.85 : 0, this.now, 0.03);
    if (!on) this.siren(false);
  }

  // ---------- 基本部品 ----------
  _osc({ type = 'sine', freq = 440, freqEnd = null, t0 = this.now, dur = 0.2, attack = 0.005, peak = 0.3, release = null, dest = null, detune = 0, lowpass = null }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    o.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    const rel = release ?? dur;
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + rel);
    let node = o;
    if (lowpass) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass; f.Q.value = 0.8;
      o.connect(f); node = f;
    }
    node.connect(g);
    g.connect(dest || this.sfxBus);
    o.start(t0);
    o.stop(t0 + rel + 0.05);
    return o;
  }

  _noise({ t0 = this.now, dur = 0.3, type = 'bandpass', freq = 800, freqEnd = null, Q = 1, peak = 0.3, attack = 0.01, dest = null }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = Q;
    f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || this.sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  // ---------- 効果音 ----------
  tap() {
    if (!this.ready) return;
    this._osc({ type: 'square', freq: 920, freqEnd: 700, dur: 0.06, peak: 0.08 });
  }

  select() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'triangle', freq: 660, t0: t, dur: 0.08, peak: 0.14 });
    this._osc({ type: 'triangle', freq: 990, t0: t + 0.07, dur: 0.12, peak: 0.14 });
  }

  cancel() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'triangle', freq: 520, t0: t, dur: 0.08, peak: 0.12 });
    this._osc({ type: 'triangle', freq: 380, t0: t + 0.07, dur: 0.12, peak: 0.12 });
  }

  invalid() {
    if (!this.ready) return;
    this._osc({ type: 'sawtooth', freq: 180, freqEnd: 120, dur: 0.18, peak: 0.1, lowpass: 900 });
  }

  heliPlace() {
    if (!this.ready) return;
    const t = this.now;
    this._noise({ t0: t, dur: 0.7, type: 'bandpass', freq: 900, freqEnd: 250, Q: 1.2, peak: 0.25 });
    this._osc({ type: 'sine', freq: 70, freqEnd: 40, t0: t + 0.55, dur: 0.25, peak: 0.3 });
  }

  heliMove() {
    if (!this.ready) return;
    const t = this.now;
    this._noise({ t0: t, dur: 0.9, type: 'bandpass', freq: 220, freqEnd: 700, Q: 1.5, peak: 0.22, attack: 0.08 });
    this._noise({ t0: t + 0.3, dur: 0.6, type: 'bandpass', freq: 700, freqEnd: 240, Q: 1.5, peak: 0.18, attack: 0.05 });
    // ローターの回転音
    for (let k = 0; k < 9; k++) this._osc({ type: 'sine', freq: 95, t0: t + k * 0.09, dur: 0.07, peak: 0.1 });
  }

  lift() {
    if (!this.ready) return;
    const t = this.now;
    this._noise({ t0: t, dur: 0.5, type: 'bandpass', freq: 300, freqEnd: 1800, Q: 1.1, peak: 0.26, attack: 0.03 });
    this._osc({ type: 'sine', freq: 180, freqEnd: 360, t0: t, dur: 0.4, peak: 0.1 });
  }

  drop() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'sine', freq: 90, freqEnd: 38, t0: t, dur: 0.22, peak: 0.42 });
    this._noise({ t0: t, dur: 0.14, type: 'lowpass', freq: 600, Q: 0.7, peak: 0.25, attack: 0.005 });
  }

  nothing() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'triangle', freq: 300, freqEnd: 220, t0: t, dur: 0.28, peak: 0.12 });
    this._osc({ type: 'triangle', freq: 225, freqEnd: 170, t0: t + 0.16, dur: 0.3, peak: 0.1 });
  }

  trace(color = 'blue') {
    if (!this.ready) return;
    const t = this.now;
    const notes = color === 'yellow' ? [1046, 1318, 1568, 2093] : color === 'red' ? [880, 1108, 1318, 1760] : [659, 987, 1318];
    notes.forEach((f, k) => {
      this._osc({ type: 'sine', freq: f, t0: t + k * 0.09, dur: 0.5, peak: 0.16 });
      this._osc({ type: 'triangle', freq: f * 2, t0: t + k * 0.09, dur: 0.25, peak: 0.04 });
    });
    this._noise({ t0: t, dur: 0.4, type: 'highpass', freq: 4000, Q: 0.5, peak: 0.05 });
  }

  siren(on) {
    if (!this.ctx) return;
    if (!on) {
      if (this.sirenNodes) {
        const { g } = this.sirenNodes;
        g.gain.setTargetAtTime(0.0001, this.now, 0.1);
        const nodes = this.sirenNodes;
        setTimeout(() => { try { nodes.o1.stop(); nodes.o2.stop(); nodes.lfo.stop(); } catch (e) { /* noop */ } }, 500);
        this.sirenNodes = null;
      }
      return;
    }
    if (this.sirenNodes || !this.enabled) return;
    const ctx = this.ctx, t = this.now;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = 700;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 702;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 180;
    lfo.connect(lfoGain); lfoGain.connect(o1.frequency); lfoGain.connect(o2.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.15);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.sfxBus);
    o1.start(t); o2.start(t); lfo.start(t);
    this.sirenNodes = { o1, o2, lfo, g };
  }

  arrest() {
    if (!this.ready) return;
    const t = this.now;
    this.siren(true);
    setTimeout(() => this.siren(false), 2600);
    // ブラス風スティンガー
    const chord = [261.6, 329.6, 392, 523.3];
    chord.forEach((f, k) => {
      this._osc({ type: 'sawtooth', freq: f, t0: t + 0.1, dur: 1.4, attack: 0.05, peak: 0.1, lowpass: 2200, detune: k * 4 });
      this._osc({ type: 'sawtooth', freq: f * 1.5, t0: t + 0.55, dur: 1.2, attack: 0.04, peak: 0.07, lowpass: 2200 });
    });
    this._osc({ type: 'sine', freq: 60, freqEnd: 30, t0: t, dur: 0.6, peak: 0.5 });
    this._noise({ t0: t, dur: 0.5, type: 'lowpass', freq: 400, peak: 0.3, attack: 0.005 });
  }

  escape() {
    if (!this.ready) return;
    const t = this.now;
    this.engine(t, 1.3, 0.35);
    const arp = [392, 493.9, 587.3, 784, 987.8, 1174.7];
    arp.forEach((f, k) => this._osc({ type: 'triangle', freq: f, t0: t + 0.5 + k * 0.11, dur: 0.7, peak: 0.16 }));
    [523.3, 659.3, 784, 1046.5].forEach((f, k) => this._osc({ type: 'sawtooth', freq: f, t0: t + 1.2, dur: 1.6, attack: 0.08, peak: 0.08, lowpass: 2400, detune: k * 3 }));
  }

  engine(t0 = this.now, dur = 0.7, peak = 0.22) {
    if (!this.ready) return;
    this._osc({ type: 'sawtooth', freq: 55, freqEnd: 190, t0, dur, attack: 0.05, peak, lowpass: 700 });
    this._osc({ type: 'square', freq: 110, freqEnd: 380, t0, dur, attack: 0.05, peak: peak * 0.45, lowpass: 900 });
    this._noise({ t0, dur: dur * 0.8, type: 'lowpass', freq: 500, freqEnd: 1400, peak: peak * 0.5, attack: 0.05 });
  }

  sneak() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'sawtooth', freq: 50, freqEnd: 120, t0: t, dur: 1.1, attack: 0.2, peak: 0.12, lowpass: 260 });
    this._noise({ t0: t + 0.2, dur: 0.8, type: 'lowpass', freq: 220, peak: 0.08, attack: 0.1 });
  }

  roundStart() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'sine', freq: 150, freqEnd: 45, t0: t, dur: 0.35, peak: 0.5 });
    this._noise({ t0: t, dur: 0.25, type: 'lowpass', freq: 900, peak: 0.25, attack: 0.004 });
    this._osc({ type: 'triangle', freq: 880, t0: t + 0.12, dur: 0.18, peak: 0.12 });
    this._osc({ type: 'triangle', freq: 1320, t0: t + 0.24, dur: 0.25, peak: 0.12 });
  }

  surrounded() {
    if (!this.ready) return;
    const t = this.now;
    for (let k = 0; k < 3; k++) {
      this._osc({ type: 'sine', freq: 120, freqEnd: 40, t0: t + k * 0.35, dur: 0.3, peak: 0.5 });
      this._noise({ t0: t + k * 0.35, dur: 0.2, type: 'lowpass', freq: 700, peak: 0.25, attack: 0.004 });
    }
    this._osc({ type: 'sawtooth', freq: 220, freqEnd: 110, t0: t + 1.0, dur: 1.2, attack: 0.1, peak: 0.12, lowpass: 1200 });
  }

  handover() {
    if (!this.ready) return;
    const t = this.now;
    this._osc({ type: 'sine', freq: 440, t0: t, dur: 1.2, peak: 0.16 });
    this._osc({ type: 'sine', freq: 660, t0: t + 0.02, dur: 1.0, peak: 0.1 });
    this._osc({ type: 'sine', freq: 1320, t0: t + 0.04, dur: 0.6, peak: 0.04 });
  }

  thinking() {
    if (!this.ready) return;
    this._osc({ type: 'sine', freq: 1500, dur: 0.04, peak: 0.05 });
  }

  win() {
    if (!this.ready) return;
    const t = this.now;
    [523.3, 659.3, 784, 1046.5, 1318.5].forEach((f, k) => this._osc({ type: 'triangle', freq: f, t0: t + k * 0.12, dur: 0.6, peak: 0.16 }));
  }

  lose() {
    if (!this.ready) return;
    const t = this.now;
    [392, 349.2, 311.1, 261.6].forEach((f, k) => this._osc({ type: 'triangle', freq: f, t0: t + k * 0.22, dur: 0.5, peak: 0.14 }));
  }

  // ---------- BGM（アンビエントループ） ----------
  startBgm() {
    if (!this.ctx || this.bgm) return;
    const ctx = this.ctx;
    const t = this.now;
    const pad = ctx.createGain(); pad.gain.setValueAtTime(0.0001, t); pad.gain.exponentialRampToValueAtTime(0.5, t + 2.5);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 1.2;
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    const oscs = [];
    for (const [f, det, type] of [[55, 0, 'sawtooth'], [82.4, 6, 'sawtooth'], [110, -5, 'triangle'], [164.8, 4, 'triangle']]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
      const g = ctx.createGain(); g.gain.value = f < 100 ? 0.35 : 0.2;
      o.connect(g); g.connect(lp); o.start(t); oscs.push(o);
    }
    lp.connect(pad); pad.connect(this.bgmBus); lfo.start(t);
    // ハイハットとベースパルスのスケジューラ
    const bpm = 96;
    const beat = 60 / bpm;
    let nextBeat = t + 0.5;
    let count = 0;
    const timer = setInterval(() => {
      if (!this.ctx || !this.bgm) return;
      while (nextBeat < this.now + 0.4) {
        const tb = nextBeat;
        if (this.enabled) {
          // ハイハット（8分）
          this._noise({ t0: tb, dur: 0.05, type: 'highpass', freq: 7000, peak: count % 2 === 0 ? 0.045 : 0.025, attack: 0.002, dest: this.bgmBus });
          this._noise({ t0: tb + beat / 2, dur: 0.04, type: 'highpass', freq: 8000, peak: 0.02, attack: 0.002, dest: this.bgmBus });
          // ベースパルス（1拍目と3拍目の裏）
          if (count % 4 === 0) this._osc({ type: 'sine', freq: 55, freqEnd: 50, t0: tb, dur: 0.4, peak: 0.35, dest: this.bgmBus });
          if (count % 4 === 2) this._osc({ type: 'sine', freq: 41.2, freqEnd: 38, t0: tb + beat / 2, dur: 0.3, peak: 0.25, dest: this.bgmBus });
          // 時々鳴る不穏なベル
          if (count % 16 === 7) this._osc({ type: 'sine', freq: 659.3, t0: tb, dur: 1.6, peak: 0.05, dest: this.bgmBus });
          if (count % 16 === 13) this._osc({ type: 'sine', freq: 587.3, t0: tb, dur: 1.6, peak: 0.05, dest: this.bgmBus });
        }
        nextBeat += beat;
        count++;
      }
    }, 120);
    this.bgm = { oscs, lfo, pad, timer };
  }

  stopBgm() {
    if (!this.bgm) return;
    const { oscs, lfo, pad, timer } = this.bgm;
    clearInterval(timer);
    pad.gain.setTargetAtTime(0.0001, this.now, 0.4);
    setTimeout(() => { try { oscs.forEach((o) => o.stop()); lfo.stop(); } catch (e) { /* noop */ } }, 1500);
    this.bgm = null;
  }
}

export const audio = new AudioEngine();
