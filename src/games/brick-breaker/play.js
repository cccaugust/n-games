import { getCurrentPlayer } from '../../js/auth.js';
import { getRankings, saveScore } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';
import { initOverlay } from './overlay.js';
import { applyCanvasDpr, clamp, ensureStages, escapeHtml, fitStageToWrap, normalizeStage, refreshStageCacheFromSupabase, TILE, STAGE_COLS, STAGE_ROWS, tileParam, tileType } from './shared.js';

// =========================================================
// Play page (fullscreen) - Brick Breaker
// =========================================================

function qs(id) {
  return document.getElementById(id);
}

// --------------------
// Settings (Sound)
// --------------------
const SOUND_KEY = 'ngames.brickBreaker.sound.v1';
function loadSoundEnabled() {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    if (v == null) return true; // 初期はON（ただしユーザー操作でアンロックされるまで鳴らない）
    return v === '1';
  } catch {
    return true;
  }
}
function saveSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

// --------------------
// SFX (WebAudio, assetsなし)
// --------------------
function createSfx({ enabled = true, volume = 0.18 } = {}) {
  let ctx = null;
  let master = null;

  function ensure() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC({ latencyHint: 'interactive' });
      master = ctx.createGain();
      master.gain.value = clamp(volume, 0, 1);
      master.connect(ctx.destination);
    }
    return ctx;
  }

  async function unlock() {
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') {
      try { await c.resume(); } catch { /* ignore */ }
    }
  }

  function setEnabled(v) {
    enabled = !!v;
    if (master) master.gain.value = enabled ? clamp(volume, 0, 1) : 0;
  }
  function getEnabled() {
    return enabled;
  }

  function tone({
    type = 'sine',
    freq = 440,
    dur = 0.08,
    gain = 0.14,
    attack = 0.003,
    release = 0.06,
    detune = 0,
    freqTo = null
  } = {}) {
    const c = ensure();
    if (!c || !master || c.state !== 'running') return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, freq), t0);
    if (freqTo != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freqTo), t0 + Math.max(0.001, dur));
    }
    o.detune.setValueAtTime(detune, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + Math.max(0.001, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.01, dur + release));
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + release + 0.02);
  }

  function noise({ dur = 0.12, gain = 0.12, filterFreq = 900, q = 0.9 } = {}) {
    const c = ensure();
    if (!c || !master || c.state !== 'running') return;
    const len = Math.max(1, Math.floor(c.sampleRate * Math.max(0.02, dur)));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.85;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = Math.max(120, filterFreq);
    filt.Q.value = Math.max(0.1, q);
    const g = c.createGain();
    const t0 = c.currentTime;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.03, dur + 0.06));
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.12);
  }

  // High-level cues
  function paddle() {
    tone({ type: 'triangle', freq: 260, freqTo: 340, dur: 0.045, gain: 0.12, release: 0.06 });
  }
  function wall() {
    tone({ type: 'square', freq: 220, freqTo: 160, dur: 0.04, gain: 0.10, release: 0.05 });
  }
  function soft() {
    tone({ type: 'sine', freq: 170, freqTo: 130, dur: 0.05, gain: 0.10, release: 0.08 });
  }
  function hit() {
    tone({ type: 'triangle', freq: 420, freqTo: 380, dur: 0.035, gain: 0.10, release: 0.05 });
  }
  function toughHit() {
    tone({ type: 'square', freq: 520, dur: 0.03, gain: 0.08, release: 0.04 });
    tone({ type: 'triangle', freq: 780, dur: 0.02, gain: 0.05, release: 0.03, detune: -10 });
  }
  function breakNormal() {
    tone({ type: 'triangle', freq: 520, freqTo: 360, dur: 0.06, gain: 0.14, release: 0.07 });
  }
  function breakSplit() {
    tone({ type: 'sine', freq: 660, freqTo: 990, dur: 0.07, gain: 0.12, release: 0.10 });
    tone({ type: 'sine', freq: 990, freqTo: 1320, dur: 0.06, gain: 0.08, release: 0.08, detune: 6 });
  }
  function powerUp() {
    tone({ type: 'sine', freq: 520, freqTo: 1040, dur: 0.12, gain: 0.12, release: 0.12 });
  }
  function reverse() {
    tone({ type: 'sawtooth', freq: 520, freqTo: 260, dur: 0.11, gain: 0.10, release: 0.12 });
  }
  function portal() {
    tone({ type: 'sine', freq: 420, freqTo: 840, dur: 0.09, gain: 0.08, release: 0.12 });
    tone({ type: 'triangle', freq: 980, freqTo: 520, dur: 0.08, gain: 0.06, release: 0.10, detune: 14 });
  }
  function bomb() {
    noise({ dur: 0.10, gain: 0.14, filterFreq: 1200, q: 0.6 });
    tone({ type: 'sine', freq: 120, freqTo: 70, dur: 0.18, gain: 0.12, release: 0.18 });
  }

  return {
    unlock,
    setEnabled,
    getEnabled,
    paddle,
    wall,
    soft,
    hit,
    toughHit,
    breakNormal,
    breakSplit,
    powerUp,
    reverse,
    portal,
    bomb
  };
}

// --------------------
// Particles / Screen shake
// --------------------
const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
const particles = [];
const rings = [];
let shakeT = 0;
let shakePow = 0;

function fxAddShake(pow, time = 0.12) {
  shakePow = Math.max(shakePow, pow);
  shakeT = Math.max(shakeT, time);
}

function fxSpawnRing(x, y, color, { r0 = 6, r1 = 36, life = 0.22, width = 3 } = {}) {
  rings.push({ x, y, color, r0, r1, life, t: 0, width });
}

function fxSpawnBurst(x, y, color, {
  count = 12,
  speedMin = 80,
  speedMax = 260,
  lifeMin = 0.15,
  lifeMax = 0.45,
  sizeMin = 1.2,
  sizeMax = 3.2,
  gravity = 520,
  drag = 0.02,
  glow = false
} = {}) {
  const n = prefersReducedMotion ? Math.max(4, Math.floor(count * 0.55)) : count;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = speedMin + Math.random() * (speedMax - speedMin);
    const vx = Math.cos(a) * sp;
    const vy = Math.sin(a) * sp;
    const life = lifeMin + Math.random() * (lifeMax - lifeMin);
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);
    particles.push({
      x,
      y,
      vx,
      vy,
      g: gravity,
      drag,
      life,
      t: 0,
      size,
      color,
      glow
    });
  }
}

function fxUpdate(dt) {
  if (shakeT > 0) {
    shakeT = Math.max(0, shakeT - dt);
    if (shakeT <= 0) shakePow = 0;
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.life) {
      particles.splice(i, 1);
      continue;
    }
    p.vx *= (1 - p.drag);
    p.vy *= (1 - p.drag);
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.t += dt;
    if (r.t >= r.life) {
      rings.splice(i, 1);
    }
  }

  // 念のため上限（長時間プレイの暴走防止）
  const MAX_PARTICLES = 900;
  if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
  const MAX_RINGS = 30;
  if (rings.length > MAX_RINGS) rings.splice(0, rings.length - MAX_RINGS);
}

function fxShakeOffset() {
  if (shakeT <= 0 || shakePow <= 0) return { x: 0, y: 0 };
  const t = shakeT;
  const k = clamp(t / 0.12, 0, 1);
  const p = shakePow * k;
  return {
    x: (Math.random() * 2 - 1) * p,
    y: (Math.random() * 2 - 1) * p
  };
}

function fxDraw(ctx2d) {
  // rings
  for (const r of rings) {
    const tt = clamp(r.t / Math.max(0.0001, r.life), 0, 1);
    const rr = r.r0 + (r.r1 - r.r0) * tt;
    const a = (1 - tt) * 0.75;
    ctx2d.save();
    ctx2d.globalAlpha = a;
    ctx2d.strokeStyle = r.color;
    ctx2d.lineWidth = r.width;
    ctx2d.beginPath();
    ctx2d.arc(r.x, r.y, rr, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.restore();
  }

  // particles
  // glow は lighter で気持ちよく
  ctx2d.save();
  for (const p of particles) {
    const tt = clamp(p.t / Math.max(0.0001, p.life), 0, 1);
    const a = (1 - tt);
    ctx2d.globalAlpha = a;
    if (p.glow) ctx2d.globalCompositeOperation = 'lighter';
    else ctx2d.globalCompositeOperation = 'source-over';
    ctx2d.fillStyle = p.color;
    ctx2d.beginPath();
    ctx2d.arc(p.x, p.y, Math.max(0.6, p.size * (0.9 + (1 - tt) * 0.35)), 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.restore();
}

function getStageFromUrl() {
  const sp = new URLSearchParams(location.search);
  const s = sp.get('stage');
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

// --------------------
// DOM
// --------------------
const canvas = qs('gameCanvas');
const ctx = canvas.getContext('2d');
const wrap = canvas?.closest('.bb-canvas-wrap');
const stageBox = qs('gameStage');
const stageLabel = qs('stageLabel');

const scoreEl = qs('score');
const livesEl = qs('lives');
const ballsEl = qs('balls');
const continuesEl = qs('continues');

const soundBtn = qs('soundBtn');
const pauseBtn = qs('pauseBtn');
const resetBtn = qs('resetBtn');

const { showOverlay, closeOverlay } = initOverlay();

const sfx = createSfx({ enabled: loadSoundEnabled() });
function syncSoundBtn() {
  if (!soundBtn) return;
  const on = sfx.getEnabled();
  soundBtn.textContent = `音: ${on ? 'ON' : 'OFF'}`;
  soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
}
syncSoundBtn();
soundBtn?.addEventListener('click', async () => {
  const next = !sfx.getEnabled();
  sfx.setEnabled(next);
  saveSoundEnabled(next);
  syncSoundBtn();
  if (next) await sfx.unlock();
});

// --------------------
// Canvas Resize (DPR対応)
// --------------------
let viewW = 600;
let viewH = 500;

function getDesignSize() {
  // HTMLの width/height（設計比率）を基準に、画面に収まる最大サイズでフィットさせる
  const dw = Number(canvas?.getAttribute('width')) || 600;
  const dh = Number(canvas?.getAttribute('height')) || 500;
  return { dw, dh };
}

function resizeGameCanvas() {
  const { dw, dh } = getDesignSize();
  if (wrap && stageBox) {
    fitStageToWrap({ wrapEl: wrap, stageEl: stageBox, designW: dw, designH: dh });
  }
  const { w, h } = applyCanvasDpr(canvas, ctx);
  viewW = w;
  viewH = h;
  layoutPaddleToBottom();
}

window.addEventListener('resize', () => {
  resizeGameCanvas();
  drawGame();
});

// --------------------
// Game (Play)
// --------------------
const paddle = {
  x: 0,
  y: 0,
  w: 100,
  h: 14,
  color: '#74b9ff'
};

// 🙃 さかさ操作（残り秒）
let reverseTimeLeft = 0;
// 🐌/⚡ のろのろ・はやはや（残り秒）
let speedMode = null; // 'slow' | 'fast' | null
let speedTimeLeft = 0;
let speedFactor = 1;
// 🌈 無敵（残り秒）
let invincibleTimeLeft = 0;
let invincibleSpawnCd = 0;

function currentBallSpeed() {
  return ballSpeed() * speedFactor;
}

function applySpeedFactor(nextFactor) {
  const f = clamp(Number(nextFactor) || 1, 0.15, 3.0);
  if (Math.abs(f - speedFactor) < 1e-6) return;
  const k = f / speedFactor;
  for (const b of balls) {
    // くっつき中は速度を持たないので無視
    if ((b.stuckTimeLeft || 0) > 0) continue;
    b.vx *= k;
    b.vy *= k;
  }
  speedFactor = f;
}

function speedBallTint() {
  if (speedMode === 'slow') return '#74f8ff'; // 青っぽく
  if (speedMode === 'fast') return '#ff5252'; // 赤く
  return null;
}

function syncBallColor(ballObj) {
  if ((ballObj.stuckTimeLeft || 0) > 0) {
    ballObj.color = '#b388ff'; // ベタベタ中
    return;
  }
  const tint = speedBallTint();
  ballObj.color = tint || ballObj.baseColor || '#ffffff';
}

function layoutPaddleToBottom() {
  paddle.w = clamp(viewW * 0.18, 70, 130);
  paddle.h = clamp(viewH * 0.028, 12, 18);
  paddle.y = viewH - clamp(viewH * 0.08, 36, 52);
  paddle.x = clamp(paddle.x, 0, Math.max(0, viewW - paddle.w));
}

function makeBall(x, y, speed, angleRad) {
  const r = clamp(viewW * 0.013, 6, 9);
  return {
    x,
    y,
    r,
    vx: Math.cos(angleRad) * speed,
    vy: Math.sin(angleRad) * speed,
    color: '#ffffff',
    baseColor: '#ffffff',
    portalCd: 0, // 🌀 連続ワープ防止（秒）
    bigTimeLeft: 0,
    baseR: r,
    // 🩹 ベタベタ（ブロックにくっつく）
    stuckTimeLeft: 0,
    stuckX: 0,
    stuckY: 0,
    stuckReleaseSpeed: 0
  };
}

function getBrickMetrics() {
  const pad = clamp(viewW * 0.02, 8, 16);
  const gap = clamp(viewW * 0.012, 5, 12);
  const top = clamp(viewH * 0.12, 54, 74);
  const brickH = clamp(viewH * 0.045, 16, 24);
  const areaW = viewW - pad * 2;
  const brickW = (areaW - gap * (STAGE_COLS + 1)) / STAGE_COLS;
  return { pad, gap, top, brickW, brickH };
}

function brickRect(brick) {
  const { pad, gap, top, brickW, brickH } = getBrickMetrics();
  const x = pad + gap + brick.col * (brickW + gap);
  const y = top + brick.row * (brickH + gap);
  return { x, y, w: brickW, h: brickH };
}

function gridIndex(x, y) {
  return y * STAGE_COLS + x;
}

function makeBricksFromStage(stage) {
  const s = normalizeStage(stage);
  const bricks = [];
  for (let row = 0; row < STAGE_ROWS; row++) {
    for (let col = 0; col < STAGE_COLS; col++) {
      const v = s.grid[gridIndex(col, row)];
      const t = tileType(v);
      const p = tileParam(v);
      if (t === TILE.EMPTY) continue;
      const hp =
        t === TILE.TOUGH ? (p || 3)
          : (t === TILE.WALL || t === TILE.PORTAL ? Number.POSITIVE_INFINITY : 1);
      bricks.push({
        col,
        row,
        type: t,
        param: p,
        hp,
        alive: true,
        flash: 0
      });
    }
  }
  return bricks;
}

function circleRectHit(ballObj, rect) {
  const cx = clamp(ballObj.x, rect.x, rect.x + rect.w);
  const cy = clamp(ballObj.y, rect.y, rect.y + rect.h);
  const dx = ballObj.x - cx;
  const dy = ballObj.y - cy;
  return (dx * dx + dy * dy) <= (ballObj.r * ballObj.r);
}

function brickBaseColor(brick) {
  if (brick.type === TILE.SPLIT) return '#00cec9';
  if (brick.type === TILE.TOUGH) return '#a29bfe';
  if (brick.type === TILE.SOFT) return '#ffeaa7';
  if (brick.type === TILE.WALL) return '#636e72';
  if (brick.type === TILE.BOMB) return '#ff7675';
  if (brick.type === TILE.PORTAL) return '#74f8ff';
  if (brick.type === TILE.REVERSE) return '#55efc4';
  if (brick.type === TILE.BIG) return '#81ecec';
  if (brick.type === TILE.ONE_WAY) return '#fab1a0';
  if (brick.type === TILE.SLOW) return '#74f8ff';
  if (brick.type === TILE.FAST) return '#ff5252';
  if (brick.type === TILE.STICKY) return '#b388ff';
  if (brick.type === TILE.INVINCIBLE) return '#ffe66d';
  return '#74b9ff';
}

function brickPoints(brick) {
  if (brick.type === TILE.SPLIT) return 25;
  if (brick.type === TILE.TOUGH) return 35;
  if (brick.type === TILE.BOMB) return 20;
  if (brick.type === TILE.REVERSE) return 15;
  if (brick.type === TILE.BIG) return 18;
  if (brick.type === TILE.ONE_WAY) return 8;
  if (brick.type === TILE.SLOW) return 15;
  if (brick.type === TILE.FAST) return 15;
  if (brick.type === TILE.STICKY) return 15;
  if (brick.type === TILE.INVINCIBLE) return 18;
  if (brick.type === TILE.WALL) return 0;
  if (brick.type === TILE.PORTAL) return 0;
  return 10;
}

let isRunning = false;
let isPaused = false;
let lastT = 0;

let score = 0;
let lives = 3;
let continueCount = 0;

let playingStageName = null;
let bricks = [];
let balls = [];

function resetRunStats() {
  score = 0;
  lives = 3;
  continueCount = 0;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
  ballsEl.textContent = String(balls.length);
  continuesEl.textContent = String(continueCount);
}

function setPaused(paused) {
  isPaused = paused;
  pauseBtn.textContent = paused ? '再開' : '一時停止';
}

function stopGameLoop() {
  isRunning = false;
  setPaused(false);
}

function ballSpeed() {
  return clamp(viewW * 0.75, 420, 760); // px/s
}

function resetPaddleAndBall({ keepBricks = true } = {}) {
  layoutPaddleToBottom();
  paddle.x = viewW / 2 - paddle.w / 2;
  balls = [];
  const speed = currentBallSpeed();
  const angle = (-Math.PI / 2) + (Math.random() * 0.55 - 0.275);
  balls.push(makeBall(viewW / 2, paddle.y - 18, speed, angle));
  if (!keepBricks) {
    const list = ensureStages();
    const s = list.find(x => x.name === playingStageName) ?? list[0];
    bricks = makeBricksFromStage(s);
  }
  updateHud();
}

function setStageLabel(name) {
  if (stageLabel) stageLabel.textContent = `ステージ：${name || '—'}`;
}

function startStage(stageName, { resetStats = true } = {}) {
  const list = ensureStages();
  const stage = list.find(x => x.name === stageName) ?? list[0];
  if (!stage) return;

  playingStageName = stage.name;
  setStageLabel(stage.name);

  if (resetStats) resetRunStats();

  // 効果をリセット
  reverseTimeLeft = 0;
  speedMode = null;
  speedTimeLeft = 0;
  applySpeedFactor(1);
  invincibleTimeLeft = 0;
  invincibleSpawnCd = 0;

  bricks = makeBricksFromStage(stage);
  resetPaddleAndBall({ keepBricks: true });
  resizeGameCanvas();
  setPaused(false);
  isRunning = true;
  lastT = performance.now();
  requestAnimationFrame(loop);
}

function nextStageName() {
  const list = ensureStages();
  const names = list.map(s => s.name);
  const idx = Math.max(0, names.indexOf(playingStageName));
  return names[(idx + 1) % names.length] ?? names[0];
}

function spawnSplitBalls(fromBall, atX, atY, { desiredTotal = 5 } = {}) {
  // ぶんれつ: 1つのボールが「合計Nこ」になる（= +N-1）
  const MAX_BALLS = 15;
  if (balls.length >= MAX_BALLS) return;

  const speed = Math.max(currentBallSpeed() * 0.95, Math.hypot(fromBall.vx, fromBall.vy));
  const base = Math.atan2(fromBall.vy, fromBall.vx);

  // 最大5方向にばらける（全部ちがう角度）
  const dtot = clamp(Number(desiredTotal) || 5, 2, 50);
  const canAdd = Math.max(0, Math.min(dtot - 1, MAX_BALLS - balls.length));
  const total = 1 + canAdd;
  if (total <= 1) return;

  const spread = 1.6; // rad（左右に約±0.8）
  const offsets = Array.from({ length: total }, (_, i) => {
    if (total === 1) return 0;
    const t = i / (total - 1);
    return (-spread / 2) + spread * t;
  });
  const mid = Math.floor(total / 2);

  // 元のボールも方向を変えて「分裂した感」を出す
  {
    const a = base + offsets[mid];
    fromBall.x = atX;
    fromBall.y = atY;
    fromBall.vx = Math.cos(a) * speed;
    fromBall.vy = Math.sin(a) * speed;
  }

  for (let i = 0; i < offsets.length; i++) {
    if (i === mid) continue;
    if (balls.length >= MAX_BALLS) break;
    const jitter = (Math.random() * 0.06) - 0.03;
    const a = base + offsets[i] + jitter;
    const b = makeBall(atX, atY, speed, a);
    // 重なり/連続ヒットを減らすため、少しだけ前に出す
    b.x += Math.cos(a) * (b.r * 1.2);
    b.y += Math.sin(a) * (b.r * 1.2);
    balls.push(b);
  }
}

function onAllBallsLost() {
  lives = Math.max(0, lives - 1);
  updateHud();

  stopGameLoop();

  if (lives > 0) {
    showOverlay(
      'ミス！',
      `のこりLIFE: ${lives}。いまの状態からつづけられるよ。`,
      `
        <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
          <button class="btn-primary" id="ovContinue">つづける</button>
          <button class="bb-tool-btn" id="ovToSelect">ステージ選択へ</button>
        </div>
      `,
      { closable: false }
    );
    qs('ovContinue').onclick = () => {
      closeOverlay();
      resetPaddleAndBall({ keepBricks: true });
      isRunning = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    };
    qs('ovToSelect').onclick = () => {
      closeOverlay();
      location.href = './stage-select.html';
    };
    return;
  }

  showOverlay(
    'ゲームオーバー…',
    `SCORE: ${score}（CONTINUE: ${continueCount}）`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovRevive">コンティニュー</button>
        <button class="bb-tool-btn" id="ovFinish">おしまい（ランキング）</button>
      </div>
    `,
    { closable: false }
  );
  qs('ovRevive').onclick = () => {
    closeOverlay();
    continueCount += 1;
    lives = 1;
    updateHud();
    resetPaddleAndBall({ keepBricks: true });
    isRunning = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  };
  qs('ovFinish').onclick = () => {
    void finishRunAndShowRanking();
  };
}

async function finishRunAndShowRanking() {
  stopGameLoop();
  closeOverlay();

  const player = getCurrentPlayer();
  if (player?.id) {
    await saveScore('brick-breaker', player.id, score);
  }

  const rankings = await getRankings('brick-breaker');
  const rankingHtml = rankings.map((r, i) => `
    <div style="display: flex; justify-content: space-between; width: 100%; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,0.15);">
      <div style="display: flex; align-items: center; gap: 8px; min-width:0;">
        <span style="font-weight: 900; width: 26px;">${i + 1}.</span>
        <span style="display:inline-flex; align-items:center;">${avatarToHtml(r.avatar || '👤', { size: 24, className: 'ng-avatar', alt: '' })}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; max-width: 160px; white-space: nowrap;">${escapeHtml(r.name || '')}</span>
      </div>
      <span style="font-weight: 900;">${escapeHtml(r.score || '')}</span>
    </div>
  `).join('');

  showOverlay(
    'おしまい！',
    `SCORE: ${score}`,
    `
      <div style="background: rgba(255,255,255,0.12); padding: 14px; border-radius: 14px; margin: 14px 0; width: 100%; max-width: 440px; text-align: left;">
        <h3 style="text-align: center; margin-bottom: 10px; color: white;">🏆 ランキング</h3>
        ${rankingHtml || '<div style="opacity:0.9; text-align:center;">まだランキングがないよ</div>'}
      </div>
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap;">
        <button class="btn-primary" id="ovRestart">もういっかい</button>
        <a href="./stage-select.html" style="color: white; display:inline-block; padding: 12px 14px;">&larr; ステージ選択</a>
      </div>
    `,
    { closable: false }
  );
  qs('ovRestart').onclick = () => {
    closeOverlay();
    startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
  };
}

function stageCleared() {
  stopGameLoop();
  showOverlay(
    'ステージクリア！',
    `「${playingStageName}」 クリア！`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovNext">つぎへ</button>
        <button class="bb-tool-btn" id="ovSelect">ステージ選択へ</button>
      </div>
    `,
    { closable: false }
  );
  qs('ovNext').onclick = () => {
    closeOverlay();
    startStage(nextStageName(), { resetStats: false });
  };
  qs('ovSelect').onclick = () => {
    closeOverlay();
    location.href = './stage-select.html';
  };
}

function updateGame(dt) {
  if (isPaused) return;
  fxUpdate(dt);
  reverseTimeLeft = Math.max(0, reverseTimeLeft - dt);
  invincibleTimeLeft = Math.max(0, invincibleTimeLeft - dt);
  invincibleSpawnCd = Math.max(0, invincibleSpawnCd - dt);

  if (speedTimeLeft > 0) {
    speedTimeLeft = Math.max(0, speedTimeLeft - dt);
    if (speedTimeLeft <= 0) {
      speedMode = null;
      applySpeedFactor(1);
    }
  }

  // brick flash decay
  for (const br of bricks) {
    if ((br.flash || 0) > 0) br.flash = Math.max(0, (br.flash || 0) - dt);
  }

  const aliveBricks = bricks.filter(b => b.alive);

  const portals = aliveBricks.filter(b => b.type === TILE.PORTAL);
  function portalCenter(p) {
    const rect = brickRect(p);
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2, rect };
  }
  function tryWarp(ballObj, hitPortal) {
    if (portals.length < 2) return false;
    if ((ballObj.portalCd || 0) > 0) return false;
    const others = portals.filter(p => !(p.col === hitPortal.col && p.row === hitPortal.row));
    if (others.length === 0) return false;
    const target = others[Math.floor(Math.random() * others.length)];
    const { x, y } = portalCenter(target);
    const src = portalCenter(hitPortal);

    // 少しだけ前に出して「はまり」を防ぐ
    const vlen = Math.max(60, Math.hypot(ballObj.vx, ballObj.vy));
    const nx = ballObj.vx / vlen;
    const ny = ballObj.vy / vlen;
    ballObj.x = x + nx * (ballObj.r * 2.2);
    ballObj.y = y + ny * (ballObj.r * 2.2);

    // ちょいシュールに：角度を少しだけランダム回転
    const a = Math.atan2(ballObj.vy, ballObj.vx) + ((Math.random() * 0.6) - 0.3);
    ballObj.vx = Math.cos(a) * vlen;
    ballObj.vy = Math.sin(a) * vlen;

    ballObj.portalCd = 0.35;

    // FX
    sfx.portal();
    fxSpawnRing(src.x, src.y, 'rgba(116,248,255,0.95)', { r0: 10, r1: 44, life: 0.22, width: 3 });
    fxSpawnRing(x, y, 'rgba(116,248,255,0.95)', { r0: 10, r1: 44, life: 0.22, width: 3 });
    fxSpawnBurst(src.x, src.y, 'rgba(116,248,255,0.95)', { count: 14, speedMin: 120, speedMax: 320, lifeMin: 0.18, lifeMax: 0.45, sizeMin: 1.3, sizeMax: 3.0, gravity: 320, glow: true });
    fxSpawnBurst(x, y, 'rgba(116,248,255,0.95)', { count: 14, speedMin: 120, speedMax: 320, lifeMin: 0.18, lifeMax: 0.45, sizeMin: 1.3, sizeMax: 3.0, gravity: 320, glow: true });
    return true;
  }

  function brickFxColor(brick) {
    return brickBaseColor(brick);
  }
  function hitPointOnRect(ballObj, rect) {
    // ボール中心を矩形にクランプ（当たったっぽい点）
    const hx = clamp(ballObj.x, rect.x, rect.x + rect.w);
    const hy = clamp(ballObj.y, rect.y, rect.y + rect.h);
    return { x: hx, y: hy };
  }
  function fxHitBrick(brick, rect, ballObj, { strong = false } = {}) {
    const c = brickFxColor(brick);
    const hp = hitPointOnRect(ballObj, rect);
    brick.flash = Math.max(brick.flash || 0, strong ? 0.14 : 0.10);

    if (brick.type === TILE.WALL) {
      sfx.wall();
      fxSpawnBurst(hp.x, hp.y, 'rgba(255,255,255,0.95)', { count: 8, speedMin: 80, speedMax: 220, lifeMin: 0.10, lifeMax: 0.25, sizeMin: 1.0, sizeMax: 2.4, gravity: 620, glow: true });
      return;
    }

    if (brick.type === TILE.SOFT) {
      sfx.soft();
      fxSpawnBurst(hp.x, hp.y, 'rgba(255,234,167,0.95)', { count: 10, speedMin: 60, speedMax: 160, lifeMin: 0.12, lifeMax: 0.28, sizeMin: 1.0, sizeMax: 2.6, gravity: 760, drag: 0.04 });
      return;
    }

    if (brick.type === TILE.TOUGH) {
      sfx.toughHit();
      fxSpawnBurst(hp.x, hp.y, 'rgba(255,255,255,0.95)', { count: strong ? 16 : 12, speedMin: 90, speedMax: 260, lifeMin: 0.10, lifeMax: 0.26, sizeMin: 1.0, sizeMax: 2.6, gravity: 720, glow: true });
      fxSpawnBurst(hp.x, hp.y, c, { count: 6, speedMin: 60, speedMax: 160, lifeMin: 0.12, lifeMax: 0.28, sizeMin: 1.0, sizeMax: 2.2, gravity: 740 });
      return;
    }

    // other breakables (normal/split/bomb/reverse/big/oneway)
    sfx.hit();
    fxSpawnBurst(hp.x, hp.y, c, { count: strong ? 14 : 10, speedMin: 80, speedMax: 220, lifeMin: 0.12, lifeMax: 0.30, sizeMin: 1.1, sizeMax: 2.8, gravity: 640, glow: brick.type === TILE.SPLIT });
  }

  function fxBreakBrick(brick, rect, { byBomb = false } = {}) {
    const c = brickFxColor(brick);
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;

    if (brick.type === TILE.SPLIT) {
      sfx.breakSplit();
      fxSpawnRing(cx, cy, 'rgba(255,255,255,0.95)', { r0: 8, r1: 46, life: 0.20, width: 3 });
      fxSpawnBurst(cx, cy, 'rgba(255,255,255,0.95)', { count: 18, speedMin: 140, speedMax: 420, lifeMin: 0.14, lifeMax: 0.42, sizeMin: 1.1, sizeMax: 3.2, gravity: 420, glow: true });
      fxSpawnBurst(cx, cy, c, { count: 14, speedMin: 120, speedMax: 320, lifeMin: 0.16, lifeMax: 0.45, sizeMin: 1.1, sizeMax: 3.0, gravity: 520 });
      return;
    }

    if (brick.type === TILE.BOMB) {
      // 爆発は別でまとめて出す。ここでは破片だけ。
      fxSpawnBurst(cx, cy, c, { count: 14, speedMin: 120, speedMax: 360, lifeMin: 0.14, lifeMax: 0.42, sizeMin: 1.2, sizeMax: 3.4, gravity: 620, glow: true });
      return;
    }

    if (brick.type === TILE.REVERSE) {
      sfx.reverse();
      fxSpawnRing(cx, cy, 'rgba(85,239,196,0.95)', { r0: 10, r1: 54, life: 0.26, width: 3 });
      fxSpawnBurst(cx, cy, 'rgba(85,239,196,0.95)', { count: 18, speedMin: 120, speedMax: 330, lifeMin: 0.14, lifeMax: 0.45, sizeMin: 1.2, sizeMax: 3.0, gravity: 520, glow: true });
      return;
    }

    if (brick.type === TILE.BIG) {
      sfx.powerUp();
      fxSpawnRing(cx, cy, 'rgba(129,236,236,0.95)', { r0: 10, r1: 58, life: 0.26, width: 3 });
      fxSpawnBurst(cx, cy, 'rgba(129,236,236,0.95)', { count: 18, speedMin: 120, speedMax: 340, lifeMin: 0.14, lifeMax: 0.45, sizeMin: 1.2, sizeMax: 3.2, gravity: 480, glow: true });
      return;
    }

    if (brick.type === TILE.SLOW) {
      sfx.powerUp();
      fxSpawnRing(cx, cy, 'rgba(116,248,255,0.95)', { r0: 12, r1: 70, life: 0.30, width: 3 });
      fxSpawnBurst(cx, cy, 'rgba(116,248,255,0.95)', { count: 22, speedMin: 80, speedMax: 260, lifeMin: 0.18, lifeMax: 0.55, sizeMin: 1.2, sizeMax: 3.4, gravity: 180, glow: true });
      return;
    }

    if (brick.type === TILE.FAST) {
      sfx.powerUp();
      fxSpawnRing(cx, cy, 'rgba(255,82,82,0.95)', { r0: 12, r1: 70, life: 0.30, width: 3 });
      fxSpawnBurst(cx, cy, 'rgba(255,82,82,0.95)', { count: 22, speedMin: 160, speedMax: 520, lifeMin: 0.12, lifeMax: 0.40, sizeMin: 1.1, sizeMax: 3.2, gravity: 420, glow: true });
      return;
    }

    if (brick.type === TILE.STICKY) {
      // ベチャッ
      sfx.powerUp();
      fxSpawnRing(cx, cy, 'rgba(179,136,255,0.95)', { r0: 10, r1: 64, life: 0.28, width: 4 });
      fxSpawnBurst(cx, cy, 'rgba(179,136,255,0.95)', { count: 20, speedMin: 60, speedMax: 200, lifeMin: 0.18, lifeMax: 0.70, sizeMin: 1.6, sizeMax: 5.2, gravity: 820, drag: 0.01, glow: true });
      return;
    }

    if (brick.type === TILE.INVINCIBLE) {
      sfx.powerUp();
      fxSpawnRing(cx, cy, 'rgba(255,230,109,0.95)', { r0: 10, r1: 86, life: 0.34, width: 4 });
      fxSpawnBurst(cx, cy, 'rgba(255,255,255,0.95)', { count: 22, speedMin: 140, speedMax: 420, lifeMin: 0.16, lifeMax: 0.55, sizeMin: 1.1, sizeMax: 3.4, gravity: 420, glow: true });
      return;
    }

    if (brick.type === TILE.ONE_WAY) {
      // 片方向は軽め（貫通破壊の爽快感）
      sfx.breakNormal();
      fxSpawnBurst(cx, cy, c, { count: 12, speedMin: 110, speedMax: 280, lifeMin: 0.14, lifeMax: 0.38, sizeMin: 1.1, sizeMax: 3.0, gravity: 560 });
      return;
    }

    if (brick.type === TILE.TOUGH) {
      // toughの「割れた！」感
      sfx.breakNormal();
      fxSpawnRing(cx, cy, 'rgba(255,255,255,0.9)', { r0: 10, r1: 62, life: 0.22, width: 3 });
      fxSpawnBurst(cx, cy, 'rgba(255,255,255,0.95)', { count: 20, speedMin: 140, speedMax: 460, lifeMin: 0.12, lifeMax: 0.40, sizeMin: 1.2, sizeMax: 3.4, gravity: 520, glow: true });
      fxSpawnBurst(cx, cy, c, { count: 12, speedMin: 120, speedMax: 300, lifeMin: 0.14, lifeMax: 0.42, sizeMin: 1.1, sizeMax: 3.0, gravity: 620 });
      if (!byBomb) fxAddShake(4, 0.10);
      return;
    }

    // normal / soft etc
    if (brick.type === TILE.SOFT) sfx.soft();
    else sfx.breakNormal();
    fxSpawnBurst(cx, cy, c, { count: 14, speedMin: 120, speedMax: 320, lifeMin: 0.14, lifeMax: 0.38, sizeMin: 1.1, sizeMax: 3.2, gravity: 660 });
  }

  function fxBombExplosion(centerRect) {
    const cx = centerRect.x + centerRect.w / 2;
    const cy = centerRect.y + centerRect.h / 2;
    sfx.bomb();
    fxAddShake(7, 0.18);
    fxSpawnRing(cx, cy, 'rgba(255,118,117,0.95)', { r0: 14, r1: 120, life: 0.30, width: 4 });
    fxSpawnBurst(cx, cy, 'rgba(255,255,255,0.95)', { count: 26, speedMin: 220, speedMax: 620, lifeMin: 0.12, lifeMax: 0.45, sizeMin: 1.2, sizeMax: 3.8, gravity: 420, glow: true });
    fxSpawnBurst(cx, cy, 'rgba(255,118,117,0.95)', { count: 22, speedMin: 180, speedMax: 520, lifeMin: 0.14, lifeMax: 0.55, sizeMin: 1.2, sizeMax: 3.6, gravity: 520 });
    fxSpawnBurst(cx, cy, 'rgba(30,30,30,0.55)', { count: 18, speedMin: 90, speedMax: 240, lifeMin: 0.30, lifeMax: 0.90, sizeMin: 2.2, sizeMax: 6.5, gravity: 120, drag: 0.01 });
  }

  function killBrick(brick, fromBall) {
    if (!brick.alive) return false;
    if (brick.type === TILE.WALL || brick.type === TILE.PORTAL) return false;
    const rect = brickRect(brick);
    brick.hp -= 1;
    if (brick.hp <= 0) {
      brick.alive = false;
      score += brickPoints(brick);
      fxBreakBrick(brick, rect);
      if (brick.type === TILE.SPLIT) {
        spawnSplitBalls(fromBall, rect.x + rect.w / 2, rect.y + rect.h / 2, { desiredTotal: brick.param || 5 });
      }
      if (brick.type === TILE.REVERSE) {
        reverseTimeLeft = Math.max(reverseTimeLeft, 6.0);
      }
      if (brick.type === TILE.SLOW) {
        speedMode = 'slow';
        speedTimeLeft = Math.max(speedTimeLeft, 5.0);
        applySpeedFactor(0.55);
      }
      if (brick.type === TILE.FAST) {
        speedMode = 'fast';
        speedTimeLeft = Math.max(speedTimeLeft, 5.0);
        applySpeedFactor(1.75);
      }
      if (brick.type === TILE.INVINCIBLE) {
        invincibleTimeLeft = Math.max(invincibleTimeLeft, 5.0);
        invincibleSpawnCd = 0;
      }
      return true;
    }
    // かたいブロックは当てるだけでも少し加点
    if (brick.type === TILE.TOUGH) score += 2;
    fxHitBrick(brick, rect, fromBall, { strong: false });
    return true;
  }

  function explodeAt(centerBrick, fromBall) {
    // 3x3（周りも巻きこむ）。かべ/ポータルは無視。
    let spawnedFromSplit = false;
    const destroyed = [];
    for (const b of aliveBricks) {
      if (!b.alive) continue;
      if (b.type === TILE.WALL || b.type === TILE.PORTAL) continue;
      const dx = Math.abs(b.col - centerBrick.col);
      const dy = Math.abs(b.row - centerBrick.row);
      if (dx > 1 || dy > 1) continue;

      // tough は爆風で少し強めに削る（2ダメ）
      if (b.type === TILE.TOUGH) {
        b.hp -= 2;
      } else {
        b.hp -= 99;
      }
      if (b.hp <= 0) {
        b.alive = false;
        score += brickPoints(b);
        destroyed.push(b);
        if (!spawnedFromSplit && b.type === TILE.SPLIT) {
          const rect = brickRect(b);
          spawnSplitBalls(fromBall, rect.x + rect.w / 2, rect.y + rect.h / 2, { desiredTotal: b.param || 5 });
          spawnedFromSplit = true;
        }
        if (b.type === TILE.REVERSE) reverseTimeLeft = Math.max(reverseTimeLeft, 6.0);
      }
    }

    // FX（巻きこみ破壊）
    for (const d of destroyed) {
      const r = brickRect(d);
      fxBreakBrick(d, r, { byBomb: true });
    }
  }

  const nextBalls = [];
  for (const b of balls) {
    syncBallColor(b);
    if ((b.portalCd || 0) > 0) b.portalCd = Math.max(0, b.portalCd - dt);

    // 🩹 ベタベタ中：その場に固定
    if ((b.stuckTimeLeft || 0) > 0) {
      b.stuckTimeLeft = Math.max(0, b.stuckTimeLeft - dt);
      b.x = b.stuckX;
      b.y = b.stuckY;
      if (b.stuckTimeLeft <= 0) {
        // ぼとっと落ちる
        const drop = Math.max(120, Math.min(currentBallSpeed() * 0.55, (b.stuckReleaseSpeed || currentBallSpeed()) * 0.60));
        b.vx = 0;
        b.vy = Math.abs(drop);
        fxSpawnBurst(b.x, b.y, 'rgba(179,136,255,0.95)', { count: 10, speedMin: 30, speedMax: 130, lifeMin: 0.14, lifeMax: 0.50, sizeMin: 1.6, sizeMax: 4.8, gravity: 980, drag: 0.01, glow: true });
      }
      // 固定中は落下判定などをしない
      nextBalls.push(b);
      continue;
    }

    if ((b.bigTimeLeft || 0) > 0) {
      b.bigTimeLeft = Math.max(0, b.bigTimeLeft - dt);
      const targetR = (b.baseR || b.r) * 1.9;
      b.r = clamp(targetR, 8, 18);
      if (b.bigTimeLeft <= 0) {
        b.r = b.baseR || b.r;
      }
    } else {
      b.baseR = b.baseR || b.r;
    }

    const prevX = b.x;
    const prevY = b.y;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Wall
    if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x + b.r > viewW) { b.x = viewW - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y - b.r < 0) { b.y = b.r; b.vy = Math.abs(b.vy); }

    // Paddle
    const hitPaddle =
      b.vy > 0 &&
      b.y + b.r >= paddle.y &&
      b.y - b.r <= paddle.y + paddle.h &&
      b.x >= paddle.x - 2 &&
      b.x <= paddle.x + paddle.w + 2;

    if (hitPaddle) {
      b.y = paddle.y - b.r;
      const speed = Math.max(currentBallSpeed() * 0.85, Math.hypot(b.vx, b.vy));
      const center = paddle.x + paddle.w / 2;
      const rel = clamp((b.x - center) / (paddle.w / 2), -1, 1);
      const vx = rel * speed * 0.92;
      const vy = -Math.sqrt(Math.max(60, speed * speed - vx * vx));
      b.vx = vx;
      b.vy = vy;

      // FX
      sfx.paddle();
      fxSpawnBurst(b.x, paddle.y, 'rgba(255,255,255,0.95)', { count: 8, speedMin: 80, speedMax: 260, lifeMin: 0.10, lifeMax: 0.22, sizeMin: 1.0, sizeMax: 2.6, gravity: 720, glow: true });
    }

    // Bricks
    let hitSomething = false;
    for (const brick of aliveBricks) {
      if (!brick.alive) continue;
      const rect = brickRect(brick);
      if (!circleRectHit(b, rect)) continue;

      const isSoft = brick.type === TILE.SOFT;
      const isWall = brick.type === TILE.WALL;
      const isPortal = brick.type === TILE.PORTAL;
      const isOneWay = brick.type === TILE.ONE_WAY;
      const isBigBall = (b.bigTimeLeft || 0) > 0;

      // Reflect (ざっくり) ※やわらかは反射しない
      if (!isSoft && !isPortal && !isOneWay) {
        const cameFromTop = prevY + b.r <= rect.y && b.y + b.r > rect.y;
        const cameFromBottom = prevY - b.r >= rect.y + rect.h && b.y - b.r < rect.y + rect.h;
        const cameFromLeft = prevX + b.r <= rect.x && b.x + b.r > rect.x;
        const cameFromRight = prevX - b.r >= rect.x + rect.w && b.x - b.r < rect.x + rect.w;

        if (cameFromTop) b.vy = -Math.abs(b.vy);
        else if (cameFromBottom) b.vy = Math.abs(b.vy);
        else if (cameFromLeft) b.vx = -Math.abs(b.vx);
        else if (cameFromRight) b.vx = Math.abs(b.vx);
        else b.vy = -b.vy;
      }

      // ⬇️ 片方向壁：
      // - 上から（落下中 vy>0）は通れない＝壁として反射
      // - 下から（上昇中 vy<0）は倒れる＝壊れて通過
      if (isOneWay) {
        if (b.vy > 0) {
          b.vy = -Math.abs(b.vy);
          fxHitBrick(brick, rect, b, { strong: false });
        } else {
          brick.alive = false;
          score += brickPoints(brick);
          fxBreakBrick(brick, rect);
        }
        hitSomething = true;
        break;
      }

      // Portal: warp (壊れない)
      if (isPortal) {
        if (tryWarp(b, brick)) {
          hitSomething = true;
          break;
        }
        // ワープできないときは普通の壁っぽく反射しておく
        b.vy = -b.vy;
        // FX（ワープ失敗でも「触った感」）
        brick.flash = Math.max(brick.flash || 0, 0.10);
        fxSpawnBurst(rect.x + rect.w / 2, rect.y + rect.h / 2, 'rgba(116,248,255,0.95)', { count: 10, speedMin: 80, speedMax: 220, lifeMin: 0.12, lifeMax: 0.30, sizeMin: 1.0, sizeMax: 2.6, gravity: 260, glow: true });
        hitSomething = true;
        break;
      }

      // Wall: 壊れない（反射だけ）でも「当たった感」
      if (isWall) {
        fxHitBrick(brick, rect, b, { strong: false });
        hitSomething = true;
        break;
      }

      // 🩹 ベタベタ：当たるとくっつく（5秒）
      if (brick.type === TILE.STICKY) {
        brick.alive = false;
        score += brickPoints(brick);
        fxBreakBrick(brick, rect);
        const hp = hitPointOnRect(b, rect);
        b.stuckTimeLeft = 5.0;
        b.stuckX = hp.x;
        b.stuckY = hp.y;
        b.stuckReleaseSpeed = Math.max(80, Math.hypot(b.vx, b.vy));
        b.vx = 0;
        b.vy = 0;
        fxSpawnBurst(hp.x, hp.y, 'rgba(179,136,255,0.95)', { count: 18, speedMin: 40, speedMax: 180, lifeMin: 0.16, lifeMax: 0.70, sizeMin: 1.6, sizeMax: 5.6, gravity: 920, drag: 0.01, glow: true });
        hitSomething = true;
        break;
      }

      // Hit brick
      if (!isWall) {
        if (brick.type === TILE.BIG) {
          // 🔵 でかボール（5秒）
          brick.alive = false;
          score += brickPoints(brick);
          b.baseR = b.baseR || b.r;
          b.bigTimeLeft = Math.max(b.bigTimeLeft || 0, 5.0);
          fxBreakBrick(brick, rect);
        } else if (isBigBall && brick.type === TILE.TOUGH) {
          // でかボールは「硬いブロックだけ反射」＆一気に2減る
          b.vy = -b.vy;
          brick.hp -= 2;
          if (brick.hp <= 0) {
            brick.alive = false;
            score += brickPoints(brick);
            fxBreakBrick(brick, rect);
          } else {
            score += 2;
            fxHitBrick(brick, rect, b, { strong: true });
          }
        } else if (isBigBall && (
          brick.type === TILE.NORMAL ||
          brick.type === TILE.SOFT ||
          brick.type === TILE.SPLIT ||
          brick.type === TILE.BOMB ||
          brick.type === TILE.REVERSE ||
          brick.type === TILE.SLOW ||
          brick.type === TILE.FAST ||
          brick.type === TILE.INVINCIBLE
        )) {
          // 普通ブロックは貫通（反射しない）
          if (brick.type === TILE.BOMB) {
            brick.alive = false;
            score += brickPoints(brick);
            fxBreakBrick(brick, rect);
            fxBombExplosion(rect);
            explodeAt(brick, b);
          } else {
            killBrick(brick, b);
          }
        } else if (brick.type === TILE.BOMB) {
          // 💣 ばくはつ：自分＋周りをまとめて
          brick.alive = false;
          score += brickPoints(brick);
          fxBreakBrick(brick, rect);
          fxBombExplosion(rect);
          explodeAt(brick, b);
        } else {
          killBrick(brick, b);
        }
      }
      hitSomething = true;
      break;
    }

    if (b.y - b.r > viewH) {
      continue;
    }

    nextBalls.push(b);
    if (hitSomething) {
      b.x += b.vx * (dt * 0.35);
      b.y += b.vy * (dt * 0.35);
    }
  }

  balls = nextBalls;
  updateHud();

  if (balls.length === 0) {
    onAllBallsLost();
    return;
  }

  // かべ（壊れない）はクリア判定から除外
  const remaining = bricks.some(b => b.alive && b.type !== TILE.WALL && b.type !== TILE.PORTAL);
  if (!remaining) {
    stageCleared();
  }
}

function drawGame() {
  ctx.clearRect(0, 0, viewW, viewH);

  const sh = fxShakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);

  // 背景グラデ
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, '#2d3436');
  g.addColorStop(1, '#111827');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);

  // Bricks
  for (const brick of bricks) {
    if (!brick.alive) continue;
    const rect = brickRect(brick);
    ctx.fillStyle = brickBaseColor(brick);
    ctx.globalAlpha = 1;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // ヒット時フラッシュ
    if ((brick.flash || 0) > 0) {
      const a = clamp(brick.flash / 0.14, 0, 1) * 0.55;
      ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }

    if (brick.type === TILE.TOUGH) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(brick.hp), rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.SPLIT) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const n = clamp(brick.param || 5, 2, 50);
      ctx.fillText(`✶${n}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.SOFT) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('≈', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.WALL) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('■', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.BOMB) {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.72))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.PORTAL) {
      // ちょいアニメ（リングがくるくる）
      const t = performance.now() / 1000;
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const r = Math.max(6, Math.min(rect.w, rect.h) * 0.32);
      const a0 = t * 2.4;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, rect.h * 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a0 + 1.6);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌀', cx, cy);
    }

    if (brick.type === TILE.REVERSE) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🙃', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.BIG) {
      ctx.fillStyle = 'rgba(0,0,0,0.40)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔵', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.ONE_WAY) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⬇', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.SLOW) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐌', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.FAST) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.STICKY) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🩹', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }

    if (brick.type === TILE.INVINCIBLE) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.font = `${Math.max(12, Math.floor(rect.h * 0.70))}px Outfit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🌈', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
  }
  ctx.globalAlpha = 1;

  // FX (particles/rings)
  fxDraw(ctx);

  // Paddle
  if (invincibleTimeLeft > 0) {
    // 🌈 虹色に輝く（時間で色が流れる）
    const t = performance.now() / 1000;
    const g = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y);
    for (let i = 0; i <= 6; i++) {
      const p = i / 6;
      const h = (t * 120 + p * 360) % 360;
      g.addColorStop(p, `hsl(${h} 90% 60%)`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    // ふちのキラッ
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = Math.max(2, paddle.h * 0.22);
    ctx.strokeRect(paddle.x + 0.5, paddle.y + 0.5, paddle.w - 1, paddle.h - 1);
  } else {
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  }

  // Balls
  for (const b of balls) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  if (reverseTimeLeft > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.max(12, Math.floor(viewH * 0.032))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`🙃 さかさ中… ${reverseTimeLeft.toFixed(1)}s`, viewW / 2, 12);
  }

  if (balls.some(bb => (bb.bigTimeLeft || 0) > 0)) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.max(12, Math.floor(viewH * 0.030))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('🔵 でかボール中！', viewW / 2, reverseTimeLeft > 0 ? 42 : 12);
  }

  if (speedTimeLeft > 0 && speedMode) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.max(12, Math.floor(viewH * 0.028))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const y = (reverseTimeLeft > 0 ? 42 : 12) + (balls.some(bb => (bb.bigTimeLeft || 0) > 0) ? 30 : 0);
    const label = speedMode === 'slow' ? '🐌 のろのろ中…' : '⚡ はやはや中…';
    ctx.fillText(`${label} ${speedTimeLeft.toFixed(1)}s`, viewW / 2, y);
  }

  if (invincibleTimeLeft > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `${Math.max(12, Math.floor(viewH * 0.028))}px Outfit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const y = 12 + (reverseTimeLeft > 0 ? 30 : 0) + (balls.some(bb => (bb.bigTimeLeft || 0) > 0) ? 30 : 0) + (speedTimeLeft > 0 ? 30 : 0);
    ctx.fillText(`🌈 無敵！ タップでボール ${invincibleTimeLeft.toFixed(1)}s`, viewW / 2, y);
  }

  ctx.restore();
}

function loop(t) {
  if (!isRunning) return;
  const dt = Math.min(0.033, (t - lastT) / 1000);
  lastT = t;
  updateGame(dt);
  drawGame();
  requestAnimationFrame(loop);
}

// --------------------
// Input (Paddle)
// --------------------
let paddlePointerId = null;
function movePaddleFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  let x = (clientX - rect.left);
  if (reverseTimeLeft > 0) {
    x = viewW - x;
  }
  paddle.x = clamp(x - paddle.w / 2, 0, Math.max(0, viewW - paddle.w));
}

canvas.addEventListener('pointerdown', (e) => {
  void sfx.unlock();
  paddlePointerId = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  movePaddleFromClientX(e.clientX);

  // 🌈 無敵中：タップでボール発射（指の移動とは別でOK）
  if (invincibleTimeLeft > 0 && !isPaused && isRunning && invincibleSpawnCd <= 0) {
    const MAX_BALLS = 15;
    if (balls.length < MAX_BALLS) {
      const speed = currentBallSpeed();
      const angle = (-Math.PI / 2) + (Math.random() * 0.75 - 0.375);
      const bx = paddle.x + paddle.w / 2;
      const by = paddle.y - 18;
      const nb = makeBall(bx, by, speed, angle);
      // 少しだけ散らして重なりを避ける
      nb.x += (Math.random() * 10) - 5;
      balls.push(nb);
      invincibleSpawnCd = 0.12;
      sfx.powerUp();
      fxSpawnBurst(bx, paddle.y, 'rgba(255,255,255,0.95)', { count: 10, speedMin: 100, speedMax: 320, lifeMin: 0.10, lifeMax: 0.26, sizeMin: 1.0, sizeMax: 2.8, gravity: 720, glow: true });
      updateHud();
    }
  }

  e.preventDefault();
});
canvas.addEventListener('pointermove', (e) => {
  if (paddlePointerId == null) return;
  if (e.pointerId !== paddlePointerId) return;
  movePaddleFromClientX(e.clientX);
  e.preventDefault();
});
function endPaddle(e) {
  if (paddlePointerId == null) return;
  if (e?.pointerId != null && e.pointerId !== paddlePointerId) return;
  paddlePointerId = null;
}
canvas.addEventListener('pointerup', endPaddle);
canvas.addEventListener('pointercancel', endPaddle);
canvas.addEventListener('pointerleave', endPaddle);

// --------------------
// UI
// --------------------
pauseBtn.addEventListener('click', () => {
  if (!playingStageName) {
    showOverlay('まだだよ', '先に始まってないみたい。');
    return;
  }
  if (!isRunning) {
    showOverlay('止まってるよ', '「最初から」で始めてね。');
    return;
  }
  setPaused(!isPaused);
});

resetBtn.addEventListener('click', () => {
  closeOverlay();
  startStage(playingStageName ?? getStageFromUrl(), { resetStats: true });
});

// --------------------
// Init
// --------------------
async function init() {
  // キャッシュ準備
  ensureStages();

  resizeGameCanvas();
  updateHud();

  // URL指定のステージ（なければ先頭）
  const desired = getStageFromUrl();
  const initial = ensureStages();
  const stageName = (desired && initial.some(s => s.name === desired)) ? desired : (initial[0]?.name ?? null);
  if (stageName) startStage(stageName, { resetStats: true });

  // Supabaseから最新を取り込み（失敗してもキャッシュで動く）
  await refreshStageCacheFromSupabase({
    showError: false
  });

  // 取り込み後に、指定ステージが見つかるならラベル更新（プレイ中は変えない）
  if (!playingStageName) {
    const list = ensureStages();
    const name2 = (desired && list.some(s => s.name === desired)) ? desired : (list[0]?.name ?? null);
    if (name2) startStage(name2, { resetStats: true });
  }
}

init();

