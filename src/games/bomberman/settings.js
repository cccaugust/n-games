// ===== Settings & Skin Selection =====

import samplePack from '../../pages/pixel-art-maker/samples.json';

const PLAYER_SKIN_KEY = 'ngames.bomberman.player_skin.v1';
const SOUND_KEY = 'ngames.bomberman.sound.v1';
const CUSTOM_ENEMIES_KEY = 'ngames.bomberman.custom_enemies.v1';

// ===== Local Storage Helpers =====
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

// ===== Pixel Data Helpers =====
export function base64ToArrayBuffer(b64) {
  try {
    const binary = atob(String(b64 || ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return new ArrayBuffer(0);
  }
}

export function decodePixelsB64(b64) {
  try {
    return new Uint32Array(base64ToArrayBuffer(b64));
  } catch {
    return new Uint32Array();
  }
}

export function createImageFromPixels(pixels, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    const idx = i * 4;
    // ARGB format
    data[idx + 0] = (pixel >> 16) & 0xff; // R
    data[idx + 1] = (pixel >> 8) & 0xff;  // G
    data[idx + 2] = pixel & 0xff;         // B
    data[idx + 3] = (pixel >> 24) & 0xff; // A
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ===== Skin Selection =====
export function readSkinSelection() {
  const sel = readJson(PLAYER_SKIN_KEY);
  if (!sel) return null;

  if (sel.source === 'sample' && typeof sel.sampleId === 'string') {
    return { source: 'sample', sampleId: sel.sampleId };
  }
  if (sel.source === 'asset' && typeof sel.assetId === 'string') {
    return { source: 'asset', assetId: sel.assetId };
  }
  if (sel.source === 'pokemon' && typeof sel.pokemonId === 'string') {
    return { source: 'pokemon', pokemonId: sel.pokemonId };
  }
  return null;
}

export function setSkinSample(sampleId) {
  return writeJson(PLAYER_SKIN_KEY, {
    source: 'sample',
    sampleId: String(sampleId),
    at: new Date().toISOString()
  });
}

export function setSkinAsset(assetId) {
  return writeJson(PLAYER_SKIN_KEY, {
    source: 'asset',
    assetId: String(assetId),
    at: new Date().toISOString()
  });
}

export function setSkinPokemon(pokemonId) {
  return writeJson(PLAYER_SKIN_KEY, {
    source: 'pokemon',
    pokemonId: String(pokemonId),
    at: new Date().toISOString()
  });
}

// ===== Load Sprite Data =====
export async function loadSpriteData(selection) {
  if (!selection) return null;

  try {
    if (selection.source === 'sample') {
      const samples = await loadSamples();
      const sample = samples.find(s => s.id === selection.sampleId);
      if (!sample) return null;

      const frames = sample.frames.map(frame => {
        const pixels = decodePixelsB64(frame.pixelsB64);
        const imageData = createImageFromPixels(pixels, sample.width, sample.height);
        return {
          imageData,
          durationMs: frame.durationMs || 100
        };
      });

      return {
        name: sample.name,
        width: sample.width,
        height: sample.height,
        frames
      };
    }

    if (selection.source === 'asset') {
      // Load from IndexedDB
      const { getAssetById } = await import('../../js/pixelAssets.js');
      const asset = await getAssetById(selection.assetId);
      if (!asset) return null;

      const frames = (asset.frames || [{ pixels: asset.pixels, width: asset.width, height: asset.height }]).map(frame => {
        const imageData = createImageFromPixels(
          frame.pixels,
          frame.width || asset.width,
          frame.height || asset.height
        );
        return {
          imageData,
          durationMs: frame.durationMs || 100
        };
      });

      return {
        name: asset.name,
        width: asset.width,
        height: asset.height,
        frames
      };
    }

    if (selection.source === 'pokemon') {
      // Load pokemon image
      const { pokemonData } = await import('../../data/pokemonData.js');
      const pokemon = pokemonData.find(p => p.id === selection.pokemonId);
      if (!pokemon || !pokemon.image) return null;

      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({
            name: pokemon.name,
            width: 32,
            height: 32,
            frames: [{ imageData: img, durationMs: 100 }]
          });
        };
        img.onerror = () => resolve(null);
        img.src = pokemon.image;
      });
    }
  } catch (e) {
    console.error('Failed to load sprite data:', e);
  }

  return null;
}

// ===== Load Samples =====
export async function loadSamples() {
  return samplePack.samples || [];
}

// ===== Sound Settings =====
export function isSoundEnabled() {
  const val = readJson(SOUND_KEY);
  return val !== false; // Default to true
}

export function setSoundEnabled(enabled) {
  return writeJson(SOUND_KEY, enabled);
}

// ===== Custom Enemies =====
export function loadCustomEnemies() {
  return readJson(CUSTOM_ENEMIES_KEY) || [];
}

export function saveCustomEnemies(enemies) {
  return writeJson(CUSTOM_ENEMIES_KEY, enemies);
}

export function saveCustomEnemy(enemy) {
  const enemies = loadCustomEnemies();
  const existingIndex = enemies.findIndex(e => e.id === enemy.id);

  if (existingIndex >= 0) {
    enemies[existingIndex] = enemy;
  } else {
    enemies.push(enemy);
  }

  return saveCustomEnemies(enemies);
}

export function deleteCustomEnemy(enemyId) {
  const enemies = loadCustomEnemies();
  const filtered = enemies.filter(e => e.id !== enemyId);
  return saveCustomEnemies(filtered);
}

// ===== Create Default Enemy =====
export function createNewEnemy() {
  return {
    id: 'custom_' + Date.now(),
    name: '新しい敵',
    speed: 1.0,
    pattern: 'random',
    wallPass: false,
    bombPass: false,
    color: '#ff6b6b',
    points: 100,
    spriteId: null,
    spriteSource: null
  };
}
