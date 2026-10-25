/**
 * プロシージャルなドット絵テクスチャ生成
 * 16x16 のタイルを Canvas 上のアトラス（16列）に並べ、名前→タイル番号の対応を返す。
 * 外部画像を一切使わず、見た目の統一感を出すためにここで全部描く。
 */
import { mulberry32 } from './noise.js';

export const TILE = 16;
export const ATLAS_COLS = 16;

class Px {
  constructor(seed) {
    this.data = new Uint8ClampedArray(TILE * TILE * 4);
    this.rnd = mulberry32(seed);
  }
  set(x, y, r, g, b, a = 255) {
    if (x < 0 || y < 0 || x >= TILE || y >= TILE) return;
    const i = (y * TILE + x) * 4;
    this.data[i] = r; this.data[i + 1] = g; this.data[i + 2] = b; this.data[i + 3] = a;
  }
  get(x, y) {
    const i = (y * TILE + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }
  /** ベース色 + ランダム揺らぎで全面を塗る */
  noise(base, v, alpha = 255) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      const n = (this.rnd() - 0.5) * 2 * v;
      this.set(x, y, base[0] + n, base[1] + n, base[2] + n, alpha);
    }
  }
  fill(c, a = 255) {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) this.set(x, y, c[0], c[1], c[2], a);
  }
  rect(x0, y0, w, h, c, a = 255) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, c[0], c[1], c[2], a);
  }
  /** 既存ピクセルに明度を加える */
  shade(x, y, d) {
    const [r, g, b, a] = this.get(x, y);
    this.set(x, y, r + d, g + d, b + d, a);
  }
  sprinkle(count, c, size = 1) {
    for (let i = 0; i < count; i++) {
      const x = Math.floor(this.rnd() * TILE), y = Math.floor(this.rnd() * TILE);
      this.rect(x, y, size, size, c);
    }
  }
  copyFrom(other) { this.data.set(other.data); }
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* ---------- 色定義 ---------- */
const C = {
  stone: [125, 125, 125],
  dirt: [134, 96, 67],
  grass: [95, 166, 58],
  sand: [219, 207, 163],
  sandstone: [214, 200, 150],
  gravel: [136, 126, 126],
  oakBark: [103, 80, 48],
  oakBarkLight: [128, 100, 62],
  oakInner: [176, 143, 92],
  birchBark: [222, 220, 210],
  birchDark: [50, 48, 44],
  spruceBark: [62, 42, 22],
  spruceLight: [84, 58, 32],
  planks: [178, 139, 86],
  planksDark: [136, 102, 58],
  leavesOak: [58, 124, 36],
  leavesBirch: [112, 160, 64],
  leavesSpruce: [44, 90, 52],
  water: [48, 92, 210],
  snow: [242, 246, 252],
  ice: [160, 200, 255],
  bedrock: [55, 55, 55],
  brick: [152, 72, 62],
  mortar: [172, 166, 158],
  cactus: [66, 136, 46],
  glow: [236, 196, 116],
  torchWood: [120, 92, 52]
};

const textures = {};
const reg = (name, fn) => { textures[name] = fn; };

/* ---------- 基本ブロック ---------- */
reg('stone', (p) => {
  p.noise(C.stone, 12);
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(p.rnd() * 16), y = Math.floor(p.rnd() * 16), w = 2 + Math.floor(p.rnd() * 3);
    for (let dx = 0; dx < w; dx++) p.shade((x + dx) & 15, y, -14);
  }
});
reg('dirt', (p) => {
  p.noise(C.dirt, 16);
  p.sprinkle(14, [110, 76, 50]);
  p.sprinkle(8, [158, 118, 84]);
});
reg('grass_top', (p) => {
  p.noise(C.grass, 14);
  p.sprinkle(16, [120, 190, 70]);
  p.sprinkle(10, [70, 130, 40]);
});
reg('grass_side', (p) => {
  p.copyFrom(make('dirt', 11));
  for (let x = 0; x < 16; x++) {
    const depth = 3 + Math.floor(p.rnd() * 3);
    for (let y = 0; y < depth; y++) {
      const n = (p.rnd() - 0.5) * 24;
      p.set(x, y, C.grass[0] + n, C.grass[1] + n, C.grass[2] + n);
    }
  }
});
reg('grass_side_snow', (p) => {
  p.copyFrom(make('dirt', 11));
  for (let x = 0; x < 16; x++) {
    const depth = 3 + Math.floor(p.rnd() * 2);
    for (let y = 0; y < depth; y++) {
      const n = (p.rnd() - 0.5) * 10;
      p.set(x, y, C.snow[0] + n, C.snow[1] + n, C.snow[2] + n);
    }
  }
});
function cobble(p, mossy) {
  // ボロノイ風の石畳
  const pts = [];
  for (let i = 0; i < 9; i++) pts.push([p.rnd() * 16, p.rnd() * 16, 100 + p.rnd() * 60]);
  const cell = new Int8Array(256);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let best = 0, bd = 1e9;
    for (let i = 0; i < pts.length; i++) {
      // タイルがループするように距離を測る
      let dx = Math.abs(x - pts[i][0]); dx = Math.min(dx, 16 - dx);
      let dy = Math.abs(y - pts[i][1]); dy = Math.min(dy, 16 - dy);
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = i; }
    }
    cell[y * 16 + x] = best;
    const g = pts[best][2] + (p.rnd() - 0.5) * 16;
    if (mossy && best % 3 === 0) p.set(x, y, g * 0.55, g * 0.85, g * 0.45);
    else p.set(x, y, g, g, g);
  }
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const c = cell[y * 16 + x];
    if (cell[y * 16 + ((x + 1) & 15)] !== c || cell[((y + 1) & 15) * 16 + x] !== c) p.shade(x, y, -45);
  }
}
reg('cobblestone', (p) => cobble(p, false));
reg('mossy_cobblestone', (p) => cobble(p, true));
reg('planks', (p) => {
  p.noise(C.planks, 10);
  for (let y = 0; y < 16; y++) {
    if (y % 4 === 3) for (let x = 0; x < 16; x++) p.set(x, y, C.planksDark[0] - 20, C.planksDark[1] - 20, C.planksDark[2] - 16);
    else if (p.rnd() < 0.5) {
      const x0 = Math.floor(p.rnd() * 16), len = 3 + Math.floor(p.rnd() * 6);
      for (let x = x0; x < x0 + len; x++) p.shade(x & 15, y, -12);
    }
  }
  // 板のつなぎ目
  p.rect(4, 0, 1, 3, C.planksDark); p.rect(12, 4, 1, 3, C.planksDark);
  p.rect(7, 8, 1, 3, C.planksDark); p.rect(2, 12, 1, 3, C.planksDark);
});
reg('sand', (p) => { p.noise(C.sand, 9); p.sprinkle(10, [200, 186, 140]); });
reg('sandstone', (p) => {
  p.noise(C.sandstone, 6);
  for (const y of [3, 7, 11, 15]) for (let x = 0; x < 16; x++) if (p.rnd() < 0.8) p.shade(x, y, -22);
});
reg('sandstone_top', (p) => { p.noise(C.sandstone, 5); p.sprinkle(6, [196, 182, 134]); });
reg('gravel', (p) => {
  p.noise(C.gravel, 14);
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(p.rnd() * 16), y = Math.floor(p.rnd() * 16);
    const g = 100 + p.rnd() * 70;
    p.rect(x, y, 2, 2, [g, g * 0.96, g * 0.95]);
  }
});

/* ---------- 木 ---------- */
reg('log_oak', (p) => {
  p.noise(C.oakBark, 8);
  for (let x = 0; x < 16; x++) if (p.rnd() < 0.4) for (let y = 0; y < 16; y++) if (p.rnd() < 0.85) p.set(x, y, ...C.oakBarkLight);
  p.sprinkle(8, [84, 64, 36]);
});
reg('log_oak_top', (p) => {
  p.noise(C.oakBark, 6);
  const rings = [[2, 2, 12, 12, C.oakInner], [4, 4, 8, 8, [150, 120, 74]], [6, 6, 4, 4, C.oakInner], [7, 7, 2, 2, [150, 120, 74]]];
  for (const [x, y, w, h, c] of rings) p.rect(x, y, w, h, c);
});
reg('log_birch', (p) => {
  p.noise(C.birchBark, 8);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(p.rnd() * 16), y = Math.floor(p.rnd() * 16), w = 2 + Math.floor(p.rnd() * 3);
    for (let dx = 0; dx < w; dx++) p.set((x + dx) & 15, y, ...C.birchDark);
  }
});
reg('log_birch_top', (p) => {
  p.noise(C.birchBark, 6);
  p.rect(2, 2, 12, 12, [200, 180, 130]); p.rect(4, 4, 8, 8, [222, 202, 150]); p.rect(6, 6, 4, 4, [200, 180, 130]);
});
reg('log_spruce', (p) => {
  p.noise(C.spruceBark, 7);
  for (let x = 0; x < 16; x++) if (p.rnd() < 0.35) for (let y = 0; y < 16; y++) if (p.rnd() < 0.8) p.set(x, y, ...C.spruceLight);
});
reg('log_spruce_top', (p) => {
  p.noise(C.spruceBark, 6);
  p.rect(2, 2, 12, 12, [150, 110, 62]); p.rect(4, 4, 8, 8, [176, 134, 80]); p.rect(6, 6, 4, 4, [150, 110, 62]);
});
function leaves(p, base, holes) {
  p.noise(base, 18);
  p.sprinkle(14, [base[0] + 30, base[1] + 34, base[2] + 24]);
  for (let i = 0; i < holes; i++) p.set(Math.floor(p.rnd() * 16), Math.floor(p.rnd() * 16), 0, 0, 0, 0);
}
reg('leaves_oak', (p) => leaves(p, C.leavesOak, 40));
reg('leaves_birch', (p) => leaves(p, C.leavesBirch, 44));
reg('leaves_spruce', (p) => leaves(p, C.leavesSpruce, 30));

/* ---------- 液体 / 透明 ---------- */
reg('water', (p) => {
  p.noise(C.water, 10);
  for (let i = 0; i < 8; i++) {
    const x = Math.floor(p.rnd() * 16), y = Math.floor(p.rnd() * 16), w = 2 + Math.floor(p.rnd() * 4);
    for (let dx = 0; dx < w; dx++) p.shade((x + dx) & 15, y, 22);
  }
});
reg('ice', (p) => {
  p.noise(C.ice, 8);
  for (let i = 0; i < 4; i++) {
    let x = Math.floor(p.rnd() * 16), y = Math.floor(p.rnd() * 16);
    for (let k = 0; k < 7; k++) { p.shade(x & 15, y & 15, 40); x += p.rnd() < 0.5 ? 1 : 0; y += p.rnd() < 0.7 ? 1 : -1; }
  }
});
reg('glass', (p) => {
  p.fill([255, 255, 255], 0);
  for (let i = 0; i < 16; i++) {
    p.set(i, 0, 232, 240, 248); p.set(i, 15, 232, 240, 248); p.set(0, i, 232, 240, 248); p.set(15, i, 232, 240, 248);
  }
  for (let i = 0; i < 6; i++) { p.set(2 + i, 8 - i, 240, 248, 255, 190); p.set(3 + i, 8 - i, 240, 248, 255, 150); }
  for (let i = 0; i < 3; i++) { p.set(10 + i, 13 - i, 240, 248, 255, 170); }
});
reg('bedrock', (p) => {
  p.noise(C.bedrock, 40);
  p.sprinkle(10, [20, 20, 20], 2);
});

/* ---------- 鉱石 ---------- */
function ore(p, color, dark) {
  p.copyFrom(make('stone', 7));
  const spots = [[2, 2], [9, 1], [12, 6], [4, 8], [8, 11], [1, 13], [13, 12]];
  for (const [x, y] of spots) {
    p.rect(x, y, 2, 2, color);
    p.set(x + 1, y + 1, ...dark);
    if (p.rnd() < 0.5) p.set(x + 2, y, ...color);
  }
}
reg('ore_coal', (p) => ore(p, [40, 40, 40], [16, 16, 16]));
reg('ore_iron', (p) => ore(p, [222, 178, 150], [180, 130, 100]));
reg('ore_gold', (p) => ore(p, [252, 216, 70], [206, 160, 30]));
reg('ore_diamond', (p) => ore(p, [96, 236, 230], [40, 180, 190]));

/* ---------- 雪 / 建材 ---------- */
reg('snow', (p) => { p.noise(C.snow, 5); p.sprinkle(6, [226, 232, 240]); });
reg('brick', (p) => {
  p.noise(C.mortar, 6);
  for (let row = 0; row < 4; row++) {
    const off = row % 2 === 0 ? 0 : 4;
    for (let col = -1; col < 3; col++) {
      const x0 = col * 8 + off;
      const tint = (p.rnd() - 0.5) * 20;
      for (let y = row * 4; y < row * 4 + 3; y++) for (let x = x0; x < x0 + 7; x++) {
        const n = (p.rnd() - 0.5) * 10;
        p.set(x & 15, y, C.brick[0] + tint + n, C.brick[1] + tint * 0.5 + n, C.brick[2] + tint * 0.5 + n);
      }
    }
  }
});
reg('stone_bricks', (p) => {
  p.noise([128, 128, 128], 8);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const row = Math.floor(y / 8);
    const off = row % 2 === 0 ? 0 : 4;
    if (y % 8 === 7 || ((x + off) % 8) === 7) p.shade(x, y, -40);
    else if (y % 8 === 0 || ((x + off) % 8) === 0) p.shade(x, y, 14);
  }
});
reg('glowstone', (p) => {
  p.noise(C.glow, 18);
  p.sprinkle(12, [255, 236, 170], 2);
  p.sprinkle(10, [196, 150, 80], 2);
});
reg('bookshelf', (p) => {
  p.copyFrom(make('planks', 13));
  const books = [[200, 60, 60], [60, 90, 200], [60, 160, 80], [220, 180, 60], [150, 80, 180], [220, 220, 220]];
  for (const shelfY of [3, 9]) {
    p.rect(0, shelfY, 16, 5, [50, 36, 22]);
    let x = 1;
    while (x < 15) {
      const w = 1 + Math.floor(p.rnd() * 2);
      const c = books[Math.floor(p.rnd() * books.length)];
      const h = 4 + (p.rnd() < 0.5 ? 0 : -1);
      p.rect(x, shelfY + (5 - h), Math.min(w, 15 - x), h, c);
      x += w + (p.rnd() < 0.3 ? 1 : 0);
    }
  }
});
reg('crafting_table_top', (p) => {
  p.copyFrom(make('planks', 13));
  for (let i = 0; i < 16; i++) {
    for (const k of [5, 10]) { p.set(i, k, 70, 50, 30); p.set(k, i, 70, 50, 30); }
    p.set(i, 0, 90, 66, 40); p.set(i, 15, 90, 66, 40); p.set(0, i, 90, 66, 40); p.set(15, i, 90, 66, 40);
  }
});
reg('crafting_table_side', (p) => {
  p.copyFrom(make('planks', 13));
  p.rect(0, 0, 16, 2, [90, 66, 40]);
  p.rect(2, 4, 5, 6, [160, 160, 170]); p.rect(3, 5, 3, 4, [110, 110, 120]);
  p.rect(9, 4, 5, 6, [160, 160, 170]); p.rect(10, 5, 3, 4, [110, 110, 120]);
});

/* ---------- 羊毛 ---------- */
function wool(p, c) {
  p.noise(c, 10);
  for (let i = 0; i < 12; i++) {
    const x = Math.floor(p.rnd() * 16), y = Math.floor(p.rnd() * 16);
    p.shade(x, y, -16); p.shade((x + 1) & 15, y, -16); p.shade((x + 1) & 15, (y + 1) & 15, -10);
  }
}
reg('wool_white', (p) => wool(p, [236, 236, 236]));
reg('wool_red', (p) => wool(p, [190, 50, 44]));
reg('wool_yellow', (p) => wool(p, [238, 200, 40]));
reg('wool_blue', (p) => wool(p, [56, 80, 190]));
reg('wool_green', (p) => wool(p, [76, 150, 48]));
reg('wool_black', (p) => wool(p, [36, 36, 40]));

/* ---------- 植物（透明背景） ---------- */
reg('tall_grass', (p) => {
  p.fill([0, 0, 0], 0);
  for (let i = 0; i < 9; i++) {
    let x = 1 + Math.floor(p.rnd() * 14);
    const h = 5 + Math.floor(p.rnd() * 9);
    const lean = p.rnd() < 0.5 ? -1 : 1;
    for (let y = 15; y > 15 - h; y--) {
      const g = 130 + p.rnd() * 60;
      p.set(x, y, g * 0.55, g, g * 0.3);
      if (p.rnd() < 0.3) x += lean;
    }
  }
});
function flower(p, petal, center) {
  p.fill([0, 0, 0], 0);
  for (let y = 7; y < 16; y++) p.set(7, y, 60, 130, 40);
  p.set(6, 11, 60, 130, 40); p.set(5, 11, 70, 150, 50); p.set(8, 9, 60, 130, 40); p.set(9, 9, 70, 150, 50);
  p.rect(5, 3, 5, 5, petal);
  p.set(5, 3, 0, 0, 0, 0); p.set(9, 3, 0, 0, 0, 0); p.set(5, 7, 0, 0, 0, 0); p.set(9, 7, 0, 0, 0, 0);
  p.set(7, 5, ...center);
  p.set(7, 2, ...petal); p.set(4, 5, ...petal); p.set(10, 5, ...petal);
}
reg('poppy', (p) => flower(p, [220, 40, 40], [30, 30, 30]));
reg('dandelion', (p) => flower(p, [250, 220, 60], [240, 170, 40]));
reg('cornflower', (p) => flower(p, [70, 100, 230], [240, 220, 100]));
reg('cactus_side', (p) => {
  p.noise(C.cactus, 9);
  for (let x = 1; x < 16; x += 4) for (let y = 0; y < 16; y++) p.shade(x, y, -22);
  for (let x = 3; x < 16; x += 4) for (let y = 1; y < 16; y += 3) p.set(x, y, 200, 220, 160);
});
reg('cactus_top', (p) => { p.noise(C.cactus, 8); p.rect(2, 2, 12, 12, [86, 156, 60]); p.rect(4, 4, 8, 8, C.cactus); });

/* ---------- たいまつ ---------- */
reg('torch', (p) => {
  p.fill([0, 0, 0], 0);
  p.rect(7, 6, 2, 10, C.torchWood);
  p.set(7, 8, 140, 108, 62); p.set(8, 12, 100, 76, 40);
  p.rect(7, 4, 2, 2, [255, 220, 60]);
  p.rect(7, 6, 2, 1, [255, 150, 40]);
  p.set(7, 3, 255, 240, 160); p.set(8, 3, 255, 200, 90);
});

/* ---------- アイテム ---------- */
reg('item_stick', (p) => {
  p.fill([0, 0, 0], 0);
  for (let i = 0; i < 11; i++) { p.set(3 + i, 13 - i, 136, 100, 54); p.set(4 + i, 13 - i, 160, 122, 70); }
});
reg('item_coal', (p) => {
  p.fill([0, 0, 0], 0);
  p.rect(4, 4, 8, 8, [40, 40, 44]); p.rect(3, 6, 10, 5, [40, 40, 44]); p.rect(6, 3, 5, 10, [40, 40, 44]);
  p.rect(5, 5, 3, 2, [80, 80, 86]); p.rect(9, 9, 2, 2, [20, 20, 22]);
});
reg('item_apple', (p) => {
  p.fill([0, 0, 0], 0);
  p.rect(4, 5, 8, 8, [212, 40, 40]); p.rect(3, 7, 10, 4, [212, 40, 40]); p.rect(5, 13, 6, 1, [160, 24, 24]);
  p.rect(5, 6, 2, 2, [250, 120, 120]);
  p.rect(7, 3, 1, 3, [100, 70, 40]); p.rect(8, 3, 3, 2, [70, 160, 60]);
});
reg('item_wheat', (p) => { p.fill([0, 0, 0], 0); p.rect(7, 2, 2, 12, [220, 190, 80]); });

/* ---------- ひび割れ（破壊の進み具合） ---------- */
for (let stage = 0; stage < 5; stage++) {
  reg(`crack_${stage}`, (p) => {
    p.fill([0, 0, 0], 0);
    const lines = 2 + stage * 2;
    for (let i = 0; i < lines; i++) {
      let x = 8 + Math.floor((p.rnd() - 0.5) * 6), y = 8 + Math.floor((p.rnd() - 0.5) * 6);
      const len = 4 + stage * 2 + Math.floor(p.rnd() * 4);
      let dx = p.rnd() < 0.5 ? 1 : -1, dy = p.rnd() < 0.5 ? 1 : -1;
      for (let k = 0; k < len; k++) {
        p.set(x, y, 20, 20, 20, 150 + stage * 20);
        if (p.rnd() < 0.5) x += dx; else y += dy;
        if (p.rnd() < 0.15) dx = -dx;
        if (p.rnd() < 0.15) dy = -dy;
      }
    }
  });
}

/* ---------- 生成 ---------- */
const cache = new Map();
function make(name, seedOffset = 0) {
  const key = name + ':' + seedOffset;
  if (cache.has(key)) return cache.get(key);
  const fn = textures[name];
  if (!fn) throw new Error('unknown texture ' + name);
  const p = new Px(hashName(name) + seedOffset);
  fn(p);
  cache.set(key, p);
  return p;
}
function hashName(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * すべてのテクスチャをアトラスへ描く。
 * @returns {{canvas: HTMLCanvasElement, index: Map<string, number>, rows: number, tileCanvas: (name)=>HTMLCanvasElement}}
 */
export function buildAtlas() {
  const names = Object.keys(textures);
  const rows = Math.ceil(names.length / ATLAS_COLS);
  const canvas = document.createElement('canvas');
  canvas.width = ATLAS_COLS * TILE;
  canvas.height = Math.max(rows, 1) * TILE;
  const ctx = canvas.getContext('2d');
  const index = new Map();
  const tiles = new Map();
  names.forEach((name, i) => {
    const px = make(name);
    const img = new ImageData(px.data, TILE, TILE);
    const tx = (i % ATLAS_COLS) * TILE, ty = Math.floor(i / ATLAS_COLS) * TILE;
    ctx.putImageData(img, tx, ty);
    index.set(name, i);
    const tc = document.createElement('canvas');
    tc.width = TILE; tc.height = TILE;
    tc.getContext('2d').putImageData(img, 0, 0);
    tiles.set(name, tc);
  });
  return { canvas, index, rows, cols: ATLAS_COLS, tileCanvas: (name) => tiles.get(name) };
}
