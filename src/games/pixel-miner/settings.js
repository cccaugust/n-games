import { getCurrentPlayer } from '../../js/auth.js';
import { avatarToHtml, escapeHtml } from '../../js/avatar.js';
import { assetPreviewDataUrl, getPixelAsset, listPixelAssets } from '../../js/pixelAssets.js';
import samplePack from '../../pages/pixel-art-maker/samples.json';

const PLAYER_SPRITE_KEY = 'ngames.pixel_miner.player_sprite.v1';

const playerPill = document.getElementById('playerPill');
const currentPreview = /** @type {HTMLImageElement} */ (document.getElementById('currentPreview'));
const currentName = document.getElementById('currentName');
const currentNote = document.getElementById('currentNote');
const refreshBtn = document.getElementById('refreshBtn');

const sampleSearch = /** @type {HTMLInputElement} */ (document.getElementById('sampleSearch'));
const sampleList = document.getElementById('sampleList');
const assetHint = document.getElementById('assetHint');
const assetList = document.getElementById('assetList');

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
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
 * @param {any} sample
 */
function sampleFrame0Pixels(sample) {
  const frames = Array.isArray(sample?.frames) ? sample.frames : [];
  if (frames.length > 0 && typeof frames[0]?.pixelsB64 === 'string') return decodePixelsB64(frames[0].pixelsB64);
  if (typeof sample?.pixelsB64 === 'string') return decodePixelsB64(sample.pixelsB64);
  return new Uint32Array();
}

/**
 * @param {any} sample
 */
function sampleToPseudoAsset(sample) {
  const w = Number(sample?.width) || 16;
  const h = Number(sample?.height) || 16;
  const pixels = sampleFrame0Pixels(sample);
  const safe = pixels.length === w * h ? pixels : new Uint32Array(w * h);
  return {
    id: `sample_${String(sample?.id || '')}`,
    ownerId: 'sample',
    name: String(sample?.name || 'サンプル'),
    kind: 'character',
    width: w,
    height: h,
    pixels: safe,
    frames: []
  };
}

function normalizeSampleList() {
  const list = Array.isArray(samplePack?.samples) ? samplePack.samples : [];
  return list.filter((s) => s?.kind === 'character');
}

function isSpriteSizeOk(w, h) {
  const ww = Number(w) || 0;
  const hh = Number(h) || 0;
  if (ww <= 0 || hh <= 0) return false;
  // ピクセルマイナーは 16x16 前提寄り。大きすぎると見た目が崩れやすいので制限。
  return ww <= 64 && hh <= 64;
}

function readSelection() {
  const sel = readJson(PLAYER_SPRITE_KEY);
  if (!sel || typeof sel !== 'object') return null;
  if (sel.source === 'sample' && typeof sel.sampleId === 'string') return { source: 'sample', sampleId: sel.sampleId };
  if (sel.source === 'asset' && typeof sel.assetId === 'string') return { source: 'asset', assetId: sel.assetId };
  return null;
}

function setSelectionSample(sampleId) {
  return writeJson(PLAYER_SPRITE_KEY, { source: 'sample', sampleId: String(sampleId), at: new Date().toISOString() });
}

function setSelectionAsset(assetId) {
  return writeJson(PLAYER_SPRITE_KEY, { source: 'asset', assetId: String(assetId), at: new Date().toISOString() });
}

function makeItem({ thumbUrl, name, info, selected, onClick }) {
  const row = document.createElement('div');
  row.className = 'pm-item' + (selected ? ' selected' : '');
  row.tabIndex = 0;
  row.setAttribute('role', 'button');
  row.addEventListener('click', onClick);
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  });

  const img = document.createElement('img');
  img.className = 'pm-thumb';
  img.alt = '';
  img.src = thumbUrl || '';

  const meta = document.createElement('div');
  meta.className = 'pm-meta';

  const title = document.createElement('div');
  title.className = 'pm-name';
  title.textContent = name || '-';

  const sub = document.createElement('div');
  sub.className = 'pm-info';
  sub.textContent = info || '';

  meta.appendChild(title);
  meta.appendChild(sub);
  row.appendChild(img);
  row.appendChild(meta);
  return row;
}

async function updateCurrentUi() {
  const sel = readSelection();
  const samples = normalizeSampleList();
  const sampleById = new Map(samples.map((s) => [String(s.id), s]));

  if (!sel) {
    currentName.textContent = 'デフォルト';
    currentNote.textContent = '未設定（ゲーム側のデフォルトが使われます）';
    currentPreview.src = '';
    return;
  }

  if (sel.source === 'sample') {
    const s = sampleById.get(sel.sampleId);
    if (!s) {
      currentName.textContent = '見つかりません';
      currentNote.textContent = 'サンプルが見つからないため、デフォルトになります';
      currentPreview.src = '';
      return;
    }
    const pseudo = sampleToPseudoAsset(s);
    currentName.textContent = s.name || 'サンプル';
    currentNote.textContent = `サンプル / ${pseudo.width}×${pseudo.height}`;
    currentPreview.src = assetPreviewDataUrl(pseudo, 96);
    return;
  }

  if (sel.source === 'asset') {
    try {
      const asset = await getPixelAsset(sel.assetId);
      if (!asset) {
        currentName.textContent = '見つかりません';
        currentNote.textContent = '作品が見つからないため、デフォルトになります';
        currentPreview.src = '';
        return;
      }
      currentName.textContent = asset.name || '作品';
      currentNote.textContent = `自作 / ${asset.width}×${asset.height} / ${asset.kind || '-'}`;
      currentPreview.src = assetPreviewDataUrl(asset, 96);
    } catch (e) {
      console.warn('getPixelAsset failed:', e);
      currentName.textContent = '読み込み失敗';
      currentNote.textContent = '作品の読み込みに失敗しました（ネットワーク/設定）';
      currentPreview.src = '';
    }
  }
}

function renderSampleList() {
  const sel = readSelection();
  const q = String(sampleSearch?.value || '').trim().toLowerCase();
  const samples = normalizeSampleList();
  const filtered = q
    ? samples.filter((s) => String(s.name || '').toLowerCase().includes(q) || String(s.id || '').toLowerCase().includes(q))
    : samples;

  sampleList.innerHTML = '';
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pm-tiny-note';
    empty.textContent = 'サンプルが見つかりませんでした。';
    sampleList.appendChild(empty);
    return;
  }

  filtered.forEach((s) => {
    const pseudo = sampleToPseudoAsset(s);
    if (!isSpriteSizeOk(pseudo.width, pseudo.height)) return;
    const selected = sel?.source === 'sample' && sel.sampleId === String(s.id);
    const row = makeItem({
      thumbUrl: assetPreviewDataUrl(pseudo, 72),
      name: s.name || '(no name)',
      info: `${pseudo.width}×${pseudo.height} / サンプル`,
      selected,
      onClick: async () => {
        if (!setSelectionSample(s.id)) {
          alert('保存に失敗しました（ブラウザ設定をご確認ください）');
          return;
        }
        renderSampleList();
        await renderAssetList();
        await updateCurrentUi();
      }
    });
    sampleList.appendChild(row);
  });
}

async function renderAssetList() {
  const player = getCurrentPlayer?.();
  const ownerId = player?.id != null ? String(player.id) : null;
  const sel = readSelection();

  assetList.innerHTML = '';
  if (!ownerId) {
    assetHint.textContent = '※ 自作を使うには、プレイヤー選択（ログイン）が必要です。';
    return;
  }

  assetHint.textContent = '読み込み中…';
  let list = [];
  try {
    list = await listPixelAssets({ ownerId, kind: 'character' });
  } catch (e) {
    console.warn('listPixelAssets failed:', e);
    assetHint.textContent = '自作一覧の読み込みに失敗しました（ネットワーク/設定）';
    return;
  }

  const filtered = list.filter((a) => isSpriteSizeOk(a.width, a.height));
  assetHint.textContent = filtered.length ? `自分の作品: ${filtered.length}件` : 'まだ作品がないよ。ドット絵メーカーで作ってみよう！';

  filtered.forEach((a) => {
    const selected = sel?.source === 'asset' && sel.assetId === a.id;
    const row = makeItem({
      thumbUrl: assetPreviewDataUrl(a, 72),
      name: a.name || '(no name)',
      info: `${a.width}×${a.height} / 自作`,
      selected,
      onClick: async () => {
        if (!setSelectionAsset(a.id)) {
          alert('保存に失敗しました（ブラウザ設定をご確認ください）');
          return;
        }
        renderSampleList();
        await renderAssetList();
        await updateCurrentUi();
      }
    });
    assetList.appendChild(row);
  });
}

function updatePlayerPill() {
  const p = getCurrentPlayer?.();
  if (!playerPill) return;
  if (!p) {
    playerPill.textContent = 'ゲスト';
    return;
  }
  playerPill.innerHTML = `${avatarToHtml(p?.avatar, { size: 18, className: 'pm-pill-avatar', alt: '' })} ${escapeHtml(
    p?.name || 'Player'
  )}`;
}

async function boot() {
  updatePlayerPill();
  renderSampleList();
  await renderAssetList();
  await updateCurrentUi();

  sampleSearch?.addEventListener('input', () => {
    renderSampleList();
  });

  refreshBtn?.addEventListener('click', async () => {
    await renderAssetList();
    await updateCurrentUi();
  });
}

boot();

