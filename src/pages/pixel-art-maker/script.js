import { getCurrentPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import { avatarToHtml, escapeHtml, makeImageAvatar } from '../../js/avatar.js';
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
import samplePack from './samples.json';

requireAuth();

const player = getCurrentPlayer();
const ownerId = player?.id != null ? String(player.id) : 'unknown';

const AVATAR_PICK_KEY = 'ngames.avatar.pick.v1';
const AVATAR_CTX_KEY = 'ngames.avatar.ctx.v1';

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Header
const playerPill = document.getElementById('playerPill');
playerPill.innerHTML = `${avatarToHtml(player?.avatar, { size: 18, className: 'pm-pill-avatar', alt: '' })} ${escapeHtml(
  player?.name || 'Player'
)}`;

const backToPortal = document.getElementById('backToPortal');
backToPortal.href = resolvePath('/pages/portal/portal.html');

// DOM
const appRoot = document.getElementById('appRoot');
const galleryView = document.getElementById('galleryView');
const galleryNewBtn = document.getElementById('galleryNewBtn');
const gallerySamplesBtn = document.getElementById('gallerySamplesBtn');
const galleryList = document.getElementById('galleryList');
const gallerySummary = document.getElementById('gallerySummary');
const gallerySearchInput = document.getElementById('gallerySearchInput');
const gallerySortSelect = document.getElementById('gallerySortSelect');
const editorView = document.getElementById('editorView');
const backToGalleryBtn = document.getElementById('backToGalleryBtn');

const canvasMeta = document.getElementById('canvasMeta');
const canvasScroll = document.getElementById('canvasScroll');
const canvasFrame = document.getElementById('canvasFrame');
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');

const zoomRange = document.getElementById('zoomRange');
const gridToggle = document.getElementById('gridToggle');
const gridToggleBtn = document.getElementById('gridToggleBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn = document.getElementById('zoomInBtn');

const nameInput = document.getElementById('nameInput');

const toolPen = document.getElementById('toolPen');
const toolEraser = document.getElementById('toolEraser');
const toolFill = document.getElementById('toolFill');
const toolPicker = document.getElementById('toolPicker');

const colorInput = document.getElementById('colorInput');
const paletteGrid = document.getElementById('paletteGrid');
const colorBtn = document.getElementById('colorBtn');
const colorDot = document.getElementById('colorDot');
const colorPopover = document.getElementById('colorPopover');
const colorPopoverCloseBtn = document.getElementById('colorPopoverCloseBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const expandWidthBtn = document.getElementById('expandWidthBtn');
const expandHeightBtn = document.getElementById('expandHeightBtn');

const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const duplicateBtn = document.getElementById('duplicateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const exportBtn = document.getElementById('exportBtn');
const avatarPickBtn = document.getElementById('avatarPickBtn');

const importImageBtn = document.getElementById('importImageBtn');
const importImageInput = document.getElementById('importImageInput');

const statusText = document.getElementById('statusText');

// New asset modal
const newAssetModal = document.getElementById('newAssetModal');
const newAssetCloseBtn = document.getElementById('newAssetCloseBtn');
const newAssetCreateBtn = document.getElementById('newAssetCreateBtn');
const newNameInput = document.getElementById('newNameInput');

// Sample modal
const sampleModal = document.getElementById('sampleModal');
const sampleCloseBtn = document.getElementById('sampleCloseBtn');
const sampleList = document.getElementById('sampleList');

/**
 * @typedef {{id:string,name:string,kind:'character'|'object'|'tile',width:number,height:number,pixelsB64:string,tags?:string[]}} SampleAsset
 */

/** @type {SampleAsset[]} */
const SAMPLE_ASSETS = Array.isArray(samplePack?.samples) ? samplePack.samples : [];

// State
/** @type {'pen'|'eraser'|'fill'|'picker'} */
let currentTool = 'pen';
let currentColor = hexToRgbaInt(colorInput.value);

/** @type {import('../../js/pixelAssets.js').PixelAsset|null} */
let currentAsset = null;
let isPersisted = false;
let dirty = false;

/**
 * @typedef {{width:number,height:number,pixels:Uint32Array}} PixelSnapshot
 */
/** @type {PixelSnapshot[]} */
let undoStack = [];
/** @type {PixelSnapshot[]} */
let redoStack = [];
let strokeSnapshot = null;
let strokeChanged = false;

let zoom = Number(zoomRange.value);
let isPointerDown = false;
let lastPaintedIndex = -1;
let renderScheduled = false;

const pickAvatarMode = new URLSearchParams(window.location.search).get('pickAvatar') === '1';
if (avatarPickBtn) avatarPickBtn.hidden = !pickAvatarMode;

const CANVAS_STEP = 16;
const CANVAS_MAX = 256;
const DEFAULT_KIND = 'character';

const DEFAULT_NEW_ASSET = {
  name: 'あたらしいドット'
};

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

let gallerySearchText = '';
/** @type {'updated_desc'|'updated_asc'|'name_asc'|'name_desc'|'size_desc'|'size_asc'} */
let gallerySortMode = 'updated_desc';

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

function base64ToArrayBuffer(b64) {
  const binary = atob(String(b64 || ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function decodePixelsB64(b64) {
  try {
    return new Uint32Array(base64ToArrayBuffer(b64));
  } catch {
    return new Uint32Array();
  }
}

/**
 * @param {SampleAsset} sample
 * @returns {import('../../js/pixelAssets.js').PixelAsset}
 */
function sampleToPixelAsset(sample) {
  const now = new Date().toISOString();
  const w = Number(sample.width) || 16;
  const h = Number(sample.height) || 16;
  const pixels = decodePixelsB64(sample.pixelsB64);
  const safePixels = pixels.length === w * h ? pixels : new Uint32Array(w * h);
  return {
    id: `sample_${sample.id}`,
    ownerId,
    name: sample.name || 'サンプル',
    kind: sample.kind || DEFAULT_KIND,
    width: w,
    height: h,
    pixels: safePixels,
    frames: [
      {
        index: 0,
        width: w,
        height: h,
        pixels: new Uint32Array(safePixels),
        durationMs: 100
      }
    ],
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

function openSampleModal() {
  if (!sampleModal) return;
  renderSampleList();
  sampleModal.hidden = false;
  sampleModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeSampleModal() {
  if (!sampleModal) return;
  sampleModal.hidden = true;
  sampleModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function renderSampleList() {
  if (!sampleList) return;
  sampleList.innerHTML = '';

  if (SAMPLE_ASSETS.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tiny-note';
    empty.textContent = 'サンプルが見つかりませんでした。';
    sampleList.appendChild(empty);
    return;
  }

  SAMPLE_ASSETS.forEach((sample) => {
    const asset = sampleToPixelAsset(sample);

    const row = document.createElement('div');
    row.className = 'asset-item';

    const img = document.createElement('img');
    img.className = 'asset-thumb';
    img.alt = '';
    img.src = assetPreviewDataUrl(asset, 56);

    const meta = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'asset-name';
    name.textContent = sample.name || '(no name)';

    const info = document.createElement('div');
    info.className = 'asset-meta';
    info.textContent = `${asset.width}×${asset.height} / ${sample.kind || DEFAULT_KIND}`;

    const tags = document.createElement('div');
    tags.className = 'asset-tags';
    const tagEls = (Array.isArray(sample.tags) ? sample.tags : []).slice(0, 6);
    ['サンプル', ...tagEls].forEach((t) => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tags.appendChild(span);
    });

    const actions = document.createElement('div');
    actions.className = 'sample-actions';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn-mini primary';
    copyBtn.textContent = 'コピーして編集';
    copyBtn.addEventListener('click', async () => {
      if (dirty && !confirm('いまの変更は保存されていません。サンプルをコピーして開きますか？')) return;
      const base = sampleToPixelAsset(sample);
      const nextName = `${base.name}（コピー）`;
      const created = await duplicatePixelAsset({ ...base, name: nextName }, { name: nextName });
      closeSampleModal();
      setAsset(created, { persisted: true });
      setTool('pen');
      setView('editor');
      await refreshGalleryList();
      updateStatus('サンプルをコピーした');
    });

    const previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'btn-mini';
    previewBtn.textContent = '開くだけ（保存しない）';
    previewBtn.addEventListener('click', () => {
      if (dirty && !confirm('いまの変更は保存されていません。サンプルを開きますか？（保存はされません）')) return;
      closeSampleModal();
      setAsset(sampleToPixelAsset(sample), { persisted: false });
      setTool('pen');
      setView('editor');
      updateStatus('サンプルを開いた（未保存）');
    });

    actions.appendChild(copyBtn);
    actions.appendChild(previewBtn);

    meta.appendChild(name);
    meta.appendChild(info);
    meta.appendChild(tags);
    meta.appendChild(actions);

    row.appendChild(img);
    row.appendChild(meta);
    sampleList.appendChild(row);
  });
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
  canvasMeta.textContent = `${w}×${h}`;

  // Keep the drawing comfortably visible when zoom changes.
  if (zoom >= 28) {
    canvasScroll.scrollLeft = Math.max(0, canvasScroll.scrollLeft);
    canvasScroll.scrollTop = Math.max(0, canvasScroll.scrollTop);
  }
}

function updateColorDot() {
  if (!colorDot) return;
  colorDot.style.background = String(colorInput.value || '#333333');
}

function setColorHex(hex) {
  colorInput.value = hex;
  currentColor = hexToRgbaInt(colorInput.value);
  updatePaletteSelection();
  updateColorDot();
}

function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function setGallerySummary({ total, shown }) {
  if (!gallerySummary) return;
  if (total === 0) {
    gallerySummary.textContent = '';
    return;
  }
  if (shown === total) {
    gallerySummary.textContent = `全${total}件`;
    return;
  }
  gallerySummary.textContent = `${total}件中 ${shown}件を表示`;
}

function applyGalleryFiltersAndSort(list) {
  let out = Array.isArray(list) ? list.slice() : [];

  // name search (simple contains)
  const q = String(gallerySearchText || '').trim().toLowerCase();
  if (q) {
    out = out.filter((a) => String(a.name || '').toLowerCase().includes(q));
  }

  const nameKey = (a) => String(a.name || '').toLowerCase();
  const timeKey = (a) => String(a.updatedAt || a.createdAt || '');
  const sizeKey = (a) => (Number(a.width) || 0) * (Number(a.height) || 0);

  out.sort((a, b) => {
    if (gallerySortMode === 'updated_asc') return timeKey(a) < timeKey(b) ? -1 : 1;
    if (gallerySortMode === 'name_asc') return nameKey(a) < nameKey(b) ? -1 : 1;
    if (gallerySortMode === 'name_desc') return nameKey(a) < nameKey(b) ? 1 : -1;
    if (gallerySortMode === 'size_desc') return sizeKey(b) - sizeKey(a);
    if (gallerySortMode === 'size_asc') return sizeKey(a) - sizeKey(b);
    // default updated_desc
    return timeKey(a) < timeKey(b) ? 1 : -1;
  });

  return out;
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

function snapshotCurrentPixels() {
  if (!currentAsset) return { width: 0, height: 0, pixels: new Uint32Array() };
  return {
    width: currentAsset.width,
    height: currentAsset.height,
    pixels: new Uint32Array(currentAsset.pixels)
  };
}

function restoreSnapshot(snapshot) {
  if (!currentAsset) return;
  currentAsset.width = snapshot.width;
  currentAsset.height = snapshot.height;
  currentAsset.pixels = new Uint32Array(snapshot.pixels);
  canvas.width = currentAsset.width;
  canvas.height = currentAsset.height;
  updateCanvasLayout();
  scheduleRender();
}

function pushUndoSnapshot(snapshot) {
  if (!currentAsset) return;
  const cap = maxHistoryForPixels(currentAsset.pixels.length);
  undoStack.push(snapshot);
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
      setColorHex(rgbaIntToHex(v));
      updateStatus('色をひろった');
    } else {
      updateStatus('透明（色なし）');
    }
    return;
  }

  if (currentTool === 'fill') {
    const snapshot = snapshotCurrentPixels();
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
    if (isPointerDown && strokeSnapshot) strokeChanged = true;
    scheduleRender();
  }
}

function drawImageToFit(ctx2d, img, dstW, dstH) {
  const srcW = Number(img?.width ?? 0);
  const srcH = Number(img?.height ?? 0);
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) return;

  ctx2d.clearRect(0, 0, dstW, dstH);
  ctx2d.imageSmoothingEnabled = true;
  // @ts-ignore - not all browsers type this prop
  if ('imageSmoothingQuality' in ctx2d) ctx2d.imageSmoothingQuality = 'high';

  const scale = Math.min(dstW / srcW, dstH / srcH);
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const x = Math.round((dstW - w) / 2);
  const y = Math.round((dstH - h) / 2);
  ctx2d.drawImage(img, x, y, w, h);
}

function imageDataToPixels(imgData, { alphaThreshold = 16 } = {}) {
  const data = imgData?.data;
  if (!data) return new Uint32Array();
  const out = new Uint32Array((data.length / 4) | 0);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i] & 255;
    const g = data[i + 1] & 255;
    const b = data[i + 2] & 255;
    const a = data[i + 3] & 255;
    if (a < alphaThreshold) {
      out[p] = 0;
    } else {
      out[p] = (((a << 24) | (r << 16) | (g << 8) | b) >>> 0);
    }
  }
  return out;
}

async function loadImageFromFile(file) {
  if (!file) return null;
  if (globalThis.createImageBitmap) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall through to <img> decode
    }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function importImageToCurrentAsset(file) {
  if (!currentAsset) {
    alert('先に「新規作成」か、作品を開いてね！');
    return;
  }
  if (!file) return;

  if (dirty && !confirm('いまの変更は保存されていません。画像で上書きしますか？（もどすで戻せるよ）')) return;

  const img = await loadImageFromFile(file);
  if (!img) return;

  const w = currentAsset.width;
  const h = currentAsset.height;
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  if (!tctx) return;

  drawImageToFit(tctx, img, w, h);
  const imgData = tctx.getImageData(0, 0, w, h);
  const nextPixels = imageDataToPixels(imgData, { alphaThreshold: 16 });

  const snapshot = snapshotCurrentPixels();
  currentAsset.pixels = nextPixels;
  pushUndoSnapshot(snapshot);
  setDirty(true);
  scheduleRender();
  updateStatus('画像を読み込んだ');
}

async function refreshGalleryList() {
  galleryList.innerHTML = '';
  if (gallerySummary) gallerySummary.textContent = '読み込み中…';

  const list = await listPixelAssets({ ownerId });
  const filtered = applyGalleryFiltersAndSort(list);

  galleryList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tiny-note';
    empty.textContent = 'まだ作品がないよ。右上の「新規作成」から作ってみよう！';
    galleryList.appendChild(empty);
    setGallerySummary({ total: 0, shown: 0 });
    return;
  }

  setGallerySummary({ total: list.length, shown: filtered.length });

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'tiny-note';
    empty.textContent = '見つからなかったよ。検索やフィルタを変えてみてね。';
    galleryList.appendChild(empty);
    return;
  }

  filtered.forEach((asset) => {
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
    const date = formatDateShort(asset.updatedAt || asset.createdAt);
    info.textContent = `${asset.width}×${asset.height}${date ? ` / 更新 ${date}` : ''}`;

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
      updateStatus('読み込んだ');
    });

    galleryList.appendChild(btn);
  });
}

function createNewAsset({ name, kind, width, height }) {
  return createEmptyAsset({
    ownerId,
    kind: kind || DEFAULT_KIND,
    width,
    height,
    name: name || DEFAULT_NEW_ASSET.name
  });
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
      setColorHex(hex);
    });
    paletteGrid.appendChild(btn);
  });
  updatePaletteSelection();
  updateColorDot();
}

function updatePaletteSelection() {
  const currentHex = String(colorInput.value || '').toLowerCase();
  paletteGrid.querySelectorAll('.swatch').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.classList.toggle('selected', btn.dataset.hex === currentHex);
  });
}

// UI events
if (gallerySearchInput) {
  gallerySearchInput.addEventListener('input', () => {
    gallerySearchText = String(gallerySearchInput.value || '');
    refreshGalleryList();
  });
}

if (gallerySortSelect) {
  gallerySortSelect.addEventListener('change', () => {
    gallerySortMode = /** @type {any} */ (gallerySortSelect.value || 'updated_desc');
    refreshGalleryList();
  });
}

zoomRange.addEventListener('input', () => {
  zoom = Number(zoomRange.value);
  updateCanvasLayout();
});

gridToggle.addEventListener('change', () => {
  canvasFrame.classList.toggle('grid', gridToggle.checked);
});

colorInput.addEventListener('input', () => {
  setColorHex(colorInput.value);
});

if (gridToggleBtn) {
  gridToggleBtn.addEventListener('click', () => {
    gridToggle.checked = !gridToggle.checked;
    canvasFrame.classList.toggle('grid', gridToggle.checked);
    updateStatus(gridToggle.checked ? '線ON' : '線OFF');
  });
}

function nudgeZoom(delta) {
  const min = Number(zoomRange.min || 8);
  const max = Number(zoomRange.max || 48);
  const step = Number(zoomRange.step || 1);
  const next = Math.max(min, Math.min(max, Number(zoomRange.value) + delta * step));
  zoomRange.value = String(next);
  zoom = next;
  updateCanvasLayout();
}

if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => nudgeZoom(-2));
if (zoomInBtn) zoomInBtn.addEventListener('click', () => nudgeZoom(2));

function openColorPopover() {
  if (!colorPopover) return;
  colorPopover.hidden = false;
}

function closeColorPopover() {
  if (!colorPopover) return;
  colorPopover.hidden = true;
}

if (colorBtn) {
  colorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!colorPopover) return;
    colorPopover.hidden ? openColorPopover() : closeColorPopover();
  });
}

if (colorPopoverCloseBtn) {
  colorPopoverCloseBtn.addEventListener('click', () => closeColorPopover());
}

document.addEventListener('click', (e) => {
  if (!colorPopover || colorPopover.hidden) return;
  const t = /** @type {HTMLElement} */ (e.target);
  if (t.closest('#colorPopover') || t.closest('#colorBtn')) return;
  closeColorPopover();
});

nameInput.addEventListener('input', () => {
  if (!currentAsset) return;
  currentAsset.name = nameInput.value;
  setDirty(true);
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

function expandCanvas({ addWidth = 0, addHeight = 0 } = {}) {
  if (!currentAsset) return;
  const beforeW = currentAsset.width;
  const beforeH = currentAsset.height;
  const nextW = Math.min(CANVAS_MAX, beforeW + addWidth);
  const nextH = Math.min(CANVAS_MAX, beforeH + addHeight);
  if (nextW === beforeW && nextH === beforeH) {
    updateStatus('これ以上ひろげられないよ（最大256）');
    return;
  }

  const snapshot = snapshotCurrentPixels();
  const nextPixels = new Uint32Array(nextW * nextH);
  for (let y = 0; y < beforeH; y++) {
    const srcStart = y * beforeW;
    const dstStart = y * nextW;
    nextPixels.set(currentAsset.pixels.subarray(srcStart, srcStart + beforeW), dstStart);
  }

  currentAsset.width = nextW;
  currentAsset.height = nextH;
  currentAsset.pixels = nextPixels;
  canvas.width = nextW;
  canvas.height = nextH;

  pushUndoSnapshot(snapshot);
  setDirty(true);
  updateCanvasLayout();
  scheduleRender();
  updateStatus('キャンバスをひろげた');
}

if (expandWidthBtn) {
  expandWidthBtn.addEventListener('click', () => {
    expandCanvas({ addWidth: CANVAS_STEP });
  });
}
if (expandHeightBtn) {
  expandHeightBtn.addEventListener('click', () => {
    expandCanvas({ addHeight: CANVAS_STEP });
  });
}

function openNewAssetModal() {
  newNameInput.value = DEFAULT_NEW_ASSET.name;
  newAssetModal.hidden = false;
  newAssetModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  newNameInput.focus();
}

function closeNewAssetModal() {
  newAssetModal.hidden = true;
  newAssetModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function createFromModalAndEnterEditor() {
  const name = String(newNameInput.value || '').trim() || DEFAULT_NEW_ASSET.name;
  const next = createNewAsset({ name, kind: DEFAULT_KIND, width: 16, height: 16 });
  setAsset(next, { persisted: false });
  setTool('pen');
  setView('editor');
  updateStatus('新規');
}

galleryNewBtn.addEventListener('click', () => {
  if (dirty && !confirm('いまの変更は保存されていません。新規作成しますか？')) return;
  openNewAssetModal();
});

if (gallerySamplesBtn) {
  gallerySamplesBtn.addEventListener('click', () => {
    if (dirty && !confirm('いまの変更は保存されていません。サンプルを見ますか？')) return;
    openSampleModal();
  });
}

newBtn.addEventListener('click', () => {
  if (dirty && !confirm('いまの変更は保存されていません。新規にしますか？')) return;
  openNewAssetModal();
});

newAssetCloseBtn.addEventListener('click', closeNewAssetModal);
newAssetModal.addEventListener('click', (e) => {
  if (e.target === newAssetModal) closeNewAssetModal();
});
newAssetCreateBtn.addEventListener('click', () => {
  closeNewAssetModal();
  createFromModalAndEnterEditor();
});
newNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    closeNewAssetModal();
    createFromModalAndEnterEditor();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!newAssetModal.hidden) closeNewAssetModal();
  if (sampleModal && !sampleModal.hidden) closeSampleModal();
  if (colorPopover && !colorPopover.hidden) closeColorPopover();
});

if (sampleCloseBtn) sampleCloseBtn.addEventListener('click', closeSampleModal);
if (sampleModal) {
  sampleModal.addEventListener('click', (e) => {
    if (e.target === sampleModal) closeSampleModal();
  });
}

// Small usability helpers (keyboard shortcuts)
document.addEventListener('keydown', (e) => {
  const tag = String(document.activeElement?.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (typing) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveBtn.click();
    return;
  }

  if (e.key.toLowerCase() === 'g') {
    gridToggle.checked = !gridToggle.checked;
    canvasFrame.classList.toggle('grid', gridToggle.checked);
    return;
  }

  if (e.key.toLowerCase() === 'p') setTool('pen');
  if (e.key.toLowerCase() === 'e') setTool('eraser');
  if (e.key.toLowerCase() === 'f') setTool('fill');
  if (e.key.toLowerCase() === 'i') setTool('picker');
});

undoBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (undoStack.length === 0) return;
  const prev = undoStack.pop();
  redoStack.push(snapshotCurrentPixels());
  restoreSnapshot(prev);
  setDirty(true);
  updateUndoRedoButtons();
  updateStatus('もどした');
});

redoBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(snapshotCurrentPixels());
  restoreSnapshot(next);
  setDirty(true);
  updateUndoRedoButtons();
  updateStatus('やりなおした');
});

clearBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (!confirm('ぜんぶ消しますか？（もどすで元に戻せるよ）')) return;
  const snapshot = snapshotCurrentPixels();
  currentAsset.pixels.fill(0);
  pushUndoSnapshot(snapshot);
  setDirty(true);
  scheduleRender();
  updateStatus('全消し');
});

if (importImageBtn && importImageInput) {
  importImageBtn.addEventListener('click', () => {
    if (!currentAsset) {
      alert('先に「新規作成」か、作品を開いてね！');
      return;
    }
    importImageInput.click();
  });

  importImageInput.addEventListener('change', async () => {
    const file = importImageInput.files?.[0] || null;
    // 同じファイルを連続で選べるように、先にvalueをクリアする
    importImageInput.value = '';
    try {
      await importImageToCurrentAsset(file);
    } catch (e) {
      console.warn('Image import failed:', e);
      alert('画像の読み込みに失敗しました。別の画像で試してみてね。');
    }
  });
}

saveBtn.addEventListener('click', async () => {
  if (!currentAsset) return;
  const name = nameInput.value.trim();
  if (!name) {
    alert('なまえをいれてね！');
    return;
  }
  currentAsset.name = name;
  // NOTE: current UI edits only `asset.pixels`. Keep frame0 in sync for saving.
  if (Array.isArray(currentAsset.frames) && currentAsset.frames.length > 0) {
    const f0 =
      currentAsset.frames.find((f) => (f.index ?? 0) === 0) ||
      currentAsset.frames[0];
    if (f0) {
      f0.width = currentAsset.width;
      f0.height = currentAsset.height;
      f0.pixels = new Uint32Array(currentAsset.pixels);
    }
  }
  const saved = await putPixelAsset(currentAsset);
  setAsset(saved, { persisted: true });
  await refreshGalleryList();
  updateStatus('保存した');
});

duplicateBtn.addEventListener('click', async () => {
  if (!currentAsset) return;
  const baseName = (nameInput.value.trim() || currentAsset.name || 'ドット') + '（コピー）';
  const next = await duplicatePixelAsset({ ...currentAsset, name: baseName }, { name: baseName });
  setAsset(next, { persisted: true });
  await refreshGalleryList();
  updateStatus('複製した');
});

deleteBtn.addEventListener('click', async () => {
  if (!currentAsset) return;

  if (!isPersisted) {
    if (!confirm('この新規作品はまだ保存されていません。破棄してギャラリーに戻りますか？')) return;
    currentAsset = null;
    isPersisted = false;
    setDirty(false);
    setView('gallery');
    await refreshGalleryList();
    return;
  }

  if (!confirm('本当に削除しますか？')) return;
  await deletePixelAsset(currentAsset.id);
  currentAsset = null;
  isPersisted = false;
  setDirty(false);
  setView('gallery');
  await refreshGalleryList();
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

if (avatarPickBtn) {
  avatarPickBtn.addEventListener('click', () => {
    if (!currentAsset) {
      alert('先に作品をひらくか、作ってね！');
      return;
    }
    const dataUrl = assetPreviewDataUrl(currentAsset, 96);
    try {
      localStorage.setItem(
        AVATAR_PICK_KEY,
        JSON.stringify({
          avatar: makeImageAvatar(dataUrl),
          source: 'pixel',
          assetId: currentAsset.id,
          at: new Date().toISOString()
        })
      );
    } catch {
      alert('保存に失敗しました。もう一度ためしてね。');
      return;
    }

    const ctx = readJson(AVATAR_CTX_KEY);
    const returnTo = typeof ctx?.returnTo === 'string' ? ctx.returnTo : '/pages/select-player/select-player.html';
    window.location.href = resolvePath(returnTo);
  });
}

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
  strokeChanged = false;

  if (currentTool !== 'picker') {
    strokeSnapshot = snapshotCurrentPixels();
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

  if (strokeSnapshot && strokeChanged) {
    pushUndoSnapshot(strokeSnapshot);
  }
  strokeSnapshot = null;
  strokeChanged = false;
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
  renderPalette();

  // Safety: make sure modal is closed on first paint (and also after bfcache restores).
  closeNewAssetModal();
  closeSampleModal();

  setView('gallery');
  await refreshGalleryList();
  updateStatus('準備OK');
})();

