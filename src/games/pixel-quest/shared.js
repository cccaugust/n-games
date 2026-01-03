import { getCurrentPlayer } from '../../js/auth.js';
import { assetPreviewDataUrl, assetToPngDataUrl, getPixelAsset, listPixelAssets } from '../../js/pixelAssets.js';

export const GAME_ID = 'pixel-quest';
export const STAGE_COLS = 16;
export const STAGE_ROWS = 12;
export const STORAGE_KEY = 'ngames.pixelQuest.stages.v1';

// Tile types (grid cell)
export const TILE = {
  FLOOR: 0,
  WALL: 1,
  GEM: 2,
  SPIKE: 3,
  GOAL: 4,
  START: 5
};

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
    version: 1,
    name,
    cols: STAGE_COLS,
    rows: STAGE_ROWS,
    grid: Array.from({ length: STAGE_COLS * STAGE_ROWS }, () => TILE.FLOOR),
    // Look & feel (optional PixelAsset ids)
    skin: {
      playerAssetId: null,
      wallAssetId: null,
      gemAssetId: null,
      goalAssetId: null,
      spikeAssetId: null
    }
  };
}

function normalizeSkin(skin) {
  const raw = skin && typeof skin === 'object' ? skin : {};
  const toId = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  return {
    playerAssetId: toId(raw.playerAssetId),
    wallAssetId: toId(raw.wallAssetId),
    gemAssetId: toId(raw.gemAssetId),
    goalAssetId: toId(raw.goalAssetId),
    spikeAssetId: toId(raw.spikeAssetId)
  };
}

export function normalizeStage(stage) {
  const cols = STAGE_COLS;
  const rows = STAGE_ROWS;
  const rawGrid = Array.isArray(stage?.grid) ? stage.grid : [];
  const grid = new Array(cols * rows);
  for (let i = 0; i < grid.length; i++) {
    const v = rawGrid[i];
    grid[i] =
      v === TILE.FLOOR ||
      v === TILE.WALL ||
      v === TILE.GEM ||
      v === TILE.SPIKE ||
      v === TILE.GOAL ||
      v === TILE.START
        ? v
        : TILE.FLOOR;
  }

  // Ensure exactly 1 START and 1 GOAL (keep first occurrence; others become FLOOR)
  let foundStart = false;
  let foundGoal = false;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === TILE.START) {
      if (foundStart) grid[i] = TILE.FLOOR;
      foundStart = true;
    }
    if (grid[i] === TILE.GOAL) {
      if (foundGoal) grid[i] = TILE.FLOOR;
      foundGoal = true;
    }
  }
  // If missing, place default positions.
  if (!foundStart) grid[(rows - 2) * cols + 1] = TILE.START;
  if (!foundGoal) grid[1 * cols + (cols - 2)] = TILE.GOAL;

  const name = typeof stage?.name === 'string' && stage.name.trim() ? stage.name.trim() : 'ななしのステージ';
  return { version: 1, name, cols, rows, grid, skin: normalizeSkin(stage?.skin) };
}

export function countGems(stage) {
  const s = normalizeStage(stage);
  let n = 0;
  for (const t of s.grid) if (t === TILE.GEM) n++;
  return n;
}

export function findStart(stage) {
  const s = normalizeStage(stage);
  const idx = s.grid.findIndex((t) => t === TILE.START);
  const i = idx >= 0 ? idx : 0;
  return { x: i % s.cols, y: (i / s.cols) | 0 };
}

export function findGoal(stage) {
  const s = normalizeStage(stage);
  const idx = s.grid.findIndex((t) => t === TILE.GOAL);
  const i = idx >= 0 ? idx : 0;
  return { x: i % s.cols, y: (i / s.cols) | 0 };
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
  // Small handcrafted stages.
  const s1 = makeEmptyStage('はじめての宝石');
  // Border walls
  for (let x = 0; x < STAGE_COLS; x++) {
    s1.grid[0 * STAGE_COLS + x] = TILE.WALL;
    s1.grid[(STAGE_ROWS - 1) * STAGE_COLS + x] = TILE.WALL;
  }
  for (let y = 0; y < STAGE_ROWS; y++) {
    s1.grid[y * STAGE_COLS + 0] = TILE.WALL;
    s1.grid[y * STAGE_COLS + (STAGE_COLS - 1)] = TILE.WALL;
  }
  s1.grid[(STAGE_ROWS - 2) * STAGE_COLS + 1] = TILE.START;
  s1.grid[1 * STAGE_COLS + (STAGE_COLS - 2)] = TILE.GOAL;
  s1.grid[(STAGE_ROWS - 2) * STAGE_COLS + 4] = TILE.GEM;
  s1.grid[(STAGE_ROWS - 3) * STAGE_COLS + 6] = TILE.GEM;
  s1.grid[(STAGE_ROWS - 4) * STAGE_COLS + 8] = TILE.GEM;

  const s2 = makeEmptyStage('トゲ注意');
  for (let x = 0; x < STAGE_COLS; x++) {
    s2.grid[0 * STAGE_COLS + x] = TILE.WALL;
    s2.grid[(STAGE_ROWS - 1) * STAGE_COLS + x] = TILE.WALL;
  }
  for (let y = 0; y < STAGE_ROWS; y++) {
    s2.grid[y * STAGE_COLS + 0] = TILE.WALL;
    s2.grid[y * STAGE_COLS + (STAGE_COLS - 1)] = TILE.WALL;
  }
  s2.grid[(STAGE_ROWS - 2) * STAGE_COLS + 1] = TILE.START;
  s2.grid[1 * STAGE_COLS + (STAGE_COLS - 2)] = TILE.GOAL;
  for (let x = 3; x < STAGE_COLS - 3; x++) s2.grid[5 * STAGE_COLS + x] = TILE.SPIKE;
  s2.grid[3 * STAGE_COLS + 6] = TILE.GEM;
  s2.grid[8 * STAGE_COLS + 10] = TILE.GEM;

  const s3 = makeEmptyStage('まよいみち');
  // Maze-ish walls
  for (let x = 0; x < STAGE_COLS; x++) {
    s3.grid[0 * STAGE_COLS + x] = TILE.WALL;
    s3.grid[(STAGE_ROWS - 1) * STAGE_COLS + x] = TILE.WALL;
  }
  for (let y = 0; y < STAGE_ROWS; y++) {
    s3.grid[y * STAGE_COLS + 0] = TILE.WALL;
    s3.grid[y * STAGE_COLS + (STAGE_COLS - 1)] = TILE.WALL;
  }
  for (let y = 2; y < STAGE_ROWS - 2; y++) {
    if (y % 2 === 0) {
      for (let x = 2; x < STAGE_COLS - 2; x++) if (x % 3 !== 0) s3.grid[y * STAGE_COLS + x] = TILE.WALL;
    }
  }
  s3.grid[(STAGE_ROWS - 2) * STAGE_COLS + 1] = TILE.START;
  s3.grid[1 * STAGE_COLS + (STAGE_COLS - 2)] = TILE.GOAL;
  s3.grid[2 * STAGE_COLS + 2] = TILE.GEM;
  s3.grid[6 * STAGE_COLS + 7] = TILE.GEM;
  s3.grid[9 * STAGE_COLS + 13] = TILE.GEM;

  const s4 = makeEmptyStage('ぜんぶ集めて');
  for (let x = 0; x < STAGE_COLS; x++) {
    s4.grid[0 * STAGE_COLS + x] = TILE.WALL;
    s4.grid[(STAGE_ROWS - 1) * STAGE_COLS + x] = TILE.WALL;
  }
  for (let y = 0; y < STAGE_ROWS; y++) {
    s4.grid[y * STAGE_COLS + 0] = TILE.WALL;
    s4.grid[y * STAGE_COLS + (STAGE_COLS - 1)] = TILE.WALL;
  }
  s4.grid[(STAGE_ROWS - 2) * STAGE_COLS + 1] = TILE.START;
  s4.grid[1 * STAGE_COLS + (STAGE_COLS - 2)] = TILE.GOAL;
  for (let y = 2; y < STAGE_ROWS - 2; y += 2) {
    for (let x = 2; x < STAGE_COLS - 2; x += 2) s4.grid[y * STAGE_COLS + x] = TILE.GEM;
  }

  return [s1, s2, s3, s4].map(normalizeStage);
}

export function ensureStages() {
  const defaults = getDefaultStages();
  const user = loadUserStages();
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

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function getOwnerId() {
  const p = getCurrentPlayer();
  return p?.id != null ? String(p.id) : 'unknown';
}

export async function listAssetsForPicker({ ownerOnly = true } = {}) {
  const ownerId = ownerOnly ? getOwnerId() : undefined;
  const list = await listPixelAssets(ownerId ? { ownerId } : undefined);
  return Array.isArray(list) ? list : [];
}

export function previewUrlForAsset(asset) {
  return assetPreviewDataUrl(asset, 72);
}

/**
 * Load a PixelAsset as an <img> with caching.
 * @returns {Promise<{kind:'none'|'asset'|'missing', id:string|null, img:HTMLImageElement|null, width?:number, height?:number}>}
 */
export async function loadAssetImage(assetId) {
  if (!assetId) return { kind: 'none', id: null, img: null };
  const asset = await getPixelAsset(assetId).catch(() => null);
  if (!asset) return { kind: 'missing', id: assetId, img: null };
  const url = assetToPngDataUrl(asset);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode().catch(() => {});
  return { kind: 'asset', id: assetId, img, width: asset.width, height: asset.height };
}

