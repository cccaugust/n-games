import { getCurrentPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import {
  assetPreviewDataUrl,
  createEmptyAsset,
  deletePixelAsset,
  duplicatePixelAsset,
  getPixelAsset,
  hexToRgbaInt,
  listPixelAssets,
  pixelsToImageData,
  putPixelAsset,
  rgbaIntToHex
} from '../../js/pixelAssets.js';

requireAuth();

const player = getCurrentPlayer();
const ownerId = player?.id != null ? String(player.id) : 'unknown';

// Header
const playerPill = document.getElementById('playerPill');
playerPill.textContent = `${player?.avatar || '👤'} ${player?.name || 'Player'}`;

const backToPortal = document.getElementById('backToPortal');
backToPortal.href = resolvePath('/pages/portal/portal.html');

// DOM
const canvasMeta = document.getElementById('canvasMeta');
const canvasScroll = document.getElementById('canvasScroll');
const canvasFrame = document.getElementById('canvasFrame');
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

const zoomRange = document.getElementById('zoomRange');
const gridToggle = document.getElementById('gridToggle');

const nameInput = document.getElementById('nameInput');
const kindSelect = document.getElementById('kindSelect');
const sizeSelect = document.getElementById('sizeSelect');

const toolPen = document.getElementById('toolPen');
const toolEraser = document.getElementById('toolEraser');
const toolPicker = document.getElementById('toolPicker');

const colorInput = document.getElementById('colorInput');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');

const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const duplicateBtn = document.getElementById('duplicateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const exportBtn = document.getElementById('exportBtn');

const statusText = document.getElementById('statusText');
const assetsList = document.getElementById('assetsList');

// State
/** @type {'pen'|'eraser'|'picker'} */
let currentTool = 'pen';
let currentColor = hexToRgbaInt(colorInput.value);

/** @type {import('../../js/pixelAssets.js').PixelAsset|null} */
let currentAsset = null;
let isPersisted = false;
let dirty = false;

/** @type {Uint32Array[]} */
let undoStack = [];
/** @type {Uint32Array[]} */
let redoStack = [];
let strokeSnapshot = null;

let zoom = Number(zoomRange.value);
let isPointerDown = false;
let lastPaintedIndex = -1;
let renderScheduled = false;

function parseSizeValue(v) {
  const [w, h] = String(v).split('x').map((n) => parseInt(n, 10));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return { width: 16, height: 16 };
  return { width: w, height: h };
}

function maxHistoryForPixels(pixelCount) {
  if (pixelCount <= 16 * 16) return 60;
  if (pixelCount <= 64 * 64) return 40;
  if (pixelCount <= 128 * 128) return 20;
  return 8;
}

function setDirty(nextDirty) {
  dirty = nextDirty;
  updateStatus();
}

function updateStatus(message) {
  const parts = [];
  if (message) parts.push(message);
  if (dirty) parts.push('未保存');
  if (!dirty && isPersisted) parts.push('保存済み');
  if (!dirty && !isPersisted) parts.push('新規（未保存）');
  statusText.textContent = parts.join(' / ') || '-';
}

function setTool(tool) {
  currentTool = tool;
  toolPen.classList.toggle('active', tool === 'pen');
  toolEraser.classList.toggle('active', tool === 'eraser');
  toolPicker.classList.toggle('active', tool === 'picker');
  canvas.style.cursor = tool === 'picker' ? 'copy' : 'crosshair';
}

function updateCanvasLayout() {
  if (!currentAsset) return;
  const w = currentAsset.width;
  const h = currentAsset.height;

  canvas.style.width = `${w * zoom}px`;
  canvas.style.height = `${h * zoom}px`;
  canvasFrame.style.setProperty('--cell', `${zoom}px`);
  canvasMeta.textContent = `${w}×${h} / ${kindLabel(currentAsset.kind)}`;

  // Keep the drawing comfortably visible when zoom changes.
  if (zoom >= 28) {
    canvasScroll.scrollLeft = Math.max(0, canvasScroll.scrollLeft);
    canvasScroll.scrollTop = Math.max(0, canvasScroll.scrollTop);
  }
}

function kindLabel(kind) {
  if (kind === 'tile') return '地形';
  if (kind === 'object') return 'モノ';
  return 'キャラ';
}

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    renderNow();
  });
}

function renderNow() {
  if (!currentAsset) return;
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(pixelsToImageData(currentAsset.pixels, currentAsset.width, currentAsset.height), 0, 0);
}

function setAsset(asset, { persisted }) {
  currentAsset = asset;
  isPersisted = Boolean(persisted);
  setDirty(false);

  // Sync UI fields
  nameInput.value = asset.name || '';
  kindSelect.value = asset.kind;
  sizeSelect.value = `${asset.width}x${asset.height}`;
  sizeSelect.disabled = true; // MVP: resize later

  // Canvas internal size
  canvas.width = asset.width;
  canvas.height = asset.height;

  // Reset history
  undoStack = [];
  redoStack = [];
  strokeSnapshot = null;
  lastPaintedIndex = -1;

  updateCanvasLayout();
  scheduleRender();
  updateUndoRedoButtons();
  updateStatus();
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function pushUndoSnapshot(snapshotPixels) {
  if (!currentAsset) return;
  const cap = maxHistoryForPixels(currentAsset.pixels.length);
  undoStack.push(snapshotPixels);
  if (undoStack.length > cap) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function coordToIndex(x, y) {
  if (!currentAsset) return -1;
  if (x < 0 || y < 0 || x >= currentAsset.width || y >= currentAsset.height) return -1;
  return y * currentAsset.width + x;
}

function eventToPixel(e) {
  if (!currentAsset) return { x: -1, y: -1, index: -1 };
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) * currentAsset.width) / rect.width);
  const y = Math.floor(((e.clientY - rect.top) * currentAsset.height) / rect.height);
  const index = coordToIndex(x, y);
  return { x, y, index };
}

function setPixelAtIndex(index, rgba) {
  if (!currentAsset) return false;
  if (index < 0 || index >= currentAsset.pixels.length) return false;
  const prev = currentAsset.pixels[index] >>> 0;
  const next = rgba >>> 0;
  if (prev === next) return false;
  currentAsset.pixels[index] = next;
  return true;
}

function applyToolAtEvent(e) {
  if (!currentAsset) return;
  const { index } = eventToPixel(e);
  if (index < 0) return;
  if (index === lastPaintedIndex && currentTool !== 'picker') return;
  lastPaintedIndex = index;

  if (currentTool === 'picker') {
    const v = currentAsset.pixels[index] >>> 0;
    if (v !== 0) {
      colorInput.value = rgbaIntToHex(v);
      currentColor = hexToRgbaInt(colorInput.value);
      updateStatus('色をひろった');
    } else {
      updateStatus('透明（色なし）');
    }
    return;
  }

  const changed =
    currentTool === 'eraser'
      ? setPixelAtIndex(index, 0)
      : setPixelAtIndex(index, currentColor);

  if (changed) {
    setDirty(true);
    scheduleRender();
  }
}

async function refreshAssetsList() {
  const list = await listPixelAssets({ ownerId });
  assetsList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tiny-note';
    empty.textContent = 'まだ保存した作品がないよ（右上の「保存」を押すとここに出るよ）';
    assetsList.appendChild(empty);
    return;
  }

  list.forEach((asset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'asset-item';
    const isSelected = currentAsset && isPersisted && asset.id === currentAsset.id;
    btn.classList.toggle('selected', isSelected);

    const img = document.createElement('img');
    img.className = 'asset-thumb';
    img.alt = '';
    img.src = assetPreviewDataUrl(asset, 56);

    const meta = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'asset-name';
    name.textContent = asset.name || '(no name)';

    const info = document.createElement('div');
    info.className = 'asset-meta';
    info.textContent = `${kindLabel(asset.kind)} / ${asset.width}×${asset.height}`;

    meta.appendChild(name);
    meta.appendChild(info);

    btn.appendChild(img);
    btn.appendChild(meta);

    btn.addEventListener('click', async () => {
      if (dirty && !confirm('いまの変更は保存されていません。読み込みますか？')) return;
      const loaded = await getPixelAsset(asset.id);
      if (!loaded) return;
      setAsset(loaded, { persisted: true });
      await refreshAssetsList();
    });

    assetsList.appendChild(btn);
  });
}

function createNewAssetFromUI() {
  const { width, height } = parseSizeValue(sizeSelect.value);
  const kind = /** @type {any} */ (kindSelect.value);
  const next = createEmptyAsset({
    ownerId,
    kind,
    width,
    height,
    name: 'あたらしいドット'
  });
  return next;
}

// UI events
zoomRange.addEventListener('input', () => {
  zoom = Number(zoomRange.value);
  updateCanvasLayout();
});

gridToggle.addEventListener('change', () => {
  canvasFrame.classList.toggle('grid', gridToggle.checked);
});

colorInput.addEventListener('input', () => {
  currentColor = hexToRgbaInt(colorInput.value);
});

nameInput.addEventListener('input', () => {
  if (!currentAsset) return;
  currentAsset.name = nameInput.value;
  setDirty(true);
});

kindSelect.addEventListener('change', () => {
  if (!currentAsset) return;
  currentAsset.kind = /** @type {any} */ (kindSelect.value);
  setDirty(true);
  updateCanvasLayout();
});

toolPen.addEventListener('click', () => setTool('pen'));
toolEraser.addEventListener('click', () => setTool('eraser'));
toolPicker.addEventListener('click', () => setTool('picker'));

undoBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (undoStack.length === 0) return;
  const prev = undoStack.pop();
  redoStack.push(new Uint32Array(currentAsset.pixels));
  currentAsset.pixels = prev;
  scheduleRender();
  setDirty(true);
  updateUndoRedoButtons();
  updateStatus('もどした');
});

redoBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(new Uint32Array(currentAsset.pixels));
  currentAsset.pixels = next;
  scheduleRender();
  setDirty(true);
  updateUndoRedoButtons();
  updateStatus('やりなおした');
});

newBtn.addEventListener('click', async () => {
  if (dirty && !confirm('いまの変更は保存されていません。新規にしますか？')) return;
  sizeSelect.disabled = false;
  isPersisted = false;
  const next = createNewAssetFromUI();
  setAsset(next, { persisted: false });
  sizeSelect.disabled = false;
  updateStatus('新規');
  await refreshAssetsList();
});

saveBtn.addEventListener('click', async () => {
  if (!currentAsset) return;
  const name = nameInput.value.trim();
  if (!name) {
    alert('なまえをいれてね！');
    return;
  }
  currentAsset.name = name;
  currentAsset.kind = /** @type {any} */ (kindSelect.value);
  const saved = await putPixelAsset(currentAsset);
  setAsset(saved, { persisted: true });
  await refreshAssetsList();
  updateStatus('保存した');
});

duplicateBtn.addEventListener('click', async () => {
  if (!currentAsset) return;
  const baseName = (nameInput.value.trim() || currentAsset.name || 'ドット') + '（コピー）';
  const next = await duplicatePixelAsset(
    { ...currentAsset, name: baseName, kind: /** @type {any} */ (kindSelect.value) },
    { name: baseName }
  );
  setAsset(next, { persisted: true });
  await refreshAssetsList();
  updateStatus('複製した');
});

deleteBtn.addEventListener('click', async () => {
  if (!currentAsset) return;

  if (!isPersisted) {
    if (!confirm('この新規作品はまだ保存されていません。消して新規にしますか？')) return;
    sizeSelect.disabled = false;
    const next = createNewAssetFromUI();
    setAsset(next, { persisted: false });
    sizeSelect.disabled = false;
    updateStatus('新規');
    return;
  }

  if (!confirm('本当に削除しますか？')) return;
  await deletePixelAsset(currentAsset.id);
  sizeSelect.disabled = false;
  const next = createNewAssetFromUI();
  setAsset(next, { persisted: false });
  sizeSelect.disabled = false;
  await refreshAssetsList();
  updateStatus('削除した');
});

exportBtn.addEventListener('click', async () => {
  if (!currentAsset) return;

  const out = document.createElement('canvas');
  out.width = currentAsset.width;
  out.height = currentAsset.height;
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.putImageData(pixelsToImageData(currentAsset.pixels, currentAsset.width, currentAsset.height), 0, 0);

  const safeName = (currentAsset.name || 'pixel-art')
    .replaceAll(/[\\/:*?"<>|]/g, '_')
    .slice(0, 60);

  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}_${currentAsset.width}x${currentAsset.height}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
});

// Pointer drawing
canvas.addEventListener('pointerdown', (e) => {
  if (!currentAsset) return;
  isPointerDown = true;
  canvas.setPointerCapture(e.pointerId);
  lastPaintedIndex = -1;

  if (currentTool !== 'picker') {
    strokeSnapshot = new Uint32Array(currentAsset.pixels);
  } else {
    strokeSnapshot = null;
  }

  applyToolAtEvent(e);
});

canvas.addEventListener('pointermove', (e) => {
  if (!isPointerDown) return;
  applyToolAtEvent(e);
});

function endStroke() {
  if (!currentAsset) return;
  isPointerDown = false;
  lastPaintedIndex = -1;

  if (strokeSnapshot && dirty) {
    pushUndoSnapshot(strokeSnapshot);
  }
  strokeSnapshot = null;
}

canvas.addEventListener('pointerup', endStroke);
canvas.addEventListener('pointercancel', endStroke);
canvas.addEventListener('pointerleave', () => {
  if (isPointerDown) endStroke();
});

// Initial load: newest asset if exists, else blank.
(async function init() {
  setTool('pen');
  canvasFrame.classList.toggle('grid', gridToggle.checked);

  const list = await listPixelAssets({ ownerId });
  if (list.length > 0) {
    const loaded = await getPixelAsset(list[0].id);
    if (loaded) setAsset(loaded, { persisted: true });
  }
  if (!currentAsset) {
    sizeSelect.disabled = false;
    const next = createNewAssetFromUI();
    setAsset(next, { persisted: false });
    sizeSelect.disabled = false;
  }

  await refreshAssetsList();
  updateStatus('準備OK');
})();

