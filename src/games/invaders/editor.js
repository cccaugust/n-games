import { initOverlay } from './overlay.js';
import {
  ENEMY_DEFAULT,
  STAGE_COLS,
  STAGE_ROWS,
  WALL_CELL,
  WALL_ROWS,
  clamp,
  ensureStages,
  escapeHtml,
  getDefaultStages,
  getStageFromUrl,
  listEnemyAssetsForCurrentPlayer,
  makeEmptyStage,
  normalizeStage,
  previewUrlForAsset,
  upsertUserStage,
  deleteUserStageByName,
  stageHref
} from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

// DOM
const editorCanvas = qs('editorCanvas');
const ectx = editorCanvas.getContext('2d');
const toolErase = qs('toolErase');
const toolDefault = qs('toolDefault');
const toolWall = qs('toolWall');
const assetStrip = qs('assetStrip');
const assetStatus = qs('assetStatus');
const stageNameEl = qs('stageName');
const saveBtn = qs('saveBtn');
const loadBtn = qs('loadBtn');
const clearBtn = qs('clearBtn');
const editorStatus = qs('editorStatus');

const libraryOverlay = qs('libraryOverlay');
const libraryClose = qs('libraryClose');
const libraryNew = qs('libraryNew');
const libraryListEl = qs('libraryList');
const libraryCountEl = qs('libraryCount');

const { showOverlay } = initOverlay();

// Canvas layout (DPR)
let eViewW = 800;
let eViewH = 520;

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

function resizeEditorCanvas() {
  const { w, h } = applyDpr(editorCanvas, ectx);
  eViewW = w;
  eViewH = h;
}

window.addEventListener('resize', () => {
  resizeEditorCanvas();
  drawEditor();
});

// State
let currentStage = makeEmptyStage('新しいステージ');
let loadedStageName = null;

/** @type {null | string} */
let selectedEnemyToken = ENEMY_DEFAULT; // 'default' or assetId (enemy mode)
/** @type {'enemy' | 'wall' | 'erase'} */
let selectedMode = 'enemy';

// Asset preview cache (token -> HTMLImageElement)
const enemyThumbImg = new Map();

function setMode(mode) {
  selectedMode = mode;
  toolErase.dataset.active = mode === 'erase' ? 'true' : 'false';
  toolWall.dataset.active = mode === 'wall' ? 'true' : 'false';

  // Enemy selection buttons are active only in enemy mode
  toolDefault.dataset.active = mode === 'enemy' && selectedEnemyToken === ENEMY_DEFAULT ? 'true' : 'false';
  assetStrip?.querySelectorAll('button[data-asset-id]').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.dataset.active = mode === 'enemy' && btn.dataset.assetId === selectedEnemyToken ? 'true' : 'false';
  });

  const label =
    mode === 'erase'
      ? 'けす'
      : mode === 'wall'
        ? '壁（🧱）'
        : selectedEnemyToken === ENEMY_DEFAULT
          ? 'デフォルト（👾）'
          : 'ドット絵（選択中）';
  if (assetStatus) assetStatus.textContent = `いま：${label}`;
}

function setSelectedEnemyToken(token) {
  selectedEnemyToken = token;
  setMode('enemy');
}

function gridIndex(x, y) {
  return y * STAGE_COLS + x;
}

function wallIndex(x, y) {
  return y * STAGE_COLS + x;
}

function computeZones(W, H) {
  // Top area: enemies (STAGE_ROWS). Bottom area: walls (WALL_ROWS).
  const gap = Math.max(10, Math.round(H * 0.02));
  let enemyH = Math.round(H * 0.72);
  let wallH = H - enemyH - gap;
  if (wallH < 110) {
    wallH = 110;
    enemyH = Math.max(140, H - wallH - gap);
  }
  const enemyY0 = 0;
  const wallY0 = enemyY0 + enemyH + gap;
  return { gap, enemyY0, enemyH, wallY0, wallH };
}

function getCellFromPointer(evt) {
  const rect = editorCanvas.getBoundingClientRect();
  const nx = (evt.clientX - rect.left) / rect.width;
  const ny = (evt.clientY - rect.top) / rect.height;
  const { gap, enemyY0, enemyH, wallY0, wallH } = computeZones(eViewW, eViewH);
  const cx = clamp(Math.floor(nx * STAGE_COLS), 0, STAGE_COLS - 1);
  const py = ny * eViewH;

  // Separator gap: ignore
  if (py >= enemyY0 + enemyH && py < enemyY0 + enemyH + gap) return null;

  if (py < enemyY0 + enemyH) {
    const ry = clamp(Math.floor((py - enemyY0) / enemyH * STAGE_ROWS), 0, STAGE_ROWS - 1);
    return { layer: 'enemy', x: cx, y: ry };
  }
  const ry = clamp(Math.floor((py - wallY0) / wallH * WALL_ROWS), 0, WALL_ROWS - 1);
  return { layer: 'wall', x: cx, y: ry };
}

function applyToolAt(x, y) {
  // Back-compat: ensure fields exist (loaded old data)
  if (!Array.isArray(currentStage.walls)) currentStage.walls = Array.from({ length: STAGE_COLS * WALL_ROWS }, () => 0);
  if (currentStage.wallRows !== WALL_ROWS) currentStage.wallRows = WALL_ROWS;

  if (selectedMode === 'enemy') {
    const idx = gridIndex(x, y);
    currentStage.grid[idx] = selectedEnemyToken;
    return;
  }
  if (selectedMode === 'wall') {
    // Walls are placed only in wall layer (y is wall-row index)
    const idx = wallIndex(x, y);
    currentStage.walls[idx] = WALL_CELL;
    return;
  }
  // erase
  const idx = gridIndex(x, y);
  currentStage.grid[idx] = null;
}

function drawDefaultInvader(ctx, x, y, w, h) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';

  // 8x8 bitmap (simple)
  const bmp = [
    '00111100',
    '01111110',
    '11111111',
    '11011011',
    '11111111',
    '00100100',
    '01000010',
    '10000001'
  ];
  const sx = w / 8;
  const sy = h / 8;
  for (let yy = 0; yy < 8; yy++) {
    for (let xx = 0; xx < 8; xx++) {
      if (bmp[yy][xx] === '1') ctx.fillRect(xx * sx, yy * sy, Math.max(1, sx), Math.max(1, sy));
    }
  }
  ctx.restore();
}

function drawEditor() {
  const W = eViewW;
  const H = eViewH;
  ectx.clearRect(0, 0, W, H);

  // Background
  ectx.fillStyle = '#f8f9ff';
  ectx.fillRect(0, 0, W, H);

  const zones = computeZones(W, H);
  const enemyCellW = W / STAGE_COLS;
  const enemyCellH = zones.enemyH / STAGE_ROWS;
  const wallCellW = W / STAGE_COLS;
  const wallCellH = zones.wallH / WALL_ROWS;

  // Zone backgrounds
  ectx.fillStyle = 'rgba(108, 92, 231, 0.04)';
  ectx.fillRect(0, zones.enemyY0, W, zones.enemyH);
  ectx.fillStyle = 'rgba(17, 24, 39, 0.04)';
  ectx.fillRect(0, zones.wallY0, W, zones.wallH);

  // Zone labels
  ectx.fillStyle = 'rgba(17,24,39,0.55)';
  ectx.font = `${Math.max(11, Math.floor(Math.min(W, H) * 0.02))}px Outfit, sans-serif`;
  ectx.textAlign = 'left';
  ectx.textBaseline = 'top';
  ectx.fillText('上：敵', 10, 10);
  ectx.fillText('下：壁（弾でこわれる）', 10, zones.wallY0 + 10);

  // Cells
  for (let y = 0; y < STAGE_ROWS; y++) {
    for (let x = 0; x < STAGE_COLS; x++) {
      const t = currentStage.grid[gridIndex(x, y)];
      if (t == null) continue;

      const px = x * enemyCellW;
      const py = zones.enemyY0 + y * enemyCellH;
      const pad = Math.max(2, Math.floor(Math.min(enemyCellW, enemyCellH) * 0.08));
      const rw = Math.max(1, enemyCellW - pad * 2);
      const rh = Math.max(1, enemyCellH - pad * 2);

      // Cell background
      ectx.fillStyle = 'rgba(108, 92, 231, 0.10)';
      ectx.fillRect(px + pad, py + pad, rw, rh);

      if (t === ENEMY_DEFAULT) {
        drawDefaultInvader(ectx, px + pad, py + pad, rw, rh);
        continue;
      }

      const img = enemyThumbImg.get(t);
      if (img && img.complete) {
        ectx.imageSmoothingEnabled = false;
        ectx.drawImage(img, px + pad, py + pad, rw, rh);
      } else {
        ectx.fillStyle = 'rgba(0, 206, 201, 0.95)';
        ectx.fillRect(px + pad, py + pad, rw, rh);
        ectx.fillStyle = 'rgba(0,0,0,0.6)';
        ectx.font = `${Math.max(10, Math.floor(Math.min(enemyCellW, enemyCellH) * 0.34))}px Outfit, sans-serif`;
        ectx.textAlign = 'center';
        ectx.textBaseline = 'middle';
        ectx.fillText('?', px + enemyCellW / 2, py + enemyCellH / 2);
      }
    }
  }

  // Walls
  if (!Array.isArray(currentStage.walls)) currentStage.walls = Array.from({ length: STAGE_COLS * WALL_ROWS }, () => 0);
  for (let y = 0; y < WALL_ROWS; y++) {
    for (let x = 0; x < STAGE_COLS; x++) {
      const v = currentStage.walls[wallIndex(x, y)];
      if (!v) continue;
      const px = x * wallCellW;
      const py = zones.wallY0 + y * wallCellH;
      const pad = Math.max(2, Math.floor(Math.min(wallCellW, wallCellH) * 0.10));
      const rw = Math.max(1, wallCellW - pad * 2);
      const rh = Math.max(1, wallCellH - pad * 2);
      ectx.fillStyle = 'rgba(17, 24, 39, 0.20)';
      ectx.fillRect(px + pad, py + pad, rw, rh);
      ectx.strokeStyle = 'rgba(17, 24, 39, 0.25)';
      ectx.lineWidth = 1;
      ectx.strokeRect(px + pad + 0.5, py + pad + 0.5, rw - 1, rh - 1);
    }
  }

  // Grid lines (enemy + wall)
  ectx.strokeStyle = 'rgba(0,0,0,0.06)';
  ectx.lineWidth = 1;
  for (let x = 0; x <= STAGE_COLS; x++) {
    const p = Math.round(x * enemyCellW) + 0.5;
    ectx.beginPath();
    ectx.moveTo(p, 0);
    ectx.lineTo(p, H);
    ectx.stroke();
  }
  for (let y = 0; y <= STAGE_ROWS; y++) {
    const p = Math.round(zones.enemyY0 + y * enemyCellH) + 0.5;
    ectx.beginPath();
    ectx.moveTo(0, p);
    ectx.lineTo(W, p);
    ectx.stroke();
  }
  for (let y = 0; y <= WALL_ROWS; y++) {
    const p = Math.round(zones.wallY0 + y * wallCellH) + 0.5;
    ectx.beginPath();
    ectx.moveTo(0, p);
    ectx.lineTo(W, p);
    ectx.stroke();
  }

  if (editorStatus) editorStatus.textContent = `${STAGE_COLS}×${STAGE_ROWS}（敵） + ${STAGE_COLS}×${WALL_ROWS}（壁）`;
}

// Paint
let isPainting = false;
let lastPaint = null;
editorCanvas.addEventListener('pointerdown', (e) => {
  editorCanvas.setPointerCapture?.(e.pointerId);
  isPainting = true;
  const c = getCellFromPointer(e);
  if (!c) {
    isPainting = false;
    return;
  }
  lastPaint = c;
  if (selectedMode === 'wall') {
    if (c.layer !== 'wall') {
      isPainting = false;
      lastPaint = null;
      return;
    }
    applyToolAt(c.x, c.y);
  } else if (selectedMode === 'enemy') {
    if (c.layer !== 'enemy') {
      isPainting = false;
      lastPaint = null;
      return;
    }
    applyToolAt(c.x, c.y);
  } else {
    // erase: erase in the active layer
    if (c.layer === 'enemy') {
      currentStage.grid[gridIndex(c.x, c.y)] = null;
    } else {
      currentStage.walls[wallIndex(c.x, c.y)] = 0;
    }
  }
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointermove', (e) => {
  if (!isPainting) return;
  const c = getCellFromPointer(e);
  if (!c) return;
  if (lastPaint && c.x === lastPaint.x && c.y === lastPaint.y) return;
  lastPaint = c;
  if (selectedMode === 'wall') {
    if (c.layer !== 'wall') return;
    applyToolAt(c.x, c.y);
  } else if (selectedMode === 'enemy') {
    if (c.layer !== 'enemy') return;
    applyToolAt(c.x, c.y);
  } else {
    if (c.layer === 'enemy') {
      currentStage.grid[gridIndex(c.x, c.y)] = null;
    } else {
      currentStage.walls[wallIndex(c.x, c.y)] = 0;
    }
  }
  drawEditor();
  e.preventDefault();
});
function endPaint() {
  isPainting = false;
  lastPaint = null;
}
editorCanvas.addEventListener('pointerup', endPaint);
editorCanvas.addEventListener('pointercancel', endPaint);

// Library overlay
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
  currentStage = makeEmptyStage('新しいステージ');
  stageNameEl.value = currentStage.name;
  loadedStageName = null;
  drawEditor();
  showOverlay('新規', '新しいステージを作ろう！');
});

function renderLibrary() {
  const list = ensureStages();
  const defaultNames = new Set(getDefaultStages().map((s) => s.name));
  libraryCountEl.textContent = `${list.length}こ`;
  libraryListEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '12px';
    empty.style.borderRadius = '14px';
    empty.style.background = 'rgba(255,255,255,0.08)';
    empty.style.border = '1px solid rgba(255,255,255,0.12)';
    empty.textContent = 'まだステージがないよ。';
    libraryListEl.appendChild(empty);
    return;
  }

  list.forEach((s) => {
    const isDefault = defaultNames.has(s.name);
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.gap = '10px';
    row.style.alignItems = 'center';
    row.style.padding = '12px';
    row.style.borderRadius = '14px';
    row.style.background = 'rgba(255, 255, 255, 0.08)';
    row.style.border = '1px solid rgba(255,255,255,0.12)';

    const info = document.createElement('div');
    info.innerHTML = `
      <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
        <div style="font-weight: 900; font-size: 1.1rem;">${escapeHtml(s.name)}</div>
        <div style="opacity: 0.9; font-size: 0.9rem;">${isDefault ? 'デフォルト' : 'ユーザー'}</div>
      </div>
      <div style="opacity: 0.85; margin-top: 4px; font-size: 0.9rem;">${s.cols}×${s.rows}</div>
      <div style="opacity: 0.75; margin-top: 4px; font-size: 0.85rem;">
        <a href="${stageHref('./play.html', s.name)}" style="color: rgba(255,255,255,0.9);">▶ プレイ</a>
      </div>
    `;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';
    actions.style.justifyContent = 'flex-end';

    const btnLoad = document.createElement('button');
    btnLoad.className = 'iv-tool-btn';
    btnLoad.textContent = 'ロード';
    btnLoad.style.background = 'rgba(255,255,255,0.14)';
    btnLoad.style.color = 'white';
    btnLoad.addEventListener('click', () => {
      currentStage = normalizeStage(s);
      stageNameEl.value = currentStage.name;
      loadedStageName = currentStage.name;
      closeLibrary();
      drawEditor();
      showOverlay('ロードしたよ', `「${currentStage.name}」を読みこみました。`);
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'iv-tool-btn';
    btnDelete.textContent = '削除';
    btnDelete.style.background = isDefault ? 'rgba(255,255,255,0.08)' : 'rgba(255, 118, 117, 0.18)';
    btnDelete.style.border = '1px solid rgba(255,255,255,0.18)';
    btnDelete.style.color = 'white';
    btnDelete.disabled = isDefault;
    btnDelete.addEventListener('click', () => {
      if (isDefault) return;
      if (!confirm(`「${s.name}」を削除する？（元に戻せないよ）`)) return;
      deleteUserStageByName(s.name);
      renderLibrary();
      showOverlay('削除したよ', `「${s.name}」を削除しました。`);
    });

    actions.appendChild(btnLoad);
    actions.appendChild(btnDelete);

    row.appendChild(info);
    row.appendChild(actions);
    libraryListEl.appendChild(row);
  });
}

// Buttons
toolErase?.addEventListener('click', () => setMode('erase'));
toolDefault?.addEventListener('click', () => setSelectedEnemyToken(ENEMY_DEFAULT));
toolWall?.addEventListener('click', () => setMode('wall'));

saveBtn.addEventListener('click', () => {
  const name = (stageNameEl.value || '').trim();
  if (!name) {
    showOverlay('名前がいるよ', '「名前」を入れてから保存してね。');
    return;
  }
  currentStage.name = name;
  upsertUserStage(currentStage);
  loadedStageName = name;
  showOverlay('保存したよ', `「${name}」を保存しました。`);
});

loadBtn.addEventListener('click', () => openLibrary());

clearBtn.addEventListener('click', () => {
  if (!confirm('いまのステージをぜんぶ消す？（保存してないと元に戻せないよ）')) return;
  const name = (stageNameEl.value || '').trim() || '新しいステージ';
  currentStage = makeEmptyStage(name);
  drawEditor();
});

async function buildAssetStrip() {
  if (!assetStrip) return;
  assetStrip.innerHTML = '';

  // Default choice
  const defaultBtn = document.createElement('button');
  defaultBtn.type = 'button';
  defaultBtn.className = 'iv-asset-btn';
  defaultBtn.dataset.assetId = ENEMY_DEFAULT;
  defaultBtn.dataset.active = selectedEnemyToken === ENEMY_DEFAULT ? 'true' : 'false';
  defaultBtn.innerHTML = `
    <img alt="" src="data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" rx="12" fill="#111827"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="34">👾</text></svg>`
    )}">
    <div>
      <div class="iv-asset-name">デフォルト</div>
      <div class="iv-asset-meta">内蔵</div>
    </div>
  `;
  defaultBtn.addEventListener('click', () => setSelectedEnemyToken(ENEMY_DEFAULT));
  assetStrip.appendChild(defaultBtn);

  // Assets (dot-art maker): samples + my saved assets
  let assets = [];
  try {
    assets = await listEnemyAssetsForCurrentPlayer();
  } catch (e) {
    console.warn('listEnemyAssets failed:', e);
  }

  if (assets.length === 0) {
    const note = document.createElement('div');
    note.className = 'iv-chip';
    note.style.gridColumn = '1 / -1';
    note.textContent = 'まだドット絵（キャラ）がないよ。ドット絵メーカーで作って保存すると、ここに出てくるよ。';
    assetStrip.appendChild(note);
    return;
  }

  const sampleAssets = assets.filter((a) => String(a.ownerId || '') === 'sample' || String(a.id || '').startsWith('sample_'));
  const userAssets = assets.filter((a) => !(String(a.ownerId || '') === 'sample' || String(a.id || '').startsWith('sample_')));

  function addSectionLabel(text) {
    const chip = document.createElement('div');
    chip.className = 'iv-chip';
    chip.style.gridColumn = '1 / -1';
    chip.textContent = text;
    assetStrip.appendChild(chip);
  }

  if (sampleAssets.length > 0) addSectionLabel('サンプル（コピー不要で使える）');
  if (sampleAssets.length > 0 && userAssets.length > 0) addSectionLabel('自分の作品（ドット絵メーカーで保存したもの）');

  const ordered = sampleAssets.length > 0 || userAssets.length > 0 ? [...sampleAssets, ...userAssets] : [...assets];

  ordered.forEach((a) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'iv-asset-btn';
    btn.dataset.assetId = a.id;
    btn.dataset.active = selectedEnemyToken === a.id ? 'true' : 'false';

    const thumbUrl = previewUrlForAsset(a);
    const img = new Image();
    img.decoding = 'async';
    img.src = thumbUrl;
    enemyThumbImg.set(a.id, img);

    const frameCount = Array.isArray(a.frames) ? a.frames.length : 1;
    const isSample = String(a.ownerId || '') === 'sample' || String(a.id || '').startsWith('sample_');
    btn.innerHTML = `
      <img alt="" src="${thumbUrl}">
      <div>
        <div class="iv-asset-name">${escapeHtml(a.name || '（no name）')}</div>
        <div class="iv-asset-meta">${a.width}×${a.height}${frameCount > 1 ? ` / ${frameCount}フレーム` : ''}${isSample ? ' / サンプル' : ''}</div>
      </div>
    `;
    btn.addEventListener('click', () => setSelectedEnemyToken(a.id));
    assetStrip.appendChild(btn);
  });
}

async function init() {
  resizeEditorCanvas();

  // Load stage from URL (if any)
  const desired = getStageFromUrl();
  if (desired) {
    const list = ensureStages();
    const found = list.find((s) => s.name === desired);
    if (found) {
      currentStage = normalizeStage(found);
      stageNameEl.value = currentStage.name;
      loadedStageName = currentStage.name;
    }
  }
  if (!stageNameEl.value) stageNameEl.value = currentStage.name;

  setSelectedEnemyToken(ENEMY_DEFAULT);
  await buildAssetStrip();
  drawEditor();
}

init();

