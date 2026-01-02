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
const appRoot = document.getElementById('appRoot');
const galleryView = document.getElementById('galleryView');
const galleryNewBtn = document.getElementById('galleryNewBtn');
const galleryList = document.getElementById('galleryList');
const editorView = document.getElementById('editorView');
const backToGalleryBtn = document.getElementById('backToGalleryBtn');

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
const toolFill = document.getElementById('toolFill');
const toolPicker = document.getElementById('toolPicker');

const colorInput = document.getElementById('colorInput');
const paletteGrid = document.getElementById('paletteGrid');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const sizePicker = document.getElementById('sizePicker');

const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const duplicateBtn = document.getElementById('duplicateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const exportBtn = document.getElementById('exportBtn');

const statusText = document.getElementById('statusText');
const assetsList = document.getElementById('assetsList');

// State
/** @type {'pen'|'eraser'|'fill'|'picker'} */
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

const UNIT = 16;
const SIZE_PRESETS = [
  { w: 1, h: 1 },
  { w: 2, h: 1 },
  { w: 1, h: 2 },
  { w: 2, h: 2 },
  { w: 4, h: 2 },
  { w: 2, h: 4 },
  { w: 4, h: 4 },
  { w: 8, h: 8 },
  { w: 16, h: 16 }
];

const FIXED_PALETTE_64 = [
  // DawnBringer 64 (DB64) palette (curated 64 colors)
  '#140c1c',
  '#442434',
  '#30346d',
  '#4e4a4e',
  '#854c30',
  '#346524',
  '#d04648',
  '#757161',
  '#597dce',
  '#d27d2c',
  '#8595a1',
  '#6daa2c',
  '#d2aa99',
  '#6dc2ca',
  '#dad45e',
  '#deeed6',
  '#000000',
  '#222034',
  '#45283c',
  '#663931',
  '#8f563b',
  '#df7126',
  '#d9a066',
  '#eec39a',
  '#fbf236',
  '#99e550',
  '#6abe30',
  '#37946e',
  '#4b692f',
  '#524b24',
  '#323c39',
  '#3f3f74',
  '#306082',
  '#5b6ee1',
  '#639bff',
  '#5fcde4',
  '#cbdbfc',
  '#ffffff',
  '#9badb7',
  '#847e87',
  '#696a6a',
  '#595652',
  '#76428a',
  '#ac3232',
  '#d95763',
  '#d77bba',
  '#8f974a',
  '#8a6f30',
  '#c2c3c7',
  '#5d275d',
  '#b13e53',
  '#ef7d57',
  '#ffcd75',
  '#a7f070',
  '#38b764',
  '#257179',
  '#29366f',
  '#3b5dc9',
  '#41a6f6',
  '#73eff7',
  '#f4f4f4',
  '#94b0c2',
  '#566c86',
  '#333c57'
];

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
  toolFill.classList.toggle('active', tool === 'fill');
  toolPicker.classList.toggle('active', tool === 'picker');
  canvas.style.cursor = tool === 'picker' ? 'copy' : 'crosshair';
}

function setView(view) {
  const v = view === 'editor' ? 'editor' : 'gallery';
  appRoot.dataset.view = v;
  const showEditor = v === 'editor';
  editorView.hidden = !showEditor;
  galleryView.hidden = showEditor;
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
  sizeSelect.disabled = Boolean(persisted); // 保存済みは固定 / 新規は変更OK
  updateSizePickerDisabled();
  updateSizePickerSelection();

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

function updateSizePickerDisabled() {
  if (!sizePicker) return;
  sizePicker.classList.toggle('disabled', Boolean(sizeSelect.disabled));
}

function updateSizePickerSelection() {
  if (!sizePicker) return;
  const current = String(sizeSelect.value || '');
  sizePicker.querySelectorAll('.size-btn').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.classList.toggle('selected', btn.dataset.sizeValue === current);
  });
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

function floodFillAtIndex(startIndex, replacementRgba) {
  if (!currentAsset) return 0;
  const w = currentAsset.width;
  const h = currentAsset.height;
  const pixels = currentAsset.pixels;
  const target = pixels[startIndex] >>> 0;
  const replacement = replacementRgba >>> 0;
  if (startIndex < 0 || startIndex >= pixels.length) return 0;
  if (target === replacement) return 0;

  let changed = 0;
  const stack = [startIndex];

  while (stack.length) {
    const idx = stack.pop();
    if (idx == null) continue;
    if ((pixels[idx] >>> 0) !== target) continue;
    pixels[idx] = replacement;
    changed++;

    const x = idx % w;
    const y = (idx / w) | 0;
    if (x > 0) stack.push(idx - 1);
    if (x < w - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - w);
    if (y < h - 1) stack.push(idx + w);
  }

  return changed;
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
      updatePaletteSelection();
      updateStatus('色をひろった');
    } else {
      updateStatus('透明（色なし）');
    }
    return;
  }

  if (currentTool === 'fill') {
    const snapshot = new Uint32Array(currentAsset.pixels);
    const changedCount = floodFillAtIndex(index, currentColor);
    if (changedCount > 0) {
      pushUndoSnapshot(snapshot);
      setDirty(true);
      scheduleRender();
      updateStatus('ベタ塗り');
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
      setView('editor');
      await refreshAssetsList();
    });

    assetsList.appendChild(btn);
  });
}

async function refreshGalleryList() {
  const list = await listPixelAssets({ ownerId });
  galleryList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tiny-note';
    empty.textContent = 'まだ作品がないよ。右上の「新規作成」から作ってみよう！';
    galleryList.appendChild(empty);
    return;
  }

  list.forEach((asset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gallery-item';

    const img = document.createElement('img');
    img.className = 'gallery-thumb';
    img.alt = '';
    img.src = assetPreviewDataUrl(asset, 72);

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
      const loaded = await getPixelAsset(asset.id);
      if (!loaded) return;
      setAsset(loaded, { persisted: true });
      setView('editor');
      await refreshAssetsList();
      updateStatus('読み込んだ');
    });

    galleryList.appendChild(btn);
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

function renderSizePicker() {
  if (!sizePicker) return;
  sizePicker.innerHTML = '';

  SIZE_PRESETS.forEach((p) => {
    const pxW = p.w * UNIT;
    const pxH = p.h * UNIT;
    const sizeValue = `${pxW}x${pxH}`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'size-btn';
    btn.dataset.sizeValue = sizeValue;
    btn.setAttribute('aria-label', `サイズ 横${p.w} 縦${p.h}（${pxW}×${pxH}）`);

    const visual = document.createElement('div');
    visual.className = 'size-visual';

    const grid = document.createElement('div');
    grid.className = 'size-visual-grid';
    const cols = Math.min(8, p.w);
    const rows = Math.min(8, p.h);
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    for (let i = 0; i < cols * rows; i++) {
      const cell = document.createElement('div');
      cell.className = 'size-cell';
      grid.appendChild(cell);
    }
    visual.appendChild(grid);

    const meta = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'size-label';
    label.textContent = `横${p.w} × 縦${p.h}`;

    const sub = document.createElement('div');
    sub.className = 'size-sub';
    sub.textContent = `${pxW}×${pxH}px`;

    meta.appendChild(label);
    meta.appendChild(sub);

    btn.appendChild(visual);
    btn.appendChild(meta);

    btn.addEventListener('click', () => {
      if (sizeSelect.disabled) return;
      sizeSelect.value = sizeValue;
      updateSizePickerSelection();
      maybeResizeNewAsset();
    });

    sizePicker.appendChild(btn);
  });

  updateSizePickerDisabled();
  updateSizePickerSelection();
}

function maybeResizeNewAsset() {
  if (!currentAsset) return;
  if (isPersisted) return;

  const nextSize = parseSizeValue(sizeSelect.value);
  if (currentAsset.width === nextSize.width && currentAsset.height === nextSize.height) return;

  if (dirty && !confirm('いまの絵は消えます。サイズを変えますか？')) {
    // Revert selection
    sizeSelect.value = `${currentAsset.width}x${currentAsset.height}`;
    updateSizePickerSelection();
    return;
  }

  const next = createEmptyAsset({
    ownerId,
    kind: currentAsset.kind,
    width: nextSize.width,
    height: nextSize.height,
    name: currentAsset.name || 'あたらしいドット'
  });
  setAsset(next, { persisted: false });
  updateStatus('サイズ変更');
}

function renderPalette() {
  paletteGrid.innerHTML = '';
  FIXED_PALETTE_64.forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'swatch';
    btn.style.background = hex;
    btn.dataset.hex = hex.toLowerCase();
    btn.setAttribute('aria-label', `色 ${hex}`);
    btn.addEventListener('click', () => {
      colorInput.value = hex;
      currentColor = hexToRgbaInt(colorInput.value);
      updatePaletteSelection();
    });
    paletteGrid.appendChild(btn);
  });
  updatePaletteSelection();
}

function updatePaletteSelection() {
  const currentHex = String(colorInput.value || '').toLowerCase();
  paletteGrid.querySelectorAll('.swatch').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.classList.toggle('selected', btn.dataset.hex === currentHex);
  });
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
  updatePaletteSelection();
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
toolFill.addEventListener('click', () => setTool('fill'));
toolPicker.addEventListener('click', () => setTool('picker'));

backToGalleryBtn.addEventListener('click', async () => {
  if (dirty && !confirm('いまの変更は保存されていません。ギャラリーに戻りますか？')) return;
  setView('gallery');
  await refreshGalleryList();
});

galleryNewBtn.addEventListener('click', async () => {
  if (dirty && !confirm('いまの変更は保存されていません。新規作成しますか？')) return;
  isPersisted = false;
  const next = createNewAssetFromUI();
  setAsset(next, { persisted: false });
  setTool('pen');
  setView('editor');
  await refreshAssetsList();
  updateStatus('新規');
});

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

clearBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (!confirm('ぜんぶ消しますか？（もどすで元に戻せるよ）')) return;
  const snapshot = new Uint32Array(currentAsset.pixels);
  currentAsset.pixels.fill(0);
  pushUndoSnapshot(snapshot);
  setDirty(true);
  scheduleRender();
  updateStatus('全消し');
});

newBtn.addEventListener('click', async () => {
  if (dirty && !confirm('いまの変更は保存されていません。新規にしますか？')) return;
  isPersisted = false;
  const next = createNewAssetFromUI();
  setAsset(next, { persisted: false });
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
    const next = createNewAssetFromUI();
    setAsset(next, { persisted: false });
    updateStatus('新規');
    return;
  }

  if (!confirm('本当に削除しますか？')) return;
  await deletePixelAsset(currentAsset.id);
  const next = createNewAssetFromUI();
  setAsset(next, { persisted: false });
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

  if (currentTool === 'fill') {
    lastPaintedIndex = -1;
    applyToolAtEvent(e);
    return;
  }

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
  renderSizePicker();
  renderPalette();

  const list = await listPixelAssets({ ownerId });
  if (list.length === 0) {
    const next = createNewAssetFromUI();
    setAsset(next, { persisted: false });
    setView('editor');
  } else {
    setView('gallery');
  }

  await refreshGalleryList();
  await refreshAssetsList();
  updateStatus('準備OK');
})();

