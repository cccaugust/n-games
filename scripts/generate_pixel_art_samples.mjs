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
  toSample('house_red', 'ちいさなおうち', 'tile', makeHouse(), ['マップ', '32x32', 'タイル'])
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
