/**
 * 保存（localStorage）：ワールド 3 スロット + 設定
 */
const KEY = 'block-world:v1';
export const SLOT_COUNT = 3;

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) { return {}; }
}
function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch (e) { console.warn('save failed', e); return false; }
}

export function loadSettings() {
  const d = read();
  return {
    renderDistance: 0, // 0 = 自動
    sound: true,
    music: true,
    alwaysDay: false,
    autoJump: true,
    sensitivity: 1,
    showCoords: false,
    fov: 70,
    ...(d.settings || {})
  };
}
export function saveSettings(s) {
  const d = read();
  d.settings = s;
  write(d);
}

export function listWorlds() {
  const d = read();
  const worlds = d.worlds || [];
  const out = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const w = worlds[i];
    out.push(w ? { name: w.name, seed: w.seed, mode: w.mode, lastPlayed: w.lastPlayed, edits: Object.keys(w.edits || {}).length, playTime: w.playTime || 0 } : null);
  }
  return out;
}

export function loadWorld(slot) {
  const d = read();
  return (d.worlds || [])[slot] || null;
}

export function saveWorld(slot, data) {
  const d = read();
  d.worlds = d.worlds || [];
  d.worlds[slot] = data;
  return write(d);
}

export function deleteWorld(slot) {
  const d = read();
  if (d.worlds) d.worlds[slot] = null;
  write(d);
}
