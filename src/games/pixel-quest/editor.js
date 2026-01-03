import { initOverlay } from './overlay.js';
import {
  clamp,
  countGems,
  deleteUserStageByName,
  downloadJson,
  ensureStages,
  escapeHtml,
  getStageFromUrl,
  makeEmptyStage,
  normalizeStage,
  stageHref,
  STAGE_COLS,
  STAGE_ROWS,
  TILE,
  uniqueName,
  upsertUserStage,
  listAssetsForPicker,
  previewUrlForAsset
} from './shared.js';

function qs(id) {
  return document.getElementById(id);
}

const editorCanvas = qs('editorCanvas');
const ectx = editorCanvas.getContext('2d');
const toolButtons = [
  qs('toolFloor'),
  qs('toolWall'),
  qs('toolGem'),
  qs('toolSpike'),
  qs('toolGoal'),
  qs('toolStart')
].filter(Boolean);

const stageNameEl = qs('stageName');
const saveBtn = qs('saveBtn');
const loadBtn = qs('loadBtn');
const clearBtn = qs('clearBtn');
const editorStatus = qs('editorStatus');
const toolHint = qs('toolHint');
const skinStatus = qs('skinStatus');

const libraryOverlay = qs('libraryOverlay');
const libraryClose = qs('libraryClose');
const libraryNew = qs('libraryNew');
const libraryExportAll = qs('libraryExportAll');
const libraryImportBtn = qs('libraryImportBtn');
const libraryImportFile = qs('libraryImportFile');
const libraryListEl = qs('libraryList');
const libraryCountEl = qs('libraryCount');

const assetPickerOverlay = qs('assetPickerOverlay');
const assetPickerClose = qs('assetPickerClose');
const assetPickerTitle = qs('assetPickerTitle');
const assetPickerList = qs('assetPickerList');
const assetPickerNone = qs('assetPickerNone');
const assetPickerSearch = qs('assetPickerSearch');
const assetPickerScope = qs('assetPickerScope');

const pickButtons = [
  qs('pickPlayerBtn'),
  qs('pickWallBtn'),
  qs('pickGemBtn'),
  qs('pickGoalBtn'),
  qs('pickSpikeBtn')
].filter(Boolean);

const { showOverlay } = initOverlay();

// Canvas DPR
let viewW = 800;
let viewH = 520;

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
  viewW = w;
  viewH = h;
}

window.addEventListener('resize', () => {
  resizeEditorCanvas();
  drawEditor();
});

// State
let currentTool = 'floor';
let currentStage = makeEmptyStage('新しいステージ');
let loadedStageName = null;
let assetPickerSlot = null; // skin slot name
let cachedAssets = [];

function setTool(tool) {
  currentTool = tool;
  toolButtons.forEach((btn) => {
    btn.dataset.active = btn.dataset.tool === tool ? 'true' : 'false';
  });
  if (toolHint) {
    const hint =
      tool === 'floor'
        ? '床をぬる（消しゴム）'
        : tool === 'wall'
          ? 'かべを置く'
          : tool === 'gem'
            ? 'ほうせきを置く'
            : tool === 'spike'
              ? 'トゲを置く'
              : tool === 'goal'
                ? 'ゴールは1つだけ'
                : 'スタートは1つだけ';
    toolHint.textContent = hint;
  }
}
setTool('floor');

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
  if (tool === 'wall') return TILE.WALL;
  if (tool === 'gem') return TILE.GEM;
  if (tool === 'spike') return TILE.SPIKE;
  if (tool === 'goal') return TILE.GOAL;
  if (tool === 'start') return TILE.START;
  return TILE.FLOOR;
}

function applyToolAt(x, y) {
  const idx = gridIndex(x, y);
  const t = toolToTile(currentTool);
  currentStage.grid[idx] = t;
  // Normalize later to enforce single START/GOAL
}

function tileColor(t) {
  if (t === TILE.WALL) return 'rgba(255,255,255,0.18)';
  if (t === TILE.GEM) return 'rgba(0, 206, 201, 0.92)';
  if (t === TILE.SPIKE) return 'rgba(255, 118, 117, 0.92)';
  if (t === TILE.GOAL) return 'rgba(162, 155, 254, 0.92)';
  if (t === TILE.START) return 'rgba(255, 234, 167, 0.92)';
  return 'rgba(255,255,255,0.04)';
}

function drawEditor() {
  const W = viewW;
  const H = viewH;
  ectx.clearRect(0, 0, W, H);

  const g = ectx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#0b1020');
  ectx.fillStyle = g;
  ectx.fillRect(0, 0, W, H);

  const cellW = W / STAGE_COLS;
  const cellH = H / STAGE_ROWS;

  for (let y = 0; y < STAGE_ROWS; y++) {
    for (let x = 0; x < STAGE_COLS; x++) {
      const t = currentStage.grid[gridIndex(x, y)];
      const px = x * cellW;
      const py = y * cellH;
      ectx.fillStyle = tileColor(t);
      ectx.fillRect(px + 2, py + 2, cellW - 4, cellH - 4);
    }
  }

  // grid lines
  ectx.strokeStyle = 'rgba(255,255,255,0.06)';
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

  if (editorStatus) editorStatus.textContent = `${STAGE_COLS}×${STAGE_ROWS} / 宝石 ${countGems(currentStage)}こ`;
}

let isPainting = false;
let lastPaint = null;
editorCanvas.addEventListener('pointerdown', (e) => {
  editorCanvas.setPointerCapture?.(e.pointerId);
  isPainting = true;
  const c = getCellFromPointer(e);
  lastPaint = c;
  applyToolAt(c.x, c.y);
  currentStage = normalizeStage(currentStage);
  drawEditor();
  e.preventDefault();
});
editorCanvas.addEventListener('pointermove', (e) => {
  if (!isPainting) return;
  const c = getCellFromPointer(e);
  if (lastPaint && c.x === lastPaint.x && c.y === lastPaint.y) return;
  lastPaint = c;
  applyToolAt(c.x, c.y);
  currentStage = normalizeStage(currentStage);
  drawEditor();
  e.preventDefault();
});
function endPaint() {
  isPainting = false;
  lastPaint = null;
}
editorCanvas.addEventListener('pointerup', endPaint);
editorCanvas.addEventListener('pointercancel', endPaint);

toolButtons.forEach((btn) => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});

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
});

libraryExportAll?.addEventListener('click', () => {
  const list = ensureStages();
  downloadJson('n-games-pixel-quest-stages.json', list);
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
  const names = new Set(existing.map((s) => s.name));

  let ok = 0;
  for (const s of normalized) {
    const name = uniqueName(s.name, names);
    names.add(name);
    upsertUserStage({ ...s, name });
    ok++;
  }
  renderLibrary();
  showOverlay('インポートOK', `${ok}こ取りこんだよ。`);
}

libraryImportFile?.addEventListener('change', async () => {
  const f = libraryImportFile.files?.[0];
  if (!f) return;
  await importFromFile(f);
});

function renderLibrary() {
  const list = ensureStages();
  libraryCountEl.textContent = `${list.length}こ`;
  libraryListEl.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.padding = '12px';
    empty.style.borderRadius = '14px';
    empty.style.background = 'rgba(255,255,255,0.08)';
    empty.style.border = '1px solid rgba(255,255,255,0.12)';
    empty.innerHTML = `
      <div style="font-weight: 900;">まだステージがないよ</div>
      <div style="opacity: 0.9; margin-top: 4px; font-size: 0.95rem;">作って「保存」するとここに出てくるよ。</div>
    `;
    libraryListEl.appendChild(empty);
    return;
  }

  list.forEach((s) => {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto';
    row.style.gap = '10px';
    row.style.alignItems = 'center';
    row.style.padding = '12px';
    row.style.borderRadius = '14px';
    row.style.background = 'rgba(255, 255, 255, 0.08)';
    row.style.border = '1px solid rgba(255,255,255,0.12)';

    const gems = countGems(s);
    const info = document.createElement('div');
    info.innerHTML = `
      <div style="display:flex; gap: 10px; flex-wrap: wrap; align-items: baseline;">
        <div style="font-weight: 900; font-size: 1.1rem;">${escapeHtml(s.name)}</div>
        <div style="opacity: 0.9; font-size: 0.9rem;">宝石 ${gems}こ</div>
      </div>
      <div style="opacity: 0.85; margin-top: 4px; font-size: 0.9rem;">${s.cols}×${s.rows}</div>
    `;

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.flexWrap = 'wrap';
    actions.style.justifyContent = 'flex-end';

    const btnLoadStage = document.createElement('button');
    btnLoadStage.className = 'pq-tool-btn pq-mini';
    btnLoadStage.textContent = 'ロード';
    btnLoadStage.addEventListener('click', () => {
      currentStage = normalizeStage(s);
      stageNameEl.value = currentStage.name;
      loadedStageName = currentStage.name;
      closeLibrary();
      drawEditor();
      showOverlay('ロードしたよ', `「${currentStage.name}」を読みこみました。`);
    });

    const btnExport = document.createElement('button');
    btnExport.className = 'pq-tool-btn pq-mini';
    btnExport.textContent = '書き出し';
    btnExport.addEventListener('click', () => {
      downloadJson(`${s.name}.pixel-quest.stage.json`, s);
      showOverlay('書き出したよ', `「${s.name}」をファイルにしました。`);
    });

    const btnPlay = document.createElement('a');
    btnPlay.className = 'btn-primary';
    btnPlay.textContent = 'プレイ';
    btnPlay.href = stageHref('./play.html', s.name);
    btnPlay.style.textDecoration = 'none';
    btnPlay.style.borderRadius = '999px';
    btnPlay.style.padding = '9px 12px';
    btnPlay.style.display = 'inline-flex';
    btnPlay.style.alignItems = 'center';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'pq-tool-btn pq-mini danger';
    btnDelete.textContent = '削除';
    btnDelete.addEventListener('click', () => {
      if (!confirm(`「${s.name}」を削除する？（元に戻せないよ）`)) return;
      deleteUserStageByName(s.name);
      renderLibrary();
      showOverlay('削除したよ', `「${s.name}」を削除しました。`);
    });

    actions.appendChild(btnPlay);
    actions.appendChild(btnLoadStage);
    actions.appendChild(btnExport);
    actions.appendChild(btnDelete);
    row.appendChild(info);
    row.appendChild(actions);
    libraryListEl.appendChild(row);
  });
}

// Asset picker
function openAssetPicker(slot) {
  assetPickerSlot = slot;
  if (assetPickerTitle) assetPickerTitle.textContent = '🧩 見た目をえらぶ';
  if (assetPickerSearch) assetPickerSearch.value = '';
  cachedAssets = [];
  renderAssetPickerList([]);
  assetPickerOverlay.style.display = 'flex';
  assetPickerOverlay.setAttribute('aria-hidden', 'false');
  void refreshAssetPickerList();
}

function closeAssetPicker() {
  assetPickerOverlay.style.display = 'none';
  assetPickerOverlay.setAttribute('aria-hidden', 'true');
  assetPickerSlot = null;
}

assetPickerClose?.addEventListener('click', closeAssetPicker);
assetPickerOverlay?.addEventListener('click', (e) => {
  if (e.target === assetPickerOverlay) closeAssetPicker();
});

function renderAssetPickerList(list) {
  if (!assetPickerList) return;
  assetPickerList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pq-card';
    empty.textContent = '作品が見つからなかったよ。ドット絵メーカーで作って保存してみてね。';
    assetPickerList.appendChild(empty);
    return;
  }

  list.forEach((asset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pq-asset-btn';

    const img = document.createElement('img');
    img.alt = '';
    img.src = previewUrlForAsset(asset);

    const meta = document.createElement('div');
    const title = document.createElement('div');
    title.style.fontWeight = '900';
    title.textContent = asset.name || '(no name)';
    const info = document.createElement('div');
    info.style.opacity = '0.85';
    info.style.fontSize = '0.9rem';
    info.textContent = `${asset.width}×${asset.height} / ${asset.kind}`;
    meta.appendChild(title);
    meta.appendChild(info);

    btn.appendChild(img);
    btn.appendChild(meta);

    btn.addEventListener('click', () => {
      if (!assetPickerSlot) return;
      currentStage.skin = { ...(currentStage.skin || {}), [assetPickerSlot]: asset.id };
      updateSkinStatus();
      closeAssetPicker();
      drawEditor();
    });

    assetPickerList.appendChild(btn);
  });
}

function applyAssetSearchFilter(list) {
  const q = String(assetPickerSearch?.value || '').trim().toLowerCase();
  if (!q) return list;
  return list.filter((a) => String(a.name || '').toLowerCase().includes(q));
}

async function refreshAssetPickerList() {
  const scope = String(assetPickerScope?.value || 'mine');
  const ownerOnly = scope !== 'all';
  const assets = await listAssetsForPicker({ ownerOnly });
  cachedAssets = Array.isArray(assets) ? assets : [];
  renderAssetPickerList(applyAssetSearchFilter(cachedAssets));
}

assetPickerSearch?.addEventListener('input', () => {
  renderAssetPickerList(applyAssetSearchFilter(cachedAssets));
});
assetPickerScope?.addEventListener('change', () => {
  void refreshAssetPickerList();
});

assetPickerNone?.addEventListener('click', () => {
  if (!assetPickerSlot) return;
  currentStage.skin = { ...(currentStage.skin || {}), [assetPickerSlot]: null };
  updateSkinStatus();
  closeAssetPicker();
  drawEditor();
});

function updateSkinStatus() {
  if (!skinStatus) return;
  const skin = currentStage.skin || {};
  const picked = [
    skin.playerAssetId ? '🙂' : null,
    skin.wallAssetId ? '🧱' : null,
    skin.gemAssetId ? '💎' : null,
    skin.goalAssetId ? '🏁' : null,
    skin.spikeAssetId ? '⚠️' : null
  ].filter(Boolean);
  skinStatus.textContent = picked.length ? `設定中：${picked.join(' ')}` : 'ドット絵メーカーの作品を使えるよ';
}

pickButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const slot = btn.dataset.skinSlot;
    if (!slot) return;
    openAssetPicker(slot);
  });
});

// Buttons
saveBtn.addEventListener('click', () => {
  const name = (stageNameEl.value || '').trim();
  if (!name) {
    showOverlay('名前がいるよ', '「名前」を入れてから保存してね。');
    return;
  }
  currentStage.name = name;
  currentStage = normalizeStage(currentStage);
  upsertUserStage(currentStage);
  loadedStageName = currentStage.name;
  showOverlay('保存したよ', `「${currentStage.name}」を保存しました。`);
});

loadBtn.addEventListener('click', () => {
  openLibrary();
});

clearBtn.addEventListener('click', () => {
  if (!confirm('いまのステージを床にする？（保存してないと元に戻せないよ）')) return;
  const name = (stageNameEl.value || '').trim() || '新しいステージ';
  const skin = currentStage.skin || {};
  currentStage = makeEmptyStage(name);
  currentStage.skin = { ...currentStage.skin, ...skin };
  currentStage = normalizeStage(currentStage);
  drawEditor();
});

// Init
async function init() {
  ensureStages();
  resizeEditorCanvas();

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
  currentStage = normalizeStage(currentStage);
  updateSkinStatus();
  drawEditor();
}

init();

