/**
 * Pixel assets (dot-art) local store + helpers.
 *
 * - Storage: IndexedDB
 * - Pixels: Uint32Array of 0xAARRGGBB (0 = transparent)
 *
 * This is designed so future games can load by assetId.
 */
import { supabase } from './supabaseClient.js';

const DB_NAME = 'n-games-assets';
const DB_VERSION = 1;
const STORE_NAME = 'pixel_assets';

/**
 * @typedef {'character'|'object'|'tile'} PixelAssetKind
 */

/**
 * @typedef {object} PixelAssetFrame
 * @property {number} index
 * @property {number} width
 * @property {number} height
 * @property {Uint32Array} pixels
 * @property {number} durationMs
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
 * @property {PixelAssetFrame[]=} frames
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
  const pixels = raw.pixels instanceof Uint32Array ? raw.pixels : new Uint32Array(raw.pixels || []);
  const frames = Array.isArray(raw.frames)
    ? raw.frames.map((f) => ({
        index: Number(f.index ?? 0),
        width: Number(f.width ?? raw.width),
        height: Number(f.height ?? raw.height),
        pixels: f.pixels instanceof Uint32Array ? f.pixels : new Uint32Array(f.pixels || []),
        durationMs: Number(f.durationMs ?? 100)
      }))
    : undefined;
  return { ...raw, pixels, frames };
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

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function pixelsToBase64(pixels) {
  return arrayBufferToBase64(pixels.buffer);
}

function base64ToPixels(b64) {
  return new Uint32Array(base64ToArrayBuffer(b64));
}

/**
 * @param {{ownerId:string, kind:PixelAssetKind, width:number, height:number, name?:string}} params
 * @returns {PixelAsset}
 */
export function createEmptyAsset({ ownerId, kind, width, height, name }) {
  const now = new Date().toISOString();
  const pixels = createEmptyPixels(width, height);
  return {
    id: createId(),
    ownerId,
    name: name || 'あたらしいドット',
    kind,
    width,
    height,
    pixels,
    frames: [
      {
        index: 0,
        width,
        height,
        pixels: new Uint32Array(pixels),
        durationMs: 100
      }
    ],
    version: 1,
    createdAt: now,
    updatedAt: now
  };
}

async function upsertRemoteAsset(asset) {
  // NOTE: This project currently uses open RLS policies for a family app.
  const now = new Date().toISOString();

  const { error: assetErr } = await supabase.from('pixel_assets').upsert(
    {
      id: asset.id,
      owner_id: asset.ownerId,
      name: asset.name,
      kind: asset.kind,
      width: asset.width,
      height: asset.height,
      frame_count: Array.isArray(asset.frames) ? asset.frames.length : 1,
      data_version: 1,
      updated_at: now
    },
    { onConflict: 'id' }
  );
  if (assetErr) throw assetErr;

  const frames = Array.isArray(asset.frames) && asset.frames.length > 0 ? asset.frames : null;
  const frame0 = frames
    ? frames.find((f) => (f.index ?? 0) === 0) || frames[0]
    : { index: 0, width: asset.width, height: asset.height, pixels: asset.pixels, durationMs: 100 };

  const { error: frameErr } = await supabase.from('pixel_asset_frames').upsert(
    {
      asset_id: asset.id,
      frame_index: 0,
      width: frame0.width ?? asset.width,
      height: frame0.height ?? asset.height,
      pixels_b64: pixelsToBase64(frame0.pixels ?? asset.pixels),
      duration_ms: frame0.durationMs ?? 100,
      updated_at: now
    },
    { onConflict: 'asset_id,frame_index' }
  );
  if (frameErr) throw frameErr;
}

/**
 * @param {PixelAsset} asset
 */
export async function putPixelAsset(asset) {
  const now = new Date().toISOString();
  const next = { ...asset, updatedAt: now, version: 1 };
  await withStore('readwrite', (store) => reqToPromise(store.put(next)));
  // Sync to Supabase (DB)
  try {
    await upsertRemoteAsset(next);
  } catch (e) {
    // Keep local save even if remote fails.
    console.warn('Remote save failed:', e);
  }
  return next;
}

export async function getPixelAsset(id) {
  const local = await withStore('readonly', (store) => reqToPromise(store.get(id)));
  const localAsset = normalizeAsset(local);
  if (localAsset) return localAsset;

  // Fallback: fetch from Supabase and cache locally.
  const { data: meta, error: metaErr } = await supabase
    .from('pixel_assets')
    .select('id, owner_id, name, kind, width, height, created_at, updated_at, frame_count')
    .eq('id', id)
    .maybeSingle();
  if (metaErr) throw metaErr;
  if (!meta) return null;

  const { data: frames, error: framesErr } = await supabase
    .from('pixel_asset_frames')
    .select('asset_id, frame_index, width, height, pixels_b64, duration_ms')
    .eq('asset_id', id)
    .order('frame_index', { ascending: true });
  if (framesErr) throw framesErr;

  const frame0 = (frames || []).find((f) => f.frame_index === 0) || frames?.[0];
  const pixels = frame0 ? base64ToPixels(frame0.pixels_b64) : createEmptyPixels(meta.width, meta.height);

  /** @type {PixelAsset} */
  const asset = {
    id: meta.id,
    ownerId: meta.owner_id,
    name: meta.name,
    kind: meta.kind,
    width: meta.width,
    height: meta.height,
    pixels,
    frames: (frames || []).map((f) => ({
      index: f.frame_index,
      width: f.width,
      height: f.height,
      pixels: base64ToPixels(f.pixels_b64),
      durationMs: f.duration_ms
    })),
    version: 1,
    createdAt: meta.created_at,
    updatedAt: meta.updated_at
  };

  await withStore('readwrite', (store) => reqToPromise(store.put(asset)));
  return asset;
}

/**
 * @param {{ownerId:string, kind?:PixelAssetKind}} params
 */
export async function listPixelAssets({ ownerId, kind } = {}) {
  if (!ownerId) return [];
  // Prefer Supabase as source of truth, and cache locally.
  let metaQuery = supabase
    .from('pixel_assets')
    .select('id, owner_id, name, kind, width, height, created_at, updated_at, frame_count')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });
  if (kind) metaQuery = metaQuery.eq('kind', kind);

  const { data: metas, error: metaErr } = await metaQuery;
  if (metaErr) {
    // Fallback to local-only
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

  const ids = (metas || []).map((m) => m.id);
  const { data: frames0, error: framesErr } = ids.length
    ? await supabase
        .from('pixel_asset_frames')
        .select('asset_id, frame_index, width, height, pixels_b64, duration_ms')
        .in('asset_id', ids)
        .eq('frame_index', 0)
    : { data: [], error: null };
  if (framesErr) throw framesErr;

  const frameMap = new Map((frames0 || []).map((f) => [f.asset_id, f]));

  const list = (metas || []).map((m) => {
    const f0 = frameMap.get(m.id);
    const pixels = f0 ? base64ToPixels(f0.pixels_b64) : createEmptyPixels(m.width, m.height);
    /** @type {PixelAsset} */
    const asset = {
      id: m.id,
      ownerId: m.owner_id,
      name: m.name,
      kind: m.kind,
      width: m.width,
      height: m.height,
      pixels,
      frames: f0
        ? [
            {
              index: 0,
              width: f0.width,
              height: f0.height,
              pixels,
              durationMs: f0.duration_ms
            }
          ]
        : undefined,
      version: 1,
      createdAt: m.created_at,
      updatedAt: m.updated_at
    };
    return asset;
  });

  // Cache locally (best effort)
  try {
    await withStore('readwrite', (store) => {
      list.forEach((a) => store.put(a));
      return true;
    });
  } catch (e) {
    console.warn('Local cache update failed:', e);
  }

  return list;
}

export async function deletePixelAsset(id) {
  await withStore('readwrite', (store) => reqToPromise(store.delete(id)));
  try {
    await supabase.from('pixel_assets').delete().eq('id', id);
  } catch (e) {
    console.warn('Remote delete failed:', e);
  }
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

/**
 * Original size PNG data URL (no scaling).
 * Useful for games to load as an <img>.
 */
export function assetToPngDataUrl(asset) {
  const c = document.createElement('canvas');
  const pixels = asset.pixels || asset.frames?.[0]?.pixels;
  renderPixelsToCanvas(c, pixels, asset.width, asset.height);
  return c.toDataURL('image/png');
}

