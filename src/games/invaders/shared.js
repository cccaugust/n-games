import { getCurrentPlayer } from '../../js/auth.js';
import { assetPreviewDataUrl, assetToPngDataUrl, getPixelAsset, listPixelAssets } from '../../js/pixelAssets.js';

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

export async function listEnemyAssetsForCurrentPlayer() {
  const ownerId = getOwnerId();
  const assets = await listPixelAssets({ ownerId, kind: 'character' });
  return assets || [];
}

export function previewUrlForAsset(asset) {
  return assetPreviewDataUrl(asset, 72);
}

export async function loadEnemySpriteImage(enemyToken) {
  if (!enemyToken || enemyToken === ENEMY_DEFAULT) return { kind: 'default', id: ENEMY_DEFAULT, img: null };
  const asset = await getPixelAsset(enemyToken);
  if (!asset) return { kind: 'missing', id: enemyToken, img: null };
  const url = assetToPngDataUrl(asset);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode().catch(() => {});
  return { kind: 'asset', id: enemyToken, img, width: asset.width, height: asset.height };
}

