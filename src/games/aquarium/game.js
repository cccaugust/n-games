import Phaser from 'phaser';
import { getCurrentPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import {
  assetPreviewDataUrl,
  createEmptyAsset,
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
const openCreateFishBtn = document.getElementById('openCreateFishBtn');
const fishPaletteEl = document.getElementById('fishPalette');
const aquariumDropEl = document.getElementById('aquariumDrop');

// Fish edit modal
const fishModal = document.getElementById('fishModal');
const fishModalTitle = document.getElementById('fishModalTitle');
const fishModalSub = document.getElementById('fishModalSub');
const fishModalCloseBtn = document.getElementById('fishModalCloseBtn');
const fishModalDeleteBtn = document.getElementById('fishModalDeleteBtn');
const fishModalPreview = document.getElementById('fishModalPreview');
const fishModalNameInput = document.getElementById('fishModalNameInput');
const fishModalPersonalitySelect = document.getElementById('fishModalPersonalitySelect');
const fishModalHueRange = document.getElementById('fishModalHueRange');
const fishModalHueValue = document.getElementById('fishModalHueValue');

// Make mobile layout stable by exposing topbar height to CSS
const topbarEl = document.querySelector('.aq-topbar');
function updateTopbarHeightVar() {
  const h = Math.max(44, Math.round(topbarEl?.getBoundingClientRect?.().height || 0));
  document.documentElement.style.setProperty('--aq-topbar-h', `${h}px`);
}
updateTopbarHeightVar();
window.addEventListener('resize', () => {
  // Defer to next frame to reflect font/layout changes
  requestAnimationFrame(updateTopbarHeightVar);
});

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

function makeMask(w, h) {
  return new Uint8Array(w * h);
}

function maskIdx(w, x, y) {
  return y * w + x;
}

function fillEllipse(mask, w, h, cx, cy, rx, ry) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) mask[maskIdx(w, x, y)] = 1;
    }
  }
}

function fillRect(mask, w, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= w) continue;
      mask[maskIdx(w, x, y)] = 1;
    }
  }
}

function fillTriangle(mask, w, h, ax, ay, bx, by, cx, cy) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(w - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(h - 1, Math.ceil(Math.max(ay, by, cy)));
  const area = (x1, y1, x2, y2, x3, y3) => (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
  const A = area(ax, ay, bx, by, cx, cy);
  if (A === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a1 = area(x, y, bx, by, cx, cy) / A;
      const a2 = area(ax, ay, x, y, cx, cy) / A;
      const a3 = area(ax, ay, bx, by, x, y) / A;
      if (a1 >= -0.02 && a2 >= -0.02 && a3 >= -0.02) mask[maskIdx(w, x, y)] = 1;
    }
  }
}

function maskToPixels(mask, w, h, { fill = '#60a5fa', outline = '#0b1220' } = {}) {
  const fillC = hexToRgbaInt(fill) >>> 0;
  const outlineC = hexToRgbaInt(outline) >>> 0;
  const pixels = new Uint32Array(w * h);
  const idx = (x, y) => y * w + x;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = idx(x, y);
      if (!mask[i]) continue;
      const isEdge =
        (x > 0 && !mask[idx(x - 1, y)]) ||
        (x < w - 1 && !mask[idx(x + 1, y)]) ||
        (y > 0 && !mask[idx(x, y - 1)]) ||
        (y < h - 1 && !mask[idx(x, y + 1)]);
      pixels[i] = isEdge ? outlineC : fillC;
    }
  }
  return pixels;
}

function setPixel(pixels, w, x, y, hex) {
  if (x < 0 || y < 0) return;
  if (x >= w) return;
  const i = y * w + x;
  if (i < 0 || i >= pixels.length) return;
  pixels[i] = hexToRgbaInt(hex) >>> 0;
}

function makeSeafoodPixels({ type, w = 32, h = 32, body = '#93c5fd', accent = '#60a5fa', outline = '#0b1220' } = {}) {
  const mask = makeMask(w, h);

  if (type === 'shrimp') {
    // Curved segments
    fillEllipse(mask, w, h, 15, 16, 8.2, 5.2);
    fillEllipse(mask, w, h, 19, 15, 6.8, 4.6);
    fillEllipse(mask, w, h, 22, 14, 5.2, 3.8);
    // Tail fan
    fillTriangle(mask, w, h, 27, 14, 31, 16, 27, 18);
    // Head bump + antenna base
    fillEllipse(mask, w, h, 9, 16, 4.4, 3.8);
  } else if (type === 'crab') {
    fillEllipse(mask, w, h, 16, 16, 7.6, 5.8);
    // Claws
    fillEllipse(mask, w, h, 6, 16, 3.2, 2.6);
    fillEllipse(mask, w, h, 26, 16, 3.2, 2.6);
    fillTriangle(mask, w, h, 3, 16, 6, 14, 6, 18);
    fillTriangle(mask, w, h, 29, 16, 26, 14, 26, 18);
    // Legs
    fillRect(mask, w, 9, 21, 10, 24);
    fillRect(mask, w, 13, 22, 14, 25);
    fillRect(mask, w, 18, 22, 19, 25);
    fillRect(mask, w, 22, 21, 23, 24);
  } else if (type === 'octopus') {
    fillEllipse(mask, w, h, 16, 13, 7.2, 6.8);
    // Tentacles
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 2;
      fillRect(mask, w, x, 18, x, 26);
      if (i % 2 === 0) fillRect(mask, w, x + 1, 20, x + 1, 25);
    }
    fillRect(mask, w, 10, 26, 22, 27);
  } else if (type === 'squid') {
    // Mantle + fins
    fillTriangle(mask, w, h, 16, 7, 9, 20, 23, 20);
    fillEllipse(mask, w, h, 11, 12, 3.2, 2.2);
    fillEllipse(mask, w, h, 21, 12, 3.2, 2.2);
    // Arms
    for (let i = 0; i < 6; i++) {
      const x = 11 + i * 2;
      fillRect(mask, w, x, 20, x, 27);
    }
  } else if (type === 'jellyfish') {
    // Dome
    fillEllipse(mask, w, h, 16, 12, 8.0, 6.2);
    // Skirt
    fillRect(mask, w, 9, 15, 23, 16);
    // Tentacles
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 2;
      fillRect(mask, w, x, 17, x, 27);
      if (i % 3 === 0) fillRect(mask, w, x, 22, x + 1, 22);
    }
  } else if (type === 'starfish') {
    // 5-point star: union of triangles
    fillTriangle(mask, w, h, 16, 6, 14, 16, 18, 16);
    fillTriangle(mask, w, h, 8, 12, 16, 14, 12, 18);
    fillTriangle(mask, w, h, 24, 12, 16, 14, 20, 18);
    fillTriangle(mask, w, h, 12, 26, 16, 18, 20, 26);
    fillEllipse(mask, w, h, 16, 16, 5.4, 5.2);
  } else if (type === 'clam') {
    fillEllipse(mask, w, h, 16, 18, 9.2, 6.4);
    fillRect(mask, w, 7, 18, 25, 23);
  } else if (type === 'scallop') {
    // Fan shell
    fillEllipse(mask, w, h, 16, 19, 9.2, 7.2);
    fillTriangle(mask, w, h, 16, 10, 8, 20, 24, 20);
  } else if (type === 'urchin') {
    fillEllipse(mask, w, h, 16, 16, 6.2, 6.2);
    // Spines (simple rays)
    for (let a = 0; a < 12; a++) {
      const ang = (Math.PI * 2 * a) / 12;
      const x = Math.round(16 + Math.cos(ang) * 9);
      const y = Math.round(16 + Math.sin(ang) * 9);
      fillTriangle(mask, w, h, 16, 16, x, y, Math.round(16 + Math.cos(ang) * 7), Math.round(16 + Math.sin(ang) * 7));
    }
  } else if (type === 'lobster') {
    // Body segments
    fillEllipse(mask, w, h, 16, 16, 6.6, 4.8);
    fillEllipse(mask, w, h, 20, 16, 6.0, 4.4);
    fillEllipse(mask, w, h, 23, 16, 4.6, 3.8);
    // Tail
    fillTriangle(mask, w, h, 27, 13, 31, 16, 27, 19);
    // Claws
    fillEllipse(mask, w, h, 8, 15, 3.8, 2.8);
    fillTriangle(mask, w, h, 4, 15, 8, 13, 8, 17);
  } else if (type === 'seahorse') {
    // Simple seahorse: head + belly + curled tail
    fillEllipse(mask, w, h, 14, 12, 4.8, 4.2); // head
    fillEllipse(mask, w, h, 15, 17, 4.8, 6.2); // body
    // Snout
    fillRect(mask, w, 8, 11, 11, 12);
    // Tail curl
    fillEllipse(mask, w, h, 18, 24, 4.4, 3.8);
    fillEllipse(mask, w, h, 20, 22, 3.6, 3.2);
    fillRect(mask, w, 16, 20, 18, 25);
    // Dorsal fin
    fillTriangle(mask, w, h, 18, 16, 22, 18, 18, 20);
  } else if (type === 'puffer') {
    // Round body + spikes
    fillEllipse(mask, w, h, 16, 16, 7.2, 6.8);
    // small tail
    fillTriangle(mask, w, h, 24, 16, 30, 13, 30, 19);
    // spikes rays
    const spikes = [
      [16, 7],
      [10, 9],
      [22, 9],
      [8, 16],
      [24, 12],
      [24, 20],
      [8, 20],
      [16, 25]
    ];
    spikes.forEach(([x, y]) => fillTriangle(mask, w, h, 16, 16, x, y, Math.round((16 + x) / 2), Math.round((16 + y) / 2)));
  } else if (type === 'manta') {
    // Diamond wings + tail
    fillTriangle(mask, w, h, 16, 10, 6, 16, 16, 22);
    fillTriangle(mask, w, h, 16, 10, 26, 16, 16, 22);
    fillEllipse(mask, w, h, 16, 16, 9.4, 5.2);
    fillRect(mask, w, 15, 22, 16, 28); // tail
  } else if (type === 'whaleshark') {
    // Big fish silhouette (like shark) with tail
    fillEllipse(mask, w, h, 14, 16, 9.0, 5.6);
    fillTriangle(mask, w, h, 22, 14, 31, 16, 22, 18);
    // dorsal fin
    fillTriangle(mask, w, h, 14, 9, 16, 12, 12, 12);
    // pectoral fin
    fillTriangle(mask, w, h, 12, 18, 16, 20, 11, 22);
  } else if (type === 'angler') {
    // Chunky fish + lure
    fillEllipse(mask, w, h, 14, 17, 8.6, 5.6);
    fillTriangle(mask, w, h, 21, 15, 30, 17, 21, 19);
    // lure stalk
    fillRect(mask, w, 10, 8, 11, 11);
    fillRect(mask, w, 9, 7, 10, 7);
  } else if (type === 'eel') {
    // Long body, slight wave
    fillRect(mask, w, 6, 15, 26, 17);
    fillRect(mask, w, 10, 13, 24, 14);
    fillRect(mask, w, 10, 18, 24, 19);
    // head
    fillEllipse(mask, w, h, 6, 16, 3.8, 2.8);
    // tail taper
    fillTriangle(mask, w, h, 26, 15, 31, 16, 26, 17);
  } else if (type === 'turtle') {
    // Shell + head + flippers
    fillEllipse(mask, w, h, 16, 16, 7.8, 6.4);
    fillEllipse(mask, w, h, 8, 16, 2.8, 2.4); // head
    fillEllipse(mask, w, h, 12, 10, 3.6, 2.2); // top-left flipper
    fillEllipse(mask, w, h, 20, 10, 3.6, 2.2); // top-right flipper
    fillEllipse(mask, w, h, 12, 22, 3.6, 2.2); // bottom-left flipper
    fillEllipse(mask, w, h, 20, 22, 3.6, 2.2); // bottom-right flipper
    fillTriangle(mask, w, h, 23, 16, 28, 14, 28, 18); // tail nub
  } else if (type === 'dolphin') {
    // Streamlined body + dorsal fin
    fillEllipse(mask, w, h, 16, 16, 9.2, 4.6);
    fillTriangle(mask, w, h, 22, 14, 31, 16, 22, 18);
    fillTriangle(mask, w, h, 16, 10, 18, 13, 14, 13); // dorsal
    // snout
    fillRect(mask, w, 5, 15, 8, 16);
  } else if (type === 'ray') {
    // Stingray (smaller manta-like) with longer tail
    fillTriangle(mask, w, h, 16, 11, 7, 16, 16, 20);
    fillTriangle(mask, w, h, 16, 11, 25, 16, 16, 20);
    fillEllipse(mask, w, h, 16, 15, 8.0, 4.6);
    fillRect(mask, w, 15, 20, 16, 30);
  } else if (type === 'seadragon') {
    // Leafy seadragon-ish: thin body + leaf fins
    fillRect(mask, w, 10, 10, 12, 25);
    fillEllipse(mask, w, h, 12, 10, 3.4, 3.0); // head
    fillTriangle(mask, w, h, 12, 22, 18, 24, 12, 26); // leaf fin right
    fillTriangle(mask, w, h, 10, 16, 4, 18, 10, 20); // leaf fin left
    fillTriangle(mask, w, h, 12, 25, 16, 30, 11, 29); // tail leaf
  } else {
    // Fallback: fish
    return makeFishPixels({ w, h, body, stripe: accent, outline });
  }

  const pixels = maskToPixels(mask, w, h, { fill: body, outline });

  // Accents / details
  if (type === 'shrimp') {
    // Eye + antenna
    setPixel(pixels, w, 9, 14, '#ffffff');
    setPixel(pixels, w, 9, 15, '#111827');
    for (let k = 0; k < 6; k++) setPixel(pixels, w, 6 + k, 12 - Math.floor(k / 2), outline);
    // Segment lines
    const a = accent;
    for (let x = 14; x <= 24; x += 3) {
      setPixel(pixels, w, x, 16, a);
      setPixel(pixels, w, x, 17, a);
    }
  } else if (type === 'crab') {
    setPixel(pixels, w, 13, 14, '#ffffff');
    setPixel(pixels, w, 13, 15, '#111827');
    setPixel(pixels, w, 19, 14, '#ffffff');
    setPixel(pixels, w, 19, 15, '#111827');
    // Shell line
    for (let x = 12; x <= 20; x++) setPixel(pixels, w, x, 18, accent);
  } else if (type === 'octopus') {
    setPixel(pixels, w, 13, 12, '#ffffff');
    setPixel(pixels, w, 13, 13, '#111827');
    setPixel(pixels, w, 18, 12, '#ffffff');
    setPixel(pixels, w, 18, 13, '#111827');
    // Suckers dots
    for (let x = 10; x <= 22; x += 2) {
      setPixel(pixels, w, x, 23, accent);
      if (x % 4 === 0) setPixel(pixels, w, x, 26, accent);
    }
  } else if (type === 'squid') {
    setPixel(pixels, w, 14, 14, '#ffffff');
    setPixel(pixels, w, 14, 15, '#111827');
    setPixel(pixels, w, 18, 14, '#ffffff');
    setPixel(pixels, w, 18, 15, '#111827');
  } else if (type === 'jellyfish') {
    for (let x = 12; x <= 20; x++) setPixel(pixels, w, x, 14, accent);
    setPixel(pixels, w, 14, 11, '#ffffff');
    setPixel(pixels, w, 14, 12, '#111827');
    setPixel(pixels, w, 18, 11, '#ffffff');
    setPixel(pixels, w, 18, 12, '#111827');
  } else if (type === 'starfish') {
    // Dots
    const dots = [
      [16, 12],
      [12, 16],
      [20, 16],
      [16, 20],
      [14, 14],
      [18, 14],
      [14, 18],
      [18, 18]
    ];
    dots.forEach(([x, y]) => setPixel(pixels, w, x, y, accent));
  } else if (type === 'clam' || type === 'scallop') {
    for (let x = 10; x <= 22; x += 2) setPixel(pixels, w, x, 19, accent);
    for (let x = 11; x <= 21; x += 2) setPixel(pixels, w, x, 21, accent);
  } else if (type === 'urchin') {
    setPixel(pixels, w, 14, 16, '#ffffff');
    setPixel(pixels, w, 14, 17, '#111827');
    setPixel(pixels, w, 18, 16, '#ffffff');
    setPixel(pixels, w, 18, 17, '#111827');
  } else if (type === 'lobster') {
    // Segment bands
    for (let x = 14; x <= 25; x += 3) setPixel(pixels, w, x, 16, accent);
    setPixel(pixels, w, 10, 15, '#ffffff');
    setPixel(pixels, w, 10, 16, '#111827');
  } else if (type === 'seahorse') {
    setPixel(pixels, w, 12, 11, '#ffffff');
    setPixel(pixels, w, 12, 12, '#111827');
    // belly highlight
    for (let y = 16; y <= 22; y += 2) setPixel(pixels, w, 14, y, accent);
  } else if (type === 'puffer') {
    setPixel(pixels, w, 12, 15, '#ffffff');
    setPixel(pixels, w, 12, 16, '#111827');
    setPixel(pixels, w, 15, 18, accent);
    setPixel(pixels, w, 18, 14, accent);
  } else if (type === 'manta' || type === 'ray') {
    setPixel(pixels, w, 13, 15, '#ffffff');
    setPixel(pixels, w, 13, 16, '#111827');
    setPixel(pixels, w, 19, 15, '#ffffff');
    setPixel(pixels, w, 19, 16, '#111827');
    // center stripe
    for (let y = 13; y <= 19; y++) setPixel(pixels, w, 16, y, accent);
  } else if (type === 'whaleshark') {
    // spots
    const spots = [
      [10, 15],
      [12, 13],
      [14, 17],
      [16, 14],
      [18, 17],
      [20, 15]
    ];
    spots.forEach(([x, y]) => setPixel(pixels, w, x, y, accent));
    setPixel(pixels, w, 8, 15, '#ffffff');
    setPixel(pixels, w, 8, 16, '#111827');
  } else if (type === 'angler') {
    setPixel(pixels, w, 9, 16, '#ffffff');
    setPixel(pixels, w, 9, 17, '#111827');
    // lure bulb
    setPixel(pixels, w, 8, 7, '#fde68a');
    setPixel(pixels, w, 8, 8, '#f59e0b');
  } else if (type === 'eel') {
    setPixel(pixels, w, 5, 15, '#ffffff');
    setPixel(pixels, w, 5, 16, '#111827');
    // side stripe
    for (let x = 8; x <= 26; x += 2) setPixel(pixels, w, x, 16, accent);
  } else if (type === 'turtle') {
    // shell pattern
    for (let x = 12; x <= 20; x += 2) setPixel(pixels, w, x, 16, accent);
    for (let y = 14; y <= 18; y += 2) setPixel(pixels, w, 16, y, accent);
    setPixel(pixels, w, 7, 15, '#ffffff');
    setPixel(pixels, w, 7, 16, '#111827');
  } else if (type === 'dolphin') {
    setPixel(pixels, w, 9, 15, '#ffffff');
    setPixel(pixels, w, 9, 16, '#111827');
    // belly light
    for (let x = 12; x <= 20; x += 2) setPixel(pixels, w, x, 18, accent);
  } else if (type === 'seadragon') {
    setPixel(pixels, w, 11, 9, '#ffffff');
    setPixel(pixels, w, 11, 10, '#111827');
    // leaf accents
    setPixel(pixels, w, 16, 24, accent);
    setPixel(pixels, w, 6, 19, accent);
  }

  return pixels;
}

/**
 * @returns {import('../../js/pixelAssets.js').PixelAsset[]}
 */
function buildSampleFishAssets() {
  const w = 32;
  const h = 32;
  const now = new Date().toISOString();
  const mk = (id, name, pixels) => {
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
    // fish
    mk('blue', 'あおいさかな', makeFishPixels({ w, h, body: '#38bdf8', stripe: '#0ea5e9', stripeMode: 'double' })),
    mk('green', 'みどりさかな', makeFishPixels({ w, h, body: '#4ade80', stripe: '#22c55e', stripeMode: 'double' })),
    mk('pink', 'ももいろさかな', makeFishPixels({ w, h, body: '#fb7185', stripe: '#f43f5e', stripeMode: 'double' })),
    mk('gold', 'きんいろさかな', makeFishPixels({ w, h, body: '#fbbf24', stripe: '#f59e0b', stripeMode: 'double' })),
    mk('purple', 'むらさきさかな', makeFishPixels({ w, h, body: '#a78bfa', stripe: '#7c3aed', stripeMode: 'single' })),
    mk('teal', 'みずいろさかな', makeFishPixels({ w, h, body: '#22d3ee', stripe: '#06b6d4', stripeMode: 'single' })),
    mk('clown', 'カクレさかな', makeFishPixels({ w, h, body: '#fb923c', stripe: '#ffffff', stripeMode: 'clown', outline: '#111827' })),
    mk('zebra', 'しましまさかな', makeFishPixels({ w, h, body: '#e5e7eb', stripe: '#111827', stripeMode: 'zebra', outline: '#111827' })),

    // seafood (non-fish) ~10
    mk('shrimp', 'えび', makeSeafoodPixels({ type: 'shrimp', w, h, body: '#fb7185', accent: '#f43f5e', outline: '#111827' })),
    mk('crab', 'かに', makeSeafoodPixels({ type: 'crab', w, h, body: '#ef4444', accent: '#fb7185', outline: '#111827' })),
    mk('octopus', 'たこ', makeSeafoodPixels({ type: 'octopus', w, h, body: '#c084fc', accent: '#a855f7', outline: '#111827' })),
    mk('squid', 'いか', makeSeafoodPixels({ type: 'squid', w, h, body: '#e5e7eb', accent: '#94a3b8', outline: '#111827' })),
    mk('jellyfish', 'くらげ', makeSeafoodPixels({ type: 'jellyfish', w, h, body: '#93c5fd', accent: '#60a5fa', outline: '#111827' })),
    mk('starfish', 'ひとで', makeSeafoodPixels({ type: 'starfish', w, h, body: '#fb923c', accent: '#f97316', outline: '#111827' })),
    mk('clam', 'あさり', makeSeafoodPixels({ type: 'clam', w, h, body: '#d1d5db', accent: '#9ca3af', outline: '#111827' })),
    mk('scallop', 'ほたて', makeSeafoodPixels({ type: 'scallop', w, h, body: '#fde68a', accent: '#f59e0b', outline: '#111827' })),
    mk('urchin', 'うに', makeSeafoodPixels({ type: 'urchin', w, h, body: '#111827', accent: '#6b7280', outline: '#0b1220' })),
    mk('lobster', 'ロブスター', makeSeafoodPixels({ type: 'lobster', w, h, body: '#dc2626', accent: '#fb7185', outline: '#111827' })),

    // fun sea creatures ~10
    mk('seahorse', 'タツノオトシゴ', makeSeafoodPixels({ type: 'seahorse', w, h, body: '#fbbf24', accent: '#f59e0b', outline: '#111827' })),
    mk('puffer', 'ハリセンボン', makeSeafoodPixels({ type: 'puffer', w, h, body: '#a3e635', accent: '#65a30d', outline: '#111827' })),
    mk('manta', 'マンタ', makeSeafoodPixels({ type: 'manta', w, h, body: '#94a3b8', accent: '#e2e8f0', outline: '#111827' })),
    mk('ray', 'エイ', makeSeafoodPixels({ type: 'ray', w, h, body: '#64748b', accent: '#cbd5e1', outline: '#111827' })),
    mk('whaleshark', 'ジンベエ', makeSeafoodPixels({ type: 'whaleshark', w, h, body: '#1e40af', accent: '#93c5fd', outline: '#111827' })),
    mk('angler', 'チョウチンアンコウ', makeSeafoodPixels({ type: 'angler', w, h, body: '#111827', accent: '#6b7280', outline: '#0b1220' })),
    mk('eel', 'うつぼ', makeSeafoodPixels({ type: 'eel', w, h, body: '#22c55e', accent: '#bbf7d0', outline: '#111827' })),
    mk('turtle', 'ウミガメ', makeSeafoodPixels({ type: 'turtle', w, h, body: '#16a34a', accent: '#bbf7d0', outline: '#111827' })),
    mk('dolphin', 'イルカ', makeSeafoodPixels({ type: 'dolphin', w, h, body: '#60a5fa', accent: '#dbeafe', outline: '#111827' })),
    mk('seadragon', 'リーフィー', makeSeafoodPixels({ type: 'seadragon', w, h, body: '#34d399', accent: '#a7f3d0', outline: '#111827' }))
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
      .text(this.scale.width / 2, this.scale.height / 2, 'まだ魚がいないよ\n上の魚をタップして追加してね', {
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
      const sx = Number(fish?.spawnX);
      const sy = Number(fish?.spawnY);
      const x = Number.isFinite(sx) ? clamp(sx, 40, Math.max(40, W - 40)) : Phaser.Math.Between(40, Math.max(40, W - 40));
      const y = Number.isFinite(sy) ? clamp(sy, 40, Math.max(40, H - 40)) : Phaser.Math.Between(40, Math.max(40, H - 40));
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

      // NOTE: iOS Safari/WebGL で負の scale を使うと描画が消えることがあるため、
      // 反転は flipX のみで行う（scale は常に正）。
      sprite.flipX = st.vx < 0;

      // Deform animation (wobble)
      const wobble = Math.sin(st.t * 4.2 + seed) * 0.06;
      const s = clamp(Number(fish.size) || 1, 0.4, 3);
      sprite.setScale(s, s * (1 + wobble));
      sprite.setAngle(wobble * 6);
    });
  }
}

// -----------------------
// UI + state
// -----------------------
/** @type {AquariumScene|null} */
let scene = null;

/**
 * @typedef {'calm'|'energetic'|'shy'|'lazy'} Personality
 */

/** @type {{id:string, name:string, personality:Personality, speed:number, size:number, hueDeg:number, asset:any, spawnX?:number, spawnY?:number}[]} */
let fishes = [];

/** @type {string|null} */
let selectedFishId = null;

const SAMPLE_ASSETS = buildSampleFishAssets();
const MAX_FISH = 48;

/** @type {Map<string, any>} */
let paletteMap = new Map();

let toastTimer = null;
function showToast(text) {
  if (!text) return;
  const existing = document.querySelector('.aq-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'aq-toast';
  t.textContent = String(text);
  document.body.appendChild(t);
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.remove();
  }, 1300);
}

function getSelectedFish() {
  return fishes.find((f) => f.id === selectedFishId) || null;
}

function syncToScene(fish) {
  if (!scene) return;
  scene.upsertFish(fish);
}

function removeFromScene(fishId) {
  scene?.removeFish(fishId);
}

function addFishFromAsset(asset, { name, personality, speed, size, hueDeg, spawnX, spawnY, select = true } = {}) {
  if (!asset) {
    showToast('素材が見つからず、追加できませんでした');
    return;
  }
  if (fishes.length >= MAX_FISH) {
    showToast(`魚が多すぎるため追加できません（最大 ${MAX_FISH} 匹）`);
    return;
  }

  const fish = {
    id: createId('fish'),
    name: String(name || asset?.name || 'さかな').slice(0, 40),
    personality: /** @type {Personality} */ (personality || 'calm'),
    speed: clamp(Number(speed ?? 70) || 70, 20, 200),
    size: clamp(Number(size ?? 1) || 1, 0.4, 3),
    hueDeg: clamp(Number(hueDeg ?? 0) || 0, -180, 180),
    asset,
    spawnX: Number.isFinite(Number(spawnX)) ? Number(spawnX) : undefined,
    spawnY: Number.isFinite(Number(spawnY)) ? Number(spawnY) : undefined
  };

  fishes = [fish, ...fishes];
  syncToScene(fish);
  if (select) openFishModal(fish.id);
}

function deleteFishById(fishId) {
  const f = fishes.find((x) => x.id === fishId);
  if (!f) return;
  const label = f.name || 'さかな';
  if (!confirm(`「${label}」を削除しますか？`)) return;
  fishes = fishes.filter((x) => x.id !== fishId);
  removeFromScene(fishId);
  if (selectedFishId === fishId) closeFishModal();
}

function renderFishModal() {
  const f = getSelectedFish();
  if (!f) return;
  fishModalTitle.textContent = f.name || 'さかな';
  fishModalSub.textContent = `性格・色相を変更できます`;

  fishModalPreview.src = assetPreviewDataUrl(f.asset, 96);
  fishModalPreview.style.filter = f.hueDeg ? `hue-rotate(${Math.round(f.hueDeg)}deg)` : '';

  fishModalNameInput.value = String(f.name || '');
  fishModalPersonalitySelect.value = String(f.personality || 'calm');
  fishModalHueRange.value = String(Math.round(Number(f.hueDeg) || 0));
  fishModalHueValue.textContent = `${Math.round(Number(f.hueDeg) || 0)}°`;
}

function openFishModal(fishId) {
  selectedFishId = String(fishId);
  renderFishModal();
  fishModal.hidden = false;
  document.body.classList.add('modal-open');
}

function closeFishModal() {
  fishModal.hidden = true;
  document.body.classList.remove('modal-open');
  selectedFishId = null;
}

function rectPointToLocal(rect, clientX, clientY) {
  const x = clamp(clientX - rect.left, 0, rect.width);
  const y = clamp(clientY - rect.top, 0, rect.height);
  return { x, y };
}

function pickSpawnPointInAquarium() {
  const rect = aquariumDropEl.getBoundingClientRect();
  const margin = 56;
  const x = clamp(rect.width * 0.5 + (Math.random() * 120 - 60), margin, Math.max(margin, rect.width - margin));
  const y = clamp(rect.height * 0.55 + (Math.random() * 120 - 60), margin, Math.max(margin, rect.height - margin));
  return { x, y };
}

async function loadPalette() {
  /** @type {any[]} */
  let assets = [];
  try {
    assets = (await listPixelAssets()) || [];
  } catch (e) {
    console.warn('Failed to list assets:', e);
    assets = [];
  }

  const own = assets
    .filter((a) => Number(a?.width) === 32 && Number(a?.height) === 32)
    .sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')))
    .slice(0, 80);

  const palette = [...SAMPLE_ASSETS, ...own];
  paletteMap = new Map(palette.map((a) => [String(a.id), a]));
  renderPalette(palette);
}

function renderPalette(assets) {
  fishPaletteEl.innerHTML = '';
  assets.forEach((a) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'aq-palette-item';
    btn.setAttribute('aria-label', String(a?.name || 'さかな'));
    btn.title = String(a?.name || 'さかな');
    btn.draggable = false;

    const img = document.createElement('img');
    img.alt = '';
    img.src = assetPreviewDataUrl(a, 40);
    btn.appendChild(img);

    btn.addEventListener('click', () => {
      const { x, y } = pickSpawnPointInAquarium();
      addFishFromAsset(a, { name: a?.name, spawnX: x, spawnY: y, select: false });
      showToast(`${a?.name || 'さかな'} を追加！`);
    });

    fishPaletteEl.appendChild(btn);
  });
}

async function createFishFlow() {
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
  try {
    await putPixelAsset(saved);
  } catch {
    // ignore
  }
  await loadPalette();
  // つくった魚は、とりあえず水槽にも1匹出す
  const rect = aquariumDropEl.getBoundingClientRect();
  addFishFromAsset(saved, { name: saved.name, spawnX: rect.width * 0.5, spawnY: rect.height * 0.5, select: true });
}

// Modal events
fishModalCloseBtn?.addEventListener('click', closeFishModal);
fishModal?.addEventListener('click', (e) => {
  if (e.target === fishModal) closeFishModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (fishModal && !fishModal.hidden) closeFishModal();
});

fishModalDeleteBtn?.addEventListener('click', () => {
  if (!selectedFishId) return;
  deleteFishById(selectedFishId);
});

fishModalNameInput?.addEventListener('input', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.name = String(fishModalNameInput.value || '').slice(0, 40);
  renderFishModal();
});

fishModalPersonalitySelect?.addEventListener('change', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.personality = /** @type {Personality} */ (fishModalPersonalitySelect.value || 'calm');
  syncToScene(f);
  renderFishModal();
});

fishModalHueRange?.addEventListener('input', () => {
  const f = getSelectedFish();
  if (!f) return;
  f.hueDeg = clamp(Number(fishModalHueRange.value) || 0, -180, 180);
  syncToScene(f);
  renderFishModal();
});

// Header actions
openCreateFishBtn?.addEventListener('click', () => {
  void (async () => {
    try {
      await createFishFlow();
    } catch (e) {
      console.warn('Failed to create fish:', e);
      showToast('魚の作成に失敗しました');
    }
  })();
});

// Init palette
void loadPalette();

// -----------------------
// Init Phaser
// -----------------------
const aquariumScene = new AquariumScene();

aquariumScene.events.on('ready', () => {
  scene = aquariumScene;
  scene.setEmptyHintVisible(fishes.length === 0);
  // If fishes were added before Phaser finished booting, sync them now.
  fishes.forEach((f) => syncToScene(f));
});

aquariumScene.events.on('fishTapped', (fishId) => {
  openFishModal(String(fishId));
});

const PHASER_PARENT_ID = 'phaserRoot';

/** @type {Phaser.Game|null} */
let phaserGame = null;
/** @type {ResizeObserver|null} */
let phaserResizeObserver = null;

function getPhaserParentEl() {
  return /** @type {HTMLElement|null} */ (document.getElementById(PHASER_PARENT_ID));
}

function getPhaserParentSize() {
  const el = getPhaserParentEl();
  const rect = el?.getBoundingClientRect?.();
  const w = Math.floor(Number(rect?.width || 0));
  const h = Math.floor(Number(rect?.height || 0));
  return { w, h };
}

async function waitForNonZeroPhaserParentSize({ maxFrames = 90 } = {}) {
  for (let i = 0; i < maxFrames; i++) {
    const { w, h } = getPhaserParentSize();
    if (w >= 8 && h >= 8) return { w, h };
    await new Promise((r) => requestAnimationFrame(r));
  }
  // Fallback: even if size is still 0, try to boot with a safe default.
  return { w: 800, h: 600 };
}

function attachPhaserResizeWatcher() {
  const parentEl = getPhaserParentEl();
  if (!parentEl) return;

  const resizeNow = () => {
    if (!phaserGame) return;
    const { w, h } = getPhaserParentSize();
    if (w >= 8 && h >= 8) {
      // Some mobile browsers don't reliably propagate size changes to Phaser RESIZE.
      phaserGame.scale.resize(w, h);
    }
  };

  // ResizeObserver for iOS Safari / address-bar / safe-area changes.
  if (typeof ResizeObserver !== 'undefined') {
    phaserResizeObserver?.disconnect?.();
    phaserResizeObserver = new ResizeObserver(() => resizeNow());
    phaserResizeObserver.observe(parentEl);
  }

  window.addEventListener('resize', () => requestAnimationFrame(resizeNow), { passive: true });
  window.addEventListener('orientationchange', () => requestAnimationFrame(resizeNow), { passive: true });
}

function showPhaserInitFallback() {
  showToast('水槽の描画に失敗しました（再読み込みしてね）');
  // Fallback message (canvas が作れない端末向け)
  try {
    const wrap = document.getElementById('aquariumDrop');
    if (wrap && !wrap.querySelector('.aq-phaser-fallback')) {
      const msg = document.createElement('div');
      msg.className = 'aq-phaser-fallback';
      msg.textContent = '水槽の描画に失敗しました。ページを再読み込みしてください。';
      msg.style.position = 'absolute';
      msg.style.inset = '0';
      msg.style.display = 'grid';
      msg.style.placeItems = 'center';
      msg.style.padding = '18px';
      msg.style.color = 'rgba(255,255,255,0.92)';
      msg.style.fontWeight = '900';
      msg.style.textAlign = 'center';
      msg.style.background = 'rgba(0,0,0,0.25)';
      wrap.appendChild(msg);
    }
  } catch {
    // ignore
  }
}

async function initPhaser() {
  const parentEl = getPhaserParentEl();
  if (!parentEl) {
    console.warn('Phaser parent element not found:', PHASER_PARENT_ID);
    showPhaserInitFallback();
    return;
  }

  const { w, h } = await waitForNonZeroPhaserParentSize({ maxFrames: 120 });

  try {
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentEl,
      backgroundColor: '#0b3555',
      pixelArt: true,
      antialias: false,
      scale: {
        // `RESIZE` は親要素のサイズ追従が命。初期0サイズ対策で width/height も与える。
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: w,
        height: h
      },
      scene: [aquariumScene]
    });

    attachPhaserResizeWatcher();
  } catch (e) {
    console.warn('Phaser init failed:', e);
    showPhaserInitFallback();
  }
}

// iOS Safari で「初期レイアウト未確定→親が0サイズ→Phaserが0x0固定」になりがちなので、
// 1フレーム待ってから起動（さらに非0サイズ待ちを入れている）。
void (async () => {
  await new Promise((r) => requestAnimationFrame(r));
  await initPhaser();
})();

