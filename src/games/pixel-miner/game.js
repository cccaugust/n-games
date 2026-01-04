import { getCurrentPlayer } from '../../js/auth.js';
import { avatarToHtml, escapeHtml } from '../../js/avatar.js';
import { getPixelAsset } from '../../js/pixelAssets.js';
import samplePack from '../../pages/pixel-art-maker/samples.json';

/**
 * ピクセルマイナー（2Dマイクラっぽい最小版）
 * - Canvas 2D / タイル（16x16）
 * - 移動/ジャンプ
 * - 掘る/置く（ホットバー）
 * - ローカル保存（localStorage）
 */

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
const ctx = canvas.getContext('2d', { alpha: false });
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const hotbarEl = document.getElementById('hotbar');
const touchControls = document.getElementById('touchControls');
const playerPill = document.getElementById('playerPill');
const hpPill = document.getElementById('hpPill');
const soundBtn = document.getElementById('soundBtn');

const TILE_SIZE = 16;
const WORLD_W = 256;
const WORLD_H = 128;

const SAVE_KEY = 'ngames.pixel_miner.save.v1';
const SOUND_KEY = 'ngames.pixel_miner.sound.v1';
const PLAYER_SPRITE_KEY = 'ngames.pixel_miner.player_sprite.v1';

const TILE = {
  AIR: 0,
  GRASS_BLOCK: 1,
  DIRT: 2,
  STONE: 3,
  SAND: 4,
  WATER: 5,
  LAVA: 6,
  WOOD: 7,
  BRICK: 8,
  ICE: 9
};

/** @type {Record<number, {id: string, name: string, solid: boolean, breakMs: number}>} */
const TILE_DEF = {
  [TILE.AIR]: { id: 'air', name: '空気', solid: false, breakMs: 0 },
  [TILE.GRASS_BLOCK]: { id: 'tile_grass_block_16', name: 'くさつち', solid: true, breakMs: 320 },
  [TILE.DIRT]: { id: 'tile_dirt_16', name: 'つち', solid: true, breakMs: 260 },
  [TILE.STONE]: { id: 'tile_stone_16', name: 'いし', solid: true, breakMs: 620 },
  [TILE.SAND]: { id: 'tile_sand_16', name: 'すな', solid: true, breakMs: 210 },
  [TILE.WATER]: { id: 'tile_water_16', name: 'みず', solid: false, breakMs: 0 },
  [TILE.LAVA]: { id: 'tile_lava_16', name: 'ようがん', solid: false, breakMs: 0 },
  [TILE.WOOD]: { id: 'tile_wood_plank_16', name: 'もくざい', solid: true, breakMs: 360 },
  [TILE.BRICK]: { id: 'tile_brick_red_16', name: 'レンガ', solid: true, breakMs: 520 },
  [TILE.ICE]: { id: 'tile_ice_16', name: 'こおり', solid: true, breakMs: 380 }
};

/** @type {number[]} */
const HOTBAR_ORDER = [TILE.DIRT, TILE.STONE, TILE.SAND, TILE.WOOD, TILE.BRICK];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function approach(current, target, maxDelta) {
  const d = target - current;
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

function isTouchLike() {
  return (
    'ontouchstart' in window ||
    (navigator.maxTouchPoints != null && navigator.maxTouchPoints > 0) ||
    window.matchMedia?.('(pointer: coarse)')?.matches
  );
}

function base64ToArrayBuffer(b64) {
  const binary = atob(String(b64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function decodePixelsB64(b64) {
  try {
    return new Uint32Array(base64ToArrayBuffer(b64));
  } catch {
    return new Uint32Array();
  }
}

function pixelsToImageData(pixels, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const c = pixels[i] >>> 0;
    const a = (c >>> 24) & 255;
    const r = (c >>> 16) & 255;
    const g = (c >>> 8) & 255;
    const b = c & 255;
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return new ImageData(data, width, height);
}

/**
 * サンプルの「フレーム配列」/「単体pixelsB64」のどちらにも対応してフレーム一覧を返す
 * @param {any} s
 * @returns {Array<{pixelsB64?: string, durationMs?: number}>}
 */
function getSampleFrames(s) {
  if (Array.isArray(s?.frames) && s.frames.length > 0) return s.frames;
  if (typeof s?.pixelsB64 === 'string' && s.pixelsB64.length > 0) return [{ pixelsB64: s.pixelsB64, durationMs: 120 }];
  return [];
}

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * @param {HTMLCanvasElement[]} frames
 * @param {number[]} durationsMs
 * @param {number} tMs
 * @returns {HTMLCanvasElement|null}
 */
function pickAnimFrame(frames, durationsMs, tMs) {
  if (!frames?.length) return null;
  if (frames.length === 1) return frames[0];
  const durs = Array.isArray(durationsMs) && durationsMs.length === frames.length ? durationsMs : frames.map(() => 120);
  const total = durs.reduce((a, b) => a + Math.max(1, Number(b) || 0), 0) || 1;
  let t = Number(tMs) || 0;
  t = ((t % total) + total) % total;
  let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    acc += Math.max(1, Number(durs[i]) || 0);
    if (t < acc) return frames[i];
  }
  return frames[0];
}

/**
 * サンプル素材IDから 16x16 のタイル画像(canvas)を作る
 * @param {Map<string, any>} samplesById
 * @param {string} sampleId
 */
function makeTileCanvas(samplesById, sampleId) {
  const s = samplesById.get(sampleId);
  const c = document.createElement('canvas');
  c.width = TILE_SIZE;
  c.height = TILE_SIZE;
  const cctx = c.getContext('2d');
  cctx.imageSmoothingEnabled = false;
  cctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

  if (!s) return c;
  const w = Number(s.width) || TILE_SIZE;
  const h = Number(s.height) || TILE_SIZE;
  const pixels = decodePixelsB64(s.pixelsB64);
  const safe = pixels.length === w * h ? pixels : new Uint32Array(w * h);

  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d');
  sctx.imageSmoothingEnabled = false;
  sctx.putImageData(pixelsToImageData(safe, w, h), 0, 0);

  // 16x16 にフィット（ピクセル保持のためスケールは nearest）
  cctx.drawImage(src, 0, 0, TILE_SIZE, TILE_SIZE);
  return c;
}

/**
 * サンプル素材IDからスプライト（フレーム配列）を作る（16x16/32x32対応）
 * @param {Map<string, any>} samplesById
 * @param {string} sampleId
 */
function makeSpriteFrames(samplesById, sampleId) {
  const s = samplesById.get(sampleId);
  const w = Number(s?.width) || 16;
  const h = Number(s?.height) || 16;
  const frames = getSampleFrames(s);
  if (!frames.length) {
    const blank = document.createElement('canvas');
    blank.width = w;
    blank.height = h;
    return { frames: [blank], durationsMs: [120] };
  }

  /** @type {HTMLCanvasElement[]} */
  const out = [];
  /** @type {number[]} */
  const durs = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cctx = c.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, w, h);
    const pixels = decodePixelsB64(f?.pixelsB64);
    const safe = pixels.length === w * h ? pixels : new Uint32Array(w * h);
    cctx.putImageData(pixelsToImageData(safe, w, h), 0, 0);
    out.push(c);
    durs.push(Math.max(1, Math.floor(Number(f?.durationMs) || 120)));
  }
  return { frames: out, durationsMs: durs };
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str) {
  const s = String(str || 'seed');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i) & 255;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function worldIndex(x, y) {
  return y * WORLD_W + x;
}

/**
 * @param {Uint8Array} world
 * @param {number} x
 * @param {number} y
 */
function getTile(world, x, y) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return TILE.STONE; // 外は壁
  return world[worldIndex(x, y)] || TILE.AIR;
}

/**
 * @param {Uint8Array} world
 * @param {number} x
 * @param {number} y
 * @param {number} t
 */
function setTile(world, x, y, t) {
  if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) return;
  world[worldIndex(x, y)] = t & 255;
}

function isSolidTileId(t) {
  return Boolean(TILE_DEF[t]?.solid);
}

function encodeU8ToB64(u8) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function decodeB64ToU8(b64) {
  try {
    const buf = base64ToArrayBuffer(b64);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function makeDefaultInventory() {
  /** @type {Record<number, number>} */
  const inv = {};
  inv[TILE.DIRT] = 18;
  inv[TILE.WOOD] = 24;
  inv[TILE.BRICK] = 10;
  inv[TILE.STONE] = 0;
  inv[TILE.SAND] = 0;
  return inv;
}

function sanitizeInventory(inv) {
  /** @type {Record<number, number>} */
  const out = {};
  const src = inv && typeof inv === 'object' ? inv : {};
  Object.keys(TILE_DEF).forEach((k) => {
    const id = Number(k);
    if (!Number.isFinite(id)) return;
    const n = Math.max(0, Math.floor(Number(src[id]) || 0));
    if (n > 0) out[id] = n;
  });
  return out;
}

function buildHotbarUi({ tiles, tileImgs, inventory, selected }) {
  hotbarEl.innerHTML = '';
  tiles.forEach((t, i) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'pm-slot' + (i === selected ? ' active' : '');
    slot.title = TILE_DEF[t]?.name || 'ブロック';
    slot.addEventListener('click', () => {
      state.selectedSlot = i;
      renderHotbar();
    });
    const img = document.createElement('img');
    img.alt = '';
    img.src = tileImgs.get(t)?.toDataURL('image/png') || '';
    const count = document.createElement('div');
    count.className = 'pm-count';
    count.textContent = String(inventory[t] || 0);
    slot.appendChild(img);
    slot.appendChild(count);
    hotbarEl.appendChild(slot);
  });
}

function updatePlayerPill() {
  const player = getCurrentPlayer?.();
  if (!playerPill) return;
  if (!player) {
    playerPill.textContent = 'ゲスト';
    return;
  }
  playerPill.innerHTML = `${avatarToHtml(player?.avatar, { size: 18, className: 'pm-pill-avatar', alt: '' })} ${escapeHtml(
    player?.name || 'Player'
  )}`;
}

function updateHpPill() {
  if (!hpPill) return;
  const hp = Math.max(0, Math.floor(state.hp || 0));
  const max = Math.max(1, Math.floor(state.maxHp || 5));
  const full = Math.max(0, Math.min(max, hp));
  const empty = Math.max(0, max - full);
  hpPill.textContent = `${'♥'.repeat(full)}${'♡'.repeat(empty)} ${hp}/${max}`;
}

// ---- SFX (WebAudio / no asset files) ----
/** @type {{ctx: AudioContext|null, master: GainNode|null, enabled: boolean, unlocked: boolean}} */
const sfx = {
  ctx: null,
  master: null,
  enabled: true,
  unlocked: false
};

function readSoundPref() {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    if (raw == null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function writeSoundPref(v) {
  try {
    localStorage.setItem(SOUND_KEY, v ? '1' : '0');
  } catch {
    // ignore
  }
}

function updateSoundBtn() {
  if (!soundBtn) return;
  soundBtn.textContent = sfx.enabled ? '🔊' : '🔇';
  soundBtn.setAttribute('aria-pressed', sfx.enabled ? 'true' : 'false');
  soundBtn.title = sfx.enabled ? 'サウンド: ON' : 'サウンド: OFF';
}

function ensureAudio() {
  if (sfx.ctx && sfx.master) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
  sfx.ctx = ctx;
  sfx.master = master;
}

async function unlockAudio() {
  if (!sfx.enabled) return;
  ensureAudio();
  const ctx = sfx.ctx;
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') await ctx.resume();
    // tiny silent tick to "warm up"
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.frequency.value = 440;
    o.connect(g);
    g.connect(sfx.master);
    o.start();
    o.stop(ctx.currentTime + 0.01);
    sfx.unlocked = true;
  } catch {
    // ignore
  }
}

function playTone({ type = 'square', freq = 440, dur = 0.06, vol = 0.18, sweepTo = null }) {
  if (!sfx.enabled) return;
  ensureAudio();
  const ctx = sfx.ctx;
  const master = sfx.master;
  if (!ctx || !master) return;
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (sweepTo != null) o.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t0 + Math.max(0.01, dur));
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function playNoise({ dur = 0.06, vol = 0.16, hp = 700, lp = 8000 }) {
  if (!sfx.enabled) return;
  ensureAudio();
  const ctx = sfx.ctx;
  const master = sfx.master;
  if (!ctx || !master) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hpf = ctx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = hp;
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(hpf);
  hpf.connect(lpf);
  lpf.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function sfxMineTick(tileId) {
  const hard = tileId === TILE.STONE || tileId === TILE.BRICK || tileId === TILE.ICE;
  playNoise({ dur: 0.03, vol: hard ? 0.12 : 0.08, hp: hard ? 1100 : 800, lp: 9000 });
  playTone({ type: 'square', freq: hard ? 240 : 300, sweepTo: hard ? 180 : 240, dur: 0.035, vol: hard ? 0.08 : 0.06 });
}

function sfxBreak(tileId) {
  const hard = tileId === TILE.STONE || tileId === TILE.BRICK || tileId === TILE.ICE;
  playNoise({ dur: hard ? 0.09 : 0.075, vol: hard ? 0.18 : 0.14, hp: hard ? 650 : 520, lp: 10000 });
  playTone({ type: hard ? 'square' : 'triangle', freq: hard ? 180 : 220, sweepTo: hard ? 120 : 160, dur: 0.09, vol: 0.1 });
}

function sfxPlace(tileId) {
  const hard = tileId === TILE.STONE || tileId === TILE.BRICK || tileId === TILE.ICE;
  playTone({ type: hard ? 'square' : 'triangle', freq: hard ? 420 : 360, sweepTo: hard ? 260 : 240, dur: 0.05, vol: 0.09 });
  playNoise({ dur: 0.025, vol: 0.05, hp: 1200, lp: 9000 });
}

function sfxJump(inWater) {
  playTone({ type: 'triangle', freq: inWater ? 260 : 360, sweepTo: inWater ? 310 : 520, dur: inWater ? 0.07 : 0.06, vol: 0.1 });
}

function sfxHurt() {
  playNoise({ dur: 0.1, vol: 0.18, hp: 500, lp: 6500 });
  playTone({ type: 'sawtooth', freq: 220, sweepTo: 90, dur: 0.12, vol: 0.12 });
}

// ---- FX particles / camera shake ----
/** @type {Record<number, {dust: string[]}>} */
const TILE_FX = {
  [TILE.GRASS_BLOCK]: { dust: ['#6aa84f', '#8fce00', '#8b5a2b'] },
  [TILE.DIRT]: { dust: ['#8b5a2b', '#a97142', '#6f4a2a'] },
  [TILE.STONE]: { dust: ['#b7b7b7', '#8e8e8e', '#5e5e5e'] },
  [TILE.SAND]: { dust: ['#f6e27f', '#e6cc6a', '#cbb45b'] },
  [TILE.WOOD]: { dust: ['#c68642', '#a96b36', '#7a4b2a'] },
  [TILE.BRICK]: { dust: ['#b94a48', '#8a2b2a', '#d0706d'] },
  [TILE.ICE]: { dust: ['#d7f1ff', '#a9d7ff', '#7fbef2'] }
};

function randPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function spawnDustAtWorld(wx, wy, tileId, strength = 1) {
  const colors = TILE_FX[tileId]?.dust || ['#ffffff'];
  const n = Math.max(2, Math.floor(10 * strength));
  for (let i = 0; i < n; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = (40 + Math.random() * 120) * strength;
    state.particles.push({
      x: wx + (Math.random() * 6 - 3),
      y: wy + (Math.random() * 6 - 3),
      vx: Math.cos(ang) * sp * 0.6,
      vy: Math.sin(ang) * sp * 0.6 - (70 + Math.random() * 90) * strength,
      lifeMs: 0,
      maxLifeMs: 340 + Math.random() * 260,
      size: 1 + Math.random() * 2,
      color: randPick(colors)
    });
  }
}

function addShake(power, ms) {
  state.shakePower = Math.max(state.shakePower, power);
  state.shakeMs = Math.max(state.shakeMs, ms);
}

/** @type {{samplesById: Map<string, any>, tileImg: Map<number, HTMLCanvasElement>, playerSprite: HTMLCanvasElement}} */
const assets = {
  samplesById: new Map(),
  tileImg: new Map(),
  playerSprite: document.createElement('canvas'),
  playerFrames: /** @type {HTMLCanvasElement[]} */ ([]),
  playerDurationsMs: /** @type {number[]} */ ([])
};

function loadAssetsFromSamples() {
  const list = Array.isArray(samplePack?.samples) ? samplePack.samples : [];
  assets.samplesById = new Map(list.map((s) => [String(s.id), s]));

  // 必須タイル
  Object.keys(TILE_DEF).forEach((k) => {
    const t = Number(k);
    if (t === TILE.AIR) return;
    const sid = TILE_DEF[t]?.id;
    if (!sid || sid === 'air') return;
    assets.tileImg.set(t, makeTileCanvas(assets.samplesById, sid));
  });

  // プレイヤー（デフォルト。設定があれば boot で差し替え）
  const fallbackId = assets.samplesById.has('robot_head_16')
    ? 'robot_head_16'
    : assets.samplesById.has('dw_mascot_round_16')
      ? 'dw_mascot_round_16'
      : assets.samplesById.has('slime_mini_16')
        ? 'slime_mini_16'
        : 'cat_face_16';
  const anim = makeSpriteFrames(assets.samplesById, fallbackId);
  assets.playerFrames = anim.frames;
  assets.playerDurationsMs = anim.durationsMs;
  assets.playerSprite = anim.frames[0] || document.createElement('canvas');
}

function isSpriteSizeOk(w, h) {
  const ww = Number(w) || 0;
  const hh = Number(h) || 0;
  if (ww <= 0 || hh <= 0) return false;
  return ww <= 64 && hh <= 64;
}

/**
 * PixelAsset からスプライトフレーム(canvas)を作る
 * @param {import('../../js/pixelAssets.js').PixelAsset} asset
 */
function makeSpriteFramesFromPixelAsset(asset) {
  const w = Number(asset?.width) || 16;
  const h = Number(asset?.height) || 16;
  const frames = Array.isArray(asset?.frames) && asset.frames.length > 0 ? asset.frames : null;

  /** @type {HTMLCanvasElement[]} */
  const out = [];
  /** @type {number[]} */
  const durs = [];

  const srcFrames = frames
    ? frames.slice().sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0))
    : [{ pixels: asset?.pixels, durationMs: 120 }];

  for (let i = 0; i < srcFrames.length; i++) {
    const f = srcFrames[i];
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cctx = c.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, w, h);

    const px = f?.pixels instanceof Uint32Array ? f.pixels : new Uint32Array(f?.pixels || []);
    const safe = px.length === w * h ? px : new Uint32Array(w * h);
    cctx.putImageData(pixelsToImageData(safe, w, h), 0, 0);
    out.push(c);
    durs.push(Math.max(1, Math.floor(Number(f?.durationMs) || 120)));
  }

  if (!out.length) {
    const blank = document.createElement('canvas');
    blank.width = w;
    blank.height = h;
    return { frames: [blank], durationsMs: [120] };
  }
  return { frames: out, durationsMs: durs };
}

async function applyPlayerSpriteFromSettings() {
  const pref = readJson(PLAYER_SPRITE_KEY);
  if (pref?.source === 'sample' && typeof pref.sampleId === 'string') {
    const sid = pref.sampleId;
    if (assets.samplesById.has(sid)) {
      const anim = makeSpriteFrames(assets.samplesById, sid);
      assets.playerFrames = anim.frames;
      assets.playerDurationsMs = anim.durationsMs;
      assets.playerSprite = anim.frames[0] || document.createElement('canvas');
      return;
    }
  }

  if (pref?.source === 'asset' && typeof pref.assetId === 'string') {
    try {
      const asset = await getPixelAsset(pref.assetId);
      if (asset && isSpriteSizeOk(asset.width, asset.height)) {
        const anim = makeSpriteFramesFromPixelAsset(asset);
        assets.playerFrames = anim.frames;
        assets.playerDurationsMs = anim.durationsMs;
        assets.playerSprite = anim.frames[0] || document.createElement('canvas');
        return;
      }
    } catch (e) {
      console.warn('applyPlayerSpriteFromSettings: getPixelAsset failed:', e);
    }
  }
  // fallback stays as default (set by loadAssetsFromSamples)
}

const MONSTER_KIND = {
  SLIME: 'slime'
};

/** @type {Record<string, {name: string, speed: number, contactDamage: number, spriteSampleId: string, w: number, h: number}>} */
const MONSTER_DEF = {
  [MONSTER_KIND.SLIME]: {
    name: 'スライム',
    speed: 56,
    contactDamage: 1,
    spriteSampleId: 'slime_mini_16',
    w: 14,
    h: 12
  }
};

/** @type {Map<string, {frames: HTMLCanvasElement[], durationsMs: number[]}>} */
const monsterSprites = new Map();

function loadMonsterSprites() {
  monsterSprites.clear();
  Object.keys(MONSTER_DEF).forEach((k) => {
    const def = MONSTER_DEF[k];
    const sid = def?.spriteSampleId;
    if (!sid) return;
    // サンプルに無ければ、プレイヤーと同じにしておく（確実に表示される）
    const useId = assets.samplesById.has(sid) ? sid : assets.samplesById.has('slime_mini_16') ? 'slime_mini_16' : null;
    if (!useId) return;
    monsterSprites.set(k, makeSpriteFrames(assets.samplesById, useId));
  });
}

function generateWorld(seedStr) {
  const seed = hashSeed(seedStr);
  const rand = mulberry32(seed);
  const world = new Uint8Array(WORLD_W * WORLD_H);

  // 高さマップ（ざっくりノイズ）
  const base = Math.floor(WORLD_H * 0.52);
  /** @type {number[]} */
  const height = new Array(WORLD_W).fill(base);
  let v = rand();
  for (let x = 0; x < WORLD_W; x++) {
    // ちょいランダムウォーク + ゆるい波
    v += (rand() - 0.5) * 0.22;
    v = clamp(v, 0, 1);
    const wave = Math.sin((x / WORLD_W) * Math.PI * 2) * 3;
    height[x] = clamp(Math.floor(base + (v - 0.5) * 14 + wave), 16, WORLD_H - 18);
  }

  // 地層
  for (let x = 0; x < WORLD_W; x++) {
    const h = height[x];
    for (let y = 0; y < WORLD_H; y++) {
      if (y < h) {
        setTile(world, x, y, TILE.AIR);
        continue;
      }
      const depth = y - h;
      if (depth === 0) setTile(world, x, y, TILE.GRASS_BLOCK);
      else if (depth < 5) setTile(world, x, y, TILE.DIRT);
      else if (depth < 14) setTile(world, x, y, rand() < 0.08 ? TILE.SAND : TILE.STONE);
      else setTile(world, x, y, TILE.STONE);
    }
  }

  // 洞窟（ランダムにくり抜く）
  for (let i = 0; i < 140; i++) {
    const cx = Math.floor(rand() * WORLD_W);
    const cy = Math.floor((0.55 + rand() * 0.35) * WORLD_H);
    const r = 2 + Math.floor(rand() * 5);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r && rand() < 0.85) {
          if (y > 8 && y < WORLD_H - 2) setTile(world, x, y, TILE.AIR);
        }
      }
    }
  }

  // 水たまり / ようがん（深いところ）
  for (let i = 0; i < 22; i++) {
    const cx = Math.floor(rand() * WORLD_W);
    const cy = Math.floor((0.50 + rand() * 0.12) * WORLD_H);
    const r = 2 + Math.floor(rand() * 4);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          if (getTile(world, x, y) === TILE.AIR) setTile(world, x, y, TILE.WATER);
        }
      }
    }
  }
  for (let i = 0; i < 14; i++) {
    const cx = Math.floor(rand() * WORLD_W);
    const cy = Math.floor((0.78 + rand() * 0.18) * WORLD_H);
    const r = 2 + Math.floor(rand() * 3);
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          if (getTile(world, x, y) === TILE.AIR) setTile(world, x, y, TILE.LAVA);
        }
      }
    }
  }

  // 小さな木（板）
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(rand() * WORLD_W);
    const h = height[x];
    if (h < 8 || h >= WORLD_H - 10) continue;
    const trunkH = 2 + Math.floor(rand() * 3);
    for (let k = 0; k < trunkH; k++) setTile(world, x, h - 1 - k, TILE.WOOD);
  }

  return { seed: seedStr, world };
}

function findSpawnY(world, spawnX) {
  for (let y = 0; y < WORLD_H - 2; y++) {
    const t = getTile(world, spawnX, y);
    if (t !== TILE.AIR && t !== TILE.WATER) {
      return Math.max(0, y - 3);
    }
  }
  return 10;
}

function findSurfaceY(world, x) {
  for (let y = 0; y < WORLD_H - 2; y++) {
    const t = getTile(world, x, y);
    if (t !== TILE.AIR && t !== TILE.WATER && t !== TILE.LAVA) {
      // 「最初の地面(=solid)」の 1つ上(=air) を返す
      return Math.max(0, y - 1);
    }
  }
  return 10;
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const worldU8 = decodeB64ToU8(data?.worldB64);
    if (!worldU8 || worldU8.length !== WORLD_W * WORLD_H) return null;
    return {
      seed: String(data?.seed || 'seed'),
      world: worldU8,
      inventory: sanitizeInventory(data?.inventory),
      selectedSlot: clamp(Number(data?.selectedSlot) || 0, 0, HOTBAR_ORDER.length - 1),
      player: {
        x: Number(data?.player?.x) || 0,
        y: Number(data?.player?.y) || 0,
        vx: Number(data?.player?.vx) || 0,
        vy: Number(data?.player?.vy) || 0
      },
      hp: Math.max(0, Math.floor(Number(data?.hp) || 0)),
      maxHp: Math.max(1, Math.floor(Number(data?.maxHp) || 5))
    };
  } catch {
    return null;
  }
}

function saveNow() {
  try {
    const payload = {
      seed: state.seed,
      worldB64: encodeU8ToB64(state.world),
      inventory: state.inventory,
      selectedSlot: state.selectedSlot,
      player: {
        x: state.player.x,
        y: state.player.y,
        vx: state.player.vx,
        vy: state.player.vy
      },
      hp: state.hp,
      maxHp: state.maxHp
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function resetSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

/** @type {{
 *  running: boolean,
 *  seed: string,
 *  world: Uint8Array,
 *  inventory: Record<number, number>,
 *  selectedSlot: number,
 *  mode: 'mine'|'place',
 *  zoom: number,
 *  cam: {x:number,y:number},
 *  spawn: {x:number,y:number},
 *  player: {x:number,y:number,vx:number,vy:number,w:number,h:number,onGround:boolean},
 *  input: {left:boolean,right:boolean,jump:boolean},
 *  pointer: {down:boolean, screenX:number, screenY:number, worldTx:number, worldTy:number},
 *  mining: {active:boolean, tx:number, ty:number, t:number, progressMs:number, needMs:number},
 *  hp: number,
 *  maxHp: number,
 *  invulnMs: number,
 *  damageFlashMs: number,
 *  soundEnabled: boolean,
 *  miningSfxMs: number,
 *  particles: Array<{x:number,y:number,vx:number,vy:number,lifeMs:number,maxLifeMs:number,size:number,color:string}>,
 *  shakeMs: number,
 *  shakePower: number,
 *  monsters: Array<{id:number, kind:string, x:number,y:number,vx:number,vy:number,w:number,h:number,onGround:boolean, dir:number, thinkMs:number}>,
 *  animMs: number,
 *  lastSaveAt: number
 * }} */
const state = {
  running: false,
  seed: 'seed',
  world: new Uint8Array(WORLD_W * WORLD_H),
  inventory: makeDefaultInventory(),
  selectedSlot: 0,
  mode: 'mine',
  zoom: 3,
  cam: { x: 0, y: 0 },
  spawn: { x: 0, y: 0 },
  player: { x: 0, y: 0, vx: 0, vy: 0, w: 12, h: 14, onGround: false },
  input: { left: false, right: false },
  pointer: { down: false, screenX: 0, screenY: 0, worldTx: -1, worldTy: -1 },
  mining: { active: false, tx: -1, ty: -1, t: TILE.AIR, progressMs: 0, needMs: 0 },
  hp: 5,
  maxHp: 5,
  invulnMs: 0,
  damageFlashMs: 0,
  soundEnabled: true,
  miningSfxMs: 0,
  particles: [],
  shakeMs: 0,
  shakePower: 0,
  monsters: [],
  monsterSpawnMs: 0,
  animMs: 0,
  lastSaveAt: 0
};

let monsterIdSeq = 1;

function desiredMonsterCount() {
  return isTouchLike() ? 10 : 14;
}

function trySpawnOneMonsterNearPlayer() {
  const want = desiredMonsterCount();
  if (state.monsters.length >= want) return false;

  const randSide = Math.random() < 0.5 ? -1 : 1;
  const distTiles = 18 + Math.floor(Math.random() * 18); // 18〜35
  const baseTx = Math.floor(state.player.x / TILE_SIZE);
  const tx = clamp(baseTx + randSide * distTiles, 2, WORLD_W - 3);
  const ty = findSurfaceY(state.world, tx);

  const tHere = getTile(state.world, tx, ty);
  const tBelow = getTile(state.world, tx, ty + 1);
  if (tHere !== TILE.AIR) return false;
  if (!isSolidTileId(tBelow)) return false;

  const kind = MONSTER_KIND.SLIME;
  const def = MONSTER_DEF[kind];
  if (!def) return false;

  const wx = tx * TILE_SIZE + TILE_SIZE * 0.5;
  const wy = ty * TILE_SIZE + TILE_SIZE * 0.5;

  // プレイヤーに近すぎると理不尽なので避ける
  if (Math.abs(wx - state.player.x) < TILE_SIZE * 9) return false;

  // ブロック内に湧かないように軽くチェック
  if (aabbIntersectsSolid(state.world, wx, wy, def.w, def.h)) return false;

  state.monsters.push({
    id: monsterIdSeq++,
    kind,
    x: wx,
    y: wy,
    vx: 0,
    vy: 0,
    w: def.w,
    h: def.h,
    onGround: false,
    dir: Math.random() < 0.5 ? -1 : 1,
    thinkMs: 150 + Math.floor(Math.random() * 450)
  });
  return true;
}

function spawnMonsters(world, seedStr) {
  const seed = (hashSeed(seedStr) ^ 0x9e3779b9) >>> 0;
  const rand = mulberry32(seed);
  /** @type {Array<any>} */
  const out = [];

  // 敵の数（スマホは少し控えめ）
  const want = desiredMonsterCount();
  let tries = 0;
  while (out.length < want && tries < 420) {
    tries++;
    const x = Math.floor(rand() * WORLD_W);
    const y = findSurfaceY(world, x);
    const tHere = getTile(world, x, y);
    const tBelow = getTile(world, x, y + 1);
    if (tHere !== TILE.AIR) continue;
    if (!isSolidTileId(tBelow)) continue;
    const kind = MONSTER_KIND.SLIME;
    const def = MONSTER_DEF[kind];
    if (!def) continue;

    // プレイヤー初期位置付近は避ける
    const wx = x * TILE_SIZE + TILE_SIZE * 0.5;
    if (Math.abs(wx - state.player.x) < TILE_SIZE * 10) continue;

    out.push({
      id: monsterIdSeq++,
      kind,
      x: wx,
      y: y * TILE_SIZE + TILE_SIZE * 0.5,
      vx: 0,
      vy: 0,
      w: def.w,
      h: def.h,
      onGround: false,
      dir: rand() < 0.5 ? -1 : 1,
      thinkMs: 150 + Math.floor(rand() * 450)
    });
  }
  state.monsters = out;
}

function initNewWorld() {
  const player = getCurrentPlayer?.();
  const nameSeed = player?.name ? String(player.name) : 'seed';
  const seed = `pm_${nameSeed}_${new Date().toISOString().slice(0, 10)}`;
  const gen = generateWorld(seed);

  state.seed = gen.seed;
  state.world = gen.world;
  state.inventory = makeDefaultInventory();
  state.selectedSlot = 0;
  state.mode = 'mine';

  const spawnX = Math.floor(WORLD_W * 0.5);
  const spawnY = findSpawnY(state.world, spawnX);
  state.player.x = spawnX * TILE_SIZE + TILE_SIZE * 0.5;
  state.player.y = spawnY * TILE_SIZE;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.onGround = false;
  state.cam.x = state.player.x;
  state.cam.y = state.player.y;
  state.spawn.x = state.player.x;
  state.spawn.y = state.player.y;
  state.mining.active = false;
  state.miningSfxMs = 0;
  state.particles = [];
  state.shakeMs = 0;
  state.shakePower = 0;
  state.maxHp = 5;
  state.hp = state.maxHp;
  state.invulnMs = 0;
  state.damageFlashMs = 0;
  spawnMonsters(state.world, state.seed);
  updateHpPill();
  saveNow();
}

function loadOrCreate() {
  const saved = loadSave();
  if (saved) {
    state.seed = saved.seed;
    state.world = saved.world;
    state.inventory = { ...makeDefaultInventory(), ...saved.inventory };
    state.selectedSlot = saved.selectedSlot;
    state.player.x = saved.player.x || state.player.x;
    state.player.y = saved.player.y || state.player.y;
    state.player.vx = saved.player.vx || 0;
    state.player.vy = saved.player.vy || 0;
    state.cam.x = state.player.x;
    state.cam.y = state.player.y;
    state.spawn.x = state.player.x;
    state.spawn.y = state.player.y;
    state.maxHp = saved.maxHp || 5;
    state.hp = saved.hp > 0 ? saved.hp : state.maxHp;
    state.invulnMs = 0;
    state.damageFlashMs = 0;
    state.miningSfxMs = 0;
    state.particles = [];
    state.shakeMs = 0;
    state.shakePower = 0;
    spawnMonsters(state.world, state.seed);
    updateHpPill();
    return;
  }
  initNewWorld();
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function screenToWorldPixel(sx, sy) {
  const rect = canvas.getBoundingClientRect();
  const x = (sx - rect.left) / (rect.width || 1);
  const y = (sy - rect.top) / (rect.height || 1);

  const viewW = rect.width;
  const viewH = rect.height;
  const scale = state.zoom;

  const worldViewW = viewW / scale;
  const worldViewH = viewH / scale;
  const wx0 = state.cam.x - worldViewW / 2;
  const wy0 = state.cam.y - worldViewH / 2;
  return { wx: wx0 + x * worldViewW, wy: wy0 + y * worldViewH };
}

function updatePointerTileFromEvent(e) {
  const p = screenToWorldPixel(e.clientX, e.clientY);
  const tx = Math.floor(p.wx / TILE_SIZE);
  const ty = Math.floor(p.wy / TILE_SIZE);
  state.pointer.screenX = e.clientX;
  state.pointer.screenY = e.clientY;
  state.pointer.worldTx = tx;
  state.pointer.worldTy = ty;
}

function renderHotbar() {
  buildHotbarUi({
    tiles: HOTBAR_ORDER,
    tileImgs: assets.tileImg,
    inventory: state.inventory,
    selected: state.selectedSlot
  });
}

function selectedTileId() {
  return HOTBAR_ORDER[state.selectedSlot] ?? TILE.DIRT;
}

function canReach(tx, ty) {
  const px = state.player.x;
  const py = state.player.y;
  const cx = (tx + 0.5) * TILE_SIZE;
  const cy = (ty + 0.5) * TILE_SIZE;
  const dx = cx - px;
  const dy = cy - py;
  return dx * dx + dy * dy <= (TILE_SIZE * 4) * (TILE_SIZE * 4);
}

function tryPlace(tx, ty) {
  const t = selectedTileId();
  const count = state.inventory[t] || 0;
  if (count <= 0) return false;
  if (!canReach(tx, ty)) return false;
  if (getTile(state.world, tx, ty) !== TILE.AIR) return false;

  // プレイヤーとぶつかる位置は置けない
  const px0 = state.player.x - state.player.w / 2;
  const py0 = state.player.y - state.player.h / 2;
  const px1 = state.player.x + state.player.w / 2;
  const py1 = state.player.y + state.player.h / 2;
  const bx0 = tx * TILE_SIZE;
  const by0 = ty * TILE_SIZE;
  const bx1 = bx0 + TILE_SIZE;
  const by1 = by0 + TILE_SIZE;
  const overlap = px0 < bx1 && px1 > bx0 && py0 < by1 && py1 > by0;
  if (overlap) return false;

  setTile(state.world, tx, ty, t);
  state.inventory[t] = count - 1;
  renderHotbar();
  sfxPlace(t);
  spawnDustAtWorld(tx * TILE_SIZE + TILE_SIZE * 0.5, ty * TILE_SIZE + TILE_SIZE * 0.5, t, 0.35);
  return true;
}

function startMining(tx, ty) {
  const t = getTile(state.world, tx, ty);
  if (t === TILE.AIR || t === TILE.WATER || t === TILE.LAVA) return false;
  if (!canReach(tx, ty)) return false;

  const def = TILE_DEF[t];
  if (!def?.solid) return false;
  state.mining.active = true;
  state.mining.tx = tx;
  state.mining.ty = ty;
  state.mining.t = t;
  state.mining.progressMs = 0;
  state.mining.needMs = def.breakMs;
  state.miningSfxMs = 0;
  sfxMineTick(t);
  return true;
}

function stopMining() {
  state.mining.active = false;
  state.mining.tx = -1;
  state.mining.ty = -1;
  state.mining.t = TILE.AIR;
  state.mining.progressMs = 0;
  state.mining.needMs = 0;
  state.miningSfxMs = 0;
}

function breakTile(tx, ty, t) {
  setTile(state.world, tx, ty, TILE.AIR);
  state.inventory[t] = (state.inventory[t] || 0) + 1;
  renderHotbar();
  sfxBreak(t);
  spawnDustAtWorld(tx * TILE_SIZE + TILE_SIZE * 0.5, ty * TILE_SIZE + TILE_SIZE * 0.5, t, 1);
  addShake(0.8, 90);
}

function aabbIntersectsSolid(world, x, y, w, h) {
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  const x1 = x + w / 2;
  const y1 = y + h / 2;
  const tx0 = Math.floor(x0 / TILE_SIZE);
  const ty0 = Math.floor(y0 / TILE_SIZE);
  const tx1 = Math.floor((x1 - 0.001) / TILE_SIZE);
  const ty1 = Math.floor((y1 - 0.001) / TILE_SIZE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = getTile(world, tx, ty);
      if (isSolidTileId(t)) return true;
    }
  }
  return false;
}

function resolveCollisionsAxis(world, player, axis) {
  // axis: 'x' | 'y'
  const w = player.w;
  const h = player.h;
  const x0 = player.x - w / 2;
  const y0 = player.y - h / 2;
  const x1 = player.x + w / 2;
  const y1 = player.y + h / 2;

  const tx0 = Math.floor(x0 / TILE_SIZE);
  const ty0 = Math.floor(y0 / TILE_SIZE);
  const tx1 = Math.floor((x1 - 0.001) / TILE_SIZE);
  const ty1 = Math.floor((y1 - 0.001) / TILE_SIZE);

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = getTile(world, tx, ty);
      if (!isSolidTileId(t)) continue;
      const bx0 = tx * TILE_SIZE;
      const by0 = ty * TILE_SIZE;
      const bx1 = bx0 + TILE_SIZE;
      const by1 = by0 + TILE_SIZE;

      const px0 = player.x - w / 2;
      const py0 = player.y - h / 2;
      const px1 = player.x + w / 2;
      const py1 = player.y + h / 2;
      const overlap = px0 < bx1 && px1 > bx0 && py0 < by1 && py1 > by0;
      if (!overlap) continue;

      if (axis === 'x') {
        const pushLeft = bx1 - px0;
        const pushRight = px1 - bx0;
        if (pushLeft < pushRight) player.x += pushLeft + 0.01;
        else player.x -= pushRight + 0.01;
      } else {
        const pushUp = by1 - py0;
        const pushDown = py1 - by0;
        if (pushUp < pushDown) {
          player.y += pushUp + 0.01;
          // hit ceiling
          if (player.vy < 0) player.vy = 0;
        } else {
          player.y -= pushDown + 0.01;
          // landed
          if (player.vy > 0) {
            player.vy = 0;
            player.onGround = true;
          }
        }
      }
    }
  }
}

function tileAtPlayerFeet(world) {
  const tx = Math.floor(state.player.x / TILE_SIZE);
  const ty = Math.floor((state.player.y + state.player.h / 2 + 2) / TILE_SIZE);
  return getTile(world, tx, ty);
}

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  const ax0 = ax - aw / 2;
  const ay0 = ay - ah / 2;
  const ax1 = ax + aw / 2;
  const ay1 = ay + ah / 2;
  const bx0 = bx - bw / 2;
  const by0 = by - bh / 2;
  const bx1 = bx + bw / 2;
  const by1 = by + bh / 2;
  return ax0 < bx1 && ax1 > bx0 && ay0 < by1 && ay1 > by0;
}

function applyPlayerDamage(amount, fromX) {
  if (state.invulnMs > 0) return;
  const dmg = Math.max(0, Math.floor(amount || 0));
  if (dmg <= 0) return;
  state.hp = Math.max(0, (state.hp || 0) - dmg);
  state.invulnMs = 850;
  state.damageFlashMs = 160;
  sfxHurt();
  addShake(1.2, 140);

  // knockback
  const p = state.player;
  const dir = p.x < fromX ? -1 : 1;
  p.vx = -dir * 150;
  p.vy = Math.min(p.vy, -220);

  if (state.hp <= 0) {
    // 最小版: その場でリスポーン（ワールドは維持）
    state.hp = state.maxHp;
    p.x = state.spawn.x;
    p.y = state.spawn.y;
    p.vx = 0;
    p.vy = 0;
    state.cam.x = p.x;
    state.cam.y = p.y;
    spawnMonsters(state.world, state.seed);
    state.invulnMs = 1000;
    state.damageFlashMs = 260;
    addShake(1.6, 180);
  }
  updateHpPill();
}

function tileIdAtWorldPx(world, wx, wy) {
  const tx = Math.floor(wx / TILE_SIZE);
  const ty = Math.floor(wy / TILE_SIZE);
  return getTile(world, tx, ty);
}

function updateMonsterAi(m, dtMs) {
  const def = MONSTER_DEF[m.kind] || MONSTER_DEF[MONSTER_KIND.SLIME];
  const p = state.player;
  const dx = p.x - m.x;
  const dy = p.y - m.y;
  const dist2 = dx * dx + dy * dy;
  const chase = dist2 < (TILE_SIZE * 14) * (TILE_SIZE * 14);

  m.thinkMs -= dtMs;
  if (m.thinkMs <= 0) {
    m.thinkMs = chase ? 80 + Math.random() * 120 : 220 + Math.random() * 520;
    if (chase) m.dir = dx < 0 ? -1 : 1;
    else if (Math.random() < 0.45) m.dir *= -1;
  }

  // 障害物があればジャンプ（簡易）
  const lookX = m.x + m.dir * (m.w / 2 + 2);
  const feetY = m.y + m.h / 2 - 2;
  const headY = m.y - m.h / 2 + 2;
  const tFoot = tileIdAtWorldPx(state.world, lookX, feetY);
  const tHead = tileIdAtWorldPx(state.world, lookX, headY);
  const blocked = isSolidTileId(tFoot) || isSolidTileId(tHead);
  if (blocked && m.onGround) {
    m.vy = -250;
  } else if (chase && m.onGround && Math.abs(dx) < TILE_SIZE * 2.5 && dy < -TILE_SIZE * 0.8) {
    // プレイヤーが少し上にいたら追いかけジャンプ
    m.vy = -250;
  }

  const desiredVx = m.dir * def.speed;
  m.vx = approach(m.vx, desiredVx, dtMs * 0.8);
}

function tickMonsters(dtMs) {
  const dt = Math.min(0.033, dtMs / 1000);
  const world = state.world;
  for (let i = 0; i < state.monsters.length; i++) {
    const m = state.monsters[i];
    const def = MONSTER_DEF[m.kind];
    if (!def) continue;
    m.onGround = false;

    updateMonsterAi(m, dtMs);

    // gravity (水は軽め)
    const feet = tileIdAtWorldPx(world, m.x, m.y + m.h / 2 + 2);
    const inWater = feet === TILE.WATER;
    const gravity = inWater ? 320 : 760;
    m.vy += gravity * dt;
    if (inWater) m.vy = clamp(m.vy, -140, 200);

    // move X/Y with collision
    m.x += m.vx * dt;
    resolveCollisionsAxis(world, m, 'x');
    m.y += m.vy * dt;
    resolveCollisionsAxis(world, m, 'y');

    // keep in world bounds + reverse when hitting edge
    const beforeX = m.x;
    m.x = clamp(m.x, TILE_SIZE * 1, WORLD_W * TILE_SIZE - TILE_SIZE * 1);
    if (Math.abs(m.x - beforeX) > 0.01) m.dir *= -1;
    m.y = clamp(m.y, TILE_SIZE * 1, WORLD_H * TILE_SIZE - TILE_SIZE * 1);

    // contact damage
    if (aabbOverlap(m.x, m.y, m.w, m.h, state.player.x, state.player.y, state.player.w, state.player.h)) {
      applyPlayerDamage(def.contactDamage, m.x);
    }
  }
}

function tickParticles(dtMs) {
  const dt = Math.min(0.033, dtMs / 1000);
  const gravity = 740;
  const world = state.world;
  /** @type {typeof state.particles} */
  const next = [];
  for (let i = 0; i < state.particles.length; i++) {
    const p = state.particles[i];
    p.lifeMs += dtMs;
    if (p.lifeMs >= p.maxLifeMs) continue;
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.002, dtMs); // friction-ish

    // very cheap ground collision (bounce)
    const below = tileIdAtWorldPx(world, p.x, p.y + 2);
    if (isSolidTileId(below)) {
      p.vy *= -0.25;
      p.vx *= 0.55;
      p.y -= 1;
    }
    next.push(p);
  }
  state.particles = next;
}

function tick(dtMs) {
  const dt = Math.min(0.033, dtMs / 1000);
  state.animMs = (state.animMs + dtMs) % 600000; // 10分で周回（数値肥大を防ぐ）
  const p = state.player;
  p.onGround = false;

  // ジャンプ入力（エッジトリガー）
  applyPendingJump();

  const feet = tileAtPlayerFeet(state.world);
  const inWater = feet === TILE.WATER;
  const inLava = feet === TILE.LAVA;
  const moveSpeed = inWater ? 70 : 110;
  const gravity = inWater ? 320 : 760;

  // input
  let ax = 0;
  if (state.input.left) ax -= 1;
  if (state.input.right) ax += 1;
  p.vx = ax * moveSpeed;

  // gravity
  p.vy += gravity * dt;
  if (inWater) p.vy = clamp(p.vy, -160, 200);

  // move X
  p.x += p.vx * dt;
  resolveCollisionsAxis(state.world, p, 'x');

  // move Y
  p.y += p.vy * dt;
  resolveCollisionsAxis(state.world, p, 'y');

  // clamp inside world
  p.x = clamp(p.x, TILE_SIZE * 1, WORLD_W * TILE_SIZE - TILE_SIZE * 1);
  p.y = clamp(p.y, TILE_SIZE * 1, WORLD_H * TILE_SIZE - TILE_SIZE * 1);

  // damage hint (lava): いまは演出だけ
  if (inLava) {
    // tiny push upward so it feels "danger"
    p.vy -= 120 * dt;
  }

  // camera follow (smooth)
  const targetX = p.x;
  const targetY = p.y - 22;
  const lerp = 1 - Math.pow(0.001, dtMs); // stable smoothing
  state.cam.x += (targetX - state.cam.x) * lerp;
  state.cam.y += (targetY - state.cam.y) * lerp;

  // mining progress
  if (state.mining.active) {
    const tx = state.pointer.worldTx;
    const ty = state.pointer.worldTy;
    const stillSame = tx === state.mining.tx && ty === state.mining.ty;
    const tNow = getTile(state.world, state.mining.tx, state.mining.ty);
    const ok = stillSame && tNow === state.mining.t && canReach(tx, ty);
    if (!ok) {
      stopMining();
    } else {
      state.mining.progressMs += dtMs;
      state.miningSfxMs += dtMs;
      if (state.miningSfxMs >= 140) {
        state.miningSfxMs = 0;
        sfxMineTick(state.mining.t);
        spawnDustAtWorld(tx * TILE_SIZE + TILE_SIZE * 0.5, ty * TILE_SIZE + TILE_SIZE * 0.5, state.mining.t, 0.25);
      }
      if (state.mining.progressMs >= state.mining.needMs) {
        breakTile(state.mining.tx, state.mining.ty, state.mining.t);
        stopMining();
      }
    }
  }

  // monsters
  tickMonsters(dtMs);

  // spawn (補充): 初期スポーンが少ない/見えない時でも、時間でちゃんと出るようにする
  state.monsterSpawnMs = (state.monsterSpawnMs || 0) + dtMs;
  if (state.monsterSpawnMs >= 1600) {
    state.monsterSpawnMs = 0;
    // 1回で増やしすぎない（負荷/理不尽防止）
    trySpawnOneMonsterNearPlayer();
  }

  // particles
  tickParticles(dtMs);

  // invuln / flash timers
  state.invulnMs = Math.max(0, (state.invulnMs || 0) - dtMs);
  state.damageFlashMs = Math.max(0, (state.damageFlashMs || 0) - dtMs);
  state.shakeMs = Math.max(0, (state.shakeMs || 0) - dtMs);
  if (state.shakeMs <= 0) state.shakePower = 0;

  // autosave (not every frame)
  const now = performance.now();
  if (now - state.lastSaveAt > 1200) {
    state.lastSaveAt = now;
    saveNow();
  }
}

function draw() {
  const rect = canvas.getBoundingClientRect();
  const viewW = rect.width;
  const viewH = rect.height;
  const scale = state.zoom;

  ctx.clearRect(0, 0, viewW, viewH);
  ctx.imageSmoothingEnabled = false;

  // world view in world pixels
  const worldViewW = viewW / scale;
  const worldViewH = viewH / scale;
  const wx0 = state.cam.x - worldViewW / 2;
  const wy0 = state.cam.y - worldViewH / 2;
  const wx1 = wx0 + worldViewW;
  const wy1 = wy0 + worldViewH;

  // visible tiles
  const tx0 = Math.floor(wx0 / TILE_SIZE) - 1;
  const ty0 = Math.floor(wy0 / TILE_SIZE) - 1;
  const tx1 = Math.floor(wx1 / TILE_SIZE) + 1;
  const ty1 = Math.floor(wy1 / TILE_SIZE) + 1;

  // scale transform: draw world pixels * scale => screen
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-wx0, -wy0);

  // camera shake (world space)
  if (state.shakeMs > 0 && state.shakePower > 0) {
    const p = state.shakePower;
    const k = clamp(state.shakeMs / 200, 0, 1);
    const sx = (Math.random() * 2 - 1) * 2.2 * p * k;
    const sy = (Math.random() * 2 - 1) * 2.2 * p * k;
    ctx.translate(sx, sy);
  }

  // background sky gradient in world space
  const bg = ctx.createLinearGradient(wx0, wy0, wx0, wy0 + worldViewH);
  bg.addColorStop(0, '#97c8ff');
  bg.addColorStop(0.52, '#e9f6ff');
  bg.addColorStop(1, '#070b18');
  ctx.fillStyle = bg;
  ctx.fillRect(wx0, wy0, worldViewW, worldViewH);

  // tiles
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = getTile(state.world, tx, ty);
      if (t === TILE.AIR) continue;
      const img = assets.tileImg.get(t);
      if (!img) continue;
      ctx.drawImage(img, tx * TILE_SIZE, ty * TILE_SIZE);
    }
  }

  // particles (between tiles and sprites)
  if (state.particles.length) {
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      const a = 1 - clamp(p.lifeMs / Math.max(1, p.maxLifeMs), 0, 1);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.15 + a * 0.75;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // monsters (behind player)
  for (let i = 0; i < state.monsters.length; i++) {
    const m = state.monsters[i];
    const anim = monsterSprites.get(m.kind);
    const spr = anim ? pickAnimFrame(anim.frames, anim.durationsMs, state.animMs) : null;
    if (spr) {
      const mw = spr.width || 0;
      const mh = spr.height || 0;
      ctx.save();
      if (m.dir < 0) {
        ctx.translate(Math.round(m.x), Math.round(m.y));
        ctx.scale(-1, 1);
        ctx.drawImage(spr, -mw / 2, -mh / 2);
      } else {
        ctx.drawImage(spr, Math.round(m.x - mw / 2), Math.round(m.y - mh / 2));
      }
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,0,255,0.85)';
      ctx.fillRect(Math.round(m.x - m.w / 2), Math.round(m.y - m.h / 2), m.w, m.h);
    }
  }

  // mining highlight
  if (state.pointer.worldTx >= 0 && state.pointer.worldTy >= 0 && canReach(state.pointer.worldTx, state.pointer.worldTy)) {
    const px = state.pointer.worldTx * TILE_SIZE;
    const py = state.pointer.worldTy * TILE_SIZE;
    ctx.strokeStyle = state.mode === 'place' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }

  // mining progress overlay
  if (state.mining.active) {
    const px = state.mining.tx * TILE_SIZE;
    const py = state.mining.ty * TILE_SIZE;
    const p = clamp(state.mining.progressMs / Math.max(1, state.mining.needMs), 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE * p, 2);
  }

  // player
  const spr = pickAnimFrame(assets.playerFrames, assets.playerDurationsMs, state.animMs) || assets.playerSprite;
  const pw = spr?.width || 0;
  const ph = spr?.height || 0;
  const drawX = state.player.x - pw / 2;
  const drawY = state.player.y - ph / 2;
  if (state.invulnMs > 0 && Math.floor(state.invulnMs / 90) % 2 === 0) {
    ctx.globalAlpha = 0.55;
    ctx.drawImage(spr, Math.round(drawX), Math.round(drawY));
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(spr, Math.round(drawX), Math.round(drawY));
  }

  // simple cursor tool icon (near pointer) for desktop
  if (!isTouchLike() && state.pointer.worldTx >= 0 && state.pointer.worldTy >= 0) {
    const cx = state.pointer.worldTx * TILE_SIZE + TILE_SIZE - 2;
    const cy = state.pointer.worldTy * TILE_SIZE + 2;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx - 14, cy - 2, 14, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.mode === 'place' ? '🧱' : '⛏', cx - 7, cy + 4);
  }

  ctx.restore();

  // hint on lava
  const feet = tileAtPlayerFeet(state.world);
  if (feet === TILE.LAVA) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 80, 80, 0.12)';
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();
  }

  // damage flash
  if (state.damageFlashMs > 0) {
    const a = clamp(state.damageFlashMs / 160, 0, 1) * 0.14;
    ctx.save();
    ctx.fillStyle = `rgba(255, 60, 60, ${a})`;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.restore();
  }
}

let last = 0;
function loop(t) {
  if (!state.running) return;
  const dtMs = last ? t - last : 16;
  last = t;
  tick(dtMs);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  overlay?.setAttribute('hidden', 'true');
  state.running = true;
  last = 0;
  requestAnimationFrame(loop);
}

function stopGame() {
  state.running = false;
}

function applyTouchUiVisibility() {
  const touch = isTouchLike();
  if (touchControls) touchControls.hidden = !touch;
}

function bindKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (!sfx.unlocked) unlockAudio();
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') state.input.left = true;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') state.input.right = true;
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') {
      // jump (edge-trigger)
      if (!jumpLatch) pendingJump = true;
      jumpLatch = true;
    }

    if (e.key === '1') {
      state.selectedSlot = 0;
      renderHotbar();
    }
    if (e.key === '2') {
      state.selectedSlot = 1;
      renderHotbar();
    }
    if (e.key === '3') {
      state.selectedSlot = 2;
      renderHotbar();
    }
    if (e.key === '4') {
      state.selectedSlot = 3;
      renderHotbar();
    }
    if (e.key === '5') {
      state.selectedSlot = 4;
      renderHotbar();
    }

    if (e.key === '+' || e.key === '=') setZoom(state.zoom + 1);
    if (e.key === '-' || e.key === '_') setZoom(state.zoom - 1);
    if (e.key.toLowerCase() === 'q') setMode('mine');
    if (e.key.toLowerCase() === 'e') setMode('place');
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') state.input.left = false;
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') state.input.right = false;
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') {
      jumpLatch = false;
    }
  });
}

let pendingJump = false;
let jumpLatch = false;

function applyPendingJump() {
  if (!pendingJump) return;
  pendingJump = false;
  const p = state.player;
  // 足元のタイルでゆるく判定
  const feet = tileAtPlayerFeet(state.world);
  const inWater = feet === TILE.WATER;
  // onGround は衝突解決の後に立つので、ここは簡易: すぐ下が固い or 水
  const tx = Math.floor(p.x / TILE_SIZE);
  const ty = Math.floor((p.y + p.h / 2 + 1) / TILE_SIZE);
  const below = getTile(state.world, tx, ty);
  const can = inWater || isSolidTileId(below);
  if (!can) return;
  p.vy = inWater ? -165 : -285;
  sfxJump(inWater);
}

function setMode(mode) {
  state.mode = mode === 'place' ? 'place' : 'mine';
  // ボタン表示
  if (!touchControls) return;
  touchControls.querySelectorAll('.pm-btn').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    const act = btn.dataset.act;
    if (act === 'modeMine') btn.classList.toggle('active', state.mode === 'mine');
    if (act === 'modePlace') btn.classList.toggle('active', state.mode === 'place');
  });
}

function setZoom(z) {
  const touch = isTouchLike();
  const min = touch ? 2 : 2;
  const max = touch ? 4 : 5;
  state.zoom = clamp(Math.round(z), min, max);
}

function bindCanvasPointer() {
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('pointerdown', (e) => {
    if (!sfx.unlocked) unlockAudio();
    state.pointer.down = true;
    canvas.setPointerCapture(e.pointerId);
    updatePointerTileFromEvent(e);

    if (e.button === 2) {
      // right click: place
      setMode('place');
      tryPlace(state.pointer.worldTx, state.pointer.worldTy);
      return;
    }

    if (state.mode === 'place') {
      tryPlace(state.pointer.worldTx, state.pointer.worldTy);
      return;
    }
    startMining(state.pointer.worldTx, state.pointer.worldTy);
  });

  canvas.addEventListener('pointermove', (e) => {
    updatePointerTileFromEvent(e);
    if (!state.pointer.down) return;
    if (state.mode === 'mine') {
      // drag mining: いまのターゲットが変わったら切り替え
      const tx = state.pointer.worldTx;
      const ty = state.pointer.worldTy;
      if (!state.mining.active || tx !== state.mining.tx || ty !== state.mining.ty) {
        stopMining();
        startMining(tx, ty);
      }
    }
  });

  function endPointer() {
    state.pointer.down = false;
    stopMining();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    if (state.pointer.down) endPointer();
  });
}

function bindTouchControls() {
  if (!touchControls) return;

  /** @type {Record<string, {down:boolean, pointerId:number|null}>} */
  const hold = {
    left: { down: false, pointerId: null },
    right: { down: false, pointerId: null }
  };

  function setHeld(key, v) {
    if (key === 'left') state.input.left = v;
    if (key === 'right') state.input.right = v;
  }

  touchControls.addEventListener('pointerdown', (e) => {
    if (!sfx.unlocked) unlockAudio();
    const target = /** @type {HTMLElement} */ (e.target);
    const btn = target.closest('button');
    if (!btn) return;
    const act = btn.dataset.act;
    if (!act) return;
    btn.setPointerCapture(e.pointerId);
    e.preventDefault();

    if (act === 'left' || act === 'right') {
      hold[act].down = true;
      hold[act].pointerId = e.pointerId;
      setHeld(act, true);
      return;
    }
    if (act === 'jump') {
      pendingJump = true;
      return;
    }
    if (act === 'modeMine') setMode('mine');
    if (act === 'modePlace') setMode('place');
    if (act === 'zoomOut') setZoom(state.zoom - 1);
    if (act === 'zoomIn') setZoom(state.zoom + 1);
  });

  touchControls.addEventListener('pointerup', (e) => {
    Object.keys(hold).forEach((k) => {
      const key = /** @type {'left'|'right'} */ (k);
      if (hold[key].down && hold[key].pointerId === e.pointerId) {
        hold[key].down = false;
        hold[key].pointerId = null;
        setHeld(key, false);
      }
    });
  });
  touchControls.addEventListener('pointercancel', (e) => {
    Object.keys(hold).forEach((k) => {
      const key = /** @type {'left'|'right'} */ (k);
      if (hold[key].pointerId === e.pointerId) {
        hold[key].down = false;
        hold[key].pointerId = null;
        setHeld(key, false);
      }
    });
  });
}

async function boot() {
  updatePlayerPill();
  sfx.enabled = readSoundPref();
  state.soundEnabled = sfx.enabled;
  updateSoundBtn();

  loadAssetsFromSamples();
  await applyPlayerSpriteFromSettings();
  loadMonsterSprites();

  // 初期ズーム（スマホは少し引き気味）
  setZoom(isTouchLike() ? 2 : 3);
  setMode('mine');
  applyTouchUiVisibility();

  loadOrCreate();
  renderHotbar();
  updateHpPill();

  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    applyTouchUiVisibility();
  });

  bindKeyboard();
  bindCanvasPointer();
  bindTouchControls();

  soundBtn?.addEventListener('click', async () => {
    state.soundEnabled = !state.soundEnabled;
    sfx.enabled = state.soundEnabled;
    writeSoundPref(state.soundEnabled);
    updateSoundBtn();
    if (state.soundEnabled) await unlockAudio();
  });

  startBtn?.addEventListener('click', () => {
    unlockAudio();
    startGame();
  });

  resetBtn?.addEventListener('click', () => {
    if (!confirm('セーブも消して、最初からにしますか？')) return;
    stopGame();
    resetSave();
    initNewWorld();
    renderHotbar();
    overlay?.removeAttribute('hidden');
  });

  // start overlay stays until click
  overlay?.removeAttribute('hidden');
}

boot();

