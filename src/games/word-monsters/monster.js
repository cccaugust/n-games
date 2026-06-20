// ドット絵モンスター自動生成エンジン
// 単語をシードに、決定論的（いつも同じ結果）で左右対称のモンスターを生成する。
// 体型(archetype) × 色 × レア度 で見た目が無限に増える。

const GRID = 20;            // ドットの数（縦横）
const ARCHES = ['slime', 'fluff', 'beast', 'bird', 'fish', 'snake', 'dragon', 'ghost', 'golem', 'plant', 'robot'];

// ---- シード乱数（文字列 → 安定した乱数）----
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 色（HSL → hex）----
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function buildPalette(rnd, shiny) {
  let baseHue = Math.floor(rnd() * 360);
  let accHue = (baseHue + (rnd() < 0.5 ? 150 + rnd() * 60 : -(150 + rnd() * 60))) ;
  let sat = 60 + rnd() * 25;
  if (shiny) { baseHue = (baseHue + 160) % 360; accHue += 90; sat = 90; }
  return {
    line:  hsl(baseHue, sat * 0.5, 16),
    shade: hsl(baseHue, sat, 38),
    base:  hsl(baseHue, sat, 55),
    belly: hsl(baseHue, sat * 0.6, 82),
    hi:    hsl(baseHue, sat * 0.4, 92),
    acc:   hsl(accHue, sat, 58),
    accSh: hsl(accHue, sat, 40),
    eyeW:  '#ffffff',
    eyeB:  hsl(baseHue, 30, 18),
    spark: '#ffffff',
  };
}

// ---- グリッド操作 ----
function makeCanvasGrid() {
  const g = Array.from({ length: GRID }, () => new Array(GRID).fill(null));
  const inb = (x, y) => x >= 0 && x < GRID && y >= 0 && y < GRID;
  const set = (x, y, role) => { if (inb(x, y)) g[x | 0][y | 0] = role; };
  // 左右対称セット（中心軸は col 9.5）
  const sym = (x, y, role) => { set(x, y, role); set(GRID - 1 - x, y, role); };
  const ellipse = (cx, cy, rx, ry, role) => {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(x, y, role);
      }
    }
  };
  const rect = (x0, y0, x1, y1, role) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, role);
  };
  return { g, set, sym, ellipse, rect, inb };
}

// 目を置く（白目＋黒目＋ハイライト）
function addEyes(api, leftX, cy, big) {
  const r = big ? 1.6 : 1.2;
  for (const ex of [leftX, GRID - 1 - leftX]) {
    api.ellipse(ex, cy, r, r + 0.3, 'eyeW');
  }
  for (const ex of [leftX, GRID - 1 - leftX]) {
    api.set(ex, cy + (big ? 0.3 : 0.2), 'eyeB');
    api.set(ex, cy + (big ? 1 : 0.6), 'eyeB');
    api.set(ex - (ex < GRID / 2 ? 0 : -1), cy - 0.4, 'spark');
  }
}

// ---- 体型ごとの生成 ----
const BUILDERS = {
  slime(api, rnd) {
    // ぷるんとした水滴形
    api.ellipse(9.5, 12, 6.5, 5, 'base');
    api.rect(4, 13, 15, 16, 'base');
    api.ellipse(9.5, 13.5, 5, 4, 'belly');
    addEyes(api, 7, 11, true);
    mouth(api, 14, 1);
  },
  fluff(api, rnd) {
    // まんまる毛玉＋小さな足
    api.ellipse(9.5, 10, 6.5, 6.5, 'base');
    // もこもこの縁
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI - Math.PI / 2;
      api.sym(9.5 + Math.cos(a) * 6.8, 10 + Math.sin(a) * 6.8, 'base');
    }
    api.ellipse(9.5, 11, 4, 3.5, 'belly');
    api.sym(7, 16, 'shade'); // 足
    addEyes(api, 7, 9, true);
    mouth(api, 12, 1);
  },
  beast(api, rnd) {
    // からだ
    api.ellipse(9.5, 12, 5.5, 4.5, 'base');
    // 耳
    api.set(6, 5, 'base'); api.set(6, 6, 'base'); api.set(7, 6, 'base'); api.set(7, 7, 'base');
    api.set(13, 5, 'base'); api.set(13, 6, 'base'); api.set(12, 6, 'base'); api.set(12, 7, 'base');
    // 頭
    api.ellipse(9.5, 8, 4.5, 3.5, 'base');
    api.ellipse(9.5, 9.5, 2.5, 2, 'belly');
    // 足
    api.rect(6, 15, 7, 17, 'shade'); api.rect(12, 15, 13, 17, 'shade');
    // しっぽ
    api.set(16, 12, 'base'); api.set(17, 11, 'base'); api.set(17, 10, 'acc');
    addEyes(api, 7, 8, true);
    api.set(9, 10, 'eyeB'); api.set(10, 10, 'eyeB'); // 鼻
  },
  bird(api, rnd) {
    // からだ（たまご形）
    api.ellipse(9.5, 11, 4.5, 5.5, 'base');
    api.ellipse(9.5, 12, 3, 4, 'belly');
    // つばさ
    api.ellipse(4.5, 11, 1.5, 3, 'acc'); api.ellipse(14.5, 11, 1.5, 3, 'acc');
    // 頭の毛
    api.set(9, 4, 'acc'); api.set(10, 4, 'acc'); api.set(9, 3, 'acc'); api.set(10, 3, 'acc');
    // くちばし
    api.set(9, 9, 'accSh'); api.set(10, 9, 'accSh'); api.set(9, 10, 'accSh'); api.set(10, 10, 'accSh');
    // 足
    api.set(8, 17, 'accSh'); api.set(11, 17, 'accSh');
    addEyes(api, 7, 7, false);
  },
  fish(api, rnd) {
    // よこ向きの体
    api.ellipse(8.5, 10, 5.5, 4, 'base');
    api.ellipse(8.5, 11, 3.5, 2.5, 'belly');
    // しっぽ
    api.set(15, 8, 'acc'); api.set(16, 7, 'acc'); api.set(15, 10, 'acc'); api.set(16, 9, 'acc');
    api.set(15, 12, 'acc'); api.set(16, 13, 'acc');
    api.rect(14, 9, 15, 11, 'acc');
    // 背びれ
    api.set(7, 5, 'acc'); api.set(8, 5, 'acc'); api.set(9, 6, 'acc');
    // 目（前方）
    api.ellipse(6, 9, 1.5, 1.5, 'eyeW');
    api.set(6, 9.3, 'eyeB'); api.set(5.6, 8.6, 'spark');
    mouth(api, 11, 0);
  },
  snake(api, rnd) {
    // くねくね胴体
    const segs = [[6, 16], [8, 14], [11, 13], [13, 11], [11, 9], [9, 8]];
    for (const [x, y] of segs) api.ellipse(x, y, 2.2, 2.2, 'base');
    // 頭
    api.ellipse(9.5, 6.5, 3, 2.5, 'base');
    api.ellipse(9.5, 7.5, 1.8, 1.5, 'belly');
    // 舌
    api.set(9, 4, 'acc'); api.set(10, 4, 'acc'); api.set(9, 3, 'acc');
    addEyes(api, 8, 6, false);
  },
  dragon(api, rnd) {
    // からだ
    api.ellipse(9.5, 12, 4.5, 4.5, 'base');
    api.ellipse(9.5, 13, 2.8, 3, 'belly');
    // 頭
    api.ellipse(9.5, 7, 4, 3.5, 'base');
    // つの
    api.set(6, 3, 'acc'); api.set(6, 4, 'acc'); api.set(13, 3, 'acc'); api.set(13, 4, 'acc');
    // つばさ（大きく）
    for (let i = 0; i < 4; i++) { api.set(3 - 0, 8 + i, 'acc'); api.set(GRID - 1 - 3, 8 + i, 'acc'); }
    api.ellipse(3.5, 10, 2, 3.5, 'acc'); api.ellipse(GRID - 1 - 3.5, 10, 2, 3.5, 'acc');
    // せなかのトゲ
    api.set(9, 4, 'accSh'); api.set(10, 4, 'accSh');
    // しっぽ
    api.set(15, 14, 'base'); api.set(16, 15, 'acc');
    // 足
    api.rect(7, 15, 8, 16, 'shade'); api.rect(11, 15, 12, 16, 'shade');
    addEyes(api, 7, 7, true);
  },
  ghost(api, rnd) {
    // 上はまるく、下はゆらゆら
    api.ellipse(9.5, 9, 6, 6, 'base');
    api.rect(4, 9, 15, 15, 'base');
    // 下のなみなみ
    for (let x = 4; x <= 15; x += 3) { api.set(x, 16, null); api.set(x + 1, 16, 'base'); }
    api.rect(4, 15, 15, 15, 'base');
    api.ellipse(9.5, 9, 3.5, 3.5, 'belly');
    // 手
    api.set(4, 11, 'base'); api.set(15, 11, 'base');
    addEyes(api, 7, 8, true);
    mouth(api, 12, 0);
  },
  golem(api, rnd) {
    // 四角いからだ
    api.rect(5, 8, 14, 16, 'base');
    api.rect(6, 9, 13, 11, 'belly');
    // 頭
    api.rect(7, 4, 12, 8, 'base');
    // 腕
    api.rect(3, 9, 4, 13, 'shade'); api.rect(15, 9, 16, 13, 'shade');
    // 足
    api.rect(6, 17, 8, 18, 'shade'); api.rect(11, 17, 13, 18, 'shade');
    // ひび
    api.set(9, 13, 'shade'); api.set(10, 14, 'shade');
    addEyes(api, 8, 6, false);
  },
  plant(api, rnd) {
    // 植木鉢
    api.rect(6, 14, 13, 18, 'acc');
    api.rect(5, 13, 14, 14, 'accSh');
    // くき
    api.rect(9, 9, 10, 14, 'shade');
    // 葉っぱ
    api.ellipse(6, 10, 2.5, 1.8, 'base'); api.ellipse(13, 10, 2.5, 1.8, 'base');
    // 花（顔）
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      api.set(9.5 + Math.cos(a) * 3, 7 + Math.sin(a) * 3, 'base');
    }
    api.ellipse(9.5, 7, 2.5, 2.5, 'belly');
    addEyes(api, 8, 7, false);
  },
  robot(api, rnd) {
    // 頭
    api.rect(6, 4, 13, 10, 'base');
    api.rect(7, 6, 12, 8, 'shade'); // 画面
    // アンテナ
    api.set(9, 2, 'acc'); api.set(10, 2, 'acc'); api.set(9, 3, 'shade'); api.set(10, 3, 'shade');
    // からだ
    api.rect(7, 11, 12, 16, 'base');
    api.rect(8, 12, 11, 14, 'belly');
    // 腕
    api.rect(4, 11, 5, 15, 'shade'); api.rect(14, 11, 15, 15, 'shade');
    // 足
    api.rect(7, 17, 8, 18, 'shade'); api.rect(11, 17, 12, 18, 'shade');
    // 目（画面の中で光る）
    api.set(8, 7, 'acc'); api.set(11, 7, 'acc');
    api.set(8, 6, 'spark'); api.set(11, 6, 'spark');
  },
};

function mouth(api, y, type) {
  if (type === 1) { // にっこり
    api.set(8, y, 'line'); api.set(9, y + 0.3, 'line'); api.set(10, y + 0.3, 'line'); api.set(11, y, 'line');
  } else { // ちょん
    api.set(9, y, 'line'); api.set(10, y, 'line');
  }
}

// ---- 仕上げ：アウトライン＋影 ----
function finalize(grid) {
  // アウトライン（空セルで、上下左右に色がある所）
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      if (grid[x][y]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < GRID && ny >= 0 && ny < GRID && grid[nx][ny] && grid[nx][ny] !== 'line';
      });
      if (near) grid[x][y] = 'line';
    }
  }
  // 下ふちにうっすら影
  for (let x = 0; x < GRID; x++) {
    for (let y = GRID - 1; y >= 1; y--) {
      if (grid[x][y] === 'base' && grid[x][y - 1] !== 'base' && grid[x][y - 1] !== 'line' && y > 12) {
        grid[x][y] = 'shade';
      }
    }
  }
}

// ---- 公開：モンスター生成 ----
export function generateMonster(word, { shiny = false } = {}) {
  const seed = hashStr(word.en + '|' + (word.cat || ''));
  const rnd = mulberry32(seed);
  let arche = word.arche;
  if (!arche || !BUILDERS[arche]) arche = ARCHES[seed % ARCHES.length];

  const api = makeCanvasGrid();
  const palette = buildPalette(rnd, shiny);
  BUILDERS[arche](api, rnd);
  finalize(api.g);

  return { grid: api.g, size: GRID, palette, arche, shiny };
}

// ---- 公開：canvasに描画 ----
export function drawMonster(canvas, monster, { silhouette = false, bob = 0, size = 0 } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const cssSize = size || canvas.clientWidth || canvas.width || 120;
  canvas.width = cssSize * dpr;
  canvas.height = cssSize * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, cssSize, cssSize);

  const cell = cssSize / monster.size;
  const yOff = Math.sin(bob) * cell * 0.6;
  const p = monster.palette;
  for (let x = 0; x < monster.size; x++) {
    for (let y = 0; y < monster.size; y++) {
      const role = monster.grid[x][y];
      if (!role) continue;
      let color;
      if (silhouette) color = role === 'line' ? '#1f2937' : '#374151';
      else color = p[role] || p.base;
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(x * cell), Math.floor(y * cell + yOff), Math.ceil(cell), Math.ceil(cell));
    }
  }
}

export { ARCHES };
