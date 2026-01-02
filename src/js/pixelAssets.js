/**
 * Pixel assets (dot-art) local store + helpers.
 *
 * - Storage: IndexedDB
 * - Pixels: Uint32Array of 0xAARRGGBB (0 = transparent)
 *
 * This is designed so future games can load by assetId.
 */
const DB_NAME = 'n-games-assets';
const DB_VERSION = 1;
const STORE_NAME = 'pixel_assets';

/**
 * @typedef {'character'|'object'|'tile'} PixelAssetKind
 */

/**
 * @typedef {object} PixelAsset
 * @property {string} id
 * @property {string} ownerId
 * @property {string} name
 * @property {PixelAssetKind} kind
 * @property {number} width
 * @property {number} height
 * @property {Uint32Array} pixels
 * @property {number} version
 * @property {string} createdAt
 * @property {string} updatedAt
 */

function createId() {
  // crypto.randomUUID is supported by modern browsers.
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `px_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('ownerId', 'ownerId', { unique: false });
        store.createIndex('ownerId_kind', ['ownerId', 'kind'], { unique: false });
        store.createIndex('ownerId_updatedAt', ['ownerId', 'updatedAt'], { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function withStore(mode, run) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = run(store);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function normalizeAsset(raw) {
  if (!raw) return null;
  const pixels =
    raw.pixels instanceof Uint32Array ? raw.pixels : new Uint32Array(raw.pixels || []);
  return { ...raw, pixels };
}

export function hexToRgbaInt(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0xff000000;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (255 << 24) | (r << 16) | (g << 8) | b;
}

export function rgbaIntToHex(rgba) {
  const r = (rgba >>> 16) & 255;
  const g = (rgba >>> 8) & 255;
  const b = rgba & 255;
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

export function createEmptyPixels(width, height) {
  return new Uint32Array(width * height);
}

/**
 * @param {{ownerId:string, kind:PixelAssetKind, width:number, height:number, name?:string}} params
 * @returns {PixelAsset}
 */
export function createEmptyAsset({ ownerId, kind, width, height, name }) {
  const now = new Date().toISOString();
  return {
    id: createId(),
    ownerId,
    name: name || 'あたらしいドット',
    kind,
    width,
    height,
    pixels: createEmptyPixels(width, height),
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * @param {PixelAsset} asset
 */
export async function putPixelAsset(asset) {
  const now = new Date().toISOString();
  const next = { ...asset, updatedAt: now, version: 1 };
  await withStore('readwrite', (store) => reqToPromise(store.put(next)));
  return next;
}

export async function getPixelAsset(id) {
  const raw = await withStore('readonly', (store) => reqToPromise(store.get(id)));
  return normalizeAsset(raw);
}

/**
 * @param {{ownerId:string, kind?:PixelAssetKind}} params
 */
export async function listPixelAssets({ ownerId, kind } = {}) {
  if (!ownerId) return [];
  const raws = await withStore('readonly', (store) => {
    if (kind) {
      const index = store.index('ownerId_kind');
      return reqToPromise(index.getAll([ownerId, kind]));
    }
    const index = store.index('ownerId');
    return reqToPromise(index.getAll(ownerId));
  });
  const list = (raws || []).map(normalizeAsset).filter(Boolean);
  list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  return list;
}

export async function deletePixelAsset(id) {
  await withStore('readwrite', (store) => reqToPromise(store.delete(id)));
}

/**
 * @param {PixelAsset} asset
 * @param {{name?:string, kind?:PixelAssetKind}} overrides
 */
export async function duplicatePixelAsset(asset, overrides = {}) {
  const now = new Date().toISOString();
  /** @type {PixelAsset} */
  const next = {
    ...asset,
    ...overrides,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    pixels: new Uint32Array(asset.pixels) // clone
  };
  await putPixelAsset(next);
  return next;
}

export function pixelsToImageData(pixels, width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const c = pixels[i] >>> 0;
    const a = (c >>> 24) & 255;
    const r = (c >>> 16) & 255;
    const g = (c >>> 8) & 255;
    const b = c & 255;
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return new ImageData(data, width, height);
}

export function renderPixelsToCanvas(canvas, pixels, width, height) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.putImageData(pixelsToImageData(pixels, width, height), 0, 0);
}

export function assetPreviewDataUrl(asset, size = 64) {
  const src = document.createElement('canvas');
  renderPixelsToCanvas(src, asset.pixels, asset.width, asset.height);

  const dst = document.createElement('canvas');
  dst.width = size;
  dst.height = size;
  const dctx = dst.getContext('2d');
  dctx.imageSmoothingEnabled = false;

  dctx.clearRect(0, 0, size, size);
  dctx.drawImage(src, 0, 0, size, size);
  return dst.toDataURL('image/png');
}

