import { getCurrentPlayer } from '../../js/auth.js';
import { assetPreviewDataUrl, getPixelAsset, listPixelAssets, pixelsToImageData } from '../../js/pixelAssets.js';
import samplePack from '../../pages/pixel-art-maker/samples.json';
import { pokemonData } from '../../data/pokemonData.js';

const PLAYER_SKIN_KEY = 'ngames.mon_survivor.player_skin.v1';

// DOM Elements
const currentPreview = document.getElementById('currentPreview');
const currentName = document.getElementById('currentName');
const currentNote = document.getElementById('currentNote');
const refreshBtn = document.getElementById('refreshBtn');

const sampleSearch = document.getElementById('sampleSearch');
const sampleList = document.getElementById('sampleList');
const assetHint = document.getElementById('assetHint');
const assetList = document.getElementById('assetList');
const pokemonSearch = document.getElementById('pokemonSearch');
const pokemonList = document.getElementById('pokemonList');

// Tab handling
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${tabId}`).classList.add('active');
    });
});

// Utility
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

function sampleFrame0Pixels(sample) {
    const frames = Array.isArray(sample?.frames) ? sample.frames : [];
    if (frames.length > 0 && typeof frames[0]?.pixelsB64 === 'string') return decodePixelsB64(frames[0].pixelsB64);
    if (typeof sample?.pixelsB64 === 'string') return decodePixelsB64(sample.pixelsB64);
    return new Uint32Array();
}

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

// Selection handling
// source: 'sample' | 'asset' | 'pokemon'
function readSelection() {
    const sel = readJson(PLAYER_SKIN_KEY);
    if (!sel || typeof sel !== 'object') return null;
    if (sel.source === 'sample' && typeof sel.sampleId === 'string') return { source: 'sample', sampleId: sel.sampleId };
    if (sel.source === 'asset' && typeof sel.assetId === 'string') return { source: 'asset', assetId: sel.assetId };
    if (sel.source === 'pokemon' && typeof sel.pokemonId === 'string') return { source: 'pokemon', pokemonId: sel.pokemonId };
    return null;
}

function setSelectionSample(sampleId) {
    return writeJson(PLAYER_SKIN_KEY, { source: 'sample', sampleId: String(sampleId), at: new Date().toISOString() });
}

function setSelectionAsset(assetId) {
    return writeJson(PLAYER_SKIN_KEY, { source: 'asset', assetId: String(assetId), at: new Date().toISOString() });
}

function setSelectionPokemon(pokemonId) {
    return writeJson(PLAYER_SKIN_KEY, { source: 'pokemon', pokemonId: String(pokemonId), at: new Date().toISOString() });
}

// UI Render
async function updateCurrentUi() {
    const sel = readSelection();
    const samples = normalizeSampleList();
    const sampleById = new Map(samples.map((s) => [String(s.id), s]));

    if (!sel) {
        currentName.textContent = 'デフォルト（ゴダンギル）';
        currentNote.textContent = '未設定（ポケモン図鑑のデフォルトキャラが使われます）';
        const defaultPoke = pokemonData.find(p => p.id === '0002');
        currentPreview.src = defaultPoke?.image || '';
        return;
    }

    if (sel.source === 'sample') {
        const s = sampleById.get(sel.sampleId);
        if (!s) {
            currentName.textContent = '見つかりません';
            currentNote.textContent = 'サンプルが見つかりません';
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
                currentNote.textContent = '作品が見つかりません';
                currentPreview.src = '';
                return;
            }
            currentName.textContent = asset.name || '作品';
            currentNote.textContent = `自作 / ${asset.width}×${asset.height}`;
            currentPreview.src = assetPreviewDataUrl(asset, 96);
        } catch (e) {
            console.warn('getPixelAsset failed:', e);
            currentName.textContent = '読み込み失敗';
            currentNote.textContent = '作品の読み込みに失敗しました';
            currentPreview.src = '';
        }
        return;
    }

    if (sel.source === 'pokemon') {
        const poke = pokemonData.find(p => p.id === sel.pokemonId);
        if (!poke) {
            currentName.textContent = '見つかりません';
            currentNote.textContent = 'ポケモンが見つかりません';
            currentPreview.src = '';
            return;
        }
        currentName.textContent = poke.name;
        currentNote.textContent = `ポケモン図鑑 / ${poke.typeNames.join('・')}`;
        currentPreview.src = poke.image;
        return;
    }
}

function makeSkinItem({ thumbUrl, name, info, selected, onClick }) {
    const div = document.createElement('div');
    div.className = 'skin-item' + (selected ? ' selected' : '');
    div.tabIndex = 0;
    div.setAttribute('role', 'button');

    const img = document.createElement('img');
    img.className = 'skin-thumb';
    img.alt = name;
    img.src = thumbUrl || '';

    const nameEl = document.createElement('div');
    nameEl.className = 'skin-name';
    nameEl.textContent = name || '-';

    const infoEl = document.createElement('div');
    infoEl.className = 'skin-info';
    infoEl.textContent = info || '';

    div.appendChild(img);
    div.appendChild(nameEl);
    div.appendChild(infoEl);

    div.addEventListener('click', onClick);
    div.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
        }
    });

    return div;
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
        empty.className = 'empty-state';
        empty.textContent = 'サンプルが見つかりませんでした。';
        sampleList.appendChild(empty);
        return;
    }

    filtered.forEach((s) => {
        const pseudo = sampleToPseudoAsset(s);
        const selected = sel?.source === 'sample' && sel.sampleId === String(s.id);
        const row = makeSkinItem({
            thumbUrl: assetPreviewDataUrl(pseudo, 72),
            name: s.name || '(no name)',
            info: `${pseudo.width}×${pseudo.height}`,
            selected,
            onClick: async () => {
                if (!setSelectionSample(s.id)) {
                    alert('保存に失敗しました');
                    return;
                }
                renderSampleList();
                await renderAssetList();
                renderPokemonList();
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
        assetHint.textContent = '自作一覧の読み込みに失敗しました';
        return;
    }

    assetHint.textContent = list.length ? `自分の作品: ${list.length}件` : 'まだ作品がないよ。ドット絵メーカーで作ってみよう！';

    list.forEach((a) => {
        const selected = sel?.source === 'asset' && sel.assetId === a.id;
        const row = makeSkinItem({
            thumbUrl: assetPreviewDataUrl(a, 72),
            name: a.name || '(no name)',
            info: `${a.width}×${a.height}`,
            selected,
            onClick: async () => {
                if (!setSelectionAsset(a.id)) {
                    alert('保存に失敗しました');
                    return;
                }
                renderSampleList();
                await renderAssetList();
                renderPokemonList();
                await updateCurrentUi();
            }
        });
        assetList.appendChild(row);
    });
}

function renderPokemonList() {
    const sel = readSelection();
    const q = String(pokemonSearch?.value || '').trim().toLowerCase();
    const filtered = q
        ? pokemonData.filter(p => p.name.toLowerCase().includes(q) || p.id.includes(q))
        : pokemonData;

    pokemonList.innerHTML = '';
    if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'ポケモンが見つかりませんでした。';
        pokemonList.appendChild(empty);
        return;
    }

    filtered.forEach((poke) => {
        const selected = sel?.source === 'pokemon' && sel.pokemonId === poke.id;
        const row = makeSkinItem({
            thumbUrl: poke.image,
            name: poke.name,
            info: poke.typeNames.join('・'),
            selected,
            onClick: async () => {
                if (!setSelectionPokemon(poke.id)) {
                    alert('保存に失敗しました');
                    return;
                }
                renderSampleList();
                await renderAssetList();
                renderPokemonList();
                await updateCurrentUi();
            }
        });
        pokemonList.appendChild(row);
    });
}

async function boot() {
    renderSampleList();
    await renderAssetList();
    renderPokemonList();
    await updateCurrentUi();

    sampleSearch?.addEventListener('input', () => {
        renderSampleList();
    });

    pokemonSearch?.addEventListener('input', () => {
        renderPokemonList();
    });

    refreshBtn?.addEventListener('click', async () => {
        await renderAssetList();
        await updateCurrentUi();
    });
}

boot();
