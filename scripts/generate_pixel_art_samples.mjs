/**
 * Generate pixel-art-maker sample assets JSON.
 *
 * Output: /workspace/src/pages/pixel-art-maker/samples.json
 *
 * - Pixels: Uint32Array of 0xAARRGGBB (0 = transparent)
 * - Stored as base64 of the underlying ArrayBuffer (little-endian Uint32)
 *
 * Run:
 *   node scripts/generate_pixel_art_samples.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_PATH = path.resolve('src/pages/pixel-art-maker/samples.json');

const rgba = (r, g, b, a = 255) => (((a & 255) << 24) | ((r & 255) << 16) | ((g & 255) << 8) | (b & 255)) >>> 0;
const hex = (h) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(h).trim());
  if (!m) return rgba(0, 0, 0, 255);
  const n = parseInt(m[1], 16);
  return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, 255);
};

function bytesToBase64(bytes) {
  // btoa for Node
  return Buffer.from(bytes).toString('base64');
}

function pixelsToBase64(pixels) {
  return bytesToBase64(new Uint8Array(pixels.buffer));
}

function makeCanvas(w, h) {
  return { w, h, p: new Uint32Array(w * h) };
}

/**
 * Create a canvas from "ASCII art" rows.
 * - '.' or ' ' => transparent
 * - other chars => lookup from colorMap
 * @param {string[]} rows
 * @param {Record<string, number>} colorMap
 */
function makeFromAscii(rows, colorMap) {
  const h = Array.isArray(rows) ? rows.length : 0;
  const w = rows.reduce((m, r) => Math.max(m, String(r).length), 0);
  const c = makeCanvas(w, h);
  for (let y = 0; y < h; y++) {
    const row = String(rows[y] || '');
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.' || ch === ' ') continue;
      const col = colorMap[ch];
      if (col == null) continue;
      setPx(c, x, y, col >>> 0);
    }
  }
  return c;
}

function idx(c, x, y) {
  return y * c.w + x;
}

function inBounds(c, x, y) {
  return x >= 0 && y >= 0 && x < c.w && y < c.h;
}

function setPx(c, x, y, color) {
  if (!inBounds(c, x, y)) return;
  c.p[idx(c, x, y)] = color >>> 0;
}

function getPx(c, x, y) {
  if (!inBounds(c, x, y)) return 0;
  return c.p[idx(c, x, y)] >>> 0;
}

function fillRect(c, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPx(c, x, y, color);
}

function fillCircle(c, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(c, x, y, color);
    }
  }
}

function fillEllipse(c, cx, cy, rx, ry, color) {
  const rx2 = rx * rx;
  const ry2 = ry * ry;
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx * ry2 + dy * dy * rx2 <= rx2 * ry2) setPx(c, x, y, color);
    }
  }
}

function outlineFromFill(c, outlineColor) {
  const next = new Uint32Array(c.p);
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const v = getPx(c, x, y);
      if (v !== 0) continue;
      // empty pixel: if any 4-neighbor is non-empty, outline here
      const n =
        getPx(c, x - 1, y) || getPx(c, x + 1, y) || getPx(c, x, y - 1) || getPx(c, x, y + 1);
      if (n !== 0) next[idx(c, x, y)] = outlineColor >>> 0;
    }
  }
  c.p = next;
}

function addShadow(c, { dx = 1, dy = 1, color = rgba(0, 0, 0, 90) } = {}) {
  // Simple projected shadow for non-transparent pixels.
  const next = new Uint32Array(c.p);
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const v = getPx(c, x, y);
      if (v === 0) continue;
      const tx = x + dx;
      const ty = y + dy;
      if (!inBounds(c, tx, ty)) continue;
      const tIdx = idx(c, tx, ty);
      if ((next[tIdx] >>> 0) === 0) next[tIdx] = color >>> 0;
    }
  }
  c.p = next;
}

const PALETTE = {
  ink: hex('#1b1b2a'),
  shadow: hex('#2b2b44'),
  white: hex('#ffffff'),
  light: hex('#f4f4f4'),
  blue1: hex('#2d6cdf'),
  blue2: hex('#64b5ff'),
  blue3: hex('#bfe8ff'),
  red1: hex('#c0392b'),
  red2: hex('#ff6b6b'),
  orange1: hex('#d35400'),
  orange2: hex('#ffb347'),
  yellow1: hex('#f1c40f'),
  yellow2: hex('#fff1a8'),
  green1: hex('#1f8a4c'),
  green2: hex('#62d26f'),
  green3: hex('#b7f2b0'),
  brown1: hex('#6d3d1f'),
  brown2: hex('#b07b46'),
  brown3: hex('#e0c29c'),
  gray1: hex('#6c7a89'),
  gray2: hex('#aab7c4'),
  gray3: hex('#e6eef7')
};

const ASCII_COLORS = {
  K: PALETTE.ink,
  s: PALETTE.shadow,
  w: PALETTE.white,
  l: PALETTE.light,
  r: PALETTE.red1,
  R: PALETTE.red2,
  o: PALETTE.orange1,
  O: PALETTE.orange2,
  y: PALETTE.yellow1,
  Y: PALETTE.yellow2,
  g: PALETTE.green1,
  G: PALETTE.green2,
  H: PALETTE.green3,
  b: PALETTE.blue1,
  B: PALETTE.blue2,
  C: PALETTE.blue3,
  1: PALETTE.brown1,
  2: PALETTE.brown2,
  3: PALETTE.brown3,
  d: PALETTE.gray1,
  D: PALETTE.gray2,
  E: PALETTE.gray3
};

function makeSlimeBlue() {
  const c = makeCanvas(32, 32);
  fillEllipse(c, 16, 19, 11, 9, PALETTE.blue1);
  fillEllipse(c, 16, 20, 10, 8, PALETTE.blue2);
  fillEllipse(c, 16, 22, 9, 6, PALETTE.blue1);
  // highlight
  fillEllipse(c, 12, 16, 5, 4, PALETTE.blue3);
  // eyes
  fillCircle(c, 12, 20, 2, PALETTE.ink);
  fillCircle(c, 20, 20, 2, PALETTE.ink);
  setPx(c, 11, 19, PALETTE.white);
  setPx(c, 19, 19, PALETTE.white);
  // mouth
  for (let x = 13; x <= 19; x++) setPx(c, x, 24, PALETTE.ink);
  setPx(c, 12, 23, PALETTE.ink);
  setPx(c, 20, 23, PALETTE.ink);
  // ground shadow
  fillEllipse(c, 16, 28, 10, 2, rgba(0, 0, 0, 70));
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeCatOrange() {
  const c = makeCanvas(32, 32);
  // head
  fillEllipse(c, 16, 18, 10, 9, PALETTE.orange2);
  fillEllipse(c, 16, 20, 9, 7, PALETTE.orange1);
  // ears
  fillRect(c, 8, 8, 6, 6, PALETTE.orange2);
  fillRect(c, 18, 8, 6, 6, PALETTE.orange2);
  // inner ears
  fillRect(c, 10, 10, 2, 2, PALETTE.red2);
  fillRect(c, 20, 10, 2, 2, PALETTE.red2);
  // muzzle
  fillEllipse(c, 16, 23, 6, 4, PALETTE.brown3);
  // eyes
  fillRect(c, 11, 17, 3, 3, PALETTE.ink);
  fillRect(c, 18, 17, 3, 3, PALETTE.ink);
  setPx(c, 12, 17, PALETTE.white);
  setPx(c, 19, 17, PALETTE.white);
  // nose + mouth
  setPx(c, 16, 21, PALETTE.red1);
  setPx(c, 15, 22, PALETTE.ink);
  setPx(c, 16, 22, PALETTE.ink);
  setPx(c, 17, 22, PALETTE.ink);
  setPx(c, 15, 23, PALETTE.ink);
  setPx(c, 17, 23, PALETTE.ink);
  // stripes
  for (let x = 10; x <= 12; x++) setPx(c, x, 14, PALETTE.brown1);
  for (let x = 20; x <= 22; x++) setPx(c, x, 14, PALETTE.brown1);
  for (let y = 12; y <= 14; y++) setPx(c, 16, y, PALETTE.brown1);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makePotionRed() {
  const c = makeCanvas(32, 32);
  // bottle
  fillRect(c, 13, 7, 6, 4, PALETTE.gray2); // neck
  fillRect(c, 12, 10, 8, 2, PALETTE.gray3); // lip
  fillEllipse(c, 16, 20, 9, 9, PALETTE.gray2); // glass
  // liquid
  fillEllipse(c, 16, 22, 7, 6, PALETTE.red2);
  fillEllipse(c, 16, 24, 7, 4, PALETTE.red1);
  // highlight
  fillRect(c, 12, 16, 2, 8, PALETTE.gray3);
  // cork
  fillRect(c, 13, 4, 6, 3, PALETTE.brown2);
  fillRect(c, 13, 3, 6, 1, PALETTE.brown1);
  // sparkle
  setPx(c, 23, 14, PALETTE.white);
  setPx(c, 24, 13, PALETTE.white);
  setPx(c, 24, 15, PALETTE.white);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeSword() {
  const c = makeCanvas(32, 32);
  // blade diagonal
  for (let i = 0; i < 18; i++) {
    setPx(c, 8 + i, 22 - i, PALETTE.gray3);
    setPx(c, 9 + i, 22 - i, PALETTE.gray2);
  }
  // edge highlight
  for (let i = 0; i < 16; i++) setPx(c, 8 + i, 21 - i, PALETTE.white);
  // tip
  setPx(c, 26, 4, PALETTE.gray3);
  setPx(c, 27, 4, PALETTE.gray2);
  setPx(c, 27, 5, PALETTE.gray2);
  // guard
  fillRect(c, 10, 20, 10, 2, PALETTE.yellow1);
  fillRect(c, 12, 19, 6, 1, PALETTE.yellow2);
  // handle
  for (let i = 0; i < 8; i++) {
    setPx(c, 14 + (i >> 1), 23 + i, PALETTE.brown2);
    setPx(c, 15 + (i >> 1), 23 + i, PALETTE.brown1);
  }
  // pommel
  fillCircle(c, 20, 30, 2, PALETTE.yellow1);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 60) });
  return c;
}

function makeShield() {
  const c = makeCanvas(32, 32);
  // body
  fillEllipse(c, 16, 16, 10, 11, PALETTE.blue1);
  fillEllipse(c, 16, 17, 9, 10, PALETTE.blue2);
  // bottom point
  for (let y = 18; y <= 28; y++) {
    const span = Math.max(0, 9 - (y - 18));
    for (let x = 16 - span; x <= 16 + span; x++) setPx(c, x, y, PALETTE.blue1);
  }
  // stripe
  fillRect(c, 15, 8, 2, 18, PALETTE.yellow1);
  // emblem
  fillCircle(c, 16, 18, 4, PALETTE.yellow2);
  fillCircle(c, 16, 18, 2, PALETTE.yellow1);
  // rivets
  setPx(c, 9, 12, PALETTE.gray3);
  setPx(c, 23, 12, PALETTE.gray3);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeChest() {
  const c = makeCanvas(32, 32);
  // base
  fillRect(c, 7, 15, 18, 11, PALETTE.brown2);
  fillRect(c, 7, 17, 18, 9, PALETTE.brown1);
  // lid curve
  fillEllipse(c, 16, 14, 10, 6, PALETTE.brown2);
  fillEllipse(c, 16, 15, 9, 5, PALETTE.brown3);
  // bands
  fillRect(c, 8, 18, 16, 2, PALETTE.yellow1);
  fillRect(c, 15, 12, 2, 14, PALETTE.yellow1);
  // lock
  fillRect(c, 14, 19, 4, 4, PALETTE.yellow2);
  fillRect(c, 15, 20, 2, 2, PALETTE.yellow1);
  // wood slats
  for (let y = 17; y <= 25; y += 2) for (let x = 9; x <= 23; x++) setPx(c, x, y, rgba(0, 0, 0, 25));
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeTree() {
  const c = makeCanvas(32, 32);
  // canopy
  fillCircle(c, 12, 14, 7, PALETTE.green2);
  fillCircle(c, 20, 14, 7, PALETTE.green2);
  fillCircle(c, 16, 10, 7, PALETTE.green2);
  fillCircle(c, 16, 16, 8, PALETTE.green1);
  // highlights
  fillCircle(c, 12, 10, 3, PALETTE.green3);
  fillCircle(c, 20, 10, 3, PALETTE.green3);
  // trunk
  fillRect(c, 14, 18, 4, 10, PALETTE.brown2);
  fillRect(c, 15, 20, 2, 8, PALETTE.brown1);
  // ground
  fillEllipse(c, 16, 28, 11, 2, rgba(0, 0, 0, 60));
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeFireball() {
  const c = makeCanvas(32, 32);
  fillCircle(c, 16, 18, 9, PALETTE.orange1);
  fillCircle(c, 16, 18, 7, PALETTE.orange2);
  fillCircle(c, 16, 18, 4, PALETTE.yellow1);
  fillCircle(c, 16, 18, 2, PALETTE.yellow2);
  // flame tail
  for (let i = 0; i < 10; i++) {
    setPx(c, 10 - i, 18 - (i >> 1), PALETTE.orange1);
    setPx(c, 11 - i, 19 - (i >> 1), PALETTE.orange2);
  }
  // sparks
  setPx(c, 24, 10, PALETTE.yellow2);
  setPx(c, 26, 14, PALETTE.yellow1);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 70) });
  return c;
}

function makeCoin() {
  const c = makeCanvas(32, 32);
  fillCircle(c, 16, 16, 10, PALETTE.yellow1);
  fillCircle(c, 16, 16, 8, PALETTE.yellow2);
  // rim shading
  for (let a = 0; a < 360; a += 10) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(16 + Math.cos(rad) * 10);
    const y = Math.round(16 + Math.sin(rad) * 10);
    setPx(c, x, y, PALETTE.orange1);
  }
  // shine
  fillEllipse(c, 13, 13, 3, 5, PALETTE.white);
  // mark
  fillRect(c, 15, 14, 2, 6, PALETTE.orange1);
  fillRect(c, 13, 16, 6, 2, PALETTE.orange1);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeHouse() {
  const c = makeCanvas(32, 32);
  // roof
  for (let y = 6; y <= 16; y++) {
    const span = y - 6;
    for (let x = 16 - span; x <= 16 + span; x++) setPx(c, x, y, PALETTE.red1);
  }
  for (let y = 8; y <= 16; y++) {
    const span = y - 8;
    for (let x = 16 - span; x <= 16 + span; x++) setPx(c, x, y, PALETTE.red2);
  }
  // walls
  fillRect(c, 10, 16, 12, 10, PALETTE.brown3);
  fillRect(c, 10, 18, 12, 8, PALETTE.brown2);
  // door
  fillRect(c, 15, 19, 3, 7, PALETTE.brown1);
  setPx(c, 17, 23, PALETTE.yellow2);
  // window
  fillRect(c, 12, 19, 3, 3, PALETTE.blue3);
  fillRect(c, 12, 19, 3, 1, PALETTE.blue2);
  fillRect(c, 12, 21, 3, 1, PALETTE.blue2);
  // chimney
  fillRect(c, 20, 8, 3, 6, PALETTE.gray1);
  fillRect(c, 20, 8, 3, 2, PALETTE.gray2);
  // ground
  fillEllipse(c, 16, 28, 12, 2, rgba(0, 0, 0, 60));
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeRobot() {
  const c = makeCanvas(32, 32);
  // head
  fillRect(c, 9, 8, 14, 12, PALETTE.gray2);
  fillRect(c, 10, 9, 12, 10, PALETTE.gray3);
  // antenna
  setPx(c, 16, 4, PALETTE.red2);
  fillRect(c, 15, 5, 2, 3, PALETTE.gray2);
  // eyes
  fillRect(c, 12, 12, 3, 3, PALETTE.blue2);
  fillRect(c, 17, 12, 3, 3, PALETTE.blue2);
  setPx(c, 13, 12, PALETTE.white);
  setPx(c, 18, 12, PALETTE.white);
  // mouth grill
  for (let x = 12; x <= 20; x++) {
    if (x % 2 === 0) setPx(c, x, 17, PALETTE.gray1);
    else setPx(c, x, 17, PALETTE.gray2);
  }
  // body
  fillRect(c, 11, 20, 10, 7, PALETTE.blue1);
  fillRect(c, 12, 21, 8, 5, PALETTE.blue2);
  // buttons
  setPx(c, 14, 23, PALETTE.yellow1);
  setPx(c, 16, 23, PALETTE.red2);
  setPx(c, 18, 23, PALETTE.green2);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeStarGem() {
  const c = makeCanvas(32, 32);
  // star
  const Y = PALETTE.yellow2;
  const O = PALETTE.yellow1;
  const I = PALETTE.orange1;
  const pts = [
    [16, 6],
    [19, 13],
    [27, 13],
    [21, 18],
    [23, 26],
    [16, 21],
    [9, 26],
    [11, 18],
    [5, 13],
    [13, 13]
  ];
  // rough fill by triangles to center
  const cx = 16,
    cy = 17;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    // sample along edge and fill toward center
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps);
      const y = Math.round(y0 + ((y1 - y0) * s) / steps);
      const innerSteps = Math.max(Math.abs(cx - x), Math.abs(cy - y), 1);
      for (let t = 0; t <= innerSteps; t++) {
        const ix = Math.round(x + ((cx - x) * t) / innerSteps);
        const iy = Math.round(y + ((cy - y) * t) / innerSteps);
        setPx(c, ix, iy, O);
      }
    }
  }
  // highlight
  fillCircle(c, 13, 14, 3, Y);
  // shade
  for (let y = 18; y <= 26; y++) for (let x = 16; x <= 26; x++) if (getPx(c, x, y)) setPx(c, x, y, I);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 55) });
  return c;
}

// --- 16x16 samples (simple, editable starters) ---
function makeSlimeMini16() {
  const c = makeFromAscii(
    [
      '................',
      '................',
      '....bbbbbb......',
      '...bBBBBBBb.....',
      '..bBCCCCCCBb....',
      '..bBCw..wCBb....',
      '..bBC....CBb....',
      '..bBCCCCCCBb....',
      '..bBBBBBBBBb....',
      '...bBBBBBBb.....',
      '....bbbbbb......',
      '.....s..s.......',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  // ensure outlines look crisp
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeCatFace16() {
  const c = makeFromAscii(
    [
      '................',
      '....o......o....',
      '...ooo....ooo...',
      '..oOOo....oOOo..',
      '..oOOooooooOOo..',
      '..oOOOOOOOOOOo..',
      '..oOOOK..KOOOo..',
      '..oOOO....OOOo..',
      '..oOOO.rr.OOOo..',
      '..oOOO..r.OOOo..',
      '..oOOOOOOOOOOo..',
      '...oOOOOOOOOo...',
      '....ooooooo.....',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeGhost16() {
  const c = makeFromAscii(
    [
      '................',
      '.....lllll......',
      '....lwwwwwl.....',
      '...lwwwwwwwl....',
      '...lwwK..Kwl....',
      '...lww....wl....',
      '...lwwwwwwwl....',
      '..lwwwwwwwwwl...',
      '..lwwwwwwwwwl...',
      '..lwwwwwwwwwl...',
      '..lwwwwwwwwwl...',
      '...lwwwwwwwl....',
      '...lwlwlwlwl....',
      '....l.l.l.l.....',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeChick16() {
  const c = makeFromAscii(
    [
      '................',
      '......yyyy......',
      '....yyYYYYyy....',
      '...yYYYYYYYYy...',
      '...yYYK..KYYy...',
      '...yYY....YYy...',
      '...yYYYooYYYy...',
      '....yYYYYYYy....',
      '.....yYYYYy.....',
      '....yYYYYYYy....',
      '...yYYYYYYYYy...',
      '...yYyYYYYyYy...',
      '....y..yy..y....',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeFrog16() {
  const c = makeFromAscii(
    [
      '................',
      '....GG....GG....',
      '...GHHG..GHHG...',
      '..GHHHHGGHHHHG..',
      '..GHHKHGKGHKHG..',
      '..GHHHHHHHHHHG..',
      '..GHH.... ....G.',
      '..GHH..K.K..HHG.',
      '..GHH.... ....G.',
      '..GHHHHHHHHHHG..',
      '...GHHHHHHHHG...',
      '....GGGGGGGG....',
      '.....s....s.....',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeRobotHead16() {
  const c = makeFromAscii(
    [
      '................',
      '......R.........',
      '.....dDd........',
      '....dEEEd.......',
      '...dEEDDEd......',
      '..dEEDDDDEd.....',
      '..dEDB..BDEd....',
      '..dEDBwwBDEd....',
      '..dEDDDDDDEd....',
      '..dEDdDdDdDEd...',
      '...dEEEEEEEd....',
      '....ddddd.dd....',
      '......s..s......',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

// --- 16x16 enemies (game-ready starters) ---
function makeEnemyBat16() {
  const c = makeFromAscii(
    [
      '................',
      '................',
      '....dddddd......',
      '...dDDddDDd.....',
      '..dDddKKddDd....',
      '..dDddwwddDd....',
      '..dDDDDDDDDd....',
      '.dDDdDDDDdDDd...',
      '.dDDDDDDDDDDd...',
      '..dDDDDDDDDd....',
      '...dDDDDDDd.....',
      '....dDDDDd......',
      '.....d..d.......',
      '....d....d......',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemyGoblin16() {
  const c = makeFromAscii(
    [
      '................',
      '.....GGGG.......',
      '....GHHHHG......',
      '...GHHHHHHG.....',
      '..GHHKHHKHHG....',
      '..GHHHHHHHHG....',
      '..GHHHrrHHHG....',
      '...GHHHHHHG.....',
      '....GGGGGG......',
      '...22222222.....',
      '..221222212.....',
      '..221222212.....',
      '..22222222......',
      '....2....2......',
      '...s......s.....',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemySkeleton16() {
  const c = makeFromAscii(
    [
      '................',
      '......llll......',
      '.....lwwwwl.....',
      '....lwKwwKwl....',
      '....lwwwwwwl....',
      '.....lwwwwl.....',
      '......llll......',
      '.....lwwwwl.....',
      '....lwwwwwwl....',
      '.....lwwwwl.....',
      '....lwwwwwwl....',
      '...lwwlwwlwwl...',
      '....ll....ll....',
      '...l..l..l..l...',
      '...s..s..s..s...',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemyEye16() {
  const c = makeFromAscii(
    [
      '................',
      '.....dddddd.....',
      '....dEEEEEd.....',
      '...dEwwwwwEd....',
      '...dEwBBBwEd....',
      '...dEwBKKwEd....',
      '...dEwBBBwEd....',
      '...dEwwwwwEd....',
      '....dEEEEEd.....',
      '.....dddddd.....',
      '......s..s......',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 55) });
  return c;
}

function makeEnemySlimeRed16() {
  const c = makeFromAscii(
    [
      '................',
      '................',
      '....rrrrrr......',
      '...rRRRRRRr.....',
      '..rRYYYYYYRr....',
      '..rRYw..wYRr....',
      '..rRY....YRr....',
      '..rRYYYYYYRr....',
      '..rRRRRRRRRr....',
      '...rRRRRRRr.....',
      '....rrrrrr......',
      '.....s..s.......',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemyImp16() {
  const c = makeFromAscii(
    [
      '................',
      '....RR....RR....',
      '...RrR....RrR...',
      '....RRRRRRRR....',
      '..RRRrrrrrrRRR..',
      '..RRrKrrrrKrRR..',
      '..RRrrrrrrrrRR..',
      '...RRRrrrrRRR...',
      '....RRRRRRRR....',
      '.....222222.....',
      '....2212212.....',
      '....222222......',
      '.....2..2.......',
      '....2....2......',
      '...s......s.....',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemySpider16() {
  const c = makeFromAscii(
    [
      '................',
      '...d..d..d..d...',
      '..d..d..d..d....',
      '....dddDDddd....',
      '...dDDKKKKDDd...',
      '...dDDwwwwDDd...',
      '...dDDDDDDDDd...',
      '....dDDDDDd.....',
      '.....dDDDd......',
      '....dDDDDDd.....',
      '...dDDDDDDDDd...',
      '..d..d..d..d....',
      '...d..d..d..d...',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 60) });
  return c;
}

function makeEnemyKnight16() {
  const c = makeFromAscii(
    [
      '................',
      '......ddd.......',
      '.....dEEEd......',
      '....dEwKKEd.....',
      '....dEwwwwd.....',
      '.....dDDDD......',
      '....DDyyyyDD....',
      '...DDyDDDDyDD...',
      '..DDyDDDDDDyDD..',
      '..DDyDDDDDDyDD..',
      '...DDyDDDDyDD...',
      '....DDyyyyDD....',
      '.....22..22.....',
      '....22....22....',
      '...s........s...',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemyMushroomBad16() {
  const c = makeFromAscii(
    [
      '................',
      '....RRRRRR......',
      '...RRwwwwRR.....',
      '..RRwwwwwwRR....',
      '..RRwKwwKwwRR....',
      '...RRwwwwRR.....',
      '....RRRRRR......',
      '.....3333.......',
      '....33YY33......',
      '....33YY33......',
      '....33YY33......',
      '.....3333.......',
      '....3..3..3.....',
      '...3.... ..3....',
      '...s......s.....',
      '................'
    ],
    ASCII_COLORS
  );
  // clean up accidental spaces in pattern row
  // (ASCII parser treats space as transparent, so it's fine; keep as-is)
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeEnemySlimePurple16() {
  // Use blue palette as base and tint with shadow/ink for a "poison" feel.
  const c = makeFromAscii(
    [
      '................',
      '................',
      '....bbbbbb......',
      '...bBBBBBBb.....',
      '..bBdddddDBb....',
      '..bBdK..KBDB....',
      '..bBd....dDB....',
      '..bBdddddDBb....',
      '..bBBBBBBBBb....',
      '...bBBBBBBb.....',
      '....bbbbbb......',
      '.....s..s.......',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeHeart16() {
  const c = makeFromAscii(
    [
      '................',
      '....RR..RR......',
      '...RRRRRRRR.....',
      '..RRRRRRRRRR....',
      '..RRRRRRRRRR....',
      '..RRRRRRRRRR....',
      '...RRRRRRRR.....',
      '....RRRRRR......',
      '.....RRRR.......',
      '......RR........',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeStar16() {
  const c = makeFromAscii(
    [
      '................',
      '.......y........',
      '......yyy.......',
      '..y..yyyyy..y...',
      '..yyyyYYYYyyy...',
      '...yyYYYYYyy....',
      '....yYYYYYy.....',
      '..yyyyYYYYyyyy..',
      '...yyYYYYYYYy...',
      '....yyyyyyy.....',
      '.....yyyyy......',
      '......yyy.......',
      '.......y........',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeCoin16() {
  const c = makeFromAscii(
    [
      '................',
      '.....yyyyy......',
      '....yYYYYYy.....',
      '...yYYYYYYYy....',
      '..yYYyyyyyYYy...',
      '..yYYyYYYyYYy...',
      '..yYYyYYYyYYy...',
      '..yYYyyyyyYYy...',
      '...yYYYYYYYy....',
      '....yYYYYYy.....',
      '.....yyyyy......',
      '......s.s.......',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeGemBlue16() {
  const c = makeFromAscii(
    [
      '................',
      '.......b........',
      '......bBb.......',
      '.....bBCBb......',
      '....bBCCCBb.....',
      '...bBCCCCCBb....',
      '..bBCCCCCCCCb...',
      '...bBCCCCCBb....',
      '....bBCCCBb.....',
      '.....bBCBb......',
      '......bBb.......',
      '.......b........',
      '................',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 55) });
  return c;
}

function makePotionGreen16() {
  const c = makeFromAscii(
    [
      '................',
      '.......DDD......',
      '......DEED......',
      '......DEED......',
      '.....DDDDDD.....',
      '.....DllllD.....',
      '....DlGGGGDl....',
      '....DlGGGGDl....',
      '....DlGGGGDl....',
      '.....DGGGGD.....',
      '.....DGGGGD.....',
      '......DDDD......',
      '.......s........',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeKey16() {
  const c = makeFromAscii(
    [
      '................',
      '......yyy.......',
      '.....yYYYy......',
      '.....yY.yy......',
      '......yy........',
      '......y.........',
      '......y.........',
      '..yyyyyyyyy.....',
      '......y..y......',
      '......y..y......',
      '......y.........',
      '......y.........',
      '......s.........',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeBomb16() {
  const c = makeFromAscii(
    [
      '................',
      '.......o........',
      '......oO........',
      '.....oOOo.......',
      '......ddd.......',
      '....ddDDDDd.....',
      '...dDDKKKDDd....',
      '..dDDKdddKDDd...',
      '..dDDKdddKDDd...',
      '..dDDKKKDDDDd...',
      '...dDDDDDDd.....',
      '....ddddd.......',
      '......s...s.....',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 60) });
  return c;
}

function makeMushroom16() {
  const c = makeFromAscii(
    [
      '................',
      '....RRRRRR......',
      '...RRwwwwRR.....',
      '..RRwwwwwwRR....',
      '..RRwwwwwwRR....',
      '...RRwwwwRR.....',
      '....RRRRRR......',
      '.....3333.......',
      '....33YY33......',
      '....33YY33......',
      '....33YY33......',
      '.....3333.......',
      '......s.s.......',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeLeaf16() {
  const c = makeFromAscii(
    [
      '................',
      '.......G........',
      '......GHG.......',
      '.....GHHHG......',
      '....GHHHHHG.....',
      '...GHHGHHHHG....',
      '..GHHHGHGHHHG...',
      '..GHHHHGHHHHG...',
      '...GHHHHHHHG....',
      '....GHHHHHG.....',
      '.....GHHHG......',
      '......GHG.......',
      '.......G........',
      '.......1........',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeTreeMini16() {
  const c = makeFromAscii(
    [
      '................',
      '......GGG.......',
      '.....GHHHG......',
      '....GHHHHHG.....',
      '....GHHGHHG.....',
      '...GHHHHHHHG....',
      '....GHHHHHG.....',
      '......GGG.......',
      '......222.......',
      '......212.......',
      '......212.......',
      '......222.......',
      '.....s....s.....',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeHouseMini16() {
  const c = makeFromAscii(
    [
      '................',
      '.......R........',
      '......RRR.......',
      '.....RRRRR......',
      '....RRRRRRR.....',
      '...RRRRRRRRR....',
      '...333333333....',
      '...322222223....',
      '...322D.D223....',
      '...322D.D223....',
      '...322111223....',
      '...333333333....',
      '.....s....s.....',
      '................',
      '................',
      '................'
    ],
    ASCII_COLORS
  );
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makeTileGrass16() {
  const c = makeFromAscii(
    [
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG',
      'GGGHGGGHGGGHGGGH',
      'GHHGGHHGGHHGGHHG'
    ],
    ASCII_COLORS
  );
  return c;
}

function makeTileWater16() {
  const c = makeFromAscii(
    [
      'BBBBBBBBBBBBBBBB',
      'BBCCCCBBCCCCBBCC',
      'BCCCCBBCCCCBBCCC',
      'BBCCCCBBCCCCBBCC',
      'BBBBBBBBBBBBBBBB',
      'BBCCCCBBCCCCBBCC',
      'BCCCCBBCCCCBBCCC',
      'BBCCCCBBCCCCBBCC',
      'BBBBBBBBBBBBBBBB',
      'BBCCCCBBCCCCBBCC',
      'BCCCCBBCCCCBBCCC',
      'BBCCCCBBCCCCBBCC',
      'BBBBBBBBBBBBBBBB',
      'BBCCCCBBCCCCBBCC',
      'BCCCCBBCCCCBBCCC',
      'BBCCCCBBCCCCBBCC'
    ],
    ASCII_COLORS
  );
  return c;
}

function makeTileStone16() {
  const c = makeFromAscii(
    [
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD',
      'DDDDDDDDDDDDDDDD',
      'DddDDddDDddDDddD'
    ],
    ASCII_COLORS
  );
  return c;
}

function h2(x, y, seed = 0) {
  // Small deterministic hash for texture patterns (0..255).
  const n = (x * 17 + y * 31 + seed * 101 + ((x << 3) ^ (y << 5))) | 0;
  return (n ^ (n >>> 7) ^ (n >>> 13)) & 255;
}

function makeTileDirt16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.brown2);
  // speckles + subtle noise
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 1);
      if (v % 23 === 0) setPx(c, x, y, PALETTE.brown3);
      else if (v % 17 === 0) setPx(c, x, y, PALETTE.brown1);
      else if (v % 29 === 0) setPx(c, x, y, PALETTE.gray2); // small pebble
    }
  }
  // a few darker clumps
  for (let i = 0; i < 10; i++) {
    const x = (h2(i, 7, 9) % 14) + 1;
    const y = (h2(i, 3, 11) % 14) + 1;
    setPx(c, x, y, PALETTE.brown1);
    if (i % 2 === 0) setPx(c, x + 1, y, PALETTE.brown1);
  }
  return c;
}

function makeTileSand16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.yellow2);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 2);
      if (v % 19 === 0) setPx(c, x, y, PALETTE.yellow1);
      else if (v % 31 === 0) setPx(c, x, y, PALETTE.orange2);
    }
  }
  // wind streaks (very subtle)
  for (let y = 2; y < 16; y += 5) {
    for (let x = 0; x < 16; x++) {
      if ((x + y) % 4 === 0) setPx(c, x, y, PALETTE.yellow1);
    }
  }
  return c;
}

function makeTileBrickRed16() {
  const c = makeCanvas(16, 16);
  const mortar = PALETTE.gray3;
  // mortar grid
  fillRect(c, 0, 0, 16, 16, mortar);
  for (let y = 0; y < 16; y++) {
    const row = (y / 4) | 0;
    const innerY = y % 4;
    const offset = (row % 2) * 3; // stagger
    for (let x = 0; x < 16; x++) {
      // leave mortar lines: 1px between bricks + 1px between rows
      const innerX = (x + offset) % 6;
      const isMortar = innerY === 0 || innerX === 0;
      if (isMortar) continue;
      // brick fill with a bit of variation
      const v = h2(x, y, 3);
      const base = v % 9 === 0 ? PALETTE.red2 : PALETTE.red1;
      setPx(c, x, y, base);
      // tiny shadow at bottom-right of brick cells
      if (innerY === 3 && innerX >= 4) setPx(c, x, y, PALETTE.orange1);
    }
  }
  return c;
}

function makeTileWoodPlank16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.brown2);
  // plank seams
  for (let y = 0; y < 16; y++) {
    if (y === 5 || y === 11) for (let x = 0; x < 16; x++) setPx(c, x, y, PALETTE.brown1);
  }
  // wood grain + knots
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 4);
      if (v % 13 === 0) setPx(c, x, y, PALETTE.brown1);
      else if (v % 29 === 0) setPx(c, x, y, PALETTE.brown3);
    }
  }
  // knots
  fillCircle(c, 4, 8, 1, PALETTE.brown1);
  setPx(c, 5, 8, PALETTE.brown3);
  fillCircle(c, 12, 3, 1, PALETTE.brown1);
  setPx(c, 11, 3, PALETTE.brown3);
  // slight highlight on top edge
  for (let x = 0; x < 16; x++) if (x % 3 === 0) setPx(c, x, 0, PALETTE.brown3);
  return c;
}

function makeTileCobble16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.gray2);
  // stones as small blobs
  const stones = [
    [4, 4, 3],
    [12, 5, 3],
    [7, 10, 3],
    [2, 12, 2],
    [14, 12, 2]
  ];
  for (const [cx, cy, r] of stones) {
    fillCircle(c, cx, cy, r, PALETTE.gray2);
    // shadow edge
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if (!inBounds(c, x, y)) continue;
        if (getPx(c, x, y) === 0) continue;
        if ((x - cx) + (y - cy) > r - 1) setPx(c, x, y, PALETTE.gray1);
      }
    }
    // highlight
    setPx(c, cx - 1, cy - 1, PALETTE.gray3);
    setPx(c, cx, cy - 2, PALETTE.gray3);
  }
  // cracks between stones
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 5);
      if (v % 37 === 0) setPx(c, x, y, PALETTE.gray1);
    }
  }
  return c;
}

function makeTileMetalPlate16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.gray2);
  // beveled frame
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, PALETTE.gray3);
    setPx(c, x, 1, PALETTE.gray3);
    setPx(c, x, 15, PALETTE.gray1);
  }
  for (let y = 0; y < 16; y++) {
    setPx(c, 0, y, PALETTE.gray3);
    setPx(c, 1, y, PALETTE.gray3);
    setPx(c, 15, y, PALETTE.gray1);
  }
  // rivets
  const rivets = [
    [3, 3],
    [12, 3],
    [3, 12],
    [12, 12]
  ];
  for (const [x, y] of rivets) {
    setPx(c, x, y, PALETTE.gray3);
    setPx(c, x + 1, y + 1, PALETTE.gray1);
  }
  // subtle scratches
  for (let i = 0; i < 10; i++) {
    const x = (h2(i, 1, 6) % 12) + 2;
    const y = (h2(i, 2, 7) % 12) + 2;
    setPx(c, x, y, PALETTE.gray3);
    if (i % 3 === 0) setPx(c, x + 1, y, PALETTE.gray1);
  }
  return c;
}

function makeTileLava16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.orange1);
  // hot veins
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 8);
      if (v % 11 === 0) setPx(c, x, y, PALETTE.orange2);
      if (v % 23 === 0) setPx(c, x, y, PALETTE.yellow1);
      if (v % 41 === 0) setPx(c, x, y, PALETTE.yellow2);
    }
  }
  // crust lines (darker)
  for (let y = 2; y < 16; y += 5) {
    for (let x = 0; x < 16; x++) if ((x * 3 + y) % 7 === 0) setPx(c, x, y, PALETTE.red1);
  }
  return c;
}

function makeTileIce16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.blue3);
  // shading
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 10);
      if (v % 17 === 0) setPx(c, x, y, PALETTE.blue2);
      if (v % 29 === 0) setPx(c, x, y, PALETTE.white);
    }
  }
  // cracks
  const crack = [
    [2, 3],
    [4, 4],
    [6, 6],
    [8, 7],
    [10, 9],
    [12, 10],
    [13, 12]
  ];
  for (const [x, y] of crack) {
    setPx(c, x, y, PALETTE.white);
    if (inBounds(c, x + 1, y)) setPx(c, x + 1, y, PALETTE.blue2);
    if (inBounds(c, x, y + 1)) setPx(c, x, y + 1, PALETTE.blue2);
  }
  // edge tint
  for (let x = 0; x < 16; x++) {
    if (x % 2 === 0) setPx(c, x, 0, PALETTE.blue2);
    if (x % 3 === 0) setPx(c, x, 15, PALETTE.blue2);
  }
  return c;
}

function makeTileGrassBlock16() {
  const c = makeCanvas(16, 16);
  // top grass
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 12);
      const col = v % 7 === 0 ? PALETTE.green3 : v % 3 === 0 ? PALETTE.green2 : PALETTE.green1;
      setPx(c, x, y, col);
    }
  }
  // dirt body
  for (let y = 6; y < 16; y++) {
    for (let x = 0; x < 16; x++) setPx(c, x, y, PALETTE.brown2);
  }
  // transition edge with a bit of jaggedness
  for (let x = 0; x < 16; x++) {
    const bump = h2(x, 0, 13) % 3; // 0..2
    for (let k = 0; k < bump; k++) setPx(c, x, 6 + k, PALETTE.green1);
    setPx(c, x, 6, PALETTE.brown1);
  }
  // dirt texture + pebbles
  for (let y = 7; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 14);
      if (v % 17 === 0) setPx(c, x, y, PALETTE.brown1);
      else if (v % 23 === 0) setPx(c, x, y, PALETTE.brown3);
      else if (v % 41 === 0) setPx(c, x, y, PALETTE.gray2);
    }
  }
  return c;
}

function makeTileSpikes16() {
  const c = makeCanvas(16, 16);
  // stone base
  fillRect(c, 0, 0, 16, 16, PALETTE.gray2);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (h2(x, y, 15) % 23 === 0) setPx(c, x, y, PALETTE.gray1);
  // spikes (3 triangles)
  const spikeXs = [3, 8, 13];
  for (const cx of spikeXs) {
    for (let h = 0; h < 7; h++) {
      const y = 15 - h;
      for (let x = cx - h; x <= cx + h; x++) {
        if (!inBounds(c, x, y)) continue;
        setPx(c, x, y, h <= 1 ? PALETTE.white : PALETTE.gray3);
      }
      // shadow edge
      if (inBounds(c, cx + h, y)) setPx(c, cx + h, y, PALETTE.gray1);
    }
    // outline base
    if (inBounds(c, cx, 15)) setPx(c, cx, 15, PALETTE.shadow);
  }
  // top outline band for readability
  for (let x = 0; x < 16; x++) setPx(c, x, 8, PALETTE.shadow);
  return c;
}

// --- Block-world ("craft") vibe tiles/items ---
function makeTileStoneSmooth16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.gray2);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 21);
      if (v % 37 === 0) setPx(c, x, y, PALETTE.gray1);
      else if (v % 41 === 0) setPx(c, x, y, PALETTE.gray3);
    }
  }
  // subtle bevel so blocks read well
  for (let x = 0; x < 16; x++) setPx(c, x, 0, PALETTE.gray3);
  for (let y = 0; y < 16; y++) setPx(c, 0, y, PALETTE.gray3);
  for (let x = 0; x < 16; x++) setPx(c, x, 15, PALETTE.gray1);
  for (let y = 0; y < 16; y++) setPx(c, 15, y, PALETTE.gray1);
  return c;
}

function makeOreOnStone16(oreColor1, oreColor2, seed = 0) {
  const c = makeTileStoneSmooth16();
  // ore clusters (2-tone)
  for (let y = 1; y < 15; y++) {
    for (let x = 1; x < 15; x++) {
      const v = h2(x, y, 50 + seed);
      if (v % 19 === 0 || (v % 23 === 0 && h2(x + 1, y - 1, 51 + seed) % 5 === 0)) {
        setPx(c, x, y, oreColor1);
        if (h2(x, y, 52 + seed) % 3 === 0) setPx(c, x + 1, y, oreColor2);
      }
    }
  }
  return c;
}

function makeTileOreCoal16() {
  return makeOreOnStone16(PALETTE.ink, PALETTE.shadow, 1);
}
function makeTileOreIron16() {
  return makeOreOnStone16(PALETTE.orange2, PALETTE.yellow1, 2);
}
function makeTileOreGold16() {
  return makeOreOnStone16(PALETTE.yellow1, PALETTE.yellow2, 3);
}
function makeTileOreGemBlue16() {
  return makeOreOnStone16(PALETTE.blue1, PALETTE.blue2, 4);
}
function makeTileOreRed16() {
  return makeOreOnStone16(PALETTE.red1, PALETTE.red2, 5);
}

function makeTileLogOakSide16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.brown2);
  // vertical grain stripes
  for (let x = 0; x < 16; x++) {
    const stripe = x % 4 === 0 || x % 7 === 0;
    for (let y = 0; y < 16; y++) {
      const v = h2(x, y, 31);
      if (stripe && v % 3 === 0) setPx(c, x, y, PALETTE.brown1);
      else if (!stripe && v % 29 === 0) setPx(c, x, y, PALETTE.brown3);
    }
  }
  // bark edge darker
  for (let y = 0; y < 16; y++) {
    setPx(c, 0, y, PALETTE.brown1);
    setPx(c, 15, y, PALETTE.brown1);
  }
  // tiny knots
  fillCircle(c, 6, 10, 1, PALETTE.brown1);
  setPx(c, 6, 10, PALETTE.brown3);
  fillCircle(c, 11, 5, 1, PALETTE.brown1);
  setPx(c, 11, 5, PALETTE.brown3);
  return c;
}

function makeTileLogOakTop16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.brown3);
  // ring
  fillEllipse(c, 8, 8, 6, 6, PALETTE.brown2);
  fillEllipse(c, 8, 8, 4, 4, PALETTE.brown1);
  fillEllipse(c, 8, 8, 2, 2, PALETTE.brown2);
  // small ring noise
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 32);
      if (v % 37 === 0) setPx(c, x, y, PALETTE.brown1);
    }
  }
  // border
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, PALETTE.brown1);
    setPx(c, x, 15, PALETTE.brown1);
  }
  for (let y = 0; y < 16; y++) {
    setPx(c, 0, y, PALETTE.brown1);
    setPx(c, 15, y, PALETTE.brown1);
  }
  return c;
}

function makeTileLeaves16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.green2);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 33);
      if (v % 11 === 0) setPx(c, x, y, PALETTE.green3);
      else if (v % 19 === 0) setPx(c, x, y, PALETTE.green1);
      // small holes (transparent)
      if (v % 47 === 0) setPx(c, x, y, 0);
    }
  }
  return c;
}

function makeTileGlass16() {
  const c = makeCanvas(16, 16);
  // glass tint
  fillRect(c, 0, 0, 16, 16, rgba(190, 232, 255, 90));
  // frame
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, rgba(190, 232, 255, 140));
    setPx(c, x, 15, rgba(190, 232, 255, 140));
  }
  for (let y = 0; y < 16; y++) {
    setPx(c, 0, y, rgba(190, 232, 255, 140));
    setPx(c, 15, y, rgba(190, 232, 255, 140));
  }
  // shine
  for (let i = 0; i < 10; i++) {
    const x = (h2(i, 1, 34) % 12) + 2;
    const y = (h2(i, 2, 35) % 12) + 2;
    if ((x + y) % 3 === 0) setPx(c, x, y, rgba(255, 255, 255, 140));
  }
  // diagonal highlight
  for (let i = 2; i < 14; i++) setPx(c, i, i - 1, rgba(255, 255, 255, 120));
  return c;
}

function makeTileObsidian16() {
  const c = makeCanvas(16, 16);
  // dark base
  fillRect(c, 0, 0, 16, 16, PALETTE.ink);
  // purple-ish specks using blue/shadow
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 36);
      if (v % 23 === 0) setPx(c, x, y, PALETTE.shadow);
      else if (v % 41 === 0) setPx(c, x, y, PALETTE.blue1);
      else if (v % 53 === 0) setPx(c, x, y, PALETTE.blue2);
    }
  }
  // bevel
  for (let x = 0; x < 16; x++) setPx(c, x, 0, PALETTE.shadow);
  for (let y = 0; y < 16; y++) setPx(c, 0, y, PALETTE.shadow);
  return c;
}

function makeTileCraftingTableTop16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.brown2);
  // grid lines (top)
  for (let x = 0; x < 16; x++) {
    if (x % 5 === 0) for (let y = 0; y < 16; y++) setPx(c, x, y, PALETTE.brown1);
  }
  for (let y = 0; y < 16; y++) {
    if (y % 5 === 0) for (let x = 0; x < 16; x++) setPx(c, x, y, PALETTE.brown1);
  }
  // corner screws (tiny)
  setPx(c, 2, 2, PALETTE.gray3);
  setPx(c, 13, 2, PALETTE.gray3);
  setPx(c, 2, 13, PALETTE.gray3);
  setPx(c, 13, 13, PALETTE.gray3);
  // highlight
  for (let x = 1; x < 15; x += 3) setPx(c, x, 1, PALETTE.brown3);
  return c;
}

function makeTileFurnaceFront16() {
  const c = makeCanvas(16, 16);
  fillRect(c, 0, 0, 16, 16, PALETTE.gray2);
  // blocks seams
  for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) setPx(c, x, y, PALETTE.gray1);
  for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y++) setPx(c, x, y, PALETTE.gray1);
  // mouth (dark)
  fillRect(c, 4, 9, 8, 4, PALETTE.ink);
  // inner glow
  fillRect(c, 5, 10, 6, 2, PALETTE.orange2);
  fillRect(c, 6, 10, 4, 1, PALETTE.yellow2);
  // top vent
  fillRect(c, 5, 4, 6, 2, PALETTE.gray1);
  // bevel
  for (let x = 0; x < 16; x++) setPx(c, x, 0, PALETTE.gray3);
  for (let y = 0; y < 16; y++) setPx(c, 0, y, PALETTE.gray3);
  for (let x = 0; x < 16; x++) setPx(c, x, 15, PALETTE.gray1);
  for (let y = 0; y < 16; y++) setPx(c, 15, y, PALETTE.gray1);
  return c;
}

function makeItemTorch16() {
  const c = makeCanvas(16, 16);
  // handle
  for (let i = 0; i < 8; i++) {
    const x = 7 + (i >> 2);
    const y = 14 - i;
    setPx(c, x, y, PALETTE.brown2);
    setPx(c, x + 1, y, PALETTE.brown1);
  }
  // flame
  fillCircle(c, 8, 4, 2, PALETTE.yellow1);
  fillCircle(c, 8, 5, 2, PALETTE.orange2);
  setPx(c, 8, 3, PALETTE.yellow2);
  // outline (simple)
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 45) });
  return c;
}

function makeItemPickaxe16() {
  const c = makeCanvas(16, 16);
  // handle diagonal
  for (let i = 0; i < 9; i++) {
    setPx(c, 5 + i, 13 - i, PALETTE.brown2);
    if (i % 2 === 0) setPx(c, 5 + i, 14 - i, PALETTE.brown1);
  }
  // head
  for (let i = 0; i < 6; i++) {
    setPx(c, 8 - i, 6 + (i >> 1), PALETTE.gray3);
    setPx(c, 8 + i, 6 + (i >> 1), PALETTE.gray3);
  }
  for (let i = 0; i < 4; i++) setPx(c, 8, 6 + i, PALETTE.gray2);
  // highlight
  setPx(c, 6, 6, PALETTE.white);
  setPx(c, 10, 6, PALETTE.white);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 50) });
  return c;
}

function makeItemApple16() {
  const c = makeCanvas(16, 16);
  fillCircle(c, 8, 9, 5, PALETTE.red2);
  fillCircle(c, 8, 10, 5, PALETTE.red1);
  // shine
  fillCircle(c, 6, 7, 2, PALETTE.white);
  setPx(c, 7, 9, PALETTE.red2);
  // stem + leaf
  fillRect(c, 7, 3, 2, 2, PALETTE.brown1);
  setPx(c, 10, 4, PALETTE.green2);
  setPx(c, 11, 4, PALETTE.green2);
  setPx(c, 11, 5, PALETTE.green3);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 45) });
  return c;
}

// --- Retro platformer vibe (Mario-like without using any copyrighted characters) ---
function makePlTileBrickOrange16() {
  const c = makeCanvas(16, 16);
  const brick = PALETTE.orange2;
  const brickDark = PALETTE.orange1;
  const mortar = PALETTE.brown3;
  fillRect(c, 0, 0, 16, 16, mortar);
  for (let y = 0; y < 16; y++) {
    const row = (y / 4) | 0;
    const innerY = y % 4;
    const offset = (row % 2) * 3;
    for (let x = 0; x < 16; x++) {
      const innerX = (x + offset) % 6;
      const isMortar = innerY === 0 || innerX === 0;
      if (isMortar) continue;
      const v = h2(x, y, 61);
      const base = v % 7 === 0 ? brickDark : brick;
      setPx(c, x, y, base);
      if (innerY === 3 && innerX >= 4) setPx(c, x, y, PALETTE.brown1);
      if (innerY === 1 && innerX === 2) setPx(c, x, y, PALETTE.orange1);
    }
  }
  // crisp outline/border helps in platformers
  for (let x = 0; x < 16; x++) setPx(c, x, 0, PALETTE.brown1);
  for (let y = 0; y < 16; y++) setPx(c, 0, y, PALETTE.brown1);
  return c;
}

function makePlTileCoinBlock16() {
  const c = makeCanvas(16, 16);
  const base = PALETTE.yellow1;
  const hi = PALETTE.yellow2;
  const edge = PALETTE.orange1;
  fillRect(c, 0, 0, 16, 16, base);
  // bevel
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, hi);
    setPx(c, x, 1, hi);
    setPx(c, x, 15, edge);
  }
  for (let y = 0; y < 16; y++) {
    setPx(c, 0, y, hi);
    setPx(c, 1, y, hi);
    setPx(c, 15, y, edge);
  }
  // center coin emboss (no question mark)
  fillCircle(c, 8, 8, 4, hi);
  fillCircle(c, 8, 8, 3, base);
  // rivet dots
  setPx(c, 3, 3, hi);
  setPx(c, 12, 3, hi);
  setPx(c, 3, 12, hi);
  setPx(c, 12, 12, hi);
  // tiny shine
  setPx(c, 6, 6, PALETTE.white);
  setPx(c, 7, 6, PALETTE.white);
  return c;
}

function makePlTilePipeGreen16() {
  const c = makeCanvas(16, 16);
  // body
  fillRect(c, 0, 0, 16, 16, PALETTE.green1);
  // rim (top band)
  fillRect(c, 0, 0, 16, 5, PALETTE.green2);
  fillRect(c, 0, 4, 16, 1, PALETTE.green1);
  // inner opening hint
  fillRect(c, 3, 1, 10, 3, PALETTE.shadow);
  fillRect(c, 4, 2, 8, 1, rgba(0, 0, 0, 80));
  // side highlight/shade
  for (let y = 0; y < 16; y++) {
    setPx(c, 3, y, PALETTE.green3);
    setPx(c, 4, y, PALETTE.green2);
    setPx(c, 11, y, PALETTE.green1);
    setPx(c, 12, y, PALETTE.shadow);
  }
  // border
  for (let x = 0; x < 16; x++) setPx(c, x, 15, PALETTE.shadow);
  return c;
}

function makePlTileCloud16() {
  const c = makeCanvas(16, 16);
  // transparent background
  // puffs
  fillCircle(c, 5, 9, 4, PALETTE.white);
  fillCircle(c, 9, 8, 5, PALETTE.white);
  fillCircle(c, 12, 10, 3, PALETTE.white);
  fillCircle(c, 4, 12, 3, PALETTE.white);
  // underside shade
  for (let y = 10; y < 16; y++) for (let x = 0; x < 16; x++) if (getPx(c, x, y)) setPx(c, x, y, PALETTE.light);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makePlTileBush16() {
  const c = makeCanvas(16, 16);
  // transparent background
  fillCircle(c, 5, 10, 5, PALETTE.green2);
  fillCircle(c, 10, 10, 5, PALETTE.green2);
  fillCircle(c, 8, 7, 4, PALETTE.green2);
  // highlights
  fillCircle(c, 4, 8, 2, PALETTE.green3);
  fillCircle(c, 11, 8, 2, PALETTE.green3);
  // shade base
  for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) if (getPx(c, x, y)) setPx(c, x, y, PALETTE.green1);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makePlTileGroundGrass16() {
  const c = makeCanvas(16, 16);
  // sky is transparent; this is meant as a solid ground tile
  // grass top
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, PALETTE.green3);
    setPx(c, x, 1, (x % 3 === 0 ? PALETTE.green2 : PALETTE.green3));
    setPx(c, x, 2, PALETTE.green1);
  }
  // dirt body
  fillRect(c, 0, 3, 16, 13, PALETTE.brown2);
  for (let y = 3; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 62);
      if (v % 17 === 0) setPx(c, x, y, PALETTE.brown1);
      else if (v % 29 === 0) setPx(c, x, y, PALETTE.brown3);
    }
  }
  // little grass teeth into dirt
  for (let x = 0; x < 16; x++) {
    if (h2(x, 0, 63) % 5 === 0) setPx(c, x, 3, PALETTE.green1);
  }
  return c;
}

function makePlTileOneWayPlatform16() {
  const c = makeCanvas(16, 16);
  // transparent background; platform strip in middle
  fillRect(c, 0, 7, 16, 4, PALETTE.brown2);
  // top highlight
  for (let x = 0; x < 16; x++) setPx(c, x, 7, PALETTE.brown3);
  // underside shadow
  for (let x = 0; x < 16; x++) setPx(c, x, 10, PALETTE.brown1);
  // arrows
  for (let x = 2; x < 16; x += 5) {
    setPx(c, x, 8, PALETTE.yellow2);
    setPx(c, x + 1, 8, PALETTE.yellow2);
    setPx(c, x + 2, 8, PALETTE.yellow2);
    setPx(c, x + 1, 9, PALETTE.yellow1);
  }
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makePlItemFlag16() {
  const c = makeCanvas(16, 16);
  // pole
  for (let y = 1; y < 16; y++) setPx(c, 4, y, PALETTE.gray2);
  setPx(c, 4, 0, PALETTE.gray3);
  // flag cloth
  fillRect(c, 5, 2, 8, 5, PALETTE.green2);
  fillRect(c, 5, 3, 7, 3, PALETTE.green3);
  // notch
  setPx(c, 12, 6, 0);
  setPx(c, 12, 5, PALETTE.green2);
  // base knob
  fillCircle(c, 4, 15, 1, PALETTE.gray1);
  outlineFromFill(c, PALETTE.shadow);
  return c;
}

function makePlItemSpring16() {
  const c = makeCanvas(16, 16);
  // base
  fillRect(c, 3, 12, 10, 3, PALETTE.red1);
  fillRect(c, 3, 12, 10, 1, PALETTE.red2);
  // spring coils
  for (let y = 5; y < 12; y++) {
    const x0 = y % 2 === 0 ? 6 : 5;
    fillRect(c, x0, y, 5, 1, PALETTE.gray3);
    if (y % 3 === 0) fillRect(c, x0, y, 5, 1, PALETTE.gray2);
  }
  // top cap
  fillRect(c, 4, 4, 8, 2, PALETTE.gray2);
  fillRect(c, 4, 4, 8, 1, PALETTE.gray3);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 45) });
  return c;
}

// --- Dreamy/cute vibe (Kirby-like feel, but original designs) ---
function makeDwTilePastelSky16() {
  const c = makeCanvas(16, 16);
  // soft sky gradient (opaque)
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const t = y / 15;
      // blend between light blue and light pink
      const r = Math.round(191 + (255 - 191) * t);
      const g = Math.round(232 + (220 - 232) * t);
      const b = Math.round(255 + (235 - 255) * t);
      setPx(c, x, y, rgba(r, g, b, 255));
    }
  }
  // sparkly dots
  for (let i = 0; i < 30; i++) {
    const x = h2(i, 1, 71) % 16;
    const y = h2(i, 2, 72) % 16;
    setPx(c, x, y, rgba(255, 255, 255, 255));
    if (i % 4 === 0 && inBounds(c, x + 1, y)) setPx(c, x + 1, y, rgba(255, 255, 255, 200));
  }
  return c;
}

function makeDwTileStarBlock16() {
  const c = makeCanvas(16, 16);
  const base = rgba(255, 210, 235, 255);
  const hi = rgba(255, 235, 248, 255);
  const edge = rgba(210, 140, 180, 255);
  fillRect(c, 0, 0, 16, 16, base);
  // bevel
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, hi);
    setPx(c, x, 1, hi);
    setPx(c, x, 15, edge);
  }
  for (let y = 0; y < 16; y++) {
    setPx(c, 0, y, hi);
    setPx(c, 1, y, hi);
    setPx(c, 15, y, edge);
  }
  // star emboss
  const star = [
    [8, 3],
    [7, 5],
    [9, 5],
    [6, 6],
    [10, 6],
    [5, 8],
    [11, 8],
    [6, 10],
    [10, 10],
    [8, 12]
  ];
  for (const [x, y] of star) setPx(c, x, y, PALETTE.yellow2);
  for (const [x, y] of star) if (inBounds(c, x + 1, y + 1)) setPx(c, x + 1, y + 1, PALETTE.orange2);
  // shine
  setPx(c, 4, 4, PALETTE.white);
  setPx(c, 5, 4, PALETTE.white);
  return c;
}

function makeDwTileCandyStripe16() {
  const c = makeCanvas(16, 16);
  const a = rgba(255, 210, 235, 255);
  const b = rgba(190, 232, 255, 255);
  const edge = rgba(255, 255, 255, 255);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const band = ((x + y) / 3) | 0;
      setPx(c, x, y, band % 2 === 0 ? a : b);
      if ((x + y) % 6 === 0) setPx(c, x, y, edge);
    }
  }
  return c;
}

function makeDwTileDreamGrass16() {
  const c = makeCanvas(16, 16);
  const grassHi = rgba(220, 255, 240, 255);
  const grass = rgba(120, 230, 190, 255);
  const dirt = rgba(255, 200, 210, 255);
  const dirtDark = rgba(210, 140, 180, 255);
  // grass top
  for (let x = 0; x < 16; x++) {
    setPx(c, x, 0, grassHi);
    setPx(c, x, 1, (x % 3 === 0 ? grass : grassHi));
    setPx(c, x, 2, grass);
  }
  // candy dirt body
  fillRect(c, 0, 3, 16, 13, dirt);
  for (let y = 3; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const v = h2(x, y, 73);
      if (v % 17 === 0) setPx(c, x, y, dirtDark);
      else if (v % 29 === 0) setPx(c, x, y, rgba(255, 230, 240, 255));
    }
  }
  // grass teeth into dirt
  for (let x = 0; x < 16; x++) if (h2(x, 0, 74) % 4 === 0) setPx(c, x, 3, grass);
  return c;
}

function makeDwTilePuffyCloud16() {
  const c = makeCanvas(16, 16);
  // transparent background cloud
  const white = rgba(255, 255, 255, 230);
  const shade = rgba(245, 245, 255, 210);
  fillCircle(c, 5, 10, 5, white);
  fillCircle(c, 10, 9, 5, white);
  fillCircle(c, 12, 11, 3, white);
  for (let y = 11; y < 16; y++) for (let x = 0; x < 16; x++) if (getPx(c, x, y)) setPx(c, x, y, shade);
  outlineFromFill(c, rgba(140, 170, 210, 255));
  return c;
}

function makeDwItemSparkle16() {
  const c = makeCanvas(16, 16);
  // transparent background: sparkles
  const w = rgba(255, 255, 255, 255);
  const y = PALETTE.yellow2;
  const b = rgba(190, 232, 255, 255);
  const pts = [
    [4, 5],
    [10, 4],
    [12, 9],
    [6, 12]
  ];
  for (const [cx, cy] of pts) {
    setPx(c, cx, cy, w);
    setPx(c, cx - 1, cy, b);
    setPx(c, cx + 1, cy, b);
    setPx(c, cx, cy - 1, y);
    setPx(c, cx, cy + 1, y);
  }
  addShadow(c, { dx: 1, dy: 1, color: rgba(0, 0, 0, 35) });
  return c;
}

function makeDwItemStarWand16() {
  const c = makeCanvas(16, 16);
  // handle
  for (let i = 0; i < 8; i++) {
    setPx(c, 4 + i, 13 - i, rgba(210, 140, 180, 255));
    if (i % 2 === 0) setPx(c, 4 + i, 14 - i, rgba(255, 230, 240, 255));
  }
  // star tip
  const star = [
    [12, 2],
    [11, 4],
    [13, 4],
    [10, 5],
    [14, 5],
    [11, 7],
    [13, 7],
    [12, 9]
  ];
  for (const [x, y] of star) setPx(c, x, y, PALETTE.yellow2);
  for (const [x, y] of star) if (inBounds(c, x + 1, y + 1)) setPx(c, x + 1, y + 1, PALETTE.orange2);
  setPx(c, 12, 3, PALETTE.white);
  outlineFromFill(c, PALETTE.shadow);
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 40) });
  return c;
}

function makeDwItemLollipop16() {
  const c = makeCanvas(16, 16);
  // stick
  fillRect(c, 7, 9, 2, 6, rgba(255, 255, 255, 255));
  fillRect(c, 8, 9, 1, 6, rgba(220, 220, 220, 255));
  // candy
  fillCircle(c, 8, 6, 4, rgba(255, 210, 235, 255));
  fillCircle(c, 8, 6, 3, rgba(190, 232, 255, 255));
  // swirl hint
  for (let i = 0; i < 6; i++) setPx(c, 6 + i, 6, rgba(255, 255, 255, 255));
  setPx(c, 7, 4, rgba(255, 255, 255, 255));
  setPx(c, 9, 8, rgba(255, 255, 255, 255));
  outlineFromFill(c, rgba(140, 170, 210, 255));
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 40) });
  return c;
}

function makeDwItemDreamDoor16() {
  const c = makeCanvas(16, 16);
  // door body
  fillRect(c, 4, 3, 8, 12, rgba(190, 232, 255, 255));
  fillRect(c, 5, 4, 6, 10, rgba(255, 210, 235, 255));
  // arch
  fillEllipse(c, 8, 4, 4, 3, rgba(190, 232, 255, 255));
  fillEllipse(c, 8, 5, 3, 2, rgba(255, 210, 235, 255));
  // star knob
  setPx(c, 10, 10, PALETTE.yellow2);
  setPx(c, 10, 11, PALETTE.orange2);
  setPx(c, 9, 10, PALETTE.yellow2);
  setPx(c, 11, 10, PALETTE.yellow2);
  // border + shadow
  outlineFromFill(c, rgba(140, 170, 210, 255));
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 45) });
  return c;
}

function makeDwItemBubble16() {
  const c = makeCanvas(16, 16);
  // transparent bubble (alpha)
  fillCircle(c, 8, 8, 6, rgba(190, 232, 255, 60));
  // rim
  for (let a = 0; a < 360; a += 20) {
    const rad = (a * Math.PI) / 180;
    const x = Math.round(8 + Math.cos(rad) * 6);
    const y = Math.round(8 + Math.sin(rad) * 6);
    setPx(c, x, y, rgba(190, 232, 255, 140));
  }
  // highlight
  fillEllipse(c, 6, 6, 2, 3, rgba(255, 255, 255, 140));
  return c;
}

function makeDwItemStrawberry16() {
  const c = makeCanvas(16, 16);
  // body
  fillEllipse(c, 8, 10, 5, 5, rgba(255, 120, 160, 255));
  fillEllipse(c, 8, 11, 5, 4, rgba(210, 60, 100, 255));
  // seeds
  for (let i = 0; i < 10; i++) {
    const x = (h2(i, 1, 75) % 8) + 4;
    const y = (h2(i, 2, 76) % 7) + 6;
    if (getPx(c, x, y)) setPx(c, x, y, rgba(255, 235, 248, 255));
  }
  // leaves
  fillCircle(c, 6, 5, 2, rgba(120, 230, 190, 255));
  fillCircle(c, 10, 5, 2, rgba(120, 230, 190, 255));
  setPx(c, 8, 4, rgba(220, 255, 240, 255));
  outlineFromFill(c, rgba(140, 60, 90, 255));
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 40) });
  return c;
}

function makeDwMascotRound16() {
  const c = makeCanvas(16, 16);
  // Original mascot: mint body, tiny crown tuft, no signature feet.
  const body1 = rgba(120, 230, 190, 255);
  const body2 = rgba(80, 200, 165, 255);
  fillCircle(c, 8, 9, 6, body1);
  fillCircle(c, 8, 10, 5, body2);
  // tuft
  setPx(c, 8, 2, rgba(255, 210, 235, 255));
  setPx(c, 7, 3, rgba(255, 230, 240, 255));
  setPx(c, 9, 3, rgba(255, 230, 240, 255));
  // eyes
  fillRect(c, 5, 8, 2, 3, PALETTE.ink);
  fillRect(c, 10, 8, 2, 3, PALETTE.ink);
  setPx(c, 6, 8, PALETTE.white);
  setPx(c, 11, 8, PALETTE.white);
  // blush
  setPx(c, 4, 11, rgba(255, 180, 210, 255));
  setPx(c, 12, 11, rgba(255, 180, 210, 255));
  // tiny mouth
  setPx(c, 8, 12, PALETTE.shadow);
  setPx(c, 7, 12, PALETTE.shadow);
  // outline + shadow
  outlineFromFill(c, rgba(60, 120, 110, 255));
  addShadow(c, { dx: 1, dy: 2, color: rgba(0, 0, 0, 45) });
  return c;
}

function toSample(id, name, kind, canvas, tags) {
  return {
    id,
    name,
    kind,
    width: canvas.w,
    height: canvas.h,
    pixelsB64: pixelsToBase64(canvas.p),
    tags
  };
}

const samples = [
  toSample('slime_blue', 'ぷるぷるスライム', 'character', makeSlimeBlue(), ['モンスター', '32x32', 'キャラ']),
  toSample('cat_orange', 'みかんねこ', 'character', makeCatOrange(), ['どうぶつ', '32x32', 'キャラ']),
  toSample('robot_buddy', 'ちびロボ', 'character', makeRobot(), ['メカ', '32x32', 'キャラ']),
  toSample('potion_red', 'あかポーション', 'object', makePotionRed(), ['アイテム', '32x32', '小物']),
  toSample('sword_steel', 'はがねのつるぎ', 'object', makeSword(), ['装備', '32x32', '小物']),
  toSample('shield_azure', 'あおのたて', 'object', makeShield(), ['装備', '32x32', '小物']),
  toSample('chest_wood', 'たからばこ', 'object', makeChest(), ['アイテム', '32x32', '小物']),
  toSample('tree_green', 'もりのき', 'tile', makeTree(), ['マップ', '32x32', 'タイル']),
  toSample('fireball', 'ファイアボール', 'object', makeFireball(), ['エフェクト', '32x32', '小物']),
  toSample('house_red', 'ちいさなおうち', 'tile', makeHouse(), ['マップ', '32x32', 'タイル']),

  // 16x16 pack (about 20)
  toSample('slime_mini_16', 'ちびスライム', 'character', makeSlimeMini16(), ['モンスター', '16x16', 'キャラ']),
  toSample('cat_face_16', 'ねこかお', 'character', makeCatFace16(), ['どうぶつ', '16x16', 'キャラ']),
  toSample('ghost_16', 'おばけ', 'character', makeGhost16(), ['モンスター', '16x16', 'キャラ']),
  toSample('chick_16', 'ひよこ', 'character', makeChick16(), ['どうぶつ', '16x16', 'キャラ']),
  toSample('frog_16', 'かえる', 'character', makeFrog16(), ['どうぶつ', '16x16', 'キャラ']),
  toSample('robot_head_16', 'ロボのあたま', 'character', makeRobotHead16(), ['メカ', '16x16', 'キャラ']),
  toSample('enemy_bat_16', 'こうもり', 'character', makeEnemyBat16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_goblin_16', 'ゴブリン', 'character', makeEnemyGoblin16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_skeleton_16', 'スケルトン', 'character', makeEnemySkeleton16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_eye_16', 'めだま', 'character', makeEnemyEye16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_slime_red_16', 'あかスライム', 'character', makeEnemySlimeRed16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_imp_16', 'こあくま', 'character', makeEnemyImp16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_spider_16', 'くも', 'character', makeEnemySpider16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_knight_16', 'よろい', 'character', makeEnemyKnight16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_mushroom_16', 'どくきのこ', 'character', makeEnemyMushroomBad16(), ['モンスター', '16x16', 'キャラ', '敵']),
  toSample('enemy_slime_purple_16', 'どくスライム', 'character', makeEnemySlimePurple16(), ['モンスター', '16x16', 'キャラ', '敵']),

  toSample('heart_16', 'ハート', 'object', makeHeart16(), ['アイコン', '16x16', '小物']),
  toSample('star_16', 'スター', 'object', makeStar16(), ['アイコン', '16x16', '小物']),
  toSample('coin_16', 'コイン', 'object', makeCoin16(), ['アイテム', '16x16', '小物']),
  toSample('gem_blue_16', 'あおジェム', 'object', makeGemBlue16(), ['アイテム', '16x16', '小物']),
  toSample('potion_green_16', 'みどりポーション', 'object', makePotionGreen16(), ['アイテム', '16x16', '小物']),
  toSample('key_16', 'カギ', 'object', makeKey16(), ['アイテム', '16x16', '小物']),
  toSample('bomb_16', 'ボム', 'object', makeBomb16(), ['アイテム', '16x16', '小物']),
  toSample('mushroom_16', 'きのこ', 'object', makeMushroom16(), ['どうぶつ', '16x16', '小物']),
  toSample('leaf_16', 'はっぱ', 'object', makeLeaf16(), ['自然', '16x16', '小物']),

  toSample('tree_mini_16', 'ちびのき', 'tile', makeTreeMini16(), ['マップ', '16x16', 'タイル']),
  toSample('house_mini_16', 'ちびハウス', 'tile', makeHouseMini16(), ['マップ', '16x16', 'タイル']),
  toSample('tile_grass_16', 'くさタイル', 'tile', makeTileGrass16(), ['マップ', '16x16', 'タイル']),
  toSample('tile_water_16', 'みずタイル', 'tile', makeTileWater16(), ['マップ', '16x16', 'タイル']),
  toSample('tile_stone_16', 'いしタイル', 'tile', makeTileStone16(), ['マップ', '16x16', 'タイル']),

  // tile/block pack (+10)
  toSample('tile_dirt_16', 'つちタイル', 'tile', makeTileDirt16(), ['マップ', '16x16', 'タイル', 'ブロック', '地面']),
  toSample('tile_sand_16', 'すなタイル', 'tile', makeTileSand16(), ['マップ', '16x16', 'タイル', 'ブロック', '地面']),
  toSample('tile_brick_red_16', 'あかレンガ', 'tile', makeTileBrickRed16(), ['マップ', '16x16', 'タイル', 'ブロック', '壁']),
  toSample('tile_wood_plank_16', 'もくざい（いた）', 'tile', makeTileWoodPlank16(), ['マップ', '16x16', 'タイル', 'ブロック', '床']),
  toSample('tile_cobble_16', 'いしだたみ', 'tile', makeTileCobble16(), ['マップ', '16x16', 'タイル', 'ブロック', '道']),
  toSample('tile_metal_plate_16', 'てつプレート', 'tile', makeTileMetalPlate16(), ['マップ', '16x16', 'タイル', 'ブロック', '工場']),
  toSample('tile_lava_16', 'ようがん', 'tile', makeTileLava16(), ['マップ', '16x16', 'タイル', '危険', '床']),
  toSample('tile_ice_16', 'こおり', 'tile', makeTileIce16(), ['マップ', '16x16', 'タイル', 'ブロック', '床']),
  toSample('tile_grass_block_16', 'くさつちブロック', 'tile', makeTileGrassBlock16(), ['マップ', '16x16', 'タイル', 'ブロック', '足場']),
  toSample('tile_spikes_16', 'トゲ（わな）', 'tile', makeTileSpikes16(), ['マップ', '16x16', 'タイル', 'トラップ', '危険']),
  // block-world pack (minecraft-like vibe, original)
  toSample('bw_stone_smooth_16', 'なめらかいし', 'tile', makeTileStoneSmooth16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '石']),
  toSample('bw_log_oak_side_16', 'げんぼく（よこ）', 'tile', makeTileLogOakSide16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '木']),
  toSample('bw_log_oak_top_16', 'げんぼく（うえ）', 'tile', makeTileLogOakTop16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '木']),
  toSample('bw_leaves_16', 'はっぱブロック', 'tile', makeTileLeaves16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '自然']),
  toSample('bw_glass_16', 'ガラス', 'tile', makeTileGlass16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '建材']),
  toSample('bw_obsidian_16', 'くろいかたい石', 'tile', makeTileObsidian16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', 'レア']),
  toSample('bw_crafting_top_16', 'さぎょうだい（うえ）', 'tile', makeTileCraftingTableTop16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', 'クラフト']),
  toSample('bw_furnace_front_16', 'かまど（まえ）', 'tile', makeTileFurnaceFront16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', 'クラフト']),
  toSample('bw_ore_coal_16', 'くろいこうせき', 'tile', makeTileOreCoal16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '鉱石']),
  toSample('bw_ore_iron_16', 'てつこうせき', 'tile', makeTileOreIron16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '鉱石']),
  toSample('bw_ore_gold_16', 'きんこうせき', 'tile', makeTileOreGold16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '鉱石']),
  toSample('bw_ore_gemblue_16', 'あおこうせき', 'tile', makeTileOreGemBlue16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '鉱石']),
  toSample('bw_ore_red_16', 'あかこうせき', 'tile', makeTileOreRed16(), ['ブロックワールド', '16x16', 'タイル', 'ブロック', '鉱石']),

  toSample('bw_torch_16', 'たいまつ', 'object', makeItemTorch16(), ['ブロックワールド', '16x16', '小物', 'クラフト']),
  toSample('bw_pickaxe_16', 'つるはし', 'object', makeItemPickaxe16(), ['ブロックワールド', '16x16', '小物', 'クラフト']),
  toSample('bw_apple_16', 'りんご', 'object', makeItemApple16(), ['ブロックワールド', '16x16', '小物', '食べもの']),

  // retro platformer pack (bright, readable, game-ready)
  toSample('pl_ground_grass_16', 'くさつち（だいち）', 'tile', makePlTileGroundGrass16(), ['プラットフォーマー', '16x16', 'タイル', '地面']),
  toSample('pl_brick_orange_16', 'オレンジれんが', 'tile', makePlTileBrickOrange16(), ['プラットフォーマー', '16x16', 'タイル', 'ブロック']),
  toSample('pl_coin_block_16', 'コインブロック', 'tile', makePlTileCoinBlock16(), ['プラットフォーマー', '16x16', 'タイル', 'ブロック', 'ギミック']),
  toSample('pl_pipe_green_16', 'みどりパイプ', 'tile', makePlTilePipeGreen16(), ['プラットフォーマー', '16x16', 'タイル', 'ブロック', 'ギミック']),
  toSample('pl_cloud_16', 'くも', 'tile', makePlTileCloud16(), ['プラットフォーマー', '16x16', 'タイル', '背景']),
  toSample('pl_bush_16', 'しげみ', 'tile', makePlTileBush16(), ['プラットフォーマー', '16x16', 'タイル', '背景']),
  toSample('pl_oneway_platform_16', 'すりぬけ足場', 'tile', makePlTileOneWayPlatform16(), ['プラットフォーマー', '16x16', 'タイル', '足場', 'ギミック']),
  toSample('pl_flag_16', 'ゴールのはた', 'object', makePlItemFlag16(), ['プラットフォーマー', '16x16', '小物', 'ゴール']),
  toSample('pl_spring_16', 'バネ', 'object', makePlItemSpring16(), ['プラットフォーマー', '16x16', '小物', 'ギミック']),

  // dreamy/cute pack
  toSample('dw_mascot_round_16', 'まんまるマスコット', 'character', makeDwMascotRound16(), ['ドリーミー', 'パステル', '16x16', 'キャラ']),
  toSample('dw_pastel_sky_16', 'パステルそら', 'tile', makeDwTilePastelSky16(), ['ドリーミー', 'パステル', '16x16', 'タイル', '背景']),
  toSample('dw_puffy_cloud_16', 'ふわふわくも', 'tile', makeDwTilePuffyCloud16(), ['ドリーミー', 'パステル', '16x16', 'タイル', '背景']),
  toSample('dw_dream_grass_16', 'ゆめのくさつち', 'tile', makeDwTileDreamGrass16(), ['ドリーミー', 'パステル', '16x16', 'タイル', '地面']),
  toSample('dw_star_block_16', 'スターのブロック', 'tile', makeDwTileStarBlock16(), ['ドリーミー', 'パステル', '16x16', 'タイル', 'ブロック']),
  toSample('dw_candy_stripe_16', 'キャンディしま', 'tile', makeDwTileCandyStripe16(), ['ドリーミー', 'パステル', '16x16', 'タイル', '床']),
  toSample('dw_sparkle_16', 'きらきら', 'object', makeDwItemSparkle16(), ['ドリーミー', 'パステル', '16x16', '小物', 'エフェクト']),
  toSample('dw_star_wand_16', 'ほしのつえ', 'object', makeDwItemStarWand16(), ['ドリーミー', 'パステル', '16x16', '小物']),
  toSample('dw_lollipop_16', 'ぺろぺろキャンディ', 'object', makeDwItemLollipop16(), ['ドリーミー', 'パステル', '16x16', '小物', '食べもの']),
  toSample('dw_dream_door_16', 'ゆめのとびら', 'object', makeDwItemDreamDoor16(), ['ドリーミー', 'パステル', '16x16', '小物', 'ギミック']),
  toSample('dw_bubble_16', 'しゃぼんだま', 'object', makeDwItemBubble16(), ['ドリーミー', 'パステル', '16x16', '小物', 'エフェクト']),
  toSample('dw_strawberry_16', 'いちご', 'object', makeDwItemStrawberry16(), ['ドリーミー', 'パステル', '16x16', '小物', '食べもの'])
];

const output = {
  version: 1,
  updatedAt: new Date().toISOString(),
  note:
    'ドット絵メーカー用のサンプル素材です。サンプルはDBに保存されず、ユーザーが「コピーして編集」することで自分の作品として保存できます。',
  samples
};

await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');

console.log(`Wrote ${samples.length} samples to: ${OUT_PATH}`);
