import { getCurrentPlayer } from '../../js/auth.js';
import { assetPreviewDataUrl, getPixelAsset, listPixelAssets, renderPixelsToCanvas } from '../../js/pixelAssets.js';
import samplePack from '../../pages/pixel-art-maker/samples.json';

export const GAME_ID = 'invaders';
export const STAGE_COLS = 14;
export const STAGE_ROWS = 10;
export const WALL_ROWS = 4;
export const STORAGE_KEY = 'ngames.invaders.stages.v1';

// Enemy token: null = empty, 'default' = built-in invader sprite, otherwise PixelAsset.id
export const ENEMY_DEFAULT = 'default';
export const WALL_CELL = 1; // walls[] cell marker

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function uniqueName(baseName, existingNames) {
  const base = (baseName || 'ななしのステージ').trim() || 'ななしのステージ';
  if (!existingNames.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} (${i})`;
    if (!existingNames.has(candidate)) return candidate;
  }
  return `${base} (${Date.now()})`;
}

export function makeEmptyStage(name = '新しいステージ') {
  return {
    version: 2,
    name,
    cols: STAGE_COLS,
    rows: STAGE_ROWS,
    grid: Array.from({ length: STAGE_COLS * STAGE_ROWS }, () => null),
    wallRows: WALL_ROWS,
    walls: Array.from({ length: STAGE_COLS * WALL_ROWS }, () => 0)
  };
}

export function normalizeStage(stage) {
  const s = stage && typeof stage === 'object' ? stage : {};
  const cols = s.cols === STAGE_COLS ? STAGE_COLS : STAGE_COLS;
  const rows = s.rows === STAGE_ROWS ? STAGE_ROWS : STAGE_ROWS;
  const raw = Array.isArray(s.grid) ? s.grid : [];
  const grid = Array.from({ length: cols * rows }, (_, i) => {
    const v = raw[i];
    if (v == null) return null;
    if (v === ENEMY_DEFAULT) return ENEMY_DEFAULT;
    // PixelAsset id (string)
    return typeof v === 'string' && v.trim() ? v : null;
  });
  const wallRows = s.wallRows === WALL_ROWS ? WALL_ROWS : WALL_ROWS;
  const rawWalls = Array.isArray(s.walls) ? s.walls : [];
  const walls = Array.from({ length: cols * wallRows }, (_, i) => {
    const v = rawWalls[i];
    if (v === WALL_CELL) return WALL_CELL;
    if (v === true) return WALL_CELL;
    if (typeof v === 'number' && v > 0) return WALL_CELL;
    return 0;
  });
  return {
    version: 2,
    name: typeof s.name === 'string' && s.name.trim() ? s.name.trim() : 'ななしのステージ',
    cols,
    rows,
    grid,
    wallRows,
    walls
  };
}

export function countEnemies(stage) {
  const s = normalizeStage(stage);
  let n = 0;
  for (const cell of s.grid) if (cell != null) n++;
  return n;
}

export function loadUserStages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStage);
  } catch {
    return [];
  }
}

export function saveUserStages(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertUserStage(stage) {
  const next = normalizeStage(stage);
  const list = loadUserStages();
  const idx = list.findIndex((x) => x.name === next.name);
  if (idx >= 0) list[idx] = next;
  else list.unshift(next);
  saveUserStages(list);
  return list;
}

export function deleteUserStageByName(name) {
  const list = loadUserStages().filter((x) => x.name !== name);
  saveUserStages(list);
  return list;
}

export function getDefaultStages() {
  // 3 default stages using built-in invader sprite
  const s1 = makeEmptyStage('はじめて');
  for (let y = 0; y < 4; y++) {
    for (let x = 2; x < STAGE_COLS - 2; x++) {
      if ((x + y) % 2 === 0) s1.grid[y * STAGE_COLS + x] = ENEMY_DEFAULT;
    }
  }
  // Simple walls (bottom area)
  for (let x = 2; x < STAGE_COLS - 2; x++) {
    if (x % 2 === 0) s1.walls[1 * STAGE_COLS + x] = WALL_CELL;
  }

  const s2 = makeEmptyStage('ジグザグ');
  for (let y = 0; y < 5; y++) {
    for (let x = 1; x < STAGE_COLS - 1; x++) {
      if (y % 2 === 0 ? x % 2 === 0 : x % 2 === 1) s2.grid[y * STAGE_COLS + x] = ENEMY_DEFAULT;
    }
  }
  for (let x = 1; x < STAGE_COLS - 1; x++) {
    if (x % 3 !== 0) s2.walls[2 * STAGE_COLS + x] = WALL_CELL;
  }

  const s3 = makeEmptyStage('ウォール');
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < STAGE_COLS; x++) {
      if (y < 2) {
        if (x % 2 === 0) s3.grid[y * STAGE_COLS + x] = ENEMY_DEFAULT;
      } else if (y < 4) {
        if (x % 3 !== 0) s3.grid[y * STAGE_COLS + x] = ENEMY_DEFAULT;
      } else {
        if (x % 2 === 1) s3.grid[y * STAGE_COLS + x] = ENEMY_DEFAULT;
      }
    }
  }
  for (let x = 0; x < STAGE_COLS; x++) {
    if (x % 2 === 1) s3.walls[0 * STAGE_COLS + x] = WALL_CELL;
    if (x % 3 !== 0) s3.walls[3 * STAGE_COLS + x] = WALL_CELL;
  }

  return [s1, s2, s3].map(normalizeStage);
}

export function ensureStages() {
  const defaults = getDefaultStages();
  const user = loadUserStages();

  // De-duplicate by name (user overrides defaults with same name).
  const defaultNames = new Set(defaults.map((s) => s.name));
  const byName = new Map();
  defaults.forEach((s) => byName.set(s.name, s));
  user.forEach((s) => byName.set(s.name, s));

  const merged = [];
  for (const d of defaults) merged.push(byName.get(d.name));
  for (const u of user) {
    if (!defaultNames.has(u.name)) merged.push(u);
  }
  return merged.filter(Boolean);
}

export function getStageFromUrl() {
  const sp = new URLSearchParams(location.search);
  const s = sp.get('stage');
  return typeof s === 'string' && s.trim() ? s.trim() : null;
}

export function stageHref(page, name) {
  if (!name) return page;
  return `${page}?stage=${encodeURIComponent(name)}`;
}

export function getOwnerId() {
  const p = getCurrentPlayer();
  return p?.id != null ? String(p.id) : 'unknown';
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

function normalizePixelsSize(width, height, pixels) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const expected = w * h;
  if (pixels instanceof Uint32Array && pixels.length === expected) return pixels;
  const out = new Uint32Array(expected);
  if (!(pixels instanceof Uint32Array)) return out;
  out.set(pixels.subarray(0, Math.min(expected, pixels.length)), 0);
  return out;
}

function isSampleToken(token) {
  return typeof token === 'string' && token.startsWith('sample_');
}

function sampleIdToToken(sampleId) {
  return `sample_${String(sampleId || '').trim()}`;
}

function findSampleByToken(token) {
  if (!isSampleToken(token)) return null;
  const id = token.slice('sample_'.length);
  const samples = Array.isArray(samplePack?.samples) ? samplePack.samples : [];
  return samples.find((s) => String(s?.id || '') === id) || null;
}

function sampleToPixelAsset(sample) {
  const w = Number(sample?.width) || 16;
  const h = Number(sample?.height) || 16;
  const now = new Date().toISOString();

  const rawFrames = Array.isArray(sample?.frames) && sample.frames.length > 0 ? sample.frames : null;
  const frames = rawFrames
    ? rawFrames.map((f, i) => ({
        index: i,
        width: w,
        height: h,
        pixels: new Uint32Array(normalizePixelsSize(w, h, decodePixelsB64(f?.pixelsB64))),
        durationMs: Number(f?.durationMs ?? 120) || 120
      }))
    : [
        {
          index: 0,
          width: w,
          height: h,
          pixels: new Uint32Array(normalizePixelsSize(w, h, decodePixelsB64(sample?.pixelsB64))),
          durationMs: 120
        }
      ];

  const frame0 = frames[0];
  return {
    id: sampleIdToToken(sample?.id),
    ownerId: 'sample',
    name: sample?.name || 'サンプル',
    kind: sample?.kind || 'character',
    width: w,
    height: h,
    pixels: frame0?.pixels ? new Uint32Array(frame0.pixels) : new Uint32Array(w * h),
    frames,
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

export async function listEnemyAssetsForCurrentPlayer() {
  const ownerId = getOwnerId();
  const assets = await listPixelAssets({ ownerId, kind: 'character' });
  const user = Array.isArray(assets) ? assets : [];

  const samples = Array.isArray(samplePack?.samples) ? samplePack.samples : [];
  const sampleChars = samples.filter((s) => (s?.kind || 'character') === 'character').map(sampleToPixelAsset);

  return [...sampleChars, ...user];
}

export function previewUrlForAsset(asset) {
  return assetPreviewDataUrl(asset, 72);
}

function framePixelsToDataUrl(pixels, width, height) {
  const c = document.createElement('canvas');
  renderPixelsToCanvas(c, pixels, width, height);
  return c.toDataURL('image/png');
}

/**
 * @typedef {{img:HTMLImageElement,width:number,height:number,durationMs:number}} EnemySpriteFrame
 * @typedef {{kind:'default'|'missing'|'asset',id:string,frames:EnemySpriteFrame[],totalDurationMs:number}} EnemySprite
 */

export async function loadEnemySprite(enemyToken) {
  if (!enemyToken || enemyToken === ENEMY_DEFAULT) {
    return { kind: 'default', id: ENEMY_DEFAULT, frames: [], totalDurationMs: 0 };
  }

  let asset = null;
  if (isSampleToken(enemyToken)) {
    const s = findSampleByToken(enemyToken);
    if (s) asset = sampleToPixelAsset(s);
  } else {
    asset = await getPixelAsset(enemyToken);
  }

  if (!asset) return { kind: 'missing', id: enemyToken, frames: [], totalDurationMs: 0 };

  const rawFrames = Array.isArray(asset.frames) && asset.frames.length > 0 ? asset.frames : null;
  const frames = rawFrames
    ? rawFrames
        .slice()
        .sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0))
        .map((f, i) => ({
          index: i,
          width: Number(f.width ?? asset.width) || asset.width,
          height: Number(f.height ?? asset.height) || asset.height,
          pixels: f.pixels instanceof Uint32Array ? f.pixels : new Uint32Array(f.pixels || []),
          durationMs: Number(f.durationMs ?? 120) || 120
        }))
    : [
        {
          index: 0,
          width: asset.width,
          height: asset.height,
          pixels: asset.pixels instanceof Uint32Array ? asset.pixels : new Uint32Array(asset.pixels || []),
          durationMs: 120
        }
      ];

  /** @type {EnemySpriteFrame[]} */
  const outFrames = [];
  let totalDurationMs = 0;
  for (const f of frames) {
    const url = framePixelsToDataUrl(f.pixels, f.width, f.height);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode().catch(() => {});
    const durationMs = Number(f.durationMs ?? 120) || 120;
    totalDurationMs += durationMs;
    outFrames.push({ img, width: f.width, height: f.height, durationMs });
  }
  totalDurationMs = Math.max(1, totalDurationMs);

  return { kind: 'asset', id: enemyToken, frames: outFrames, totalDurationMs };
}

