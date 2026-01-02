import { getCurrentPlayer } from '../../js/auth.js';
import { supabase } from '../../js/supabaseClient.js';

// =========================================================
// Shared helpers & stage store (Brick Breaker)
// =========================================================

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

export const STAGE_COLS = 14;
export const STAGE_ROWS = 10;
export const STORAGE_KEY = 'ngames.brickBreaker.stages.v1';
export const STAGES_TABLE = 'brick_breaker_stages';

// ブロック種
export const TILE = {
  EMPTY: 0,
  NORMAL: 1,
  TOUGH: 2,
  SPLIT: 3,
  SOFT: 4, // 壊れるが反射しない
  WALL: 5 // 壊れない
};

export function makeEmptyStage(name = '新しいステージ') {
  return {
    version: 1,
    name,
    cols: STAGE_COLS,
    rows: STAGE_ROWS,
    grid: Array.from({ length: STAGE_COLS * STAGE_ROWS }, () => TILE.EMPTY)
  };
}

export function normalizeStage(stage) {
  const cols = STAGE_COLS;
  const rows = STAGE_ROWS;
  const raw = Array.isArray(stage?.grid) ? stage.grid : [];
  const grid = new Array(cols * rows);
  for (let i = 0; i < grid.length; i++) {
    const v = raw[i];
    grid[i] =
      v === TILE.NORMAL ||
      v === TILE.TOUGH ||
      v === TILE.SPLIT ||
      v === TILE.SOFT ||
      v === TILE.WALL
        ? v
        : TILE.EMPTY;
  }
  const name = typeof stage?.name === 'string' && stage.name.trim() ? stage.name.trim() : 'ななしのステージ';
  return { version: 1, name, cols, rows, grid };
}

export function loadAllStagesCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeStage);
  } catch {
    return [];
  }
}

export function saveAllStagesCache(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertStageCache(stage) {
  const list = loadAllStagesCache();
  const s = normalizeStage(stage);
  const idx = list.findIndex(x => x.name === s.name);
  if (idx >= 0) list[idx] = s;
  else list.unshift(s);
  saveAllStagesCache(list);
  return list;
}

export function getDefaultStages() {
  // 0: empty, 1: normal, 2: tough, 3: split, 4: soft, 5: wall
  const a = makeEmptyStage('はじめて');
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < STAGE_COLS; c++) {
      a.grid[r * STAGE_COLS + c] = TILE.NORMAL;
    }
  }

  const b = makeEmptyStage('かたいよ');
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < STAGE_COLS; c++) {
      b.grid[r * STAGE_COLS + c] = (r === 0 || r === 3) ? TILE.TOUGH : TILE.NORMAL;
    }
  }

  const c = makeEmptyStage('ぶんれつ祭り');
  for (let r = 0; r < 5; r++) {
    for (let col = 0; col < STAGE_COLS; col++) {
      if ((r + col) % 3 === 0) c.grid[r * STAGE_COLS + col] = TILE.SPLIT;
      else c.grid[r * STAGE_COLS + col] = TILE.NORMAL;
    }
  }

  const d = makeEmptyStage('やわらか&かべ');
  // 上段: かべ、中央: やわらか、残り: ふつう
  for (let col = 0; col < STAGE_COLS; col++) d.grid[0 * STAGE_COLS + col] = TILE.WALL;
  for (let col = 0; col < STAGE_COLS; col++) d.grid[2 * STAGE_COLS + col] = TILE.SOFT;
  for (let col = 0; col < STAGE_COLS; col++) d.grid[4 * STAGE_COLS + col] = TILE.NORMAL;

  return [normalizeStage(a), normalizeStage(b), normalizeStage(c), normalizeStage(d)];
}

export function ensureStages() {
  let list = loadAllStagesCache();
  if (list.length === 0) {
    list = getDefaultStages();
    saveAllStagesCache(list);
  }
  return list;
}

export async function fetchAllStagesFromSupabase() {
  const { data, error } = await supabase
    .from(STAGES_TABLE)
    .select('name,data,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map(row => normalizeStage({ ...(row.data || {}), name: row.name }));
}

export async function refreshStageCacheFromSupabase({ showError = false, onError } = {}) {
  try {
    const list = await fetchAllStagesFromSupabase();
    saveAllStagesCache(list);
    return list;
  } catch (e) {
    console.error('Failed to fetch stages from Supabase:', e);
    if (showError && typeof onError === 'function') onError(e);
    return loadAllStagesCache();
  }
}

export async function upsertStageToSupabase(stage) {
  const s = normalizeStage(stage);
  const p = getCurrentPlayer();
  const payload = {
    name: s.name,
    data: s,
    created_by: p?.id ?? null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from(STAGES_TABLE)
    .upsert(payload, { onConflict: 'name' });
  if (error) throw error;

  upsertStageCache(s);
  return s;
}

export async function deleteStageFromSupabaseByName(name) {
  const { error } = await supabase
    .from(STAGES_TABLE)
    .delete()
    .eq('name', name);
  if (error) throw error;

  const after = loadAllStagesCache().filter(x => x.name !== name);
  saveAllStagesCache(after);
  return after;
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

export function countBlocks(stage) {
  const s = normalizeStage(stage);
  let n = 0;
  for (const t of s.grid) if (t !== TILE.EMPTY) n++;
  return n;
}

