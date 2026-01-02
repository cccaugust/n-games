// 3D迷路メーカー（最小版）
// - 作成モード: 64x64 グリッドをペイント
// - プレイモード: レイキャストで簡易3D表示

import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { supabase } from '../../js/supabaseClient.js';

const SIZE = 64;
// Supabase保存のローカルキャッシュ（オフライン/初回表示用）
const STORAGE_KEY = 'ngames.mazes.v1';
const BEST_TIME_KEY = 'ngames.mazes.bestTime.v1';

// Tile types
const TILE = {
  PATH: 0,
  WALL: 1
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// --- Touch Controls (Virtual Joystick) ---
const joystickZone = document.getElementById('joystick-zone');
const input = {
  joystick: { x: 0, y: 0, active: false }
};

const joystick = {
  pointerId: null,
  centerX: 0,
  centerY: 0,
  maxRadius: 68,
  deadZone: 0.12,
  stickEl: null
};

function resetJoystick() {
  input.joystick.x = 0;
  input.joystick.y = 0;
  input.joystick.active = false;
  joystick.pointerId = null;
  if (joystick.stickEl) {
    joystick.stickEl.style.transform = 'translate(-50%, -50%)';
  }
}

function updateJoystickFromPointer(clientX, clientY) {
  const dx = clientX - joystick.centerX;
  const dy = clientY - joystick.centerY;

  const dist = Math.hypot(dx, dy);
  const clamped = Math.min(joystick.maxRadius, dist);
  const angle = Math.atan2(dy, dx);

  const px = Math.cos(angle) * (dist === 0 ? 0 : clamped);
  const py = Math.sin(angle) * (dist === 0 ? 0 : clamped);

  if (joystick.stickEl) {
    joystick.stickEl.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
  }

  let nx = px / joystick.maxRadius;
  let ny = py / joystick.maxRadius;

  const nLen = Math.hypot(nx, ny);
  if (nLen > 1) {
    nx /= nLen;
    ny /= nLen;
  }
  if (nLen < joystick.deadZone) {
    nx = 0;
    ny = 0;
  }

  input.joystick.x = clamp(nx, -1, 1);
  input.joystick.y = clamp(ny, -1, 1);
}

function setupJoystick() {
  if (!joystickZone) return;
  if (!isTouchDevice()) return;
  if (joystickZone.dataset.ready === '1') return;
  joystickZone.dataset.ready = '1';

  joystickZone.innerHTML = `
    <div class="joystick-base" aria-hidden="true">
      <div class="joystick-stick" aria-hidden="true"></div>
    </div>
  `;
  joystick.stickEl = joystickZone.querySelector('.joystick-stick');

  joystickZone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!isPlaying) return;
    if (joystick.pointerId !== null) return;

    joystick.pointerId = e.pointerId;
    input.joystick.active = true;

    const rect = joystickZone.getBoundingClientRect();
    joystick.centerX = rect.left + rect.width / 2;
    joystick.centerY = rect.top + rect.height / 2;

    updateJoystickFromPointer(e.clientX, e.clientY);
    joystickZone.setPointerCapture?.(e.pointerId);
  });

  joystickZone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joystick.pointerId) return;
    e.preventDefault();
    updateJoystickFromPointer(e.clientX, e.clientY);
  });

  function onEnd(e) {
    if (e.pointerId !== joystick.pointerId) return;
    e.preventDefault();
    resetJoystick();
  }
  joystickZone.addEventListener('pointerup', onEnd);
  joystickZone.addEventListener('pointercancel', onEnd);
}

// タッチ端末用のCSSフラグ（タブレットでボタンが隠れないようにする）
if (isTouchDevice()) {
  document.documentElement.classList.add('touch-device');
}

function makeEmptyMaze(name = '新しい迷路') {
  const grid = new Uint8Array(SIZE * SIZE);
  // outer border as wall
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      grid[y * SIZE + x] = isBorder ? TILE.WALL : TILE.PATH;
    }
  }
  return {
    version: 1,
    name,
    w: SIZE,
    h: SIZE,
    grid: Array.from(grid), // localStorage用に配列化
    start: { x: 1, y: 1, dir: 0 },
    goal: { x: SIZE - 2, y: SIZE - 2 }
  };
}

function normalizeMaze(maze) {
  const w = maze?.w === SIZE ? SIZE : SIZE;
  const h = maze?.h === SIZE ? SIZE : SIZE;

  const raw = Array.isArray(maze?.grid) ? maze.grid : [];
  const grid = new Uint8Array(SIZE * SIZE);
  for (let i = 0; i < grid.length; i++) grid[i] = raw[i] === TILE.WALL ? TILE.WALL : TILE.PATH;

  // ensure border wall
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
      if (isBorder) grid[y * SIZE + x] = TILE.WALL;
    }
  }

  const start = maze?.start ?? { x: 1, y: 1, dir: 0 };
  const goal = maze?.goal ?? { x: SIZE - 2, y: SIZE - 2 };
  const safe = {
    version: 1,
    name: typeof maze?.name === 'string' && maze.name.trim() ? maze.name.trim() : 'ななしの迷路',
    w,
    h,
    grid: Array.from(grid),
    start: {
      x: clamp(Math.floor(start.x ?? 1), 1, SIZE - 2),
      y: clamp(Math.floor(start.y ?? 1), 1, SIZE - 2),
      dir: Number.isFinite(start.dir) ? start.dir : 0
    },
    goal: {
      x: clamp(Math.floor(goal.x ?? SIZE - 2), 1, SIZE - 2),
      y: clamp(Math.floor(goal.y ?? SIZE - 2), 1, SIZE - 2)
    }
  };

  // make sure start/goal are on path
  const sIdx = safe.start.y * SIZE + safe.start.x;
  const gIdx = safe.goal.y * SIZE + safe.goal.x;
  if (grid[sIdx] === TILE.WALL) safe.grid[sIdx] = TILE.PATH;
  if (grid[gIdx] === TILE.WALL) safe.grid[gIdx] = TILE.PATH;
  return safe;
}

function loadAllMazesCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeMaze);
  } catch {
    return [];
  }
}

function saveAllMazesCache(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function upsertMazeCache(maze) {
  const list = loadAllMazesCache();
  const m = normalizeMaze(maze);
  const idx = list.findIndex(x => x.name === m.name);
  if (idx >= 0) list[idx] = m;
  else list.unshift(m);
  saveAllMazesCache(list);
  return list;
}

async function fetchAllMazesFromSupabase() {
  const { data, error } = await supabase
    .from('mazes')
    .select('name,data,updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map(row => normalizeMaze({ ...(row.data || {}), name: row.name }));
}

async function refreshMazeCacheFromSupabase({ showError = false } = {}) {
  try {
    const list = await fetchAllMazesFromSupabase();
    saveAllMazesCache(list);
    return list;
  } catch (e) {
    console.error('Failed to fetch mazes from Supabase:', e);
    if (showError) showOverlay('通信エラー', 'Supabaseから迷路を読みこめなかったよ。ネットワークを確認してね。');
    return loadAllMazesCache();
  }
}

async function upsertMazeToSupabase(maze) {
  const m = normalizeMaze(maze);
  const p = getCurrentPlayer();

  const payload = {
    name: m.name,
    data: m,
    created_by: p?.id ?? null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('mazes')
    .upsert(payload, { onConflict: 'name' });

  if (error) throw error;
  // cache update (optimistic)
  upsertMazeCache(m);
  return m;
}

async function deleteMazeFromSupabaseByName(name) {
  const { error } = await supabase
    .from('mazes')
    .delete()
    .eq('name', name);
  if (error) throw error;

  const after = loadAllMazesCache().filter(x => x.name !== name);
  saveAllMazesCache(after);
  return after;
}

function getDefaultMazes() {
  const m = makeEmptyMaze('サンプル');
  // add some simple walls
  for (let x = 2; x < SIZE - 2; x++) m.grid[10 * SIZE + x] = TILE.WALL;
  for (let y = 12; y < SIZE - 6; y++) m.grid[y * SIZE + 20] = TILE.WALL;
  m.start = { x: 2, y: 2, dir: 0 };
  m.goal = { x: SIZE - 3, y: SIZE - 3 };
  return [normalizeMaze(m)];
}

// DOM
const tabEditor = document.getElementById('tabEditor');
const tabPlay = document.getElementById('tabPlay');
const panelEditor = document.getElementById('panelEditor');
const panelPlay = document.getElementById('panelPlay');
const mazeStatus = document.getElementById('mazeStatus');

const editorCanvas = document.getElementById('editorCanvas');
const ectx = editorCanvas.getContext('2d');
const playCanvas = document.getElementById('playCanvas');
const pctx = playCanvas.getContext('2d');
const minimapCanvas = document.getElementById('minimapCanvas');
const mctx = minimapCanvas?.getContext('2d');

const toolButtons = Array.from(document.querySelectorAll('.tool-btn[data-tool]'));
const mazeNameEl = document.getElementById('mazeName');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const clearBtn = document.getElementById('clearBtn');

const mazeSelect = document.getElementById('mazeSelect');
const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const timeLabel = document.getElementById('timeLabel');
const bestLabel = document.getElementById('bestLabel');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayExtra = document.getElementById('overlayExtra');
const overlayClose = document.getElementById('overlayClose');

// Library modal
const libraryOverlay = document.getElementById('libraryOverlay');
const libraryClose = document.getElementById('libraryClose');
const libraryNew = document.getElementById('libraryNew');
const libraryExportAll = document.getElementById('libraryExportAll');
const libraryImportBtn = document.getElementById('libraryImportBtn');
const libraryImportFile = document.getElementById('libraryImportFile');
const libraryListEl = document.getElementById('libraryList');
const libraryCountEl = document.getElementById('libraryCount');

// State (Editor)
let currentTool = 'wall';
let currentMaze = makeEmptyMaze('新しい迷路');

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach(btn => {
    btn.dataset.active = btn.dataset.tool === tool ? 'true' : 'false';
  });
}
setTool('wall');

function setTab(tab) {
  const isEditor = tab === 'editor';
  tabEditor.setAttribute('aria-selected', isEditor ? 'true' : 'false');
  tabPlay.setAttribute('aria-selected', isEditor ? 'false' : 'true');
  panelEditor.classList.toggle('hidden', !isEditor);
  panelPlay.classList.toggle('hidden', isEditor);
  if (!isEditor) {
    syncMazeSelect();
    resizePlayCanvas();
    draw3D(); // show preview
  } else {
    resizeEditorCanvas();
    drawEditor();
  }
}

tabEditor.addEventListener('click', () => setTab('editor'));
tabPlay.addEventListener('click', () => setTab('play'));

function gridIndex(x, y) {
  return y * SIZE + x;
}

function getCellFromPointer(evt) {
  const rect = editorCanvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) / rect.width;
  const y = (evt.clientY - rect.top) / rect.height;
  const cx = clamp(Math.floor(x * SIZE), 0, SIZE - 1);
  const cy = clamp(Math.floor(y * SIZE), 0, SIZE - 1);
  return { x: cx, y: cy };
}

function applyToolAt(x, y) {
  // keep border as wall
  const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
  if (isBorder) return;

  const idx = gridIndex(x, y);
  if (currentTool === 'wall') {
    currentMaze.grid[idx] = TILE.WALL;
  } else if (currentTool === 'path') {
    currentMaze.grid[idx] = TILE.PATH;
  } else if (currentTool === 'start') {
    currentMaze.start = { x, y, dir: currentMaze.start.dir ?? 0 };
    currentMaze.grid[idx] = TILE.PATH;
  } else if (currentTool === 'goal') {
    currentMaze.goal = { x, y };
    currentMaze.grid[idx] = TILE.PATH;
  }
}

function resizeEditorCanvas() {
  // Keep canvas crisp while matching layout width
  const max = Math.min(900, window.innerWidth - 40);
  const px = Math.max(320, max);
  editorCanvas.width = px;
  editorCanvas.height = px;
}

function drawEditor() {
  const w = editorCanvas.width;
  const h = editorCanvas.height;
  ectx.clearRect(0, 0, w, h);

  const cell = w / SIZE;

  // Background
  ectx.fillStyle = '#f8f9ff';
  ectx.fillRect(0, 0, w, h);

  // Tiles
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const t = currentMaze.grid[gridIndex(x, y)] === TILE.WALL ? TILE.WALL : TILE.PATH;
      if (t === TILE.WALL) {
        ectx.fillStyle = '#2d3436';
        ectx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  // Grid lines (light)
  ectx.strokeStyle = 'rgba(0,0,0,0.06)';
  ectx.lineWidth = 1;
  for (let i = 0; i <= SIZE; i++) {
    const p = Math.round(i * cell) + 0.5;
    ectx.beginPath();
    ectx.moveTo(p, 0);
    ectx.lineTo(p, h);
    ectx.stroke();
    ectx.beginPath();
    ectx.moveTo(0, p);
    ectx.lineTo(w, p);
    ectx.stroke();
  }

  // Start/Goal markers
  const { start, goal } = currentMaze;
  ectx.fillStyle = '#00cec9';
  ectx.fillRect(start.x * cell, start.y * cell, cell, cell);
  ectx.fillStyle = '#ffeaa7';
  ectx.fillRect(goal.x * cell, goal.y * cell, cell, cell);

  ectx.fillStyle = 'rgba(0,0,0,0.75)';
  ectx.font = `${Math.max(10, Math.floor(cell * 0.55))}px Outfit, sans-serif`;
  ectx.textAlign = 'center';
  ectx.textBaseline = 'middle';
  ectx.fillText('S', start.x * cell + cell / 2, start.y * cell + cell / 2);
  ectx.fillText('G', goal.x * cell + cell / 2, goal.y * cell + cell / 2);

  mazeStatus.textContent = `${SIZE}×${SIZE}`;
}

let isPainting = false;
let lastPaint = null;
editorCanvas.addEventListener('pointerdown', (e) => {
  editorCanvas.setPointerCapture?.(e.pointerId);
  isPainting = true;
  const c = getCellFromPointer(e);
  lastPaint = c;
  applyToolAt(c.x, c.y);
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointermove', (e) => {
  if (!isPainting) return;
  const c = getCellFromPointer(e);
  if (lastPaint && c.x === lastPaint.x && c.y === lastPaint.y) return;
  lastPaint = c;
  applyToolAt(c.x, c.y);
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointerup', () => {
  isPainting = false;
  lastPaint = null;
});
editorCanvas.addEventListener('pointercancel', () => {
  isPainting = false;
  lastPaint = null;
});

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

saveBtn.addEventListener('click', () => {
  void (async () => {
    const name = (mazeNameEl.value || '').trim();
    if (!name) {
      showOverlay('名前がいるよ', '「名前」を入れてから保存してね。');
      return;
    }
    const prevDisabled = saveBtn.disabled;
    saveBtn.disabled = true;
    try {
      currentMaze.name = name;
      showOverlay('保存中…', 'Supabaseに保存しているよ。');
      await upsertMazeToSupabase(currentMaze);
      await refreshMazeCacheFromSupabase();
      showOverlay('保存したよ', `「${currentMaze.name}」を保存しました。`);
      syncMazeSelect(currentMaze.name);
    } catch (e) {
      console.error(e);
      showOverlay('保存できなかった…', 'Supabaseに保存できなかったよ。');
    } finally {
      saveBtn.disabled = prevDisabled;
    }
  })();
});

loadBtn.addEventListener('click', () => {
  void (async () => {
    await refreshMazeCacheFromSupabase({ showError: true });
    openLibrary();
  })();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('いまの迷路をぜんぶ消す？（保存してないと元に戻せないよ）')) return;
  const name = (mazeNameEl.value || '').trim() || '新しい迷路';
  currentMaze = makeEmptyMaze(name);
  drawEditor();
});

function ensureMazes() {
  // Supabaseが主。ここは「キャッシュが空ならサンプルを入れる」だけ（即時表示用）。
  let list = loadAllMazesCache();
  if (list.length === 0) {
    list = getDefaultMazes();
    saveAllMazesCache(list);
  }
  return list;
}

function syncMazeSelect(selectName) {
  const list = ensureMazes();
  mazeSelect.innerHTML = '';
  list.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = m.name;
    mazeSelect.appendChild(opt);
  });
  if (selectName) mazeSelect.value = selectName;
}

// Overlay
function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  if (overlayExtra) overlayExtra.innerHTML = '';
  overlay.style.display = 'flex';
}

function showOverlayWithHtml(title, text, html) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  if (overlayExtra) overlayExtra.innerHTML = html || '';
  overlay.style.display = 'flex';
}
overlayClose.addEventListener('click', () => {
  overlay.style.display = 'none';
});
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) overlay.style.display = 'none';
});

// Library helpers
function openLibrary() {
  renderLibrary();
  libraryOverlay.style.display = 'flex';
  libraryOverlay.setAttribute('aria-hidden', 'false');
}

function closeLibrary() {
  libraryOverlay.style.display = 'none';
  libraryOverlay.setAttribute('aria-hidden', 'true');
}

function countWalls(maze) {
  let n = 0;
  for (let i = 0; i < maze.grid.length; i++) if (maze.grid[i] === TILE.WALL) n++;
  return n;
}

function uniqueName(baseName, existingNames) {
  const base = (baseName || 'ななしの迷路').trim() || 'ななしの迷路';
  if (!existingNames.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} (${i})`;
    if (!existingNames.has(candidate)) return candidate;
  }
  return `${base} (${Date.now()})`;
}

function renderLibrary() {
  const list = ensureMazes();
  libraryCountEl.textContent = `${list.length}こ`;
  libraryListEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'library-row';
    empty.innerHTML = `
      <div>
        <div style="font-weight: 900;">まだ迷路がないよ</div>
        <div style="opacity: 0.9; margin-top: 4px; font-size: 0.95rem;">作って「保存」するとここに出てくるよ。</div>
      </div>
      <div></div>
    `;
    libraryListEl.appendChild(empty);
    return;
  }

  list.forEach((m) => {
    const row = document.createElement('div');
    row.className = 'library-row';

    const walls = countWalls(m);
    const total = SIZE * SIZE;
    const density = Math.round((walls / total) * 100);

    const info = document.createElement('div');
    info.innerHTML = `
      <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
        <div style="font-weight: 900; font-size: 1.1rem;">${escapeHtml(m.name)}</div>
        <div style="opacity: 0.9; font-size: 0.9rem;">壁 ${walls} / ${total}（${density}%）</div>
      </div>
      <div style="opacity: 0.85; margin-top: 4px; font-size: 0.9rem;">S(${m.start.x},${m.start.y}) → G(${m.goal.x},${m.goal.y})</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'library-actions';

    const btnLoad = document.createElement('button');
    btnLoad.className = 'mini-btn';
    btnLoad.textContent = 'ロード';
    btnLoad.addEventListener('click', () => {
      currentMaze = normalizeMaze(m);
      mazeNameEl.value = currentMaze.name;
      closeLibrary();
      setTab('editor');
      drawEditor();
      syncMazeSelect(currentMaze.name);
      showOverlay('ロードしたよ', `「${currentMaze.name}」を読みこみました。`);
    });

    const btnExport = document.createElement('button');
    btnExport.className = 'mini-btn';
    btnExport.textContent = '書き出し';
    btnExport.addEventListener('click', () => {
      downloadJson(`${m.name}.maze.json`, m);
      showOverlay('書き出したよ', `「${m.name}」をファイルにしました。`);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'mini-btn danger';
    btnDelete.textContent = '削除';
    btnDelete.addEventListener('click', () => {
      void (async () => {
        if (!confirm(`「${m.name}」を削除する？（元に戻せないよ）`)) return;
        try {
          await deleteMazeFromSupabaseByName(m.name);
          await refreshMazeCacheFromSupabase();
          syncMazeSelect();
          renderLibrary();
          showOverlay('削除したよ', `「${m.name}」を削除しました。`);
        } catch (e) {
          console.error(e);
          showOverlay('削除できなかった…', 'Supabaseから削除できなかったよ。');
        }
      })();
    });

    actions.appendChild(btnLoad);
    actions.appendChild(btnExport);
    actions.appendChild(btnDelete);

    row.appendChild(info);
    row.appendChild(actions);
    libraryListEl.appendChild(row);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function downloadJson(filename, obj) {
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

async function importFromFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    showOverlay('インポート失敗', 'JSONファイルじゃないみたい。');
    return;
  }

  const incoming = Array.isArray(parsed) ? parsed : [parsed];
  const normalized = incoming.map(normalizeMaze);

  const existing = ensureMazes();
  const names = new Set(existing.map(m => m.name));

  // Supabaseへ保存（同名は自動リネームして upsert）
  let ok = 0;
  for (const m of normalized) {
    const name = uniqueName(m.name, names);
    names.add(name);
    try {
      await upsertMazeToSupabase({ ...m, name });
      ok++;
    } catch (e) {
      console.error('Import upsert failed:', e);
    }
  }

  await refreshMazeCacheFromSupabase();
  syncMazeSelect();
  renderLibrary();
  showOverlay('インポートOK', `${ok}こ取りこんだよ。`);
}

libraryClose?.addEventListener('click', closeLibrary);
libraryOverlay?.addEventListener('click', (e) => {
  if (e.target === libraryOverlay) closeLibrary();
});

libraryNew?.addEventListener('click', () => {
  closeLibrary();
  const name = '新しい迷路';
  currentMaze = makeEmptyMaze(name);
  mazeNameEl.value = currentMaze.name;
  setTab('editor');
  drawEditor();
});

libraryExportAll?.addEventListener('click', () => {
  const list = ensureMazes();
  downloadJson('n-games-mazes.json', list);
  showOverlay('書き出したよ', '全部の迷路を1つのファイルにしたよ。');
});

libraryImportBtn?.addEventListener('click', () => {
  libraryImportFile.value = '';
  libraryImportFile.click();
});
libraryImportFile?.addEventListener('change', async () => {
  const f = libraryImportFile.files?.[0];
  if (!f) return;
  await importFromFile(f);
});

// ==========================
// Play mode (Raycasting)
// ==========================

const keys = new Set();
document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
    e.preventDefault();
  }
  keys.add(k);
});
document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

// タッチ端末: 画面ドラッグで向きを変える（横ドラッグ = 回転）
let lookPointerId = null;
let lastLookX = 0;
const LOOK_SENSITIVITY = 0.006; // rad / px（大きいほど速く回る）

playCanvas?.addEventListener('pointerdown', (e) => {
  if (!isTouchDevice()) return;
  if (!isPlaying) return;
  if (lookPointerId != null) return;
  // ボタン操作と干渉しないよう、キャンバス上のみ対象
  lookPointerId = e.pointerId;
  lastLookX = e.clientX;
  playCanvas.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});

playCanvas?.addEventListener('pointermove', (e) => {
  if (!isTouchDevice()) return;
  if (lookPointerId == null) return;
  if (e.pointerId !== lookPointerId) return;
  if (!isPlaying) return;

  const dx = e.clientX - lastLookX;
  lastLookX = e.clientX;
  player.a += dx * LOOK_SENSITIVITY;
  e.preventDefault();
});

function endLook(e) {
  if (lookPointerId == null) return;
  if (e?.pointerId != null && e.pointerId !== lookPointerId) return;
  lookPointerId = null;
}

playCanvas?.addEventListener('pointerup', endLook);
playCanvas?.addEventListener('pointercancel', endLook);
playCanvas?.addEventListener('pointerleave', endLook);

let playingMaze = null;
let player = {
  x: 1.5,
  y: 1.5,
  a: 0, // angle
  speed: 2.6,
  turnSpeed: 2.3
};
let isPlaying = false;
let lastT = 0;
let runStartMs = 0;
let runBestMs = null;
let lastShownMs = 0;
let isFinishing = false;

function resizePlayCanvas() {
  const maxW = Math.min(980, window.innerWidth - 40);
  const w = Math.max(320, maxW);
  playCanvas.width = w;
  playCanvas.height = Math.floor(w * 0.56);
}

function mazeAt(mx, my) {
  if (!playingMaze) return TILE.WALL;
  const x = Math.floor(mx);
  const y = Math.floor(my);
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return TILE.WALL;
  return playingMaze.grid[gridIndex(x, y)] === TILE.WALL ? TILE.WALL : TILE.PATH;
}

function canMove(nx, ny) {
  // simple circle-ish collision by sampling a few points
  const r = 0.18;
  const samples = [
    [nx + r, ny],
    [nx - r, ny],
    [nx, ny + r],
    [nx, ny - r],
    [nx + r, ny + r],
    [nx - r, ny - r]
  ];
  return samples.every(([sx, sy]) => mazeAt(sx, sy) !== TILE.WALL);
}

function formatTime(ms) {
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(2)}s`;
  const m = Math.floor(s / 60);
  const rest = (s - m * 60).toFixed(2).padStart(5, '0');
  return `${m}:${rest}`;
}

function getMazeScoreId(mazeName) {
  // Supabaseのgame_idはテキストなので、迷路ごとに分ける
  return `maze:${String(mazeName || 'unknown').slice(0, 48)}`;
}

function loadBestTimeMap() {
  try {
    const raw = localStorage.getItem(BEST_TIME_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveBestTimeMap(map) {
  localStorage.setItem(BEST_TIME_KEY, JSON.stringify(map));
}

function updateBestLabel() {
  if (!bestLabel) return;
  if (!playingMaze) {
    bestLabel.textContent = '🏆 --';
    return;
  }
  const map = loadBestTimeMap();
  const best = map[playingMaze.name];
  if (typeof best === 'number') bestLabel.textContent = `🏆 ${formatTime(best)}`;
  else bestLabel.textContent = '🏆 --';
}

function updateTimeLabel(ms) {
  if (!timeLabel) return;
  timeLabel.textContent = `⏱️ ${formatTime(ms)}`;
}

function startPlay() {
  const list = ensureMazes();
  const name = mazeSelect.value || list[0]?.name;
  playingMaze = normalizeMaze(list.find(m => m.name === name) ?? list[0]);
  player.x = playingMaze.start.x + 0.5;
  player.y = playingMaze.start.y + 0.5;
  player.a = (playingMaze.start.dir ?? 0) * (Math.PI / 2);
  isPlaying = true;
  isFinishing = false;
  resetJoystick();
  lastT = performance.now();
  runStartMs = lastT;
  lastShownMs = 0;
  updateBestLabel();
  updateTimeLabel(0);
  requestAnimationFrame(loop);
}

playBtn.addEventListener('click', startPlay);
resetBtn.addEventListener('click', () => {
  if (!playingMaze) return;
  player.x = playingMaze.start.x + 0.5;
  player.y = playingMaze.start.y + 0.5;
  player.a = (playingMaze.start.dir ?? 0) * (Math.PI / 2);
  isFinishing = false;
  resetJoystick();
  runStartMs = performance.now();
  lastShownMs = 0;
  updateTimeLabel(0);
});

function loop(t) {
  if (!isPlaying) return;
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;
  const elapsed = t - runStartMs;
  // label update throttled (every ~50ms)
  if (elapsed - lastShownMs > 50) {
    lastShownMs = elapsed;
    updateTimeLabel(elapsed);
  }
  updatePlayer(dt);
  draw3D();
  drawMiniMap();
  checkGoal();
  requestAnimationFrame(loop);
}

function updatePlayer(dt) {
  // Keyboard (PC)
  const kbFwd = keys.has('w') || keys.has('arrowup');
  const kbBack = keys.has('s') || keys.has('arrowdown');
  const kbLeft = keys.has('a');
  const kbRight = keys.has('d');
  const turnL = keys.has('arrowleft');
  const turnR = keys.has('arrowright');

  // Virtual joystick (Touch)
  // y: down is +, so forward is -y
  const joyMove = -input.joystick.y;
  const joyStrafe = input.joystick.x;

  const moveAxis = (Number(kbFwd) - Number(kbBack)) + joyMove;
  const strafeAxis = (Number(kbRight) - Number(kbLeft)) + joyStrafe;
  const turn = (Number(turnR) - Number(turnL)) * player.turnSpeed * dt;

  const move = clamp(moveAxis, -1, 1) * player.speed * dt;
  const strafe = clamp(strafeAxis, -1, 1) * player.speed * dt;

  player.a += turn;
  const ca = Math.cos(player.a);
  const sa = Math.sin(player.a);

  const nx = player.x + ca * move + Math.cos(player.a + Math.PI / 2) * strafe;
  const ny = player.y + sa * move + Math.sin(player.a + Math.PI / 2) * strafe;
  if (canMove(nx, ny)) {
    player.x = nx;
    player.y = ny;
  } else {
    // try axis separated
    if (canMove(nx, player.y)) player.x = nx;
    if (canMove(player.x, ny)) player.y = ny;
  }
}

function castRay(angle) {
  // DDA
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  let mapX = Math.floor(player.x);
  let mapY = Math.floor(player.y);

  const deltaDistX = Math.abs(1 / (dx || 1e-6));
  const deltaDistY = Math.abs(1 / (dy || 1e-6));

  let stepX, stepY;
  let sideDistX, sideDistY;

  if (dx < 0) {
    stepX = -1;
    sideDistX = (player.x - mapX) * deltaDistX;
  } else {
    stepX = 1;
    sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
  }

  if (dy < 0) {
    stepY = -1;
    sideDistY = (player.y - mapY) * deltaDistY;
  } else {
    stepY = 1;
    sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
  }

  let hit = 0;
  let side = 0; // 0: x-side, 1: y-side

  for (let i = 0; i < 256; i++) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapY < 0 || mapX >= SIZE || mapY >= SIZE) break;
    if (playingMaze.grid[gridIndex(mapX, mapY)] === TILE.WALL) {
      hit = 1;
      break;
    }
  }

  // perpendicular distance
  let perpWallDist;
  if (side === 0) {
    perpWallDist = (mapX - player.x + (1 - stepX) / 2) / (dx || 1e-6);
  } else {
    perpWallDist = (mapY - player.y + (1 - stepY) / 2) / (dy || 1e-6);
  }

  return { dist: Math.max(0.001, perpWallDist), side };
}

function draw3D() {
  if (!playingMaze) {
    // quick fallback preview from currentMaze
    playingMaze = normalizeMaze(currentMaze);
  }

  const W = playCanvas.width;
  const H = playCanvas.height;

  // ceiling & floor
  pctx.fillStyle = '#111827';
  pctx.fillRect(0, 0, W, H / 2);
  pctx.fillStyle = '#2d3436';
  pctx.fillRect(0, H / 2, W, H / 2);

  // raycast
  const fov = Math.PI / 3;
  const half = fov / 2;
  for (let x = 0; x < W; x++) {
    const camX = (x / W) * 2 - 1;
    const angle = player.a + camX * half;
    const { dist, side } = castRay(angle);

    // fish-eye correction
    const corrected = dist * Math.cos(angle - player.a);
    const lineH = Math.min(H, H / corrected);
    const y0 = Math.floor((H - lineH) / 2);

    const shadeBase = side === 1 ? 0.65 : 0.85;
    const fog = clamp(1 / (1 + corrected * 0.25), 0.2, 1);
    const shade = shadeBase * fog;
    const c = Math.floor(255 * shade);
    pctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
    pctx.fillRect(x, y0, 1, lineH);
  }

  // Goal indicator (top mini hint)
  const gx = playingMaze.goal.x + 0.5;
  const gy = playingMaze.goal.y + 0.5;
  const angToGoal = Math.atan2(gy - player.y, gx - player.x);
  let diff = angToGoal - player.a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const center = W / 2;
  const indicatorX = clamp(center + (diff / (fov / 2)) * (W * 0.25), 10, W - 10);
  pctx.fillStyle = '#ffeaa7';
  pctx.fillRect(indicatorX - 3, 10, 6, 14);

  // Small text
  pctx.fillStyle = 'rgba(255,255,255,0.9)';
  pctx.font = '14px Outfit, sans-serif';
  pctx.textAlign = 'left';
  pctx.fillText('🏁 にむかってね', 12, 28);
}

function drawMiniMap() {
  if (!mctx || !minimapCanvas || !playingMaze) return;
  const W = minimapCanvas.width;
  const H = minimapCanvas.height;
  mctx.clearRect(0, 0, W, H);

  // Background
  mctx.fillStyle = 'rgba(17, 24, 39, 0.55)';
  mctx.fillRect(0, 0, W, H);

  const view = 11; // odd number
  const half = Math.floor(view / 2);
  const cell = Math.floor(W / view);

  const px = Math.floor(player.x);
  const py = Math.floor(player.y);

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const gx = px + dx;
      const gy = py + dy;
      const sx = (dx + half) * cell;
      const sy = (dy + half) * cell;

      let t = TILE.WALL;
      if (gx >= 0 && gy >= 0 && gx < SIZE && gy < SIZE) {
        t = playingMaze.grid[gridIndex(gx, gy)] === TILE.WALL ? TILE.WALL : TILE.PATH;
      }
      if (t === TILE.WALL) {
        mctx.fillStyle = 'rgba(255,255,255,0.16)';
      } else {
        mctx.fillStyle = 'rgba(255,255,255,0.04)';
      }
      mctx.fillRect(sx, sy, cell, cell);

      if (gx === playingMaze.goal.x && gy === playingMaze.goal.y) {
        mctx.fillStyle = 'rgba(255, 234, 167, 0.85)';
        mctx.fillRect(sx + 2, sy + 2, cell - 4, cell - 4);
      }
    }
  }

  // Player marker at center
  const cx = half * cell + cell / 2;
  const cy = half * cell + cell / 2;
  mctx.fillStyle = 'rgba(0, 206, 201, 0.95)';
  mctx.beginPath();
  mctx.arc(cx, cy, Math.max(3, cell * 0.28), 0, Math.PI * 2);
  mctx.fill();

  // Direction line
  mctx.strokeStyle = 'rgba(0, 206, 201, 0.9)';
  mctx.lineWidth = 2;
  mctx.beginPath();
  mctx.moveTo(cx, cy);
  mctx.lineTo(cx + Math.cos(player.a) * cell * 0.7, cy + Math.sin(player.a) * cell * 0.7);
  mctx.stroke();

  // Border
  mctx.strokeStyle = 'rgba(255,255,255,0.18)';
  mctx.lineWidth = 1;
  mctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

async function showMazeRanking(mazeName) {
  const gameId = getMazeScoreId(mazeName);
  const rankings = await getRankings(gameId, 5);
  if (!rankings || rankings.length === 0) {
    return `<div style="opacity:0.9;">ランキングはまだないよ</div>`;
  }
  const rows = rankings.map((r, i) => {
    const ms = -Number(r.score);
    const time = Number.isFinite(ms) ? formatTime(ms) : `${r.score}`;
    return `
      <div style="display:flex; justify-content: space-between; align-items:center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); margin-top: 8px;">
        <div style="display:flex; align-items:center; gap: 10px; min-width: 0;">
          <div style="font-weight: 900; width: 28px;">${i + 1}.</div>
          <div style="font-size: 1.4rem;">${escapeHtml(r.avatar || '❓')}</div>
          <div style="min-width:0; overflow:hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.name || '???')}</div>
        </div>
        <div style="font-weight: 900;">${escapeHtml(time)}</div>
      </div>
    `;
  }).join('');
  return `
    <div style="text-align:left; margin-top: 10px;">
      <div style="font-weight: 900; margin-bottom: 6px;">🏁 ランキング（上位5）</div>
      ${rows}
      <div style="opacity: 0.75; margin-top: 10px; font-size: 0.85rem;">※ タイムは小さいほど強い（内部は -ミリ秒で保存）</div>
    </div>
  `;
}

function checkGoal() {
  if (!playingMaze) return;
  if (isFinishing) return;
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  if (px === playingMaze.goal.x && py === playingMaze.goal.y) {
    isPlaying = false;
    isFinishing = true;
    void handleGoalReached();
  }
}

async function handleGoalReached() {
  if (!playingMaze) return;
  const elapsed = performance.now() - runStartMs;
  const timeText = formatTime(elapsed);

  // Local best
  const map = loadBestTimeMap();
  const prev = map[playingMaze.name];
  if (typeof prev !== 'number' || elapsed < prev) {
    map[playingMaze.name] = Math.round(elapsed);
    saveBestTimeMap(map);
  }
  updateBestLabel();

  // Supabase ranking save (score: -ms)
  const p = getCurrentPlayer();
  if (p?.id) {
    await saveScore(getMazeScoreId(playingMaze.name), p.id, -Math.round(elapsed));
  }

  const html = await showMazeRanking(playingMaze.name);
  showOverlayWithHtml('ゴール！', `「${playingMaze.name}」 クリア！ ⏱️ ${timeText}`, html);
}

// init
function init() {
  // first paint state
  mazeNameEl.value = currentMaze.name;
  resizeEditorCanvas();
  drawEditor();
  syncMazeSelect();
  resizePlayCanvas();
  setupJoystick();
  // Supabaseから最新を取り込み（失敗してもキャッシュで動く）
  void (async () => {
    await refreshMazeCacheFromSupabase();
    syncMazeSelect();
  })();

  window.addEventListener('resize', () => {
    resizeEditorCanvas();
    resizePlayCanvas();
    if (panelEditor.classList.contains('hidden')) draw3D();
    else drawEditor();
  });
}

init();

