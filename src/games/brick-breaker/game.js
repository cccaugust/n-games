import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { supabase } from '../../js/supabaseClient.js';

// =========================================================
// ブロックくずし（ステージ選択 / ブロック種類 / コンティニュー / ステージエディタ）
// =========================================================

// --------------------
// DOM
// --------------------
const tabPlay = document.getElementById('tabPlay');
const tabEditor = document.getElementById('tabEditor');
const panelPlay = document.getElementById('panelPlay');
const panelEditor = document.getElementById('panelEditor');
const stageStatus = document.getElementById('stageStatus');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const ballsEl = document.getElementById('balls');
const continuesEl = document.getElementById('continues');

const stageSelect = document.getElementById('stageSelect');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

const editorCanvas = document.getElementById('editorCanvas');
const ectx = editorCanvas.getContext('2d');
const toolButtons = Array.from(document.querySelectorAll('.tool-btn[data-tool]'));
const stageNameEl = document.getElementById('stageName');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const clearBtn = document.getElementById('clearBtn');

const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const overlayExtra = document.getElementById('overlayExtra');
const overlayClose = document.getElementById('overlayClose');

const libraryOverlay = document.getElementById('libraryOverlay');
const libraryClose = document.getElementById('libraryClose');
const libraryNew = document.getElementById('libraryNew');
const libraryExportAll = document.getElementById('libraryExportAll');
const libraryImportBtn = document.getElementById('libraryImportBtn');
const libraryImportFile = document.getElementById('libraryImportFile');
const libraryListEl = document.getElementById('libraryList');
const libraryCountEl = document.getElementById('libraryCount');

// --------------------
// Utils
// --------------------
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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

function showOverlay(title, text, html = '', { closable = true } = {}) {
  overlayTitle.textContent = title;
  overlayText.textContent = text || '';
  if (overlayExtra) overlayExtra.innerHTML = html || '';
  overlay.style.display = 'flex';
  overlayClose.style.display = closable ? 'inline-flex' : 'none';
  overlay.dataset.closable = closable ? '1' : '0';
}

function closeOverlay() {
  overlay.style.display = 'none';
}

overlayClose?.addEventListener('click', closeOverlay);
overlay?.addEventListener('click', (e) => {
  const canClose = overlay.dataset.closable !== '0';
  if (canClose && e.target === overlay) closeOverlay();
});

// --------------------
// Stage data (Play + Editor)
// --------------------
const STAGE_COLS = 14;
const STAGE_ROWS = 10;
const STORAGE_KEY = 'ngames.brickBreaker.stages.v1';
const STAGES_TABLE = 'brick_breaker_stages';

// ブロック種
const TILE = {
  EMPTY: 0,
  NORMAL: 1,
  TOUGH: 2,
  SPLIT: 3,
  SOFT: 4, // 壊れるが反射しない
  WALL: 5 // 壊れない
};

function makeEmptyStage(name = '新しいステージ') {
  return {
    version: 1,
    name,
    cols: STAGE_COLS,
    rows: STAGE_ROWS,
    grid: Array.from({ length: STAGE_COLS * STAGE_ROWS }, () => TILE.EMPTY)
  };
}

function normalizeStage(stage) {
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

function loadAllStagesCache() {
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

function saveAllStagesCache(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function upsertStageCache(stage) {
  const list = loadAllStagesCache();
  const s = normalizeStage(stage);
  const idx = list.findIndex(x => x.name === s.name);
  if (idx >= 0) list[idx] = s;
  else list.unshift(s);
  saveAllStagesCache(list);
  return list;
}

function getDefaultStages() {
  // 0: empty, 1: normal, 2: tough, 3: split, 4: soft, 5: wall
  const a = makeEmptyStage('はじめて');
  // 上3段をカラフルに
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
  for (let col = 0; col < STAGE_COLS; col++) d.grid[0 * STAGE_COLS + col] = TILE.WALL;
  for (let col = 0; col < STAGE_COLS; col++) d.grid[2 * STAGE_COLS + col] = TILE.SOFT;
  for (let col = 0; col < STAGE_COLS; col++) d.grid[4 * STAGE_COLS + col] = TILE.NORMAL;

  return [normalizeStage(a), normalizeStage(b), normalizeStage(c), normalizeStage(d)];
}

function ensureStages() {
  // キャッシュが空ならサンプルだけ入れる（即時表示用）
  let list = loadAllStagesCache();
  if (list.length === 0) {
    list = getDefaultStages();
    saveAllStagesCache(list);
  }
  return list;
}

async function fetchAllStagesFromSupabase() {
  const { data, error } = await supabase
    .from(STAGES_TABLE)
    .select('name,data,updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  return rows.map(row => normalizeStage({ ...(row.data || {}), name: row.name }));
}

async function refreshStageCacheFromSupabase({ showError = false } = {}) {
  try {
    const list = await fetchAllStagesFromSupabase();
    saveAllStagesCache(list);
    return list;
  } catch (e) {
    console.error('Failed to fetch stages from Supabase:', e);
    if (showError) showOverlay('通信エラー', 'Supabaseからステージを読みこめなかったよ。ネットワークを確認してね。');
    return loadAllStagesCache();
  }
}

async function upsertStageToSupabase(stage) {
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

async function deleteStageFromSupabaseByName(name) {
  const { error } = await supabase
    .from(STAGES_TABLE)
    .delete()
    .eq('name', name);
  if (error) throw error;

  const after = loadAllStagesCache().filter(x => x.name !== name);
  saveAllStagesCache(after);
  return after;
}

function uniqueName(baseName, existingNames) {
  const base = (baseName || 'ななしのステージ').trim() || 'ななしのステージ';
  if (!existingNames.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base} (${i})`;
    if (!existingNames.has(candidate)) return candidate;
  }
  return `${base} (${Date.now()})`;
}

// --------------------
// Tabs
// --------------------
function setTab(tab) {
  const isPlay = tab === 'play';
  tabPlay.setAttribute('aria-selected', isPlay ? 'true' : 'false');
  tabEditor.setAttribute('aria-selected', isPlay ? 'false' : 'true');
  panelPlay.classList.toggle('hidden', !isPlay);
  panelEditor.classList.toggle('hidden', isPlay);
  if (isPlay) {
    resizeGameCanvas();
    drawGame();
  } else {
    resizeEditorCanvas();
    drawEditor();
  }
}
tabPlay.addEventListener('click', () => setTab('play'));
tabEditor.addEventListener('click', () => setTab('editor'));

// --------------------
// Canvas Resize (DPR対応)
// --------------------
let viewW = 600;
let viewH = 500;
let eViewW = 800;
let eViewH = 420;

function applyDpr(canvasEl, context2d) {
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const rect = canvasEl.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvasEl.width = Math.round(w * dpr);
  canvasEl.height = Math.round(h * dpr);
  context2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}

function resizeGameCanvas() {
  const { w, h } = applyDpr(canvas, ctx);
  viewW = w;
  viewH = h;
  layoutPaddleToBottom();
}

function resizeEditorCanvas() {
  // 画面幅に合わせて、cols:rows 比率で表示
  const maxW = Math.min(900, window.innerWidth - 40);
  const w = Math.max(320, maxW);
  const h = Math.floor(w * (STAGE_ROWS / STAGE_COLS));
  editorCanvas.style.height = `${h}px`;
  const { w: vw, h: vh } = applyDpr(editorCanvas, ectx);
  eViewW = vw;
  eViewH = vh;
}

window.addEventListener('resize', () => {
  if (panelPlay.classList.contains('hidden')) {
    resizeEditorCanvas();
    drawEditor();
  } else {
    resizeGameCanvas();
    drawGame();
  }
});

// --------------------
// Editor
// --------------------
let currentTool = 'normal';
let currentStage = makeEmptyStage('新しいステージ');

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach(btn => {
    btn.dataset.active = btn.dataset.tool === tool ? 'true' : 'false';
  });
}
setTool('normal');

function gridIndex(x, y) {
  return y * STAGE_COLS + x;
}

function getCellFromPointer(evt) {
  const rect = editorCanvas.getBoundingClientRect();
  const nx = (evt.clientX - rect.left) / rect.width;
  const ny = (evt.clientY - rect.top) / rect.height;
  const cx = clamp(Math.floor(nx * STAGE_COLS), 0, STAGE_COLS - 1);
  const cy = clamp(Math.floor(ny * STAGE_ROWS), 0, STAGE_ROWS - 1);
  return { x: cx, y: cy };
}

function toolToTile(tool) {
  if (tool === 'empty') return TILE.EMPTY;
  if (tool === 'tough') return TILE.TOUGH;
  if (tool === 'split') return TILE.SPLIT;
  if (tool === 'soft') return TILE.SOFT;
  if (tool === 'wall') return TILE.WALL;
  return TILE.NORMAL;
}

function applyToolAt(x, y) {
  const idx = gridIndex(x, y);
  currentStage.grid[idx] = toolToTile(currentTool);
}

function tileColor(t, { forEditor = false } = {}) {
  if (t === TILE.NORMAL) return forEditor ? '#74b9ff' : '#74b9ff';
  if (t === TILE.TOUGH) return forEditor ? '#a29bfe' : '#a29bfe';
  if (t === TILE.SPLIT) return forEditor ? '#00cec9' : '#00cec9';
  if (t === TILE.SOFT) return forEditor ? '#ffeaa7' : '#ffeaa7';
  if (t === TILE.WALL) return forEditor ? '#636e72' : '#636e72';
  return '#ffffff';
}

function drawEditor() {
  const W = eViewW;
  const H = eViewH;
  ectx.clearRect(0, 0, W, H);

  // 背景
  ectx.fillStyle = '#f8f9ff';
  ectx.fillRect(0, 0, W, H);

  const cellW = W / STAGE_COLS;
  const cellH = H / STAGE_ROWS;

  // タイル
  for (let y = 0; y < STAGE_ROWS; y++) {
    for (let x = 0; x < STAGE_COLS; x++) {
      const t = currentStage.grid[gridIndex(x, y)];
      if (t === TILE.EMPTY) continue;
      ectx.fillStyle = tileColor(t, { forEditor: true });
      const px = x * cellW;
      const py = y * cellH;
      ectx.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);

      // かたい/ぶんれつはアイコンを少し
      ectx.fillStyle = 'rgba(0,0,0,0.65)';
      ectx.font = `${Math.max(12, Math.floor(Math.min(cellW, cellH) * 0.42))}px Outfit, sans-serif`;
      ectx.textAlign = 'center';
      ectx.textBaseline = 'middle';
      if (t === TILE.TOUGH) ectx.fillText('2', px + cellW / 2, py + cellH / 2);
      if (t === TILE.SPLIT) ectx.fillText('✶', px + cellW / 2, py + cellH / 2);
      if (t === TILE.SOFT) ectx.fillText('≈', px + cellW / 2, py + cellH / 2);
      if (t === TILE.WALL) ectx.fillText('■', px + cellW / 2, py + cellH / 2);
    }
  }

  // グリッド線
  ectx.strokeStyle = 'rgba(0,0,0,0.06)';
  ectx.lineWidth = 1;
  for (let x = 0; x <= STAGE_COLS; x++) {
    const p = Math.round(x * cellW) + 0.5;
    ectx.beginPath();
    ectx.moveTo(p, 0);
    ectx.lineTo(p, H);
    ectx.stroke();
  }
  for (let y = 0; y <= STAGE_ROWS; y++) {
    const p = Math.round(y * cellH) + 0.5;
    ectx.beginPath();
    ectx.moveTo(0, p);
    ectx.lineTo(W, p);
    ectx.stroke();
  }

  stageStatus.textContent = `${STAGE_COLS}×${STAGE_ROWS}`;
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
function endPaint() {
  isPainting = false;
  lastPaint = null;
}
editorCanvas.addEventListener('pointerup', endPaint);
editorCanvas.addEventListener('pointercancel', endPaint);

toolButtons.forEach(btn => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

function syncStageSelect(selectName) {
  const list = ensureStages();
  stageSelect.innerHTML = '';
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name;
    stageSelect.appendChild(opt);
  });
  if (selectName) stageSelect.value = selectName;
}

// Editor buttons
saveBtn.addEventListener('click', () => {
  void (async () => {
    const name = (stageNameEl.value || '').trim();
    if (!name) {
      showOverlay('名前がいるよ', '「名前」を入れてから保存してね。');
      return;
    }
    const prevDisabled = saveBtn.disabled;
    saveBtn.disabled = true;
    try {
      currentStage.name = name;
      showOverlay('保存中…', 'Supabaseに保存しているよ。', '', { closable: false });
      await upsertStageToSupabase(currentStage);
      await refreshStageCacheFromSupabase();
      syncStageSelect(currentStage.name);
      showOverlay('保存したよ', `「${currentStage.name}」を保存しました。`);
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
    await refreshStageCacheFromSupabase({ showError: true });
    openLibrary();
  })();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('いまのステージをぜんぶ消す？（保存してないと元に戻せないよ）')) return;
  const name = (stageNameEl.value || '').trim() || '新しいステージ';
  currentStage = makeEmptyStage(name);
  drawEditor();
});

// Library
function openLibrary() {
  renderLibrary();
  libraryOverlay.style.display = 'flex';
  libraryOverlay.setAttribute('aria-hidden', 'false');
}

function closeLibrary() {
  libraryOverlay.style.display = 'none';
  libraryOverlay.setAttribute('aria-hidden', 'true');
}

libraryClose?.addEventListener('click', closeLibrary);
libraryOverlay?.addEventListener('click', (e) => {
  if (e.target === libraryOverlay) closeLibrary();
});

libraryNew?.addEventListener('click', () => {
  closeLibrary();
  const name = '新しいステージ';
  currentStage = makeEmptyStage(name);
  stageNameEl.value = currentStage.name;
  setTab('editor');
  drawEditor();
});

libraryExportAll?.addEventListener('click', () => {
  const list = ensureStages();
  downloadJson('n-games-brick-breaker-stages.json', list);
  showOverlay('書き出したよ', '全部のステージを1つのファイルにしたよ。');
});

libraryImportBtn?.addEventListener('click', () => {
  libraryImportFile.value = '';
  libraryImportFile.click();
});

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
  const normalized = incoming.map(normalizeStage);
  const existing = ensureStages();
  const names = new Set(existing.map(s => s.name));

  let ok = 0;
  for (const s of normalized) {
    const name = uniqueName(s.name, names);
    names.add(name);
    try {
      await upsertStageToSupabase({ ...s, name });
      ok++;
    } catch (e) {
      console.error('Import upsert failed:', e);
    }
  }
  await refreshStageCacheFromSupabase();
  syncStageSelect();
  renderLibrary();
  showOverlay('インポートOK', `${ok}こ取りこんだよ。`);
}

libraryImportFile?.addEventListener('change', async () => {
  const f = libraryImportFile.files?.[0];
  if (!f) return;
  await importFromFile(f);
});

function countBlocks(stage) {
  let n = 0;
  for (const t of stage.grid) if (t !== TILE.EMPTY) n++;
  return n;
}

function renderLibrary() {
  const list = ensureStages();
  libraryCountEl.textContent = `${list.length}こ`;
  libraryListEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'library-row';
    empty.innerHTML = `
      <div>
        <div style="font-weight: 900;">まだステージがないよ</div>
        <div style="opacity: 0.9; margin-top: 4px; font-size: 0.95rem;">作って「保存」するとここに出てくるよ。</div>
      </div>
      <div></div>
    `;
    libraryListEl.appendChild(empty);
    return;
  }

  list.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'library-row';

    const blocks = countBlocks(s);
    const info = document.createElement('div');
    info.innerHTML = `
      <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
        <div style="font-weight: 900; font-size: 1.1rem;">${escapeHtml(s.name)}</div>
        <div style="opacity: 0.9; font-size: 0.9rem;">ブロック ${blocks}こ</div>
      </div>
      <div style="opacity: 0.85; margin-top: 4px; font-size: 0.9rem;">${s.cols}×${s.rows}</div>
    `;

    const actions = document.createElement('div');
    actions.className = 'library-actions';

    const btnLoadStage = document.createElement('button');
    btnLoadStage.className = 'mini-btn';
    btnLoadStage.textContent = 'ロード';
    btnLoadStage.addEventListener('click', () => {
      currentStage = normalizeStage(s);
      stageNameEl.value = currentStage.name;
      closeLibrary();
      setTab('editor');
      drawEditor();
      syncStageSelect(currentStage.name);
      showOverlay('ロードしたよ', `「${currentStage.name}」を読みこみました。`);
    });

    const btnExport = document.createElement('button');
    btnExport.className = 'mini-btn';
    btnExport.textContent = '書き出し';
    btnExport.addEventListener('click', () => {
      downloadJson(`${s.name}.brick-breaker.stage.json`, s);
      showOverlay('書き出したよ', `「${s.name}」をファイルにしました。`);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'mini-btn danger';
    btnDelete.textContent = '削除';
    btnDelete.addEventListener('click', () => {
      void (async () => {
        if (!confirm(`「${s.name}」を削除する？（元に戻せないよ）`)) return;
        try {
          await deleteStageFromSupabaseByName(s.name);
          await refreshStageCacheFromSupabase();
          syncStageSelect();
          renderLibrary();
          showOverlay('削除したよ', `「${s.name}」を削除しました。`);
        } catch (e) {
          console.error(e);
          showOverlay('削除できなかった…', 'Supabaseから削除できなかったよ。');
        }
      })();
    });

    actions.appendChild(btnLoadStage);
    actions.appendChild(btnExport);
    actions.appendChild(btnDelete);
    row.appendChild(info);
    row.appendChild(actions);
    libraryListEl.appendChild(row);
  });
}

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
    color: '#ffffff'
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

function makeBricksFromStage(stage) {
  const s = normalizeStage(stage);
  const bricks = [];
  for (let row = 0; row < STAGE_ROWS; row++) {
    for (let col = 0; col < STAGE_COLS; col++) {
      const t = s.grid[gridIndex(col, row)];
      if (t === TILE.EMPTY) continue;
      const hp = t === TILE.TOUGH ? 3 : (t === TILE.WALL ? Number.POSITIVE_INFINITY : 1);
      bricks.push({
        col,
        row,
        type: t,
        hp,
        alive: true
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
  return '#74b9ff';
}

function brickPoints(brick) {
  if (brick.type === TILE.SPLIT) return 25;
  if (brick.type === TILE.TOUGH) return 35;
  if (brick.type === TILE.WALL) return 0;
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
  const speed = ballSpeed();
  const angle = (-Math.PI / 2) + (Math.random() * 0.55 - 0.275);
  balls.push(makeBall(viewW / 2, paddle.y - 18, speed, angle));
  if (!keepBricks) {
    const list = ensureStages();
    const s = list.find(x => x.name === playingStageName) ?? list[0];
    bricks = makeBricksFromStage(s);
  }
  updateHud();
}

function startStage(stageName, { resetStats = true } = {}) {
  const list = ensureStages();
  const stage = list.find(x => x.name === stageName) ?? list[0];
  if (!stage) return;

  playingStageName = stage.name;
  stageSelect.value = stage.name;

  if (resetStats) resetRunStats();

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

function spawnSplitBalls(fromBall, atX, atY) {
  // ぶんれつ: 1つのボールが「合計5こ」になる（= +4）
  const MAX_BALLS = 15;
  if (balls.length >= MAX_BALLS) return;

  const speed = Math.max(ballSpeed() * 0.95, Math.hypot(fromBall.vx, fromBall.vy));
  const base = Math.atan2(fromBall.vy, fromBall.vx);

  const desiredTotal = 5;
  const canAdd = Math.max(0, Math.min(desiredTotal - 1, MAX_BALLS - balls.length));
  const total = 1 + canAdd;
  if (total <= 1) return;

  const spread = 1.6;
  const offsets = Array.from({ length: total }, (_, i) => {
    if (total === 1) return 0;
    const t = i / (total - 1);
    return (-spread / 2) + spread * t;
  });
  const mid = Math.floor(total / 2);

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
          <button class="mini-btn" id="ovToSelect">ステージ選択へ</button>
        </div>
      `,
      { closable: false }
    );
    document.getElementById('ovContinue').onclick = () => {
      closeOverlay();
      resetPaddleAndBall({ keepBricks: true });
      isRunning = true;
      lastT = performance.now();
      requestAnimationFrame(loop);
    };
    document.getElementById('ovToSelect').onclick = () => {
      closeOverlay();
      setTab('play');
      drawGame();
    };
    return;
  }

  // Game Over
  showOverlay(
    'ゲームオーバー…',
    `SCORE: ${score}（CONTINUE: ${continueCount}）`,
    `
      <div style="display:flex; gap: 10px; justify-content:center; flex-wrap: wrap; margin-top: 10px;">
        <button class="btn-primary" id="ovRevive">コンティニュー</button>
        <button class="mini-btn" id="ovFinish">おしまい（ランキング）</button>
      </div>
    `,
    { closable: false }
  );
  document.getElementById('ovRevive').onclick = () => {
    closeOverlay();
    continueCount += 1;
    lives = 1;
    updateHud();
    resetPaddleAndBall({ keepBricks: true });
    isRunning = true;
    lastT = performance.now();
    requestAnimationFrame(loop);
  };
  document.getElementById('ovFinish').onclick = () => {
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
        <span style="font-size: 1.5rem;">${escapeHtml(r.avatar)}</span>
        <span style="overflow: hidden; text-overflow: ellipsis; max-width: 160px; white-space: nowrap;">${escapeHtml(r.name)}</span>
      </div>
      <span style="font-weight: 900;">${escapeHtml(r.score)}</span>
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
        <a href="../../pages/portal/portal.html" style="color: white; display:inline-block; padding: 12px 14px;">&larr; ほかのゲーム</a>
      </div>
    `,
    { closable: false }
  );
  document.getElementById('ovRestart').onclick = () => {
    closeOverlay();
    startStage(playingStageName ?? stageSelect.value, { resetStats: true });
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
        <button class="mini-btn" id="ovSelect">ステージ選択へ</button>
      </div>
    `,
    { closable: false }
  );
  document.getElementById('ovNext').onclick = () => {
    closeOverlay();
    startStage(nextStageName(), { resetStats: false });
  };
  document.getElementById('ovSelect').onclick = () => {
    closeOverlay();
    setTab('play');
    drawGame();
  };
}

function updateGame(dt) {
  if (isPaused) return;

  // Ball update
  const aliveBricks = bricks.filter(b => b.alive);

  const nextBalls = [];
  for (const b of balls) {
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
      const speed = Math.max(ballSpeed() * 0.85, Math.hypot(b.vx, b.vy));
      const center = paddle.x + paddle.w / 2;
      const rel = clamp((b.x - center) / (paddle.w / 2), -1, 1);
      const vx = rel * speed * 0.92;
      const vy = -Math.sqrt(Math.max(60, speed * speed - vx * vx));
      b.vx = vx;
      b.vy = vy;
    }

    // Bricks
    let hitSomething = false;
    for (const brick of aliveBricks) {
      if (!brick.alive) continue;
      const rect = brickRect(brick);
      if (!circleRectHit(b, rect)) continue;

      const isSoft = brick.type === TILE.SOFT;
      const isWall = brick.type === TILE.WALL;

      // Reflect (ざっくり) ※やわらかは反射しない
      if (!isSoft) {
        const prevCx = prevX;
        const prevCy = prevY;
        const cameFromTop = prevCy + b.r <= rect.y && b.y + b.r > rect.y;
        const cameFromBottom = prevCy - b.r >= rect.y + rect.h && b.y - b.r < rect.y + rect.h;
        const cameFromLeft = prevCx + b.r <= rect.x && b.x + b.r > rect.x;
        const cameFromRight = prevCx - b.r >= rect.x + rect.w && b.x - b.r < rect.x + rect.w;

        if (cameFromTop) b.vy = -Math.abs(b.vy);
        else if (cameFromBottom) b.vy = Math.abs(b.vy);
        else if (cameFromLeft) b.vx = -Math.abs(b.vx);
        else if (cameFromRight) b.vx = Math.abs(b.vx);
        else b.vy = -b.vy;
      }

      // Hit brick
      if (!isWall) {
        brick.hp -= 1;
        if (brick.hp <= 0) {
          brick.alive = false;
          score += brickPoints(brick);
          const cx = rect.x + rect.w / 2;
          const cy = rect.y + rect.h / 2;
          if (brick.type === TILE.SPLIT) spawnSplitBalls(b, cx, cy);
        } else {
          if (brick.type === TILE.TOUGH) score += 2;
        }
      }
      hitSomething = true;
      break;
    }

    if (b.y - b.r > viewH) {
      // 落ちた
      continue;
    }

    nextBalls.push(b);
    if (hitSomething) {
      // 連続ヒットしすぎないように少し進める
      b.x += b.vx * (dt * 0.35);
      b.y += b.vy * (dt * 0.35);
    }
  }

  balls = nextBalls;
  updateHud();

  // 全部落ちた
  if (balls.length === 0) {
    onAllBallsLost();
    return;
  }

  // Clear
  const remaining = bricks.some(b => b.alive && b.type !== TILE.WALL);
  if (!remaining) {
    stageCleared();
  }
}

function drawGame() {
  ctx.clearRect(0, 0, viewW, viewH);

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

    // tough: 残りHP
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
      ctx.fillText('✶', rect.x + rect.w / 2, rect.y + rect.h / 2);
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
  }
  ctx.globalAlpha = 1;

  // Paddle
  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

  // Balls
  for (const b of balls) {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title hint (when idle)
  if (!isRunning && bricks.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '18px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ステージをえらんで「スタート」！', viewW / 2, viewH / 2);
  }
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
  const x = (clientX - rect.left);
  paddle.x = clamp(x - paddle.w / 2, 0, Math.max(0, viewW - paddle.w));
}

canvas.addEventListener('pointerdown', (e) => {
  paddlePointerId = e.pointerId;
  canvas.setPointerCapture?.(e.pointerId);
  movePaddleFromClientX(e.clientX);
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
// Play UI
// --------------------
playBtn.addEventListener('click', () => {
  const name = stageSelect.value;
  closeOverlay();
  startStage(name, { resetStats: true });
});

pauseBtn.addEventListener('click', () => {
  if (!playingStageName) {
    showOverlay('まだだよ', '先に「スタート」してね。');
    return;
  }
  if (!isRunning) {
    // paused by stop? treat as resume not possible
    showOverlay('止まってるよ', '「スタート」か「最初から」で始めてね。');
    return;
  }
  setPaused(!isPaused);
});

resetBtn.addEventListener('click', () => {
  const name = stageSelect.value;
  closeOverlay();
  startStage(name, { resetStats: true });
});

// --------------------
// Init
// --------------------
function init() {
  // 初期状態
  stageNameEl.value = currentStage.name;
  resizeGameCanvas();
  resizeEditorCanvas();
  drawEditor();
  ensureStages();
  syncStageSelect();
  updateHud();
  drawGame();

  // Supabaseから最新を取り込み（失敗してもキャッシュで動く）
  void (async () => {
    await refreshStageCacheFromSupabase();
    syncStageSelect();
  })();
}

init();
