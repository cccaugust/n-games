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
const RECENT_COLORS_KEY = 'ngames.pm.pixelArtMaker.recentColors.v1';

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

// Keep editor view within viewport height (account for topbar)
const topbarEl = document.querySelector('.topbar');
function syncTopbarHeightVar() {
  if (!(topbarEl instanceof HTMLElement)) return;
  const h = Math.ceil(topbarEl.getBoundingClientRect().height || 0);
  if (!h) return;
  document.documentElement.style.setProperty('--pm-topbar-h', `${h}px`);
}
syncTopbarHeightVar();

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
const editorHeadbar = document.getElementById('editorHeadbar');
const editorLayout = document.querySelector('.editor-layout');
const splitLeft = document.getElementById('splitLeft');
const splitRight = document.getElementById('splitRight');
const editorToolbar = document.getElementById('editorToolbar');

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

// Frames UI
const frameCounter = document.getElementById('frameCounter');
const frameList = document.getElementById('frameList');
const framePrevBtn = document.getElementById('framePrevBtn');
const frameNextBtn = document.getElementById('frameNextBtn');
const frameAddBtn = document.getElementById('frameAddBtn');
const frameDuplicateBtn = document.getElementById('frameDuplicateBtn');
const frameDeleteBtn = document.getElementById('frameDeleteBtn');

const toolPen = document.getElementById('toolPen');
const toolEraser = document.getElementById('toolEraser');
const toolFill = document.getElementById('toolFill');
const toolPicker = document.getElementById('toolPicker');
const toolSelect = document.getElementById('toolSelect');

const rangeCopyBtn = document.getElementById('rangeCopyBtn');
const rangeCutBtn = document.getElementById('rangeCutBtn');
const rangePasteBtn = document.getElementById('rangePasteBtn');

const colorInput = document.getElementById('colorInput');
const paletteGrid = document.getElementById('paletteGrid');
const colorBtn = document.getElementById('colorBtn');
const colorDot = document.getElementById('colorDot');
const colorPopover = document.getElementById('colorPopover');
const colorPopoverCloseBtn = document.getElementById('colorPopoverCloseBtn');
const toolbarPalette = document.getElementById('toolbarPalette');
const recentColors = document.getElementById('recentColors');
const recentClearBtn = document.getElementById('recentClearBtn');
const hueBtn = document.getElementById('hueBtn');
const huePopover = document.getElementById('huePopover');
const huePopoverCloseBtn = document.getElementById('huePopoverCloseBtn');
const hueRange = document.getElementById('hueRange');
const hueValue = document.getElementById('hueValue');
const hueResetBtn = document.getElementById('hueResetBtn');
const hueApplyBtn = document.getElementById('hueApplyBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const expandWidthBtn = document.getElementById('expandWidthBtn');
const expandHeightBtn = document.getElementById('expandHeightBtn');
const shrinkWidthBtn = document.getElementById('shrinkWidthBtn');
const shrinkHeightBtn = document.getElementById('shrinkHeightBtn');

const newBtn = document.getElementById('newBtn');
const saveBtn = document.getElementById('saveBtn');
const duplicateBtn = document.getElementById('duplicateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const exportBtn = document.getElementById('exportBtn');
const avatarPickBtn = document.getElementById('avatarPickBtn');

const importImageBtn = document.getElementById('importImageBtn');
const importImageInput = document.getElementById('importImageInput');

const statusText = document.getElementById('statusText');
const toolbarMenuBtn = document.getElementById('toolbarMenuBtn');
const toolbarMore = document.getElementById('toolbarMore');
const framesBtn = document.getElementById('framesBtn');

// Frames modal (mobile)
const framesModal = document.getElementById('framesModal');
const framesCloseBtn = document.getElementById('framesCloseBtn');
const framesModalBody = document.getElementById('framesModalBody');
const frameSideEl = document.querySelector('.frame-side');

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
 * @typedef {{pixelsB64:string,durationMs?:number}} SampleFrame
 * @typedef {{id:string,name:string,kind:'character'|'object'|'tile',width:number,height:number,pixelsB64?:string,frames?:SampleFrame[],tags?:string[]}} SampleAsset
 */

/** @type {SampleAsset[]} */
const SAMPLE_ASSETS = Array.isArray(samplePack?.samples) ? samplePack.samples : [];

// State
/** @type {'pen'|'eraser'|'fill'|'picker'|'select'} */
let currentTool = 'pen';
let currentColor = hexToRgbaInt(colorInput.value);

/** @type {import('../../js/pixelAssets.js').PixelAsset|null} */
let currentAsset = null;
let isPersisted = false;
let dirty = false;
let currentFrameIndex = 0;

/**
 * @typedef {{x:number,y:number,w:number,h:number}} Rect
 * @typedef {{w:number,h:number,pixels:Uint32Array}} PixelClipboard
 */
/** @type {Rect|null} */
let selectionRect = null;
/** @type {PixelClipboard|null} */
let pixelClipboard = null;
/** @type {{mode:'none'|'selecting'|'moving'|'pasting',startX:number,startY:number,anchorX:number,anchorY:number,offsetX:number,offsetY:number,buffer:PixelClipboard|null,fromRect:Rect|null}|null} */
let rangeGesture = null;
/** @type {{x:number,y:number,index:number}} */
let lastHoverPixel = { x: -1, y: -1, index: -1 };
const rangePreviewCanvas = document.createElement('canvas');
const rangePreviewCtx = rangePreviewCanvas.getContext('2d');

/**
 * @typedef {{type:'frame',frameIndex:number,width:number,height:number,pixels:Uint32Array}} FrameSnapshot
 * @typedef {{type:'asset',frameIndex:number,width:number,height:number,frames:import('../../js/pixelAssets.js').PixelAssetFrame[]}} AssetSnapshot
 * @typedef {FrameSnapshot|AssetSnapshot} PixelSnapshot
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
let huePreviewDeg = 0;
let frameThumbTimer = null;

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

// ツールボックス常設: 基本24色（DB64から厳選）
const BASE_PALETTE_24 = [
  '#000000',
  '#222034',
  '#45283c',
  '#663931',
  '#8f563b',
  '#df7126',
  '#d9a066',
  '#fbf236',
  '#99e550',
  '#6abe30',
  '#37946e',
  '#5fcde4',
  '#306082',
  '#5b6ee1',
  '#639bff',
  '#cbdbfc',
  '#ffffff',
  '#c2c3c7',
  '#847e87',
  '#696a6a',
  '#ac3232',
  '#d95763',
  '#d77bba',
  '#76428a'
];

let gallerySearchText = '';
/** @type {'updated_desc'|'updated_asc'|'name_asc'|'name_desc'|'size_desc'|'size_asc'} */
let gallerySortMode = 'updated_desc';

let isReadOnly = false;

function setReadOnly(next) {
  isReadOnly = Boolean(next);

  // Disable editing affordances (but keep export / avatar pick / duplicate).
  const disableEdit = isReadOnly;
  if (nameInput) nameInput.disabled = disableEdit;
  if (saveBtn) saveBtn.disabled = disableEdit;
  if (deleteBtn) deleteBtn.disabled = disableEdit;
  if (clearBtn) clearBtn.disabled = disableEdit;
  if (expandWidthBtn) expandWidthBtn.disabled = disableEdit;
  if (expandHeightBtn) expandHeightBtn.disabled = disableEdit;
  if (shrinkWidthBtn) shrinkWidthBtn.disabled = disableEdit;
  if (shrinkHeightBtn) shrinkHeightBtn.disabled = disableEdit;
  if (importImageBtn) importImageBtn.disabled = disableEdit;
  if (undoBtn) undoBtn.disabled = disableEdit || undoStack.length === 0;
  if (redoBtn) redoBtn.disabled = disableEdit || redoStack.length === 0;
  if (frameAddBtn) frameAddBtn.disabled = disableEdit;
  if (frameDuplicateBtn) frameDuplicateBtn.disabled = disableEdit;
  if (frameDeleteBtn) frameDeleteBtn.disabled = disableEdit;

  // Prevent pointer edits entirely in read-only.
  if (canvas) canvas.style.pointerEvents = disableEdit ? 'none' : '';

  // Hue "apply" is a destructive edit, but preview is OK.
  if (hueApplyBtn) hueApplyBtn.disabled = disableEdit;

  updateRangeButtons();
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(hex) {
  const s = String(hex || '').trim().toLowerCase();
  // #rgb -> #rrggbb
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  return '#333333';
}

function readRecentColors() {
  try {
    const raw = localStorage.getItem(RECENT_COLORS_KEY);
    const json = raw ? JSON.parse(raw) : null;
    const arr = Array.isArray(json) ? json : [];
    return arr.map(normalizeHex).filter((v, i, a) => a.indexOf(v) === i).slice(0, 20);
  } catch {
    return [];
  }
}

function writeRecentColors(list) {
  try {
    localStorage.setItem(RECENT_COLORS_KEY, JSON.stringify(Array.isArray(list) ? list.slice(0, 20) : []));
  } catch {
    // ignore
  }
}

function renderRecentColors() {
  if (!recentColors) return;
  const list = readRecentColors();
  recentColors.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'recent-empty';
    empty.textContent = 'まだないよ（色を使うとここに出ます）';
    recentColors.appendChild(empty);
    return;
  }
  list.slice(0, 10).forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'recent-swatch';
    btn.style.background = hex;
    btn.setAttribute('aria-label', `最近の色 ${hex}`);
    btn.addEventListener('click', () => {
      setColorHex(hex);
      updateStatus('最近の色');
    });
    recentColors.appendChild(btn);
  });
}

function addRecentColor(hex) {
  const h = normalizeHex(hex);
  const list = readRecentColors();
  const next = [h, ...list.filter((x) => x !== h)].slice(0, 20);
  writeRecentColors(next);
  renderRecentColors();
  renderToolbarPalette();
}

function clearRecentColors() {
  writeRecentColors([]);
  renderRecentColors();
  renderToolbarPalette();
}

// Popoverをツールボックス外（body直下）に出して、クリップされるのを防ぐ
const popoverHomes = new WeakMap();
function portalPopoverToBody(el) {
  if (!el) return;
  if (!popoverHomes.has(el)) {
    popoverHomes.set(el, { parent: el.parentNode, next: el.nextSibling });
  }
  if (el.parentNode !== document.body) document.body.appendChild(el);
}

function restorePopoverHome(el) {
  const home = popoverHomes.get(el);
  if (!home || !home.parent) return;
  if (el.parentNode === home.parent) return;
  try {
    home.parent.insertBefore(el, home.next || null);
  } catch {
    // ignore
  }
}

// Portal (move nodes temporarily; used for mobile frames modal)
const nodeHomes = new WeakMap();
function portalNode(el, nextParent) {
  if (!el || !nextParent) return;
  if (!nodeHomes.has(el)) {
    nodeHomes.set(el, { parent: el.parentNode, next: el.nextSibling });
  }
  if (el.parentNode !== nextParent) nextParent.appendChild(el);
}

function restoreNode(el) {
  const home = nodeHomes.get(el);
  if (!home || !home.parent) return;
  if (el.parentNode === home.parent) return;
  try {
    home.parent.insertBefore(el, home.next || null);
  } catch {
    // ignore
  }
}

const mobileMq = window.matchMedia?.('(max-width: 959px)');
function isMobileEditorLayout() {
  return mobileMq?.matches ?? false;
}

function syncEditorChromeVars() {
  const headH = editorHeadbar instanceof HTMLElement ? Math.ceil(editorHeadbar.getBoundingClientRect().height || 0) : 0;
  const toolH = editorToolbar instanceof HTMLElement ? Math.ceil(editorToolbar.getBoundingClientRect().height || 0) : 0;
  document.documentElement.style.setProperty('--pm-editor-head-h', `${headH}px`);
  document.documentElement.style.setProperty('--pm-editor-toolbar-h', `${toolH}px`);
}

function syncEditorMobileClass() {
  const inEditor = appRoot?.dataset?.view === 'editor';
  document.body.classList.toggle('pm-editor-mobile', Boolean(inEditor && isMobileEditorLayout()));
}

function syncModalOpenClass() {
  const anyOpen =
    (!newAssetModal?.hidden) ||
    (sampleModal && !sampleModal.hidden) ||
    (framesModal && !framesModal.hidden);
  document.body.classList.toggle('modal-open', Boolean(anyOpen));
}

function closeFramesModal() {
  if (!framesModal) return;
  framesModal.hidden = true;
  framesModal.setAttribute('aria-hidden', 'true');
  if (frameSideEl && framesModalBody && frameSideEl.parentNode === framesModalBody) restoreNode(frameSideEl);
  syncModalOpenClass();
}

function openFramesModal() {
  if (!framesModal || !framesModalBody) return;
  if (!isMobileEditorLayout()) return; // desktop shows the frames pane
  if (frameSideEl) portalNode(frameSideEl, framesModalBody);
  framesModal.hidden = false;
  framesModal.setAttribute('aria-hidden', 'false');
  syncModalOpenClass();
}

// PCレイアウト: ツールボックス / キャンバス / フレームの境界をドラッグで調整
const LAYOUT_PREF_KEY = 'ngames.pm.pixelArtMaker.layout.v1';
const DEFAULT_LEFT_W = 300;
const DEFAULT_RIGHT_W = 320;
const SPLITTER_W = 12;
const MIN_LEFT_W = 220;
const MIN_RIGHT_W = 240;
const MIN_CENTER_W = 320;

function readLayoutPrefs() {
  try {
    const raw = localStorage.getItem(LAYOUT_PREF_KEY);
    const json = raw ? JSON.parse(raw) : null;
    if (!json || typeof json !== 'object') return null;
    const left = Number(json.leftPx);
    const right = Number(json.rightPx);
    return {
      leftPx: Number.isFinite(left) ? left : DEFAULT_LEFT_W,
      rightPx: Number.isFinite(right) ? right : DEFAULT_RIGHT_W
    };
  } catch {
    return null;
  }
}

function writeLayoutPrefs(prefs) {
  try {
    localStorage.setItem(LAYOUT_PREF_KEY, JSON.stringify({ leftPx: prefs.leftPx, rightPx: prefs.rightPx }));
  } catch {
    // ignore
  }
}

function applyEditorLayoutWidths({ leftPx, rightPx }) {
  if (!editorLayout) return;
  const rect = editorLayout.getBoundingClientRect();
  const total = rect.width || 0;
  if (!total) return;

  const maxLeft = Math.max(MIN_LEFT_W, total - MIN_CENTER_W - MIN_RIGHT_W - SPLITTER_W * 2);
  const maxRight = Math.max(MIN_RIGHT_W, total - MIN_CENTER_W - MIN_LEFT_W - SPLITTER_W * 2);

  const left = clamp(Number(leftPx) || DEFAULT_LEFT_W, MIN_LEFT_W, maxLeft);
  const right = clamp(Number(rightPx) || DEFAULT_RIGHT_W, MIN_RIGHT_W, maxRight);

  editorLayout.style.setProperty('--pm-left-w', `${Math.round(left)}px`);
  editorLayout.style.setProperty('--pm-right-w', `${Math.round(right)}px`);

  return { leftPx: Math.round(left), rightPx: Math.round(right) };
}

function resetEditorLayoutWidths() {
  const applied = applyEditorLayoutWidths({ leftPx: DEFAULT_LEFT_W, rightPx: DEFAULT_RIGHT_W });
  if (applied) writeLayoutPrefs(applied);
}

function syncEditorLayoutFromPrefs() {
  const prefs = readLayoutPrefs();
  if (prefs) {
    const applied = applyEditorLayoutWidths(prefs);
    if (applied) writeLayoutPrefs(applied);
  } else {
    const applied = applyEditorLayoutWidths({ leftPx: DEFAULT_LEFT_W, rightPx: DEFAULT_RIGHT_W });
    if (applied) writeLayoutPrefs(applied);
  }
}

function initResizableEditorLayout() {
  if (!editorLayout || !splitLeft || !splitRight) return;

  const desktopMq = window.matchMedia?.('(min-width: 960px)');

  function isDesktop() {
    return desktopMq?.matches ?? false;
  }

  let dragging = null;

  function beginDrag(which, e) {
    if (!isDesktop()) return;
    if (!(e instanceof PointerEvent)) return;
    const rect = editorLayout.getBoundingClientRect();
    dragging = {
      which,
      pointerId: e.pointerId,
      startX: e.clientX,
      startLeft: parseFloat(getComputedStyle(editorLayout).getPropertyValue('--pm-left-w')) || DEFAULT_LEFT_W,
      startRight: parseFloat(getComputedStyle(editorLayout).getPropertyValue('--pm-right-w')) || DEFAULT_RIGHT_W,
      rectLeft: rect.left,
      rectRight: rect.right
    };
    document.body.classList.add('pm-resizing');
    try {
      /** @type {HTMLElement} */ (e.currentTarget)?.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    if (!(e instanceof PointerEvent)) return;
    if (e.pointerId !== dragging.pointerId) return;

    const x = e.clientX;
    if (dragging.which === 'left') {
      const nextLeft = x - dragging.rectLeft;
      const applied = applyEditorLayoutWidths({ leftPx: nextLeft, rightPx: dragging.startRight });
      if (applied) writeLayoutPrefs(applied);
    } else {
      const nextRight = dragging.rectRight - x;
      const applied = applyEditorLayoutWidths({ leftPx: dragging.startLeft, rightPx: nextRight });
      if (applied) writeLayoutPrefs(applied);
    }
    e.preventDefault();
  }

  function endDrag(e) {
    if (!dragging) return;
    if (!(e instanceof PointerEvent)) return;
    if (e.pointerId !== dragging.pointerId) return;
    dragging = null;
    document.body.classList.remove('pm-resizing');
  }

  function onKey(which, e) {
    if (!isDesktop()) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key)) return;
    e.preventDefault();

    const step = e.shiftKey ? 40 : 10;
    if (e.key === 'Home') {
      resetEditorLayoutWidths();
      return;
    }

    const curLeft = parseFloat(getComputedStyle(editorLayout).getPropertyValue('--pm-left-w')) || DEFAULT_LEFT_W;
    const curRight = parseFloat(getComputedStyle(editorLayout).getPropertyValue('--pm-right-w')) || DEFAULT_RIGHT_W;

    if (which === 'left') {
      const delta = e.key === 'ArrowLeft' ? -step : step;
      const applied = applyEditorLayoutWidths({ leftPx: curLeft + delta, rightPx: curRight });
      if (applied) writeLayoutPrefs(applied);
    } else {
      // 右ペインは「左矢印 = 右ペインを広げる」だと直感的
      const delta = e.key === 'ArrowLeft' ? step : -step;
      const applied = applyEditorLayoutWidths({ leftPx: curLeft, rightPx: curRight + delta });
      if (applied) writeLayoutPrefs(applied);
    }
  }

  splitLeft.addEventListener('pointerdown', (e) => beginDrag('left', e));
  splitRight.addEventListener('pointerdown', (e) => beginDrag('right', e));
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  splitLeft.addEventListener('dblclick', resetEditorLayoutWidths);
  splitRight.addEventListener('dblclick', resetEditorLayoutWidths);

  splitLeft.addEventListener('keydown', (e) => onKey('left', e));
  splitRight.addEventListener('keydown', (e) => onKey('right', e));

  // 初期適用 & 画面サイズ変更追従
  syncEditorLayoutFromPrefs();
  window.addEventListener('resize', () => {
    if (!isDesktop()) return;
    syncEditorLayoutFromPrefs();
  });
}

function updateHueUi() {
  if (hueValue) {
    const d = Math.round(huePreviewDeg);
    hueValue.textContent = `${d}°`;
  }
  if (canvas) {
    canvas.style.filter = huePreviewDeg ? `hue-rotate(${huePreviewDeg}deg)` : '';
  }
}

function setHuePreview(deg) {
  huePreviewDeg = clamp(Number(deg) || 0, -180, 180);
  if (hueRange) hueRange.value = String(Math.round(huePreviewDeg));
  updateHueUi();
}

function openHuePopover() {
  if (!huePopover) return;
  portalPopoverToBody(huePopover);
  huePopover.hidden = false;
}

function closeHuePopover() {
  if (!huePopover) return;
  huePopover.hidden = true;
  restorePopoverHome(huePopover);
}

function rgbaIntToRgba(rgba) {
  const v = (rgba >>> 0);
  const a = (v >>> 24) & 255;
  const r = (v >>> 16) & 255;
  const g = (v >>> 8) & 255;
  const b = v & 255;
  return { r, g, b, a };
}

function rgbToHsl(r, g, b) {
  const rn = (r & 255) / 255;
  const gn = (g & 255) / 255;
  const bn = (b & 255) / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s, l };
}

function hslToRgb(h, s, l) {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hh < 60) [r1, g1, b1] = [c, x, 0];
  else if (hh < 120) [r1, g1, b1] = [x, c, 0];
  else if (hh < 180) [r1, g1, b1] = [0, c, x];
  else if (hh < 240) [r1, g1, b1] = [0, x, c];
  else if (hh < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const rOut = Math.round((r1 + m) * 255);
  const gOut = Math.round((g1 + m) * 255);
  const bOut = Math.round((b1 + m) * 255);
  return {
    r: clamp(rOut, 0, 255),
    g: clamp(gOut, 0, 255),
    b: clamp(bOut, 0, 255)
  };
}

function hueRotateRgbaInt(rgba, deg) {
  const v = (rgba >>> 0);
  if (v === 0) return 0;
  const { r, g, b, a } = rgbaIntToRgba(v);
  const { h, s, l } = rgbToHsl(r, g, b);
  const { r: nr, g: ng, b: nb } = hslToRgb(h + deg, s, l);
  return ((((a & 255) << 24) | ((nr & 255) << 16) | ((ng & 255) << 8) | (nb & 255)) >>> 0);
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
 * @param {number} width
 * @param {number} height
 * @param {Uint32Array} pixels
 */
function normalizePixelsSize(width, height, pixels) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const expected = w * h;
  if (pixels instanceof Uint32Array && pixels.length === expected) return pixels;
  const out = new Uint32Array(expected);
  if (!(pixels instanceof Uint32Array)) return out;
  // best-effort copy (top-left)
  const min = Math.min(pixels.length, out.length);
  out.set(pixels.subarray(0, min), 0);
  return out;
}

/**
 * @param {SampleAsset} sample
 * @returns {import('../../js/pixelAssets.js').PixelAsset}
 */
function sampleToPixelAsset(sample) {
  const now = new Date().toISOString();
  const w = Number(sample.width) || 16;
  const h = Number(sample.height) || 16;
  /** @type {import('../../js/pixelAssets.js').PixelAssetFrame[]} */
  let frames = [];

  if (Array.isArray(sample.frames) && sample.frames.length > 0) {
    frames = sample.frames.map((f, i) => {
      const pixels = normalizePixelsSize(w, h, decodePixelsB64(f?.pixelsB64));
      return {
        index: i,
        width: w,
        height: h,
        pixels: new Uint32Array(pixels),
        durationMs: Number(f?.durationMs ?? 100) || 100
      };
    });
  } else {
    const pixels = normalizePixelsSize(w, h, decodePixelsB64(sample.pixelsB64));
    frames = [
      {
        index: 0,
        width: w,
        height: h,
        pixels: new Uint32Array(pixels),
        durationMs: 100
      }
    ];
  }

  const frame0 = frames.find((f) => (f.index ?? 0) === 0) || frames[0];
  const safePixels = frame0?.pixels ? new Uint32Array(frame0.pixels) : new Uint32Array(w * h);
  return {
    id: `sample_${sample.id}`,
    ownerId,
    name: sample.name || 'サンプル',
    kind: sample.kind || DEFAULT_KIND,
    width: w,
    height: h,
    pixels: safePixels,
    frames,
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
  syncModalOpenClass();
}

function closeSampleModal() {
  if (!sampleModal) return;
  sampleModal.hidden = true;
  sampleModal.setAttribute('aria-hidden', 'true');
  syncModalOpenClass();
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
    const frameCount = Array.isArray(asset.frames) ? asset.frames.length : 1;
    info.textContent = `${asset.width}×${asset.height} / ${sample.kind || DEFAULT_KIND}${frameCount > 1 ? ` / ${frameCount}フレーム` : ''}`;

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
  if (toolSelect) toolSelect.classList.toggle('active', tool === 'select');
  if (tool !== 'select' && rangeGesture?.mode === 'pasting') cancelPasteMode();
  canvas.style.cursor = tool === 'picker' ? 'copy' : tool === 'select' ? 'cell' : 'crosshair';
}

function setView(view) {
  const v = view === 'editor' ? 'editor' : 'gallery';
  appRoot.dataset.view = v;
  const showEditor = v === 'editor';
  editorView.hidden = !showEditor;
  galleryView.hidden = showEditor;
  if (showEditor) {
    // 表示されたタイミングで幅を再計算して、キャンバスを最大化する
    requestAnimationFrame(() => syncEditorLayoutFromPrefs());
  }
  // topbar の高さが変わっても editor を画面内に収める
  requestAnimationFrame(() => syncTopbarHeightVar());
  // mobile: fixed toolbars need correct spacing
  requestAnimationFrame(() => {
    syncEditorChromeVars();
    syncEditorMobileClass();
  });
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
  const safe = normalizeHex(hex);
  colorInput.value = safe;
  currentColor = hexToRgbaInt(colorInput.value);
  updatePaletteSelection();
  updateToolbarPaletteSelection();
  updateColorDot();
  addRecentColor(safe);
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
  scheduleActiveFrameThumbUpdate();
}

function scheduleActiveFrameThumbUpdate() {
  if (!currentAsset || !frameList) return;
  if (frameThumbTimer != null) return;
  const pixelCount = currentAsset?.pixels?.length || 0;
  const delay = pixelCount > 64 * 64 ? 220 : pixelCount > 32 * 32 ? 140 : 80;
  frameThumbTimer = window.setTimeout(() => {
    frameThumbTimer = null;
    updateActiveFrameThumb();
  }, delay);
}

function updateActiveFrameThumb() {
  if (!currentAsset || !frameList) return;
  const selected = frameList.querySelector('.frame-item.selected');
  const img = selected ? selected.querySelector('img.frame-thumb') : null;
  if (!(img instanceof HTMLImageElement)) return;
  try {
    img.src = assetPreviewDataUrl({ ...currentAsset, pixels: currentAsset.pixels }, 56);
  } catch {
    // ignore
  }
}

function hasSelection() {
  return Boolean(selectionRect && selectionRect.w > 0 && selectionRect.h > 0);
}

function normalizeRect(x0, y0, x1, y1) {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const right = Math.max(x0, x1);
  const bottom = Math.max(y0, y1);
  return { x: left, y: top, w: Math.max(0, right - left + 1), h: Math.max(0, bottom - top + 1) };
}

function clampRectToCanvas(rect) {
  if (!currentAsset) return rect;
  const x = clamp(rect.x, 0, currentAsset.width - 1);
  const y = clamp(rect.y, 0, currentAsset.height - 1);
  const maxW = Math.max(0, currentAsset.width - x);
  const maxH = Math.max(0, currentAsset.height - y);
  return { x, y, w: clamp(rect.w, 0, maxW), h: clamp(rect.h, 0, maxH) };
}

function pointInRect(px, py, rect) {
  if (!rect) return false;
  return px >= rect.x && py >= rect.y && px < rect.x + rect.w && py < rect.y + rect.h;
}

function clearRangeGesture() {
  rangeGesture = null;
}

function clearSelection({ keepClipboard = true } = {}) {
  selectionRect = null;
  clearRangeGesture();
  if (!keepClipboard) pixelClipboard = null;
  updateRangeButtons();
  scheduleRender();
}

function updateRangeButtons() {
  const canCopy = hasSelection();
  const canPaste = Boolean(pixelClipboard);
  if (rangeCopyBtn) rangeCopyBtn.disabled = !canCopy;
  if (rangeCutBtn) rangeCutBtn.disabled = isReadOnly || !canCopy;
  if (rangePasteBtn) rangePasteBtn.disabled = isReadOnly || !canPaste;
}

function readRectPixels(rect) {
  if (!currentAsset) return { w: 0, h: 0, pixels: new Uint32Array() };
  const r = clampRectToCanvas(rect);
  const out = new Uint32Array(r.w * r.h);
  const w = currentAsset.width;
  for (let y = 0; y < r.h; y++) {
    const srcRow = (r.y + y) * w + r.x;
    const dstRow = y * r.w;
    out.set(currentAsset.pixels.subarray(srcRow, srcRow + r.w), dstRow);
  }
  return { w: r.w, h: r.h, pixels: out };
}

function clearRectPixels(rect) {
  if (!currentAsset) return 0;
  const r = clampRectToCanvas(rect);
  const w = currentAsset.width;
  let changed = 0;
  for (let y = 0; y < r.h; y++) {
    const rowStart = (r.y + y) * w + r.x;
    for (let x = 0; x < r.w; x++) {
      const idx = rowStart + x;
      if ((currentAsset.pixels[idx] >>> 0) !== 0) {
        currentAsset.pixels[idx] = 0;
        changed++;
      }
    }
  }
  return changed;
}

function writeRectPixels(dstX, dstY, clip, { transparentIsNoop = false } = {}) {
  if (!currentAsset) return 0;
  const w = currentAsset.width;
  const maxX = currentAsset.width;
  const maxY = currentAsset.height;
  let changed = 0;
  for (let y = 0; y < clip.h; y++) {
    const yy = dstY + y;
    if (yy < 0 || yy >= maxY) continue;
    for (let x = 0; x < clip.w; x++) {
      const xx = dstX + x;
      if (xx < 0 || xx >= maxX) continue;
      const v = clip.pixels[y * clip.w + x] >>> 0;
      if (transparentIsNoop && v === 0) continue;
      const idx = yy * w + xx;
      const prev = currentAsset.pixels[idx] >>> 0;
      if (prev === v) continue;
      currentAsset.pixels[idx] = v;
      changed++;
    }
  }
  return changed;
}

function copySelectionToClipboard() {
  if (!hasSelection()) {
    updateStatus('範囲が選ばれていない');
    return false;
  }
  pixelClipboard = readRectPixels(selectionRect);
  updateRangeButtons();
  if (pixelClipboard.w > 0 && pixelClipboard.h > 0) {
    updateStatus(`コピー（${pixelClipboard.w}×${pixelClipboard.h}）`);
    return true;
  }
  updateStatus('コピーできなかった');
  return false;
}

function cutSelectionToClipboard() {
  if (!currentAsset) return false;
  if (isReadOnly) return false;
  if (!copySelectionToClipboard()) return false;
  const snapshot = snapshotCurrentPixels();
  const changed = clearRectPixels(selectionRect);
  if (changed > 0) {
    pushUndoSnapshot(snapshot);
    setDirty(true);
    scheduleRender();
    updateStatus('切り取り');
  } else {
    updateStatus('切り取り（変化なし）');
  }
  return changed > 0;
}

function startPasteMode(anchorX, anchorY) {
  if (!pixelClipboard || pixelClipboard.w <= 0 || pixelClipboard.h <= 0) {
    updateStatus('貼り付けるものがない');
    return false;
  }
  if (!currentAsset) return false;
  if (isReadOnly) return false;
  rangeGesture = {
    mode: 'pasting',
    startX: anchorX,
    startY: anchorY,
    anchorX,
    anchorY,
    offsetX: 0,
    offsetY: 0,
    buffer: pixelClipboard,
    fromRect: null
  };
  selectionRect = clampRectToCanvas({ x: anchorX, y: anchorY, w: pixelClipboard.w, h: pixelClipboard.h });
  updateRangeButtons();
  scheduleRender();
  updateStatus('貼り付け位置をクリック（Escでキャンセル）');
  return true;
}

function cancelPasteMode() {
  if (rangeGesture?.mode !== 'pasting') return;
  clearRangeGesture();
  scheduleRender();
}

function commitPasteAt(x, y) {
  if (!currentAsset || !pixelClipboard) return false;
  if (isReadOnly) return false;
  const snapshot = snapshotCurrentPixels();
  const changed = writeRectPixels(x, y, pixelClipboard, { transparentIsNoop: false });
  pushUndoSnapshot(snapshot);
  setDirty(true);
  selectionRect = clampRectToCanvas({ x, y, w: pixelClipboard.w, h: pixelClipboard.h });
  updateRangeButtons();
  scheduleRender();
  updateStatus(changed > 0 ? '貼り付け' : '貼り付け（変化なし）');
  return changed > 0;
}

function renderNow() {
  if (!currentAsset) return;
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(pixelsToImageData(currentAsset.pixels, currentAsset.width, currentAsset.height), 0, 0);

  // Range overlay (selection highlight)
  if (selectionRect && selectionRect.w > 0 && selectionRect.h > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(108, 92, 231, 0.12)';
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.95)';
    ctx.lineWidth = 1;
    ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.strokeRect(
      selectionRect.x + 0.5,
      selectionRect.y + 0.5,
      Math.max(0, selectionRect.w - 1),
      Math.max(0, selectionRect.h - 1)
    );
    ctx.restore();
  }

  // Preview while moving / pasting
  if (rangeGesture && (rangeGesture.mode === 'moving' || rangeGesture.mode === 'pasting') && rangeGesture.buffer && rangePreviewCtx) {
    const clip = rangeGesture.buffer;
    if (clip.w > 0 && clip.h > 0) {
      if (rangePreviewCanvas.width !== clip.w) rangePreviewCanvas.width = clip.w;
      if (rangePreviewCanvas.height !== clip.h) rangePreviewCanvas.height = clip.h;
      rangePreviewCtx.putImageData(pixelsToImageData(clip.pixels, clip.w, clip.h), 0, 0);
      const px = rangeGesture.anchorX + rangeGesture.offsetX;
      const py = rangeGesture.anchorY + rangeGesture.offsetY;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(rangePreviewCanvas, px, py);
      ctx.restore();
    }
  }
}

function normalizeFramesInCurrentAsset() {
  if (!currentAsset) return;
  const w = Number(currentAsset.width) || 16;
  const h = Number(currentAsset.height) || 16;

  if (!Array.isArray(currentAsset.frames) || currentAsset.frames.length === 0) {
    const pixels = normalizePixelsSize(w, h, currentAsset.pixels instanceof Uint32Array ? currentAsset.pixels : new Uint32Array());
    currentAsset.frames = [
      {
        index: 0,
        width: w,
        height: h,
        pixels: new Uint32Array(pixels),
        durationMs: 100
      }
    ];
  }

  const framesSorted = currentAsset.frames.slice().sort((a, b) => Number(a.index ?? 0) - Number(b.index ?? 0));
  currentAsset.frames = framesSorted.map((f, i) => {
    const fp = f?.pixels instanceof Uint32Array ? f.pixels : new Uint32Array(f?.pixels || []);
    const pixels = normalizePixelsSize(w, h, fp);
    return {
      index: i,
      width: w,
      height: h,
      pixels: new Uint32Array(pixels),
      durationMs: Number(f?.durationMs ?? 100) || 100
    };
  });

  currentFrameIndex = clamp(currentFrameIndex, 0, currentAsset.frames.length - 1);
  const active = currentAsset.frames[currentFrameIndex];
  currentAsset.pixels = active?.pixels ? active.pixels : new Uint32Array(w * h);
}

function switchToFrame(index, { resetHistory = false } = {}) {
  if (!currentAsset) return;
  normalizeFramesInCurrentAsset();
  const total = currentAsset.frames?.length || 1;
  const next = clamp(Number(index) || 0, 0, total - 1);
  if (next === currentFrameIndex) return;
  if (isPointerDown) endStroke();
  currentFrameIndex = next;
  normalizeFramesInCurrentAsset();
  selectionRect = null;
  rangeGesture = null;
  if (resetHistory) {
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
  }
  updateCanvasLayout();
  scheduleRender();
  updateFrameUi();
  updateRangeButtons();
  updateStatus(`フレーム ${next + 1}`);
}

function updateFrameUi() {
  if (!currentAsset) return;
  if (!frameCounter || !frameList) return;
  normalizeFramesInCurrentAsset();

  const frames = currentAsset.frames || [];
  const total = frames.length || 1;
  const cur = clamp(currentFrameIndex, 0, total - 1);
  frameCounter.textContent = `${cur + 1}/${total}`;

  if (framePrevBtn) framePrevBtn.disabled = cur <= 0;
  if (frameNextBtn) frameNextBtn.disabled = cur >= total - 1;
  if (frameDeleteBtn) frameDeleteBtn.disabled = isReadOnly || total <= 1;

  frameList.innerHTML = '';
  frames.forEach((f, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'frame-item';
    btn.classList.toggle('selected', i === cur);
    btn.setAttribute('aria-label', `フレーム ${i + 1}`);

    const img = document.createElement('img');
    img.className = 'frame-thumb';
    img.alt = '';
    img.src = assetPreviewDataUrl({ ...currentAsset, pixels: f.pixels }, 56);

    const label = document.createElement('div');
    label.className = 'frame-label';
    label.textContent = `#${i + 1}`;

    btn.appendChild(img);
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      switchToFrame(i);
    });

    frameList.appendChild(btn);
  });
}

function snapshotCurrentFrame() {
  if (!currentAsset) return { type: 'frame', frameIndex: 0, width: 0, height: 0, pixels: new Uint32Array() };
  normalizeFramesInCurrentAsset();
  return {
    type: 'frame',
    frameIndex: currentFrameIndex,
    width: currentAsset.width,
    height: currentAsset.height,
    pixels: new Uint32Array(currentAsset.pixels)
  };
}

function snapshotEntireAsset() {
  if (!currentAsset) {
    return { type: 'asset', frameIndex: 0, width: 0, height: 0, frames: [] };
  }
  normalizeFramesInCurrentAsset();
  const frames = (currentAsset.frames || []).map((f) => ({
    index: Number(f.index ?? 0),
    width: Number(f.width ?? currentAsset.width),
    height: Number(f.height ?? currentAsset.height),
    pixels: new Uint32Array(f.pixels),
    durationMs: Number(f.durationMs ?? 100) || 100
  }));
  return {
    type: 'asset',
    frameIndex: currentFrameIndex,
    width: currentAsset.width,
    height: currentAsset.height,
    frames
  };
}

function addFrame({ duplicate = false } = {}) {
  if (!currentAsset) return;
  if (isReadOnly) return;
  normalizeFramesInCurrentAsset();
  const before = snapshotEntireAsset();
  pushUndoSnapshot(before);

  const base = currentAsset.frames?.[currentFrameIndex];
  const nextPixels = duplicate && base?.pixels ? new Uint32Array(base.pixels) : new Uint32Array(currentAsset.width * currentAsset.height);
  const nextDuration = Number(base?.durationMs ?? 100) || 100;

  currentAsset.frames.push({
    index: currentAsset.frames.length,
    width: currentAsset.width,
    height: currentAsset.height,
    pixels: nextPixels,
    durationMs: nextDuration
  });

  currentFrameIndex = currentAsset.frames.length - 1;
  normalizeFramesInCurrentAsset();
  canvas.width = currentAsset.width;
  canvas.height = currentAsset.height;
  setDirty(true);
  updateFrameUi();
  scheduleRender();
  updateStatus(duplicate ? 'フレームを複製した' : 'フレームを追加した');
}

function deleteCurrentFrame() {
  if (!currentAsset) return;
  if (isReadOnly) return;
  normalizeFramesInCurrentAsset();
  if ((currentAsset.frames?.length || 0) <= 1) return;
  if (!confirm('このフレームを削除しますか？（もどすで戻せるよ）')) return;

  const before = snapshotEntireAsset();
  pushUndoSnapshot(before);

  currentAsset.frames.splice(currentFrameIndex, 1);
  currentFrameIndex = clamp(currentFrameIndex, 0, Math.max(0, currentAsset.frames.length - 1));
  normalizeFramesInCurrentAsset();
  canvas.width = currentAsset.width;
  canvas.height = currentAsset.height;
  setDirty(true);
  updateFrameUi();
  scheduleRender();
  updateStatus('フレームを削除した');
}

function setAsset(asset, { persisted }) {
  currentAsset = asset;
  isPersisted = Boolean(persisted);
  setDirty(false);
  setReadOnly(Boolean(asset?.ownerId) && String(asset.ownerId) !== String(ownerId));
  setHuePreview(0);
  currentFrameIndex = 0;
  selectionRect = null;
  rangeGesture = null;

  // Sync UI fields
  nameInput.value = asset.name || '';

  // Ensure frames exist and point pixels at active frame
  normalizeFramesInCurrentAsset();

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
  updateFrameUi();
  updateRangeButtons();
  updateStatus();
}

function updateUndoRedoButtons() {
  undoBtn.disabled = isReadOnly || undoStack.length === 0;
  redoBtn.disabled = isReadOnly || redoStack.length === 0;
}

function snapshotCurrentPixels() {
  return snapshotCurrentFrame();
}

function restoreSnapshot(snapshot) {
  if (!currentAsset) return;
  // Selection / paste state can become inconsistent after undo/redo.
  selectionRect = null;
  rangeGesture = null;
  updateRangeButtons();
  if (snapshot?.type === 'asset') {
    currentAsset.width = snapshot.width;
    currentAsset.height = snapshot.height;
    currentAsset.frames = (snapshot.frames || []).map((f) => ({
      index: Number(f.index ?? 0),
      width: Number(f.width ?? snapshot.width),
      height: Number(f.height ?? snapshot.height),
      pixels: new Uint32Array(f.pixels),
      durationMs: Number(f.durationMs ?? 100) || 100
    }));
    currentFrameIndex = clamp(snapshot.frameIndex ?? 0, 0, Math.max(0, currentAsset.frames.length - 1));
    normalizeFramesInCurrentAsset();
  } else {
    currentFrameIndex = clamp(snapshot?.frameIndex ?? 0, 0, Math.max(0, (currentAsset.frames?.length ?? 1) - 1));
    normalizeFramesInCurrentAsset();
    const nextPixels = new Uint32Array(snapshot?.pixels || []);
    if (Array.isArray(currentAsset.frames) && currentAsset.frames[currentFrameIndex]) {
      currentAsset.frames[currentFrameIndex].pixels = nextPixels;
      currentAsset.frames[currentFrameIndex].width = currentAsset.width;
      currentAsset.frames[currentFrameIndex].height = currentAsset.height;
    }
    currentAsset.pixels = nextPixels;
  }

  canvas.width = currentAsset.width;
  canvas.height = currentAsset.height;
  updateCanvasLayout();
  scheduleRender();
  updateFrameUi();
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
  normalizeFramesInCurrentAsset();
  currentAsset.pixels = nextPixels;
  if (Array.isArray(currentAsset.frames) && currentAsset.frames[currentFrameIndex]) {
    currentAsset.frames[currentFrameIndex].pixels = nextPixels;
    currentAsset.frames[currentFrameIndex].width = currentAsset.width;
    currentAsset.frames[currentFrameIndex].height = currentAsset.height;
  }
  pushUndoSnapshot(snapshot);
  setDirty(true);
  scheduleRender();
  updateFrameUi();
  updateStatus('画像を読み込んだ');
}

async function refreshGalleryList() {
  galleryList.innerHTML = '';
  if (gallerySummary) gallerySummary.textContent = '読み込み中…';

  // Shared gallery: list all assets (created by anyone).
  const list = await listPixelAssets();
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
      // If this is someone else's work, open read-only by default (avoid accidental overwrite).
      // You can still "複製" to make your own editable copy.
      setAsset(loaded, { persisted: true });
      setView('editor');
      updateStatus(loaded.ownerId && String(loaded.ownerId) !== String(ownerId) ? '読み込んだ（読み取り専用）' : '読み込んだ');
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

function renderToolbarPalette() {
  if (!toolbarPalette) return;
  const currentHex = String(colorInput.value || '').toLowerCase();
  const recent = readRecentColors().slice(0, 8);

  toolbarPalette.innerHTML = '';

  // Recent (always 8 slots)
  for (let i = 0; i < 8; i++) {
    const hex = recent[i] || null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toolbar-swatch';
    if (!hex) {
      btn.classList.add('empty');
      btn.disabled = true;
      btn.setAttribute('aria-label', '最近の色（空）');
      btn.title = '最近の色（空）';
    } else {
      btn.style.background = hex;
      btn.dataset.hex = hex.toLowerCase();
      btn.classList.toggle('selected', btn.dataset.hex === currentHex);
      btn.setAttribute('aria-label', `最近の色 ${hex}`);
      btn.title = `最近の色 ${hex}`;
      btn.addEventListener('click', () => {
        setColorHex(hex);
        updateStatus('最近の色');
      });
    }
    toolbarPalette.appendChild(btn);
  }

  // Base 24
  BASE_PALETTE_24.forEach((hex) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toolbar-swatch';
    btn.style.background = hex;
    btn.dataset.hex = hex.toLowerCase();
    btn.classList.toggle('selected', btn.dataset.hex === currentHex);
    btn.setAttribute('aria-label', `基本の色 ${hex}`);
    btn.title = `基本の色 ${hex}`;
    btn.addEventListener('click', () => {
      setColorHex(hex);
      updateStatus('基本の色');
    });
    toolbarPalette.appendChild(btn);
  });
}

function updatePaletteSelection() {
  const currentHex = String(colorInput.value || '').toLowerCase();
  paletteGrid.querySelectorAll('.swatch').forEach((el) => {
    const btn = /** @type {HTMLButtonElement} */ (el);
    btn.classList.toggle('selected', btn.dataset.hex === currentHex);
  });
}

function updateToolbarPaletteSelection() {
  if (!toolbarPalette) return;
  const currentHex = String(colorInput.value || '').toLowerCase();
  toolbarPalette.querySelectorAll('.toolbar-swatch').forEach((el) => {
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
  portalPopoverToBody(colorPopover);
  renderRecentColors();
  colorPopover.hidden = false;
}

function closeColorPopover() {
  if (!colorPopover) return;
  colorPopover.hidden = true;
  restorePopoverHome(colorPopover);
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

if (recentClearBtn) {
  recentClearBtn.addEventListener('click', () => {
    clearRecentColors();
    updateStatus('最近の色を消した');
  });
}

if (hueBtn) {
  hueBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!huePopover) return;
    huePopover.hidden ? openHuePopover() : closeHuePopover();
  });
}

if (huePopoverCloseBtn) {
  huePopoverCloseBtn.addEventListener('click', () => closeHuePopover());
}

if (hueRange) {
  hueRange.addEventListener('input', () => {
    setHuePreview(Number(hueRange.value));
  });
}

if (hueResetBtn) {
  hueResetBtn.addEventListener('click', () => {
    setHuePreview(0);
    updateStatus('色相リセット');
  });
}

if (hueApplyBtn) {
  hueApplyBtn.addEventListener('click', () => {
    if (!currentAsset) return;
    if (isReadOnly) return;
    const deg = Number(hueRange?.value ?? 0) || 0;
    if (!deg) {
      updateStatus('色相は 0°（変更なし）');
      return;
    }
    const snapshot = snapshotCurrentPixels();
    let changed = 0;
    for (let i = 0; i < currentAsset.pixels.length; i++) {
      const prev = currentAsset.pixels[i] >>> 0;
      if (prev === 0) continue;
      const next = hueRotateRgbaInt(prev, deg);
      if (next !== prev) {
        currentAsset.pixels[i] = next;
        changed++;
      }
    }
    if (changed > 0) {
      pushUndoSnapshot(snapshot);
      setDirty(true);
      scheduleRender();
      setHuePreview(0);
      closeHuePopover();
      updateStatus('色相を適用した');
    } else {
      updateStatus('色相を適用（変化なし）');
    }
  });
}

document.addEventListener('click', (e) => {
  if (!colorPopover || colorPopover.hidden) return;
  const t = /** @type {HTMLElement} */ (e.target);
  if (t.closest('#colorPopover') || t.closest('#colorBtn')) return;
  closeColorPopover();
});

document.addEventListener('click', (e) => {
  if (!huePopover || huePopover.hidden) return;
  const t = /** @type {HTMLElement} */ (e.target);
  if (t.closest('#huePopover') || t.closest('#hueBtn')) return;
  closeHuePopover();
});

nameInput.addEventListener('input', () => {
  if (!currentAsset) return;
  if (isReadOnly) return;
  currentAsset.name = nameInput.value;
  setDirty(true);
});

if (framePrevBtn) {
  framePrevBtn.addEventListener('click', () => {
    if (!currentAsset) return;
    switchToFrame(currentFrameIndex - 1);
  });
}
if (frameNextBtn) {
  frameNextBtn.addEventListener('click', () => {
    if (!currentAsset) return;
    switchToFrame(currentFrameIndex + 1);
  });
}
if (frameAddBtn) {
  frameAddBtn.addEventListener('click', () => {
    if (!currentAsset) {
      alert('先に「新規作成」か、作品を開いてね！');
      return;
    }
    addFrame({ duplicate: false });
  });
}
if (frameDuplicateBtn) {
  frameDuplicateBtn.addEventListener('click', () => {
    if (!currentAsset) {
      alert('先に「新規作成」か、作品を開いてね！');
      return;
    }
    addFrame({ duplicate: true });
  });
}
if (frameDeleteBtn) {
  frameDeleteBtn.addEventListener('click', () => {
    if (!currentAsset) return;
    deleteCurrentFrame();
  });
}

toolPen.addEventListener('click', () => setTool('pen'));
toolEraser.addEventListener('click', () => setTool('eraser'));
toolFill.addEventListener('click', () => setTool('fill'));
toolPicker.addEventListener('click', () => setTool('picker'));
if (toolSelect) toolSelect.addEventListener('click', () => setTool('select'));

if (rangeCopyBtn) rangeCopyBtn.addEventListener('click', () => copySelectionToClipboard());
if (rangeCutBtn) rangeCutBtn.addEventListener('click', () => cutSelectionToClipboard());
if (rangePasteBtn) {
  rangePasteBtn.addEventListener('click', () => {
    if (!currentAsset) return;
    const anchor = lastHoverPixel?.index >= 0 ? lastHoverPixel : { x: 0, y: 0, index: 0 };
    startPasteMode(anchor.x, anchor.y);
  });
}

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

  normalizeFramesInCurrentAsset();
  const snapshot = snapshotEntireAsset();
  pushUndoSnapshot(snapshot);

  currentAsset.width = nextW;
  currentAsset.height = nextH;

  // Resize all frames (keep top-left content).
  (currentAsset.frames || []).forEach((f) => {
    const beforePixels = normalizePixelsSize(beforeW, beforeH, f.pixels);
    const nextPixels = new Uint32Array(nextW * nextH);
    for (let y = 0; y < beforeH; y++) {
      const srcStart = y * beforeW;
      const dstStart = y * nextW;
      nextPixels.set(beforePixels.subarray(srcStart, srcStart + beforeW), dstStart);
    }
    f.width = nextW;
    f.height = nextH;
    f.pixels = nextPixels;
  });

  currentFrameIndex = clamp(currentFrameIndex, 0, Math.max(0, (currentAsset.frames?.length ?? 1) - 1));
  currentAsset.pixels = currentAsset.frames?.[currentFrameIndex]?.pixels || new Uint32Array(nextW * nextH);
  canvas.width = nextW;
  canvas.height = nextH;

  setDirty(true);
  updateCanvasLayout();
  scheduleRender();
  updateFrameUi();
  updateStatus('キャンバスをひろげた');
}

function countPixelsOutside(nextW, nextH) {
  if (!currentAsset) return 0;
  normalizeFramesInCurrentAsset();
  const frames = Array.isArray(currentAsset.frames) ? currentAsset.frames : [];
  const beforeW = currentAsset.width;
  const beforeH = currentAsset.height;

  const w2 = Math.max(1, Math.min(beforeW, nextW));
  const h2 = Math.max(1, Math.min(beforeH, nextH));
  let lost = 0;

  for (const f of frames) {
    const px = normalizePixelsSize(beforeW, beforeH, f?.pixels instanceof Uint32Array ? f.pixels : new Uint32Array());
    // right side columns (x >= w2) for y < h2
    if (w2 < beforeW) {
      for (let y = 0; y < h2; y++) {
        const row = y * beforeW;
        for (let x = w2; x < beforeW; x++) {
          if ((px[row + x] >>> 0) !== 0) lost++;
        }
      }
    }
    // bottom rows (y >= h2) for all x
    if (h2 < beforeH) {
      for (let y = h2; y < beforeH; y++) {
        const row = y * beforeW;
        for (let x = 0; x < beforeW; x++) {
          if ((px[row + x] >>> 0) !== 0) lost++;
        }
      }
    }
  }
  return lost;
}

function shrinkCanvas({ subWidth = 0, subHeight = 0 } = {}) {
  if (!currentAsset) return;
  if (isReadOnly) return;

  const beforeW = currentAsset.width;
  const beforeH = currentAsset.height;
  const nextW = Math.max(1, beforeW - (Number(subWidth) || 0));
  const nextH = Math.max(1, beforeH - (Number(subHeight) || 0));

  if (nextW === beforeW && nextH === beforeH) {
    updateStatus('これ以上ちぢめられないよ');
    return;
  }

  const lost = countPixelsOutside(nextW, nextH);
  if (lost > 0) {
    const ok = confirm(`縮小すると、右/下側のピクセルが消えます（合計 ${lost} 個）。\nそれでもちぢめますか？`);
    if (!ok) {
      updateStatus('縮小をキャンセルした');
      return;
    }
  }

  normalizeFramesInCurrentAsset();
  const snapshot = snapshotEntireAsset();
  pushUndoSnapshot(snapshot);

  currentAsset.width = nextW;
  currentAsset.height = nextH;

  // Resize all frames (keep top-left content; crop right/bottom).
  (currentAsset.frames || []).forEach((f) => {
    const beforePixels = normalizePixelsSize(beforeW, beforeH, f.pixels);
    const nextPixels = new Uint32Array(nextW * nextH);
    const copyW = Math.min(beforeW, nextW);
    const copyH = Math.min(beforeH, nextH);
    for (let y = 0; y < copyH; y++) {
      const srcStart = y * beforeW;
      const dstStart = y * nextW;
      nextPixels.set(beforePixels.subarray(srcStart, srcStart + copyW), dstStart);
    }
    f.width = nextW;
    f.height = nextH;
    f.pixels = nextPixels;
  });

  currentFrameIndex = clamp(currentFrameIndex, 0, Math.max(0, (currentAsset.frames?.length ?? 1) - 1));
  currentAsset.pixels = currentAsset.frames?.[currentFrameIndex]?.pixels || new Uint32Array(nextW * nextH);
  canvas.width = nextW;
  canvas.height = nextH;

  // Selection can become out of bounds after resize.
  selectionRect = null;
  rangeGesture = null;
  updateRangeButtons();

  setDirty(true);
  updateCanvasLayout();
  scheduleRender();
  updateFrameUi();
  updateStatus('キャンバスをちぢめた');
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
if (shrinkWidthBtn) {
  shrinkWidthBtn.addEventListener('click', () => {
    shrinkCanvas({ subWidth: CANVAS_STEP });
  });
}
if (shrinkHeightBtn) {
  shrinkHeightBtn.addEventListener('click', () => {
    shrinkCanvas({ subHeight: CANVAS_STEP });
  });
}

function openNewAssetModal() {
  newNameInput.value = DEFAULT_NEW_ASSET.name;
  newAssetModal.hidden = false;
  newAssetModal.setAttribute('aria-hidden', 'false');
  syncModalOpenClass();
  newNameInput.focus();
}

function closeNewAssetModal() {
  newAssetModal.hidden = true;
  newAssetModal.setAttribute('aria-hidden', 'true');
  syncModalOpenClass();
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
  if (framesModal && !framesModal.hidden) closeFramesModal();
  if (colorPopover && !colorPopover.hidden) closeColorPopover();
  if (huePopover && !huePopover.hidden) closeHuePopover();
});

if (sampleCloseBtn) sampleCloseBtn.addEventListener('click', closeSampleModal);
if (sampleModal) {
  sampleModal.addEventListener('click', (e) => {
    if (e.target === sampleModal) closeSampleModal();
  });
}

if (framesBtn) {
  framesBtn.addEventListener('click', () => {
    if (framesModal && !framesModal.hidden) closeFramesModal();
    else openFramesModal();
  });
}
if (framesCloseBtn) framesCloseBtn.addEventListener('click', closeFramesModal);
if (framesModal) {
  framesModal.addEventListener('click', (e) => {
    if (e.target === framesModal) closeFramesModal();
  });
}

// Small usability helpers (keyboard shortcuts)
document.addEventListener('keydown', (e) => {
  const tag = String(document.activeElement?.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select';
  if (typing) return;

  const inEditor = appRoot?.dataset?.view === 'editor';
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;

  if (inEditor && currentAsset) {
    if (e.key === 'Escape') {
      if (rangeGesture?.mode === 'pasting') {
        e.preventDefault();
        cancelPasteMode();
        updateStatus('貼り付けキャンセル');
        return;
      }
      if (hasSelection()) {
        e.preventDefault();
        clearSelection({ keepClipboard: true });
        updateStatus('範囲選択を解除');
        return;
      }
    }

    if (mod && key === 'c') {
      e.preventDefault();
      copySelectionToClipboard();
      return;
    }
    if (mod && key === 'x') {
      e.preventDefault();
      cutSelectionToClipboard();
      return;
    }
    if (mod && key === 'v') {
      e.preventDefault();
      const anchor = lastHoverPixel?.index >= 0 ? lastHoverPixel : { x: 0, y: 0, index: 0 };
      startPasteMode(anchor.x, anchor.y);
      return;
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && hasSelection()) {
      if (isReadOnly) return;
      e.preventDefault();
      const snapshot = snapshotCurrentPixels();
      const changed = clearRectPixels(selectionRect);
      if (changed > 0) {
        pushUndoSnapshot(snapshot);
        setDirty(true);
        scheduleRender();
        updateStatus('範囲を消した');
      } else {
        updateStatus('範囲を消した（変化なし）');
      }
      return;
    }

    // Arrow keys: nudge selected pixels (Shift=8px)
    if (hasSelection() && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key)) {
      if (isReadOnly) return;
      e.preventDefault();
      const step = e.shiftKey ? 8 : 1;
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0;
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0;
      const clip = readRectPixels(selectionRect);
      const from = { ...selectionRect };
      const toX = from.x + dx;
      const toY = from.y + dy;
      const snapshot = snapshotCurrentPixels();
      clearRectPixels(from);
      writeRectPixels(toX, toY, clip, { transparentIsNoop: false });
      pushUndoSnapshot(snapshot);
      setDirty(true);
      selectionRect = clampRectToCanvas({ x: toX, y: toY, w: from.w, h: from.h });
      scheduleRender();
      updateStatus('範囲を移動');
      return;
    }
  }

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
  if (e.key.toLowerCase() === 'r') setTool('select');
});

function setToolbarMoreOpen(open) {
  if (!toolbarMore) return;
  const next = Boolean(open);
  toolbarMore.hidden = !next;
  if (toolbarMenuBtn) {
    toolbarMenuBtn.setAttribute('aria-expanded', next ? 'true' : 'false');
    toolbarMenuBtn.setAttribute('aria-label', next ? 'メニューを閉じる' : 'メニューを開く');
  }
  try {
    localStorage.setItem('ngames.pm.toolbarMore.open', next ? '1' : '0');
  } catch {
    // ignore
  }
}

function syncToolbarMoreForViewport() {
  const wide = window.matchMedia?.('(min-width: 960px)')?.matches ?? false;
  if (wide) {
    setToolbarMoreOpen(true);
    return;
  }
  let saved = null;
  try {
    saved = localStorage.getItem('ngames.pm.toolbarMore.open');
  } catch {
    saved = null;
  }
  setToolbarMoreOpen(saved === '1');
}

undoBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (isReadOnly) return;
  if (undoStack.length === 0) return;
  const prev = undoStack.pop();
  redoStack.push(prev?.type === 'asset' ? snapshotEntireAsset() : snapshotCurrentPixels());
  restoreSnapshot(prev);
  setDirty(true);
  updateUndoRedoButtons();
  updateStatus('もどした');
});

redoBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (isReadOnly) return;
  if (redoStack.length === 0) return;
  const next = redoStack.pop();
  undoStack.push(next?.type === 'asset' ? snapshotEntireAsset() : snapshotCurrentPixels());
  restoreSnapshot(next);
  setDirty(true);
  updateUndoRedoButtons();
  updateStatus('やりなおした');
});

clearBtn.addEventListener('click', () => {
  if (!currentAsset) return;
  if (isReadOnly) return;
  if (!confirm('ぜんぶ消しますか？（もどすで元に戻せるよ）')) return;
  const snapshot = snapshotCurrentPixels();
  currentAsset.pixels.fill(0);
  if (Array.isArray(currentAsset.frames) && currentAsset.frames[currentFrameIndex]) {
    currentAsset.frames[currentFrameIndex].pixels = currentAsset.pixels;
  }
  pushUndoSnapshot(snapshot);
  setDirty(true);
  scheduleRender();
  updateFrameUi();
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
  if (isReadOnly) {
    alert('これは ほかの人の作品です。まず「複製」して、自分の作品にしてから保存してね！');
    return;
  }
  const name = nameInput.value.trim();
  if (!name) {
    alert('なまえをいれてね！');
    return;
  }
  currentAsset.name = name;
  // Safety: keep active frame in sync (frames are the source of truth for saving).
  normalizeFramesInCurrentAsset();
  if (Array.isArray(currentAsset.frames) && currentAsset.frames[currentFrameIndex]) {
    currentAsset.frames[currentFrameIndex].width = currentAsset.width;
    currentAsset.frames[currentFrameIndex].height = currentAsset.height;
    currentAsset.frames[currentFrameIndex].pixels = currentAsset.pixels;
  }
  const saved = await putPixelAsset(currentAsset);
  setAsset(saved, { persisted: true });
  await refreshGalleryList();
  updateStatus('保存した');
});

duplicateBtn.addEventListener('click', async () => {
  if (!currentAsset) return;
  const baseName = (nameInput.value.trim() || currentAsset.name || 'ドット') + '（コピー）';
  // Always duplicate as "my" asset, so you can safely copy others' works too.
  const next = await duplicatePixelAsset(
    { ...currentAsset, ownerId, name: baseName },
    { ownerId, name: baseName }
  );
  setAsset(next, { persisted: true });
  await refreshGalleryList();
  updateStatus('複製した');
});

deleteBtn.addEventListener('click', async () => {
  if (!currentAsset) return;
  if (isReadOnly) {
    alert('これは ほかの人の作品です。削除はできません。');
    return;
  }

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
  setReadOnly(false);
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

  // Track hover for paste anchoring.
  lastHoverPixel = eventToPixel(e);

  // Range select tool
  if (currentTool === 'select') {
    if (rangeGesture?.mode === 'pasting') {
      commitPasteAt(lastHoverPixel.x, lastHoverPixel.y);
      clearRangeGesture();
      scheduleRender();
      return;
    }

    const p = lastHoverPixel;
    const inside = hasSelection() && pointInRect(p.x, p.y, selectionRect);

    isPointerDown = true;
    canvas.setPointerCapture(e.pointerId);

    if (inside && selectionRect) {
      const buffer = readRectPixels(selectionRect);
      rangeGesture = {
        mode: 'moving',
        startX: p.x,
        startY: p.y,
        anchorX: selectionRect.x,
        anchorY: selectionRect.y,
        offsetX: 0,
        offsetY: 0,
        buffer,
        fromRect: { ...selectionRect }
      };
      updateStatus('ドラッグで移動（離すと確定 / Escで中止）');
      scheduleRender();
      return;
    }

    rangeGesture = {
      mode: 'selecting',
      startX: p.x,
      startY: p.y,
      anchorX: p.x,
      anchorY: p.y,
      offsetX: 0,
      offsetY: 0,
      buffer: null,
      fromRect: null
    };
    selectionRect = clampRectToCanvas({ x: p.x, y: p.y, w: 1, h: 1 });
    updateRangeButtons();
    scheduleRender();
    updateStatus('ドラッグして範囲選択');
    return;
  }

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
  if (!currentAsset) return;
  lastHoverPixel = eventToPixel(e);

  // Paste preview follows the pointer.
  if (rangeGesture?.mode === 'pasting' && pixelClipboard) {
    rangeGesture.anchorX = lastHoverPixel.x;
    rangeGesture.anchorY = lastHoverPixel.y;
    rangeGesture.offsetX = 0;
    rangeGesture.offsetY = 0;
    selectionRect = clampRectToCanvas({ x: lastHoverPixel.x, y: lastHoverPixel.y, w: pixelClipboard.w, h: pixelClipboard.h });
    scheduleRender();
    return;
  }

  if (currentTool === 'select' && rangeGesture && isPointerDown) {
    const p = lastHoverPixel;
    if (rangeGesture.mode === 'selecting') {
      selectionRect = clampRectToCanvas(normalizeRect(rangeGesture.startX, rangeGesture.startY, p.x, p.y));
      updateRangeButtons();
      scheduleRender();
      return;
    }
    if (rangeGesture.mode === 'moving') {
      rangeGesture.offsetX = p.x - rangeGesture.startX;
      rangeGesture.offsetY = p.y - rangeGesture.startY;
      selectionRect = clampRectToCanvas({
        x: rangeGesture.anchorX + rangeGesture.offsetX,
        y: rangeGesture.anchorY + rangeGesture.offsetY,
        w: rangeGesture.buffer?.w || 0,
        h: rangeGesture.buffer?.h || 0
      });
      scheduleRender();
      return;
    }
  }

  if (!isPointerDown) return;
  applyToolAtEvent(e);
});

function endStroke() {
  if (!currentAsset) return;
  isPointerDown = false;
  lastPaintedIndex = -1;

  if (currentTool === 'select' && rangeGesture) {
    if (rangeGesture.mode === 'selecting') {
      clearRangeGesture();
      updateRangeButtons();
      if (hasSelection()) {
        updateStatus(`範囲選択（${selectionRect.w}×${selectionRect.h}）`);
      }
      scheduleRender();
      return;
    }

    if (rangeGesture.mode === 'moving') {
      const g = rangeGesture;
      clearRangeGesture();
      if (isReadOnly) return;
      if (!g.buffer || !g.fromRect || !selectionRect) return;

      const snapshot = snapshotCurrentPixels();
      clearRectPixels(g.fromRect);
      writeRectPixels(selectionRect.x, selectionRect.y, g.buffer, { transparentIsNoop: false });
      pushUndoSnapshot(snapshot);
      setDirty(true);
      updateRangeButtons();
      scheduleRender();
      updateStatus('移動した');
      return;
    }
  }

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
  renderToolbarPalette();
  setHuePreview(0);
  updateRangeButtons();
  syncToolbarMoreForViewport();
  initResizableEditorLayout();

  if (toolbarMenuBtn) {
    toolbarMenuBtn.addEventListener('click', () => {
      const next = toolbarMore ? toolbarMore.hidden : true;
      setToolbarMoreOpen(next);
    });
  }
  window.addEventListener('resize', () => {
    // keep simple; this only controls open/close, not layout itself
    syncToolbarMoreForViewport();
    syncTopbarHeightVar();
    syncEditorChromeVars();
    syncEditorMobileClass();
    if (!isMobileEditorLayout() && framesModal && !framesModal.hidden) closeFramesModal();
  });

  // Safety: make sure modal is closed on first paint (and also after bfcache restores).
  closeNewAssetModal();
  closeSampleModal();
  closeFramesModal();

  setView('gallery');
  await refreshGalleryList();
  updateStatus('準備OK');
})();

