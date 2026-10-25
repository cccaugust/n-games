// ねこぐんだん大戦争 - WebAudio で合成する効果音 / BGM（音声ファイル不要）

class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.sfxOn = true;
    this.bgmOn = true;
    this.bgm = null; // { timer, step, nextTime, song }
    this.lastPlay = {};
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxOn ? 1 : 0;
    this.sfxGain.connect(this.master);
    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = this.bgmOn ? 0.5 : 0;
    this.bgmGain.connect(this.master);
    return true;
  }

  setSfx(on) {
    this.sfxOn = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0;
  }

  setBgm(on) {
    this.bgmOn = on;
    if (this.bgmGain) this.bgmGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.05);
  }

  // ---------- 基本の音の部品 ----------
  tone({ freq = 440, freqEnd = null, type = 'sine', dur = 0.15, vol = 0.3, attack = 0.005, dest = null, when = 0, detune = 0 }) {
    if (!this.ensure()) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (detune) osc.detune.value = detune;
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  noise({ dur = 0.15, vol = 0.3, lp = 2000, hp = 100, when = 0 }) {
    if (!this.ensure()) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f1 = ctx.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = lp;
    const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(this.sfxGain);
    src.start(t0);
  }

  // 同じ音の連打を間引く
  throttle(name, ms) {
    const now = performance.now();
    if (this.lastPlay[name] && now - this.lastPlay[name] < ms) return false;
    this.lastPlay[name] = now;
    return true;
  }

  // ---------- 効果音 ----------
  sfx(name, opt = {}) {
    if (!this.sfxOn) return;
    if (!this.ensure()) return;
    switch (name) {
      case 'deploy': // にゃっ
        if (!this.throttle('deploy', 60)) return;
        this.tone({ freq: 620 + Math.random() * 80, freqEnd: 980, type: 'triangle', dur: 0.12, vol: 0.25 });
        this.tone({ freq: 980, freqEnd: 700, type: 'triangle', dur: 0.14, vol: 0.2, when: 0.11 });
        break;
      case 'hit':
        if (!this.throttle('hit', 40)) return;
        this.noise({ dur: 0.08, vol: 0.25, lp: 1800, hp: 200 });
        this.tone({ freq: 220, freqEnd: 90, type: 'square', dur: 0.08, vol: 0.12 });
        break;
      case 'crit':
        this.noise({ dur: 0.14, vol: 0.4, lp: 3500, hp: 300 });
        this.tone({ freq: 880, freqEnd: 220, type: 'sawtooth', dur: 0.18, vol: 0.2 });
        break;
      case 'kill':
        if (!this.throttle('kill', 50)) return;
        this.tone({ freq: 520, freqEnd: 130, type: 'square', dur: 0.22, vol: 0.18 });
        this.noise({ dur: 0.2, vol: 0.2, lp: 1200, hp: 100 });
        break;
      case 'coin':
        if (!this.throttle('coin', 50)) return;
        this.tone({ freq: 1320, type: 'sine', dur: 0.08, vol: 0.18 });
        this.tone({ freq: 1760, type: 'sine', dur: 0.16, vol: 0.18, when: 0.07 });
        break;
      case 'catdown':
        if (!this.throttle('catdown', 80)) return;
        this.tone({ freq: 700, freqEnd: 300, type: 'triangle', dur: 0.25, vol: 0.18 });
        break;
      case 'kb':
        if (!this.throttle('kb', 60)) return;
        this.tone({ freq: 300, freqEnd: 600, type: 'sine', dur: 0.12, vol: 0.12 });
        break;
      case 'cannon':
        this.noise({ dur: 0.6, vol: 0.6, lp: 900, hp: 40 });
        this.tone({ freq: 160, freqEnd: 40, type: 'sawtooth', dur: 0.6, vol: 0.35 });
        this.tone({ freq: 1200, freqEnd: 200, type: 'sine', dur: 0.3, vol: 0.15 });
        break;
      case 'worker':
        [660, 830, 990].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.12, vol: 0.2, when: i * 0.07 }));
        break;
      case 'levelup':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.22, when: i * 0.08 }));
        break;
      case 'boss':
        this.noise({ dur: 1.0, vol: 0.5, lp: 600, hp: 30 });
        this.tone({ freq: 110, freqEnd: 55, type: 'sawtooth', dur: 1.2, vol: 0.4 });
        this.tone({ freq: 164, freqEnd: 82, type: 'square', dur: 1.2, vol: 0.2, when: 0.1 });
        break;
      case 'click':
        this.tone({ freq: 900, type: 'sine', dur: 0.05, vol: 0.12 });
        break;
      case 'error':
        this.tone({ freq: 220, type: 'square', dur: 0.08, vol: 0.12 });
        this.tone({ freq: 180, type: 'square', dur: 0.12, vol: 0.12, when: 0.09 });
        break;
      case 'win':
        [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.2, vol: 0.14, when: i * 0.13 }));
        [262, 330, 392, 523, 392, 523, 659].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.14, when: i * 0.13 }));
        break;
      case 'lose':
        [392, 370, 349, 294].forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.2, when: i * 0.3 }));
        this.tone({ freq: 110, freqEnd: 60, type: 'sawtooth', dur: 1.4, vol: 0.15, when: 0.9 });
        break;
      case 'start':
        [392, 523, 659, 784].forEach((f, i) => this.tone({ freq: f, type: 'square', dur: 0.14, vol: 0.14, when: i * 0.09 }));
        break;
      default:
        break;
    }
    void opt;
  }

  // ---------- BGM（簡易シーケンサー） ----------
  startBgm(songName) {
    if (!this.ensure()) return;
    if (this.bgm && this.bgm.name === songName) return;
    this.stopBgm();
    const song = SONGS[songName];
    if (!song) return;
    const state = { name: songName, song, step: 0, nextTime: this.ctx.currentTime + 0.1, timer: null };
    this.bgm = state;
    const stepDur = 60 / song.bpm / 2; // 8分音符
    const schedule = () => {
      if (this.bgm !== state) return;
      const ahead = this.ctx.currentTime + 0.35;
      while (state.nextTime < ahead) {
        const i = state.step % song.length;
        const bass = song.bass[i];
        const mel = song.melody[i];
        const chord = song.chords ? song.chords[i] : null;
        if (bass) this.tone({ freq: midi(bass), type: 'triangle', dur: stepDur * 0.9, vol: 0.16, dest: this.bgmGain, when: state.nextTime - this.ctx.currentTime });
        if (mel) this.tone({ freq: midi(mel), type: song.lead || 'square', dur: stepDur * 0.8, vol: 0.07, dest: this.bgmGain, when: state.nextTime - this.ctx.currentTime });
        if (chord) for (const n of chord) this.tone({ freq: midi(n), type: 'sine', dur: stepDur * 1.6, vol: 0.05, dest: this.bgmGain, when: state.nextTime - this.ctx.currentTime });
        if (song.drums && song.drums[i]) {
          const d = song.drums[i];
          if (d === 'k') this.tone({ freq: 150, freqEnd: 40, type: 'sine', dur: 0.12, vol: 0.25, dest: this.bgmGain, when: state.nextTime - this.ctx.currentTime });
          if (d === 's') this.noiseTo(this.bgmGain, 0.08, 0.1, state.nextTime - this.ctx.currentTime);
          if (d === 'h') this.noiseTo(this.bgmGain, 0.03, 0.05, state.nextTime - this.ctx.currentTime, 6000);
        }
        state.nextTime += stepDur;
        state.step++;
      }
      state.timer = setTimeout(schedule, 120);
    };
    schedule();
  }

  noiseTo(dest, dur, vol, when, hp = 1500) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + Math.max(0, when);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0);
  }

  stopBgm() {
    if (this.bgm) {
      clearTimeout(this.bgm.timer);
      this.bgm = null;
    }
  }
}

function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

// 曲データ（MIDIノート番号 / 0 = 休み）
const _ = 0;
const SONGS = {
  // メニュー: のんびり
  menu: {
    bpm: 96, lead: 'triangle', length: 32,
    bass:   [48, _, 55, _, 52, _, 55, _, 45, _, 52, _, 48, _, 55, _, 50, _, 57, _, 53, _, 60, _, 55, _, 50, _, 48, _, 55, _],
    melody: [72, _, 76, 79, _, 76, 72, _, 69, _, 72, 76, _, 72, 69, _, 74, _, 77, 81, _, 77, 74, _, 79, _, 76, 74, 72, _, _, _],
    chords: [[60, 64, 67], _, _, _, _, _, _, _, [57, 60, 64], _, _, _, _, _, _, _, [62, 65, 69], _, _, _, _, _, _, _, [55, 59, 62], _, _, _, _, _, _, _],
    drums:  ['k', _, 'h', _, 's', _, 'h', _, 'k', _, 'h', _, 's', _, 'h', 'h', 'k', _, 'h', _, 's', _, 'h', _, 'k', _, 'h', _, 's', _, 'h', 'h']
  },
  // バトル: 行進曲
  battle: {
    bpm: 132, lead: 'square', length: 32,
    bass:   [45, 45, _, 45, 52, _, 45, _, 48, 48, _, 48, 55, _, 48, _, 50, 50, _, 50, 57, _, 50, _, 52, 52, _, 52, 59, _, 52, 52],
    melody: [69, _, 72, _, 76, 72, 69, _, 72, _, 76, _, 79, 76, 72, _, 74, _, 77, _, 81, 77, 74, _, 76, 79, 83, _, 79, _, 76, _],
    chords: [[57, 60, 64], _, _, _, _, _, _, _, [60, 64, 67], _, _, _, _, _, _, _, [62, 65, 69], _, _, _, _, _, _, _, [64, 67, 71], _, _, _, _, _, _, _],
    drums:  ['k', _, 'h', 'h', 's', _, 'h', _, 'k', _, 'h', 'h', 's', _, 'h', 'h', 'k', _, 'h', 'h', 's', _, 'h', _, 'k', 'k', 'h', 'h', 's', _, 's', 's']
  },
  // ボス: 緊張感
  boss: {
    bpm: 150, lead: 'sawtooth', length: 32,
    bass:   [41, 41, _, 41, 41, _, 44, 41, 41, 41, _, 41, 41, _, 39, 41, 46, 46, _, 46, 46, _, 48, 46, 44, 44, _, 44, 44, _, 43, 41],
    melody: [65, _, 65, 68, _, 72, _, 71, 65, _, 65, 68, _, 72, 75, _, 70, _, 70, 73, _, 77, _, 75, 68, _, 68, 71, _, 67, 65, _],
    chords: [[53, 56, 60], _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, [58, 61, 65], _, _, _, _, _, _, _, [56, 59, 63], _, _, _, _, _, _, _],
    drums:  ['k', _, 'k', _, 's', _, 'h', 'h', 'k', _, 'k', _, 's', 's', 'h', _, 'k', _, 'k', _, 's', _, 'h', 'h', 'k', 'k', _, 'k', 's', 's', 's', 's']
  }
};

export const audio = new AudioSys();
