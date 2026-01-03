import Phaser from 'phaser';
import { getCurrentPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import { avatarToHtml, escapeHtml } from '../../js/avatar.js';
import {
  assetPreviewDataUrl,
  createEmptyAsset,
  duplicatePixelAsset,
  listPixelAssets,
  pixelsToImageData,
  putPixelAsset,
  hexToRgbaInt
} from '../../js/pixelAssets.js';
import { openPixelArtModal } from '../../js/ui/pixelArtModal.js';

requireAuth();

const player = getCurrentPlayer();
const ownerId = player?.id != null ? String(player.id) : 'unknown';

// Header
const backToPortal = document.getElementById('backToPortal');
backToPortal.href = resolvePath('/pages/portal/portal.html');
const playerPill = document.getElementById('playerPill');
playerPill.innerHTML = `${avatarToHtml(player?.avatar, { size: 18, className: 'portal-avatar', alt: '' })} ${escapeHtml(
  player?.name || 'Player'
)}`;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function createId(prefix = 'aq') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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

function hueRotatePixels(pixels, deg) {
  const out = new Uint32Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    const v = pixels[i] >>> 0;
    out[i] = v === 0 ? 0 : hueRotateRgbaInt(v, deg);
  }
  return out;
}

function makeFishPixels({ w = 32, h = 32, body = '#38bdf8', stripe = '#0ea5e9', outline = '#0b1220', stripeMode = 'double' } = {}) {
  const bodyC = hexToRgbaInt(body) >>> 0;
  const stripeC = hexToRgbaInt(stripe) >>> 0;
  const outlineC = hexToRgbaInt(outline) >>> 0;
  const whiteC = hexToRgbaInt('#ffffff') >>> 0;
  const blackC = hexToRgbaInt('#111827') >>> 0;

  const inside = new Uint8Array(w * h);
  const cx = 14;
  const cy = 16;
  const rx = 9.8;
  const ry = 6.4;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const inBody = dx * dx + dy * dy <= 1;

      // Tail: simple tapering triangle to the right
      const inTail =
        x >= 22 &&
        x <= 30 &&
        Math.abs(y - cy) <= Math.max(0, (30 - x) * 0.65 + 1.2);

      // Small fin on top
      const inFin = x >= 12 && x <= 18 && y >= 9 && y <= 14 && (y - 9) <= (x - 12) * 0.45;

      if (inBody || inTail || inFin) inside[y * w + x] = 1;
    }
  }

  const pixels = new Uint32Array(w * h);
  const idx = (x, y) => y * w + x;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (!inside[i]) continue;

      const isEdge =
        (x > 0 && !inside[idx(x - 1, y)]) ||
        (x < w - 1 && !inside[idx(x + 1, y)]) ||
        (y > 0 && !inside[idx(x, y - 1)]) ||
        (y < h - 1 && !inside[idx(x, y + 1)]);

      if (isEdge) {
        pixels[i] = outlineC;
        continue;
      }

      // Stripe patterns
      if (stripeMode === 'double') {
        if (x >= 10 && x <= 17 && (y === 14 || y === 18)) {
          pixels[i] = stripeC;
          continue;
        }
      } else if (stripeMode === 'single') {
        if (x >= 10 && x <= 18 && y === 16) {
          pixels[i] = stripeC;
          continue;
        }
      } else if (stripeMode === 'clown') {
        if (x >= 10 && x <= 12) {
          pixels[i] = stripeC;
          continue;
        }
        if (x >= 16 && x <= 18) {
          pixels[i] = stripeC;
          continue;
        }
      } else if (stripeMode === 'zebra') {
        if ((x >= 11 && x <= 12) || (x >= 14 && x <= 15) || (x >= 17 && x <= 18)) {
          pixels[i] = stripeC;
          continue;
        }
      }

      pixels[i] = bodyC;
    }
  }

  // Eye (left side)
  pixels[idx(9, 15)] = whiteC;
  pixels[idx(10, 15)] = whiteC;
  pixels[idx(10, 16)] = blackC;

  // Mouth dot
  pixels[idx(6, 17)] = outlineC;

  return pixels;
}

/**
 * @returns {import('../../js/pixelAssets.js').PixelAsset[]}
 */
function buildSampleFishAssets() {
  const w = 32;
  const h = 32;
  const now = new Date().toISOString();
  const mk = (id, name, colors) => {
    const pixels = makeFishPixels({ w, h, ...colors });
    return {
      id: `sample_aquarium_${id}`,
      ownerId,
      name,
      kind: 'character',
      width: w,
      height: h,
      pixels,
      frames: [{ index: 0, width: w, height: h, pixels: new Uint32Array(pixels), durationMs: 120 }],
      version: 1,
      createdAt: now,
      updatedAt: now
    };
  };

  return [
    mk('blue', 'あおいさかな', { body: '#38bdf8', stripe: '#0ea5e9', stripeMode: 'double' }),
    mk('green', 'みどりさかな', { body: '#4ade80', stripe: '#22c55e', stripeMode: 'double' }),
    mk('pink', 'ももいろさかな', { body: '#fb7185', stripe: '#f43f5e', stripeMode: 'double' }),
    mk('gold', 'きんいろさかな', { body: '#fbbf24', stripe: '#f59e0b', stripeMode: 'double' }),
    mk('purple', 'むらさきさかな', { body: '#a78bfa', stripe: '#7c3aed', stripeMode: 'single' }),
    mk('teal', 'みずいろさかな', { body: '#22d3ee', stripe: '#06b6d4', stripeMode: 'single' }),
    mk('clown', 'カクレさかな', { body: '#fb923c', stripe: '#ffffff', stripeMode: 'clown', outline: '#111827' }),
    mk('zebra', 'しましまさかな', { body: '#e5e7eb', stripe: '#111827', stripeMode: 'zebra', outline: '#111827' })
  ];
}

// -----------------------
// Phaser scene
// -----------------------
class AquariumScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AquariumScene' });
    this.fishMap = new Map();
    this.textureCache = new Set();
    this.emptyHint = null;
  }

  create() {
    this.makeBubbleTexture();
    this.spawnBubbles();

    // Subtle light beams
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.06);
    for (let i = 0; i < 6; i++) {
      const x = (this.scale.width / 6) * i + 30;
      g.fillTriangle(x, 0, x + 90, 0, x + 10, this.scale.height);
    }

    this.emptyHint = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'まだ魚がいないよ\n右の「＋」から追加してね', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center'
      })
      .setOrigin(0.5, 0.5)
      .setAlpha(0.85);

    this.scale.on('resize', (gameSize) => {
      const w = Number(gameSize?.width || this.scale.width);
      const h = Number(gameSize?.height || this.scale.height);
      if (this.emptyHint) {
        this.emptyHint.setPosition(w / 2, h / 2);
      }
    });

    this.events.emit('ready');
  }

  makeBubbleTexture() {
    if (this.textures.exists('aq_bubble')) return;
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(12, 12, 8, 0, Math.PI * 2);
    ctx.stroke();
    this.textures.addCanvas('aq_bubble', c);
  }

  spawnBubbles() {
    const bubbles = this.add.group();
    const spawnOne = () => {
      const x = Phaser.Math.Between(10, Math.max(10, this.scale.width - 10));
      const y = this.scale.height + Phaser.Math.Between(10, 120);
      const s = Phaser.Math.FloatBetween(0.25, 0.75);
      const sp = Phaser.Math.FloatBetween(18, 46);
      const b = this.add.image(x, y, 'aq_bubble');
      b.setAlpha(0.75);
      b.setScale(s);
      b.setData('vy', sp);
      b.setData('vx', Phaser.Math.FloatBetween(-8, 8));
      bubbles.add(b);
    };
    for (let i = 0; i < 18; i++) spawnOne();
    this.bubbles = bubbles;

    this.events.on('update', () => {
      const H = this.scale.height;
      bubbles.getChildren().forEach((b) => {
        const vy = b.getData('vy') || 30;
        const vx = b.getData('vx') || 0;
        b.x += vx * 0.016;
        b.y -= vy * 0.016;
        if (b.y < -30) {
          b.x = Phaser.Math.Between(10, Math.max(10, this.scale.width - 10));
          b.y = H + Phaser.Math.Between(10, 120);
          b.setData('vy', Phaser.Math.FloatBetween(18, 46));
          b.setData('vx', Phaser.Math.FloatBetween(-8, 8));
          b.setScale(Phaser.Math.FloatBetween(0.25, 0.75));
        }
      });
    });
  }

  ensureTextureFromAsset(asset, hueDeg) {
    const quant = Math.round((Number(hueDeg) || 0) / 5) * 5;
    const key = `aq_${asset.id}_${quant}`;
    if (this.textures.exists(key)) return key;

    const pixels = quant ? hueRotatePixels(asset.pixels, quant) : asset.pixels;
    const c = document.createElement('canvas');
    c.width = asset.width;
    c.height = asset.height;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.putImageData(pixelsToImageData(pixels, asset.width, asset.height), 0, 0);
    this.textures.addCanvas(key, c);
    this.textureCache.add(key);
    return key;
  }

  upsertFish(fish) {
    const W = this.scale.width;
    const H = this.scale.height;
    const existing = this.fishMap.get(fish.id);
    const asset = fish.asset;
    const tex = this.ensureTextureFromAsset(asset, fish.hueDeg);

    if (!existing) {
      const x = Phaser.Math.Between(40, Math.max(40, W - 40));
      const y = Phaser.Math.Between(40, Math.max(40, H - 40));
      const sprite = this.add.sprite(x, y, tex);
      sprite.setOrigin(0.5, 0.5);
      sprite.setScale(fish.size);
      sprite.setData('seed', Math.random() * 1000);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on('pointerdown', () => {
        this.events.emit('fishTapped', fish.id);
      });

      const obj = {
        fish,
        sprite,
        vx: Phaser.Math.FloatBetween(-40, 40),
        vy: Phaser.Math.FloatBetween(-18, 18),
        t: 0,
        targetX: Phaser.Math.Between(30, Math.max(30, W - 30)),
        targetY: Phaser.Math.Between(30, Math.max(30, H - 30)),
        changeIn: Phaser.Math.FloatBetween(0.8, 2.2)
      };
      this.fishMap.set(fish.id, obj);
      this.setEmptyHintVisible(this.fishMap.size === 0);
      return;
    }

    existing.fish = fish;
    existing.sprite.setTexture(tex);
    existing.sprite.setScale(fish.size);
  }

  removeFish(fishId) {
    const it = this.fishMap.get(fishId);
    if (!it) return;
    it.sprite.destroy();
    this.fishMap.delete(fishId);
    this.setEmptyHintVisible(this.fishMap.size === 0);
  }

  setEmptyHintVisible(on) {
    if (!this.emptyHint) return;
    this.emptyHint.setVisible(Boolean(on));
  }

  pickNextTarget(state) {
    const W = this.scale.width;
    const H = this.scale.height;
    const p = state.fish.personality;
    const margin = 36;

    if (p === 'shy') {
      // corners / edges
      const corners = [
        { x: margin, y: margin },
        { x: W - margin, y: margin },
        { x: margin, y: H - margin },
        { x: W - margin, y: H - margin }
      ];
      const c = corners[Phaser.Math.Between(0, corners.length - 1)];
      return { x: clamp(c.x + Phaser.Math.Between(-40, 40), margin, W - margin), y: clamp(c.y + Phaser.Math.Between(-40, 40), margin, H - margin) };
    }

    if (p === 'calm') {
      return {
        x: Phaser.Math.Between(margin, Math.max(margin, W - margin)),
        y: Phaser.Math.Between(Math.floor(H * 0.25), Math.floor(H * 0.75))
      };
    }

    if (p === 'lazy') {
      return {
        x: Phaser.Math.Between(margin, Math.max(margin, W - margin)),
        y: Phaser.Math.Between(Math.floor(H * 0.45), Math.floor(H * 0.9))
      };
    }

    // energetic
    return { x: Phaser.Math.Between(margin, Math.max(margin, W - margin)), y: Phaser.Math.Between(margin, Math.max(margin, H - margin)) };
  }

  update(_, deltaMs) {
    const dt = clamp(deltaMs / 1000, 0, 0.05);
    const W = this.scale.width;
    const H = this.scale.height;

    this.fishMap.forEach((st) => {
      st.t += dt;
      st.changeIn -= dt;

      const fish = st.fish;
      const sprite = st.sprite;
      const speed = clamp(Number(fish.speed) || 70, 10, 200);

      // Lazy fish sometimes stop
      const isLazyStop = fish.personality === 'lazy' && Math.sin(st.t * 0.9 + (sprite.getData('seed') || 0)) > 0.85;
      const desiredSpeed = isLazyStop ? speed * 0.2 : speed;

      if (st.changeIn <= 0) {
        const next = this.pickNextTarget(st);
        st.targetX = next.x;
        st.targetY = next.y;
        st.changeIn =
          fish.personality === 'energetic'
            ? Phaser.Math.FloatBetween(0.4, 1.2)
            : fish.personality === 'calm'
              ? Phaser.Math.FloatBetween(1.4, 3.0)
              : fish.personality === 'shy'
                ? Phaser.Math.FloatBetween(1.0, 2.4)
                : Phaser.Math.FloatBetween(0.9, 2.2);
      }

      // Steer to target
      const dx = st.targetX - sprite.x;
      const dy = st.targetY - sprite.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      const turn =
        fish.personality === 'energetic'
          ? 3.2
          : fish.personality === 'calm'
            ? 1.4
            : fish.personality === 'shy'
              ? 2.0
              : 1.8;

      st.vx += (nx * desiredSpeed - st.vx) * clamp(turn * dt, 0, 1);
      st.vy += (ny * desiredSpeed * 0.55 - st.vy) * clamp(turn * dt, 0, 1);

      // Slight wander
      const seed = sprite.getData('seed') || 0;
      st.vy += Math.sin((st.t + seed) * 1.6) * 6 * dt;

      sprite.x += st.vx * dt;
      sprite.y += st.vy * dt;

      // Bounds: soft push back
      const pad = 22;
      if (sprite.x < pad) st.vx += (pad - sprite.x) * 2.8 * dt;
      if (sprite.x > W - pad) st.vx -= (sprite.x - (W - pad)) * 2.8 * dt;
      if (sprite.y < pad) st.vy += (pad - sprite.y) * 2.8 * dt;
      if (sprite.y > H - pad) st.vy -= (sprite.y - (H - pad)) * 2.8 * dt;

      sprite.flipX = st.vx < 0;

      // Deform animation (wobble)
      const wobble = Math.sin(st.t * 4.2 + seed) * 0.06;
      const s = clamp(Number(fish.size) || 1, 0.4, 3);
      sprite.setScale(sprite.flipX ? -s : s, s * (1 + wobble));
      sprite.setAngle(wobble * 6);
    });
  }
}

// -----------------------
// UI + state
// -----------------------
const fishListEl = document.getElementById('fishList');
const addSampleBtn = document.getElementById('addSampleBtn');
const addAssetBtn = document.getElementById('addAssetBtn');
const createFishBtn = document.getElementById('createFishBtn');

const selectedInfo = document.getElementById('selectedInfo');
const deleteFishBtn = document.getElementById('deleteFishBtn');
const fishNameInput = document.getElementById('fishNameInput');
const personalitySelect = document.getElementById('personalitySelect');
const speedRange = document.getElementById('speedRange');
const sizeRange = document.getElementById('sizeRange');
const hueRange = document.getElementById('hueRange');
const hueValue = document.getElementById('hueValue');

const pickerModal = document.getElementById('pickerModal');
const pickerTitle = document.getElementById('pickerTitle');
const pickerNote = document.getElementById('pickerNote');
const pickerCloseBtn = document.getElementById('pickerCloseBtn');
const pickerSearchInput = document.getElementById('pickerSearchInput');
const pickerOnly32 = document.getElementById('pickerOnly32');
const pickerGrid = document.getElementById('pickerGrid');

/** @type {AquariumScene|null} */
let scene = null;

/** @type {{id:string, name:string, personality:'calm'|'energetic'|'shy'|'lazy', speed:number, size:number, hueDeg:number, asset:any}[]} */
let fishes = [];
let selectedFishId = null;

const SAMPLE_ASSETS = buildSampleFishAssets();

const MAX_FISH = 48;
const REPRO_TICK_MS = 2400;

function setSelectedFish(id) {
  selectedFishId = id;
  renderFishList();
  renderSelectedForm();
}

function getSelectedFish() {
  return fishes.find((f) => f.id === selectedFishId) || null;
}

function setFormEnabled(on) {
  const dis = !on;
  deleteFishBtn.disabled = dis;
  fishNameInput.disabled = dis;
  personalitySelect.disabled = dis;
  speedRange.disabled = dis;
  sizeRange.disabled = dis;
  hueRange.disabled = dis;
}

function renderSelectedForm() {
  const f = getSelectedFish();
  if (!f) {
    selectedInfo.textContent = 'まだ選ばれていません';
    fishNameInput.value = '';
    personalitySelect.value = 'calm';
    speedRange.value = '70';
    sizeRange.value = '1';
    hueRange.value = '0';
    hueValue.textContent = '0°';
    setFormEnabled(false);
    return;
  }

  selectedInfo.textContent = `ID: ${f.id.slice(0, 8)}… / 素材: ${f.asset?.name || '不明'}`;
  fishNameInput.value = f.name || '';
  personalitySelect.value = f.personality;
  speedRange.value = String(f.speed);
  sizeRange.value = String(f.size);
  hueRange.value = String(Math.round(f.hueDeg));
  hueValue.textContent = `${Math.round(f.hueDeg)}°`;
  setFormEnabled(true);
}

function renderFishList() {
  fishListEl.innerHTML = '';
  if (fishes.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'aq-note';
    empty.style.padding = '10px';
    empty.textContent = 'まだ魚がいません。下のサンプルをタップ（または右上の「＋」）で追加してね。';
    fishListEl.appendChild(empty);

    // Quick add samples (so there is always something selectable)
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
    grid.style.gap = '8px';
    grid.style.padding = '10px';

    SAMPLE_ASSETS.slice(0, 8).forEach((a) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'aq-btn';
      btn.style.display = 'grid';
      btn.style.gridTemplateColumns = '44px 1fr';
      btn.style.alignItems = 'center';
      btn.style.gap = '10px';
      btn.style.padding = '10px';
      btn.style.borderRadius = '14px';
      btn.style.textAlign = 'left';

      const img = document.createElement('img');
      img.alt = '';
      img.src = assetPreviewDataUrl(a, 44);
      img.style.width = '44px';
      img.style.height = '44px';
      img.style.imageRendering = 'pixelated';
      img.style.borderRadius = '12px';
      img.style.border = '1px solid rgba(0,0,0,0.08)';
      img.style.background = 'rgba(0,0,0,0.04)';

      const label = document.createElement('div');
      label.style.fontWeight = '900';
      label.style.whiteSpace = 'nowrap';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.textContent = a.name;

      btn.appendChild(img);
      btn.appendChild(label);
      btn.addEventListener('click', () => {
        void (async () => {
          // Save as "my" asset so it appears in pixel-art-maker too
          const saved = await duplicatePixelAsset(
            { ...a, ownerId, name: `${a.name}（水槽）` },
            { ownerId, name: `${a.name}（水槽）` }
          );
          addFishFromAsset(saved, { name: saved.name });
        })();
      });
      grid.appendChild(btn);
    });
    fishListEl.appendChild(grid);

    return;
  }

  fishes.forEach((f) => {
    const row = document.createElement('div');
    row.className = 'aq-fish-row';
    row.dataset.selected = f.id === selectedFishId ? 'true' : 'false';

    const img = document.createElement('img');
    img.className = 'aq-fish-thumb';
    img.alt = '';
    img.src = assetPreviewDataUrl(f.asset, 48);
    img.style.filter = f.hueDeg ? `hue-rotate(${Math.round(f.hueDeg)}deg)` : '';

    const meta = document.createElement('div');
    meta.className = 'aq-fish-meta';
    meta.innerHTML = `
      <div class="aq-fish-name">${escapeHtml(f.name || 'さかな')}</div>
      <div class="aq-fish-sub">${escapeHtml(f.asset?.name || '')}</div>
    `;

    const chip = document.createElement('div');
    chip.className = 'aq-chip';
    chip.textContent = f.personality === 'energetic' ? 'げんき' : f.personality === 'shy' ? 'びびり' : f.personality === 'lazy' ? 'マイペース' : 'おだやか';

    row.appendChild(img);
    row.appendChild(meta);
    row.appendChild(chip);
    row.addEventListener('click', () => setSelectedFish(f.id));
    fishListEl.appendChild(row);
  });
}

function syncToScene(fish) {
  if (!scene) return;
  scene.upsertFish(fish);
}

function addFishFromAsset(asset, { name, personality, speed, size, hueDeg, select = true } = {}) {
  const fish = {
    id: createId('fish'),
    name: String(name || asset?.name || 'さかな'),
    personality: personality || 'calm',
    speed: clamp(Number(speed ?? 70) || 70, 20, 200),
    size: clamp(Number(size ?? 1) || 1, 0.4, 3),
    hueDeg: clamp(Number(hueDeg ?? 0) || 0, -180, 180),
    asset
  };
  fishes = [fish, ...fishes];
  syncToScene(fish);
  if (select) setSelectedFish(fish.id);
}

function deleteSelectedFish() {
  const f = getSelectedFish();
  if (!f) return;
  if (!confirm(`「${f.name}」を削除しますか？`)) return;
  fishes = fishes.filter((x) => x.id !== f.id);
  scene?.removeFish(f.id);
  selectedFishId = fishes[0]?.id || null;
  renderFishList();
  renderSelectedForm();
}

// Picker modal
let pickerMode = 'samples'; // 'samples' | 'assets'
let pickerItems = []; // {key, name, asset, previewUrl, meta}

function openPicker(mode) {
  pickerMode = mode;
  pickerSearchInput.value = '';
  pickerOnly32.checked = true;
  pickerModal.hidden = false;
  document.body.classList.add('modal-open');
  pickerTitle.textContent = mode === 'samples' ? 'サンプルから追加' : '作品から追加';
  pickerNote.textContent = mode === 'samples' ? 'タップで追加（自分の作品として保存されます）' : 'タップで水槽に追加';
  renderPickerGrid();
}

function closePicker() {
  pickerModal.hidden = true;
  document.body.classList.remove('modal-open');
}

function buildPickerItemsFromSamples() {
  return SAMPLE_ASSETS.map((a) => ({
    key: a.id,
    name: a.name,
    asset: a,
    previewUrl: assetPreviewDataUrl(a, 56),
    meta: `${a.width}×${a.height}`
  }));
}

async function buildPickerItemsFromAssets() {
  const list = await listPixelAssets();
  return (list || []).map((a) => ({
    key: a.id,
    name: a.name,
    asset: a,
    previewUrl: assetPreviewDataUrl(a, 56),
    meta: `${a.width}×${a.height}`
  }));
}

function applyPickerFilters(items) {
  const q = String(pickerSearchInput.value || '').trim().toLowerCase();
  let out = Array.isArray(items) ? items.slice() : [];
  if (pickerOnly32.checked) out = out.filter((it) => Number(it.asset?.width) === 32 && Number(it.asset?.height) === 32);
  if (q) out = out.filter((it) => String(it.name || '').toLowerCase().includes(q));
  return out;
}

function renderPickerGrid() {
  pickerGrid.innerHTML = '';
  const filtered = applyPickerFilters(pickerItems);
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'aq-note';
    empty.textContent = '見つからなかったよ。検索やフィルタを変えてみてね。';
    pickerGrid.appendChild(empty);
    return;
  }

  filtered.slice(0, 120).forEach((it) => {
    const btn = document.createElement('div');
    btn.className = 'aq-picker-item';
    btn.innerHTML = `
      <img alt="" src="${it.previewUrl}" />
      <div>
        <div style="font-weight:900; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(it.name || '(no name)')}</div>
        <div class="aq-note">${escapeHtml(it.meta || '')}</div>
      </div>
    `;
    btn.addEventListener('click', () => {
      void (async () => {
        if (pickerMode === 'samples') {
          // Save as "my" asset so it shows in pixel-art-maker too
          const base = it.asset;
          const saved = await duplicatePixelAsset(
            { ...base, ownerId, name: `${base.name}（水槽）` },
            { ownerId, name: `${base.name}（水槽）` }
          );
          closePicker();
          addFishFromAsset(saved, { name: saved.name });
          return;
        }
        closePicker();
        addFishFromAsset(it.asset, { name: it.asset?.name });
      })();
    });
    pickerGrid.appendChild(btn);
  });
}

// Events
pickerCloseBtn.addEventListener('click', closePicker);
pickerModal.addEventListener('click', (e) => {
  if (e.target === pickerModal) closePicker();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!pickerModal.hidden) closePicker();
});
pickerSearchInput.addEventListener('input', renderPickerGrid);
pickerOnly32.addEventListener('change', renderPickerGrid);

addSampleBtn.addEventListener('click', () => {
  pickerItems = buildPickerItemsFromSamples();
  openPicker('samples');
});

addAssetBtn.addEventListener('click', () => {
  void (async () => {
    pickerItems = await buildPickerItemsFromAssets();
    openPicker('assets');
  })();
});

createFishBtn.addEventListener('click', () => {
  void (async () => {
    const initial = createEmptyAsset({ ownerId, kind: 'character', width: 32, height: 32, name: 'さかな（自作）' });
    const saved = await openPixelArtModal({
      ownerId,
      title: 'さかなをつくる',
      kind: 'character',
      width: 32,
      height: 32,
      name: initial.name,
      initialPixels: initial.pixels,
      showHue: true
    });
    if (!saved) return;
    // Ensure it is saved (openPixelArtModal already saves). But keep a safety upsert if needed.
    try {
      await putPixelAsset(saved);
    } catch {
      // ignore
    }
    addFishFromAsset(saved, { name: saved.name });
  })();
});

deleteFishBtn.addEventListener('click', deleteSelectedFish);

fishNameInput.addEventListener('input', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.name = String(fishNameInput.value || '').slice(0, 40);
  renderFishList();
});

personalitySelect.addEventListener('change', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.personality = /** @type {any} */ (personalitySelect.value || 'calm');
  renderFishList();
  syncToScene(f);
});

speedRange.addEventListener('input', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.speed = clamp(Number(speedRange.value) || 70, 20, 200);
  syncToScene(f);
});

sizeRange.addEventListener('input', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.size = clamp(Number(sizeRange.value) || 1, 0.4, 3);
  syncToScene(f);
});

hueRange.addEventListener('input', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.hueDeg = clamp(Number(hueRange.value) || 0, -180, 180);
  hueValue.textContent = `${Math.round(f.hueDeg)}°`;
  renderFishList();
  syncToScene(f);
});

function focusSelectedInList() {
  const id = selectedFishId;
  if (!id) return;
  const row = fishListEl.querySelector(`.aq-fish-row`);
  // If empty list or quick-add grid, nothing to focus.
  if (!row) return;
  // Scroll the selected row into view (best effort)
  const selected = fishListEl.querySelector(`.aq-fish-row[data-selected='true']`);
  if (selected && typeof selected.scrollIntoView === 'function') {
    selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function randomPersonality() {
  const list = /** @type {const} */ (['calm', 'energetic', 'shy', 'lazy']);
  return list[Math.floor(Math.random() * list.length)];
}

function reproduceTick() {
  if (fishes.length === 0) return;
  if (fishes.length >= MAX_FISH) return;

  // Expected births per tick scales with current population (fast early growth, capped by MAX_FISH).
  const expected = clamp(fishes.length * 0.06, 0, 3.2);
  const base = Math.floor(expected);
  const extra = Math.random() < expected - base ? 1 : 0;
  let births = base + extra;
  births = Math.min(births, Math.max(0, MAX_FISH - fishes.length));

  for (let i = 0; i < births; i++) {
    const parent = fishes[Math.floor(Math.random() * fishes.length)];
    if (!parent?.asset) continue;

    const mutateHue = clamp((Number(parent.hueDeg) || 0) + Phaser.Math.Between(-22, 22), -180, 180);
    const mutateSpeed = clamp((Number(parent.speed) || 70) + Phaser.Math.Between(-10, 14), 20, 200);
    const mutateSize = clamp((Number(parent.size) || 1) + Phaser.Math.FloatBetween(-0.12, 0.14), 0.4, 3);
    const mutatePersonality = Math.random() < 0.78 ? parent.personality : randomPersonality();

    addFishFromAsset(parent.asset, {
      name: `${parent.name || 'さかな'}のこ`,
      personality: mutatePersonality,
      speed: mutateSpeed,
      size: mutateSize,
      hueDeg: mutateHue,
      select: false
    });
  }
}

// -----------------------
// Init Phaser
// -----------------------
const aquariumScene = new AquariumScene();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaserRoot',
  backgroundColor: '#0b3555',
  pixelArt: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [aquariumScene]
});

aquariumScene.events.on('ready', () => {
  scene = aquariumScene;
  renderFishList();
  renderSelectedForm();
  scene.setEmptyHintVisible(fishes.length === 0);
});

aquariumScene.events.on('fishTapped', (fishId) => {
  setSelectedFish(String(fishId));
  renderSelectedForm();
  // Ensure the selected fish is visible in the list
  requestAnimationFrame(() => focusSelectedInList());
});

// Reproduction loop
setInterval(() => {
  try {
    // Do not reproduce while picker modal is open (user is choosing)
    if (!pickerModal.hidden) return;
    reproduceTick();
  } catch (e) {
    console.warn('Reproduction tick failed:', e);
  }
}, REPRO_TICK_MS);

