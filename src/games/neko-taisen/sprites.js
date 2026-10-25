// ねこぐんだん大戦争 - プロシージャル・スプライト描画
// すべてのキャラクターは画像を使わず Canvas の図形で描く。
// 座標系: 原点 = 足もとの中心。キャラは +x 方向（右）を向いて描く。

const OUT = '#2b2b2b';
const LW = 2.4;

export function circle(ctx, x, y, r, fill, stroke = OUT, lw = LW) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function ellipse(ctx, x, y, rx, ry, fill, stroke = OUT, lw = LW, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function roundRect(ctx, x, y, w, h, r, fill, stroke = OUT, lw = LW) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

export function poly(ctx, pts, fill, stroke = OUT, lw = LW) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}

function line(ctx, x1, y1, x2, y2, color = OUT, lw = LW) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = lw;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/**
 * アニメ用パラメータ
 * @typedef {object} Anim
 * @property {number} t      経過時間
 * @property {number} bob    歩行の上下 0..1
 * @property {number} step   歩行の足の位相 -1..1
 * @property {number} swing  攻撃: -0.3(ふりかぶり) .. 1(ヒット) .. 0 もどり
 * @property {boolean} attacking
 * @property {number} hurt   ダメージ直後 0..1
 * @property {number} dead   死亡アニメ 0..1 (0なら生存)
 * @property {number} squash ノックバック等の縮み
 */

// ---------- ねこ共通パーツ ----------
function catFace(ctx, x, y, s, { eye = 'dot', blush = true, mouth = true, eyeColor = OUT } = {}) {
  // 目
  if (eye === 'dot') {
    circle(ctx, x - 6 * s, y, 2.2 * s, eyeColor, null);
    circle(ctx, x + 6 * s, y, 2.2 * s, eyeColor, null);
  } else if (eye === 'happy') {
    ctx.lineWidth = 2 * s; ctx.strokeStyle = eyeColor; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x - 6 * s, y + 1 * s, 3 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 6 * s, y + 1 * s, 3 * s, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  } else if (eye === 'angry') {
    ctx.lineWidth = 2.2 * s; ctx.strokeStyle = eyeColor; ctx.lineCap = 'round';
    line(ctx, x - 9 * s, y - 3 * s, x - 3 * s, y - 1 * s, eyeColor, 2 * s);
    line(ctx, x + 3 * s, y - 1 * s, x + 9 * s, y - 3 * s, eyeColor, 2 * s);
    circle(ctx, x - 6 * s, y + 1 * s, 2 * s, eyeColor, null);
    circle(ctx, x + 6 * s, y + 1 * s, 2 * s, eyeColor, null);
  } else if (eye === 'white') {
    ellipse(ctx, x - 5 * s, y, 3 * s, 3.6 * s, '#fff', null);
    ellipse(ctx, x + 5 * s, y, 3 * s, 3.6 * s, '#fff', null);
    circle(ctx, x - 4.5 * s, y + 0.5 * s, 1.4 * s, OUT, null);
    circle(ctx, x + 5.5 * s, y + 0.5 * s, 1.4 * s, OUT, null);
  }
  if (blush) {
    ctx.globalAlpha *= 0.55;
    circle(ctx, x - 9 * s, y + 5 * s, 2.6 * s, '#ff9bb3', null);
    circle(ctx, x + 9 * s, y + 5 * s, 2.6 * s, '#ff9bb3', null);
    ctx.globalAlpha /= 0.55;
  }
  if (mouth) {
    // ω
    ctx.lineWidth = 1.6 * s; ctx.strokeStyle = OUT; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x - 2.2 * s, y + 5.5 * s, 2.2 * s, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 2.2 * s, y + 5.5 * s, 2.2 * s, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }
}

function catEars(ctx, x, y, s, color = '#fff', inner = '#ffb6c1') {
  poly(ctx, [[x - 15 * s, y + 4 * s], [x - 11 * s, y - 11 * s], [x - 3 * s, y + 1 * s]], color);
  poly(ctx, [[x + 15 * s, y + 4 * s], [x + 11 * s, y - 11 * s], [x + 3 * s, y + 1 * s]], color);
  poly(ctx, [[x - 12 * s, y + 2 * s], [x - 10.5 * s, y - 6 * s], [x - 5.5 * s, y + 1 * s]], inner, null);
  poly(ctx, [[x + 12 * s, y + 2 * s], [x + 10.5 * s, y - 6 * s], [x + 5.5 * s, y + 1 * s]], inner, null);
}

function catTail(ctx, x, y, s, t, color = '#fff') {
  ctx.beginPath();
  const w = Math.sin(t * 4) * 4 * s;
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - 14 * s, y - 6 * s + w, x - 12 * s, y - 20 * s + w * 0.5);
  ctx.lineWidth = 5 * s; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke();
  ctx.lineWidth = 2.4 * s; ctx.strokeStyle = color; ctx.stroke();
}

function catLegs(ctx, s, step, color = '#fff') {
  // 2本の足（歩行で前後）
  const a = step * 5 * s;
  roundRect(ctx, -9 * s + a, -8 * s, 7 * s, 9 * s, 3 * s, color);
  roundRect(ctx, 2 * s - a, -8 * s, 7 * s, 9 * s, 3 * s, color);
}

/**
 * 基本のねこ（白いまるい体）
 * opts: s(スケール), color, eye, hat(fn), hand(fn)
 */
function drawCatBody(ctx, a, { s = 1, color = '#fff', eye = 'dot', lean = 0, inner = '#ffb6c1', tail = true } = {}) {
  const by = -22 * s - a.bob * 3 * s;
  ctx.save();
  ctx.translate(lean * 6 * s, 0);
  ctx.rotate(lean * 0.15);
  if (tail) catTail(ctx, -14 * s, by + 6 * s, s, a.t, color);
  catLegs(ctx, s, a.step, color);
  catEars(ctx, 0, by - 12 * s, s, color, inner);
  const sq = 1 + a.squash * 0.15;
  ellipse(ctx, 0, by, 20 * s * sq, 17 * s / sq, color);
  catFace(ctx, 3 * s, by - 2 * s, s, { eye });
  ctx.restore();
  return by;
}

function attackLean(a) {
  if (!a.attacking) return 0;
  return a.swing < 0 ? a.swing : a.swing * 0.8;
}

// ---------- ねこユニット ----------
const CATS = {
  neko(ctx, a) {
    const lean = attackLean(a);
    drawCatBody(ctx, a, { lean, eye: a.attacking ? 'angry' : 'dot' });
    // ねこパンチ
    if (a.attacking) {
      const px = 14 + Math.max(0, a.swing) * 16;
      circle(ctx, px, -20, 6, '#fff');
    } else {
      circle(ctx, 14, -16 + a.bob * 2, 5.5, '#fff');
    }
  },

  tank(ctx, a) {
    const lean = attackLean(a) * 0.5;
    const s = 1.15;
    const by = drawCatBody(ctx, a, { s, lean, eye: 'dot' });
    // ヘルメット
    ctx.save();
    ctx.translate(lean * 6 * s, 0);
    ctx.beginPath();
    ctx.ellipse(0, by - 10 * s, 22 * s, 14 * s, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#8a97a6'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OUT; ctx.stroke();
    roundRect(ctx, -24 * s, by - 12 * s, 48 * s, 6 * s, 3 * s, '#6c7986');
    circle(ctx, -10 * s, by - 9 * s, 1.6 * s, '#cfd8e2', null);
    circle(ctx, 10 * s, by - 9 * s, 1.6 * s, '#cfd8e2', null);
    // シールド
    const sx = 22 * s + Math.max(0, a.swing) * 6;
    roundRect(ctx, sx - 6 * s, by - 10 * s, 12 * s, 30 * s, 5 * s, '#5b6ee1');
    roundRect(ctx, sx - 3 * s, by - 6 * s, 6 * s, 22 * s, 3 * s, '#ffd166', null);
    ctx.restore();
  },

  axe(ctx, a) {
    const lean = attackLean(a);
    const by = drawCatBody(ctx, a, { lean, eye: a.attacking ? 'angry' : 'dot' });
    ctx.save();
    ctx.translate(lean * 6, 0);
    // はちまき
    roundRect(ctx, -20, by - 9, 40, 6, 3, '#e63946');
    line(ctx, -19, by - 6, -30, by - 14 + Math.sin(a.t * 6) * 2, '#e63946', 3.5);
    line(ctx, -19, by - 6, -29, by - 2 + Math.sin(a.t * 5) * 2, '#e63946', 3.5);
    // オノ
    const ang = a.attacking ? (a.swing < 0 ? -1.6 + a.swing * 1.2 : -1.6 + a.swing * 2.6) : -1.2 + Math.sin(a.t * 3) * 0.05;
    ctx.translate(12, by + 4);
    ctx.rotate(ang);
    line(ctx, 0, 0, 0, -34, '#8d5a2b', 4.5);
    poly(ctx, [[-2, -34], [16, -42], [18, -22], [-2, -26]], '#cfd8e2');
    line(ctx, 15, -40, 17, -24, '#fff', 1.5);
    ctx.restore();
    circle(ctx, 12 + lean * 6, by + 4, 5, '#fff');
  },

  legs(ctx, a) {
    const s = 0.8;
    const lift = 44;
    const stomp = a.attacking && a.swing > 0.6 ? (a.swing - 0.6) * 20 : 0;
    // 長い足
    const k = a.step * 10;
    const kneeBend = a.attacking ? 6 : 0;
    const legPts = (x0, ph) => {
      const kx = x0 + ph * 0.5;
      const ky = -lift * 0.55 + kneeBend;
      line(ctx, x0 + ph, 0, kx, ky, OUT, 6.5);
      line(ctx, kx, ky, x0, -lift + stomp, OUT, 6.5);
      line(ctx, x0 + ph, 0, kx, ky, '#fff', 3.5);
      line(ctx, kx, ky, x0, -lift + stomp, '#fff', 3.5);
      ellipse(ctx, x0 + ph, 0, 6, 3, '#fff');
    };
    legPts(-8, k);
    legPts(8, -k);
    ctx.save();
    ctx.translate(0, -lift + stomp);
    const lean = attackLean(a) * 0.3;
    drawCatBody(ctx, { ...a, step: 0, bob: 0 }, { s, lean, eye: a.attacking ? 'angry' : 'dot', tail: true });
    ctx.restore();
  },

  cow(ctx, a) {
    // ウシの体 + ねこの顔
    const gallop = a.step;
    const body = -24 - a.bob * 4;
    // 足（4本）
    const legs = [[-20, gallop], [-10, -gallop], [10, gallop], [20, -gallop]];
    for (const [x, ph] of legs) {
      roundRect(ctx, x - 4 + ph * 6, -16, 8, 17, 3, '#fff');
      roundRect(ctx, x - 4 + ph * 6, -4, 8, 5, 2, '#444', null);
    }
    catTail(ctx, -30, body + 2, 1, a.t * 2, '#fff');
    ellipse(ctx, 0, body, 32, 15, '#fff');
    // ぶち模様
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, body, 31, 14, 0, 0, Math.PI * 2); ctx.clip();
    ellipse(ctx, -14, body - 6, 9, 7, '#2b2b2b', null);
    ellipse(ctx, 10, body + 6, 10, 6, '#2b2b2b', null);
    ellipse(ctx, 22, body - 8, 6, 5, '#2b2b2b', null);
    ctx.restore();
    // 頭（前上）
    const hx = 26 + Math.max(0, a.swing) * 6;
    const hy = body - 16;
    catEars(ctx, hx, hy - 8, 0.85);
    ellipse(ctx, hx, hy, 15, 13, '#fff');
    catFace(ctx, hx + 2, hy - 1, 0.85, { eye: a.attacking ? 'angry' : 'dot' });
    // つの
    poly(ctx, [[hx - 10, hy - 13], [hx - 16, hy - 24], [hx - 5, hy - 16]], '#ffd166');
    poly(ctx, [[hx + 10, hy - 13], [hx + 16, hy - 24], [hx + 5, hy - 16]], '#ffd166');
  },

  bird(ctx, a) {
    const hover = -12 + Math.sin(a.t * 5) * 4;
    ctx.save();
    ctx.translate(0, hover - (a.attacking ? Math.max(0, a.swing) * 10 : 0));
    const flap = Math.sin(a.t * 14) * 0.6;
    // 後ろのはね
    ctx.save();
    ctx.translate(-8, -26);
    ctx.rotate(-0.5 + flap);
    ellipse(ctx, -14, 0, 18, 7, '#ffe08a');
    ctx.restore();
    const by = drawCatBody(ctx, { ...a, step: 0, bob: 0 }, { lean: 0.1, eye: a.attacking ? 'angry' : 'dot', tail: false });
    // 前のはね
    ctx.save();
    ctx.translate(-4, by);
    ctx.rotate(0.4 - flap);
    ellipse(ctx, -14, 0, 18, 7, '#ffd166');
    ctx.restore();
    // くちばし
    poly(ctx, [[20, by + 1], [34 + Math.max(0, a.swing) * 6, by + 5], [20, by + 9]], '#ff9f1c');
    // あし
    line(ctx, -4, by + 16, -6, by + 24, '#ff9f1c', 2.5);
    line(ctx, 4, by + 16, 6, by + 24, '#ff9f1c', 2.5);
    ctx.restore();
  },

  fish(ctx, a) {
    const lean = attackLean(a);
    const s = 1.1;
    const by = drawCatBody(ctx, a, { s, lean, color: '#e8f6ff', eye: a.attacking ? 'angry' : 'dot', tail: false, inner: '#9bd3ff' });
    ctx.save();
    ctx.translate(lean * 6 * s, 0);
    // 背びれ
    poly(ctx, [[-6 * s, by - 16 * s], [0, by - 34 * s], [8 * s, by - 17 * s]], '#4ea8de');
    // 尾びれ
    const wag = Math.sin(a.t * 6) * 0.3;
    ctx.save();
    ctx.translate(-20 * s, by + 4 * s);
    ctx.rotate(wag);
    poly(ctx, [[0, 0], [-18 * s, -12 * s], [-14 * s, 0], [-18 * s, 12 * s]], '#4ea8de');
    ctx.restore();
    // 腹びれ(手)
    const px = 16 * s + Math.max(0, a.swing) * 18;
    poly(ctx, [[px - 4 * s, by + 2 * s], [px + 10 * s, by - 4 * s], [px + 8 * s, by + 10 * s]], '#4ea8de');
    // あわ
    for (let i = 0; i < 3; i++) {
      const ph = (a.t * 0.7 + i * 0.33) % 1;
      ctx.globalAlpha = (1 - ph) * 0.6;
      circle(ctx, -24 * s + Math.sin(ph * 6 + i) * 4, by - 10 * s - ph * 30, 2 + i, null, '#4ea8de', 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  ninja(ctx, a) {
    const lean = attackLean(a) * 1.2;
    const by = drawCatBody(ctx, a, { lean, color: '#2f3b63', eye: 'white', inner: '#5b6ee1' });
    ctx.save();
    ctx.translate(lean * 6, 0);
    // マフラー
    roundRect(ctx, -14, by + 6, 28, 6, 3, '#e63946');
    const w1 = Math.sin(a.t * 8) * 3;
    line(ctx, -14, by + 9, -34, by + 2 + w1, '#e63946', 4);
    line(ctx, -14, by + 9, -36, by + 10 - w1, '#e63946', 4);
    // 刀
    if (a.attacking && a.swing > 0.2) {
      ctx.globalAlpha = 0.85 * Math.min(1, (a.swing - 0.2) * 3);
      ctx.beginPath();
      ctx.arc(10, by, 30, -1.4, 0.8);
      ctx.lineWidth = 5; ctx.strokeStyle = '#e8f6ff'; ctx.stroke();
      ctx.globalAlpha = 1;
    }
    line(ctx, 10, by + 4, 32, by - 14, '#8d5a2b', 4);
    line(ctx, 18, by - 3, 36, by - 18, '#dfe7ef', 3);
    ctx.restore();
  },

  mage(ctx, a) {
    const lean = attackLean(a) * 0.5;
    const by = drawCatBody(ctx, a, { lean, eye: 'dot' });
    ctx.save();
    ctx.translate(lean * 6, 0);
    // とんがり帽子
    ellipse(ctx, 0, by - 14, 26, 6, '#7b2cbf');
    poly(ctx, [[-16, by - 15], [4, by - 52 + Math.sin(a.t * 3) * 2], [16, by - 15]], '#9d4edd');
    circle(ctx, 2, by - 36, 3.5, '#ffd166', null);
    // 杖
    const glow = a.attacking ? Math.max(0, a.swing) : 0.3 + Math.sin(a.t * 4) * 0.1;
    line(ctx, 16, by + 14, 26, by - 24, '#8d5a2b', 4);
    ctx.globalAlpha = 0.35 + glow * 0.5;
    circle(ctx, 27, by - 27, 9 + glow * 6, '#b5e2ff', null);
    ctx.globalAlpha = 1;
    circle(ctx, 27, by - 27, 6, '#4cc9f0');
    ctx.restore();
  },

  lizard(ctx, a) {
    const lean = attackLean(a) * 0.6;
    const by = drawCatBody(ctx, a, { lean, color: '#b7f0a1', eye: a.attacking ? 'angry' : 'dot', inner: '#7bd389' });
    ctx.save();
    ctx.translate(lean * 6, 0);
    // せびれ
    for (let i = 0; i < 3; i++) poly(ctx, [[-10 + i * 7, by - 15], [-6 + i * 7, by - 25], [-2 + i * 7, by - 15]], '#52b788');
    // ベロ
    if (a.attacking) {
      const len = a.swing < 0 ? 0 : Math.min(1, a.swing) * 70 * (a.swing > 1 ? Math.max(0, 1.6 - a.swing) : 1);
      if (len > 0) {
        line(ctx, 18, by + 4, 18 + len, by + 2 + Math.sin(a.t * 30) * 2, '#ff5d8f', 4);
        poly(ctx, [[18 + len, by - 2], [26 + len, by + 2], [18 + len, by + 6]], '#ff5d8f');
      }
    }
    ctx.restore();
  },

  knight(ctx, a) {
    const lean = attackLean(a);
    const s = 1.1;
    const by = drawCatBody(ctx, a, { s, lean, color: '#dfe7ef', eye: 'dot', inner: '#9aa8b8' });
    ctx.save();
    ctx.translate(lean * 6 * s, 0);
    // かぶと + 羽かざり
    ctx.beginPath();
    ctx.ellipse(0, by - 8 * s, 22 * s, 13 * s, 0, Math.PI, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#aab7c7'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6 * s, by - 20 * s);
    ctx.quadraticCurveTo(-20 * s, by - 34 * s + Math.sin(a.t * 5) * 2, -30 * s, by - 20 * s);
    ctx.lineWidth = 6 * s; ctx.strokeStyle = '#e63946'; ctx.lineCap = 'round'; ctx.stroke();
    // ランス
    const lx = 12 * s + Math.max(0, a.swing) * 22;
    line(ctx, lx - 10 * s, by + 8 * s, lx + 36 * s, by - 2 * s, OUT, 7);
    line(ctx, lx - 10 * s, by + 8 * s, lx + 36 * s, by - 2 * s, '#ffd166', 4);
    poly(ctx, [[lx + 34 * s, by - 6 * s], [lx + 46 * s, by - 1 * s], [lx + 34 * s, by + 3 * s]], '#dfe7ef');
    // たて
    roundRect(ctx, -2 * s, by - 2 * s, 12 * s, 22 * s, 5 * s, '#5b6ee1');
    ctx.restore();
  },

  titan(ctx, a) {
    const s = 2.0;
    const lean = attackLean(a) * 0.4;
    const slam = a.attacking ? (a.swing < 0 ? -a.swing * 30 : Math.max(0, 1 - a.swing) * 10) : 0;
    const by = drawCatBody(ctx, a, { s, lean, color: '#cfd3d8', eye: a.attacking ? 'angry' : 'dot', inner: '#9aa0a8', tail: false });
    ctx.save();
    ctx.translate(lean * 6 * s, 0);
    // ひび模様
    line(ctx, -8 * s, by - 8 * s, -2 * s, by + 2 * s, '#9aa0a8', 2);
    line(ctx, -2 * s, by + 2 * s, -8 * s, by + 10 * s, '#9aa0a8', 2);
    // 大きなこぶし
    const fy = a.attacking && a.swing >= 0 && a.swing <= 1 ? by + 18 * s - slam * 0 + (a.swing) * 10 : by - slam * 0.5;
    circle(ctx, 24 * s, (a.attacking ? (a.swing < 0 ? by - 20 * s - slam : by + 12 * s) : by + 4 * s), 10 * s, '#cfd3d8');
    circle(ctx, -22 * s, by + 6 * s, 9 * s, '#cfd3d8');
    void fy;
    ctx.restore();
  }
};

// ---------- 敵 ----------
const ENEMIES = {
  dog(ctx, a) {
    const by = -18 - a.bob * 3;
    const legs = [[-10, a.step], [8, -a.step]];
    for (const [x, ph] of legs) roundRect(ctx, x - 4 + ph * 4, -12, 8, 13, 3, '#b5651d');
    // しっぽ
    line(ctx, -18, by - 2, -28, by - 14 + Math.sin(a.t * 10) * 4, '#b5651d', 5);
    ellipse(ctx, 0, by, 20, 14, '#c97b2e');
    // 頭
    const hx = 14 + Math.max(0, a.swing) * 8;
    ellipse(ctx, hx, by - 8, 13, 11, '#c97b2e');
    ellipse(ctx, hx - 10, by - 6, 5, 9, '#8d5a2b', OUT, LW, 0.4); // たれ耳
    ellipse(ctx, hx + 10, by - 2, 7, 5, '#f1d2a9'); // 口元
    circle(ctx, hx + 13, by - 4, 2.5, OUT, null);
    circle(ctx, hx + 2, by - 11, 2, OUT, null);
    circle(ctx, hx + 7, by - 12, 2, OUT, null);
  },

  snake(ctx, a) {
    const segs = 6;
    for (let i = segs - 1; i >= 0; i--) {
      const x = -i * 9;
      const y = -8 + Math.sin(a.t * 10 - i * 0.9) * 4;
      const r = 8 - i * 0.6;
      circle(ctx, x, y, r, i % 2 ? '#52b788' : '#74c69d');
    }
    const hx = 8 + Math.max(0, a.swing) * 10;
    ellipse(ctx, hx, -12, 11, 8, '#52b788');
    circle(ctx, hx + 4, -15, 2, OUT, null);
    circle(ctx, hx + 4, -9, 2, OUT, null);
    const tongue = 6 + Math.sin(a.t * 12) * 3;
    line(ctx, hx + 11, -12, hx + 11 + tongue, -12, '#ff5d8f', 2);
    line(ctx, hx + 11 + tongue, -12, hx + 14 + tongue, -14, '#ff5d8f', 2);
    line(ctx, hx + 11 + tongue, -12, hx + 14 + tongue, -10, '#ff5d8f', 2);
  },

  boar(ctx, a) {
    const by = -22 - a.bob * 2;
    const legs = [[-16, a.step], [-6, -a.step], [8, a.step], [18, -a.step]];
    for (const [x, ph] of legs) roundRect(ctx, x - 4 + ph * 5, -14, 8, 15, 3, '#5e3a1c');
    ellipse(ctx, 0, by, 28, 16, '#7a4a21');
    // たてがみ
    for (let i = 0; i < 5; i++) poly(ctx, [[-16 + i * 6, by - 14], [-12 + i * 6, by - 22], [-9 + i * 6, by - 14]], '#4a2b10');
    const hx = 24 + Math.max(0, a.swing) * 8;
    ellipse(ctx, hx, by - 2, 14, 12, '#7a4a21');
    ellipse(ctx, hx + 11, by + 2, 6, 5, '#f4a6a6');
    // きば
    poly(ctx, [[hx + 6, by + 5], [hx + 14, by + 14], [hx + 10, by + 4]], '#fff');
    circle(ctx, hx + 2, by - 6, 2.2, OUT, null);
    ellipse(ctx, hx - 6, by - 12, 4, 6, '#7a4a21');
  },

  crow(ctx, a) {
    const hover = -26 + Math.sin(a.t * 5) * 5;
    ctx.save();
    ctx.translate(0, hover);
    const flap = Math.sin(a.t * 12) * 0.7;
    ctx.save(); ctx.translate(-6, -8); ctx.rotate(-0.4 + flap); ellipse(ctx, -16, 0, 20, 7, '#2b2b45'); ctx.restore();
    ellipse(ctx, 0, 0, 18, 12, '#3a3a5c');
    ctx.save(); ctx.translate(-2, -2); ctx.rotate(0.5 - flap); ellipse(ctx, -16, 0, 20, 7, '#2b2b45'); ctx.restore();
    const hx = 14 + Math.max(0, a.swing) * 8;
    circle(ctx, hx, -8, 9, '#3a3a5c');
    poly(ctx, [[hx + 7, -10], [hx + 20, -6], [hx + 7, -3]], '#ff9f1c');
    circle(ctx, hx + 2, -10, 2.6, '#fff', null);
    circle(ctx, hx + 3, -10, 1.3, OUT, null);
    // しっぽ
    poly(ctx, [[-16, 2], [-30, -4], [-30, 8]], '#2b2b45');
    ctx.restore();
  },

  rhino(ctx, a) {
    const s = 1.5;
    const by = -24 * s - a.bob * 2;
    const legs = [[-18, a.step], [-6, -a.step], [10, a.step], [20, -a.step]];
    for (const [x, ph] of legs) roundRect(ctx, (x - 5 + ph * 3) * s, -16 * s, 10 * s, 17 * s, 4 * s, '#8d99a6');
    ellipse(ctx, 0, by, 30 * s, 17 * s, '#a3adb8');
    // よろい板
    roundRect(ctx, -18 * s, by - 16 * s, 30 * s, 10 * s, 5 * s, '#8d99a6');
    const hx = (26 + Math.max(0, a.swing) * 6) * s;
    ellipse(ctx, hx, by + 2 * s, 14 * s, 11 * s, '#a3adb8');
    // つの
    poly(ctx, [[hx + 6 * s, by - 6 * s], [hx + 18 * s, by - 24 * s], [hx + 13 * s, by - 2 * s]], '#f1e3c6');
    circle(ctx, hx + 1 * s, by - 3 * s, 2.5, OUT, null);
    ellipse(ctx, hx - 6 * s, by - 12 * s, 4 * s, 5 * s, '#a3adb8');
  },

  ghost(ctx, a) {
    const hover = -20 + Math.sin(a.t * 4) * 6;
    ctx.save();
    ctx.translate(0, hover);
    ctx.globalAlpha *= 0.88;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-18, -20);
    ctx.arc(0, -20, 18, Math.PI, 0);
    ctx.lineTo(18, 0);
    for (let i = 0; i < 4; i++) {
      const x = 18 - (i + 0.5) * 9;
      ctx.quadraticCurveTo(x, 8 + Math.sin(a.t * 8 + i) * 3, x - 4.5, 0);
    }
    ctx.closePath();
    ctx.fillStyle = '#f4f4ff'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OUT; ctx.stroke();
    const ex = 4 + Math.max(0, a.swing) * 4;
    ellipse(ctx, ex - 5, -22, 3, 5, OUT, null);
    ellipse(ctx, ex + 6, -22, 3, 5, OUT, null);
    ellipse(ctx, ex + 1, -12, 4, a.attacking ? 6 : 3, OUT, null);
    ctx.restore();
  },

  hippo(ctx, a) {
    const s = 1.7;
    const by = -22 * s - a.bob * 2;
    const legs = [[-18, a.step], [-6, -a.step], [10, a.step], [20, -a.step]];
    for (const [x, ph] of legs) roundRect(ctx, (x - 5 + ph * 2) * s, -14 * s, 11 * s, 15 * s, 4 * s, '#7a5aa6');
    ellipse(ctx, 0, by, 32 * s, 18 * s, '#8e6bc1');
    const open = a.attacking ? Math.max(0, Math.min(1, a.swing)) * 10 * s : 0;
    const hx = 26 * s;
    // 上あご
    ellipse(ctx, hx, by - 4 * s - open * 0.3, 16 * s, 11 * s, '#8e6bc1');
    // 下あご
    ellipse(ctx, hx + 2 * s, by + 8 * s + open, 14 * s, 7 * s, '#7a5aa6');
    if (open > 2) {
      roundRect(ctx, hx - 6 * s, by + 2 * s, 18 * s, open, 2, '#4a2a5a', null);
      for (let i = 0; i < 3; i++) poly(ctx, [[hx - 2 * s + i * 6 * s, by + 3 * s], [hx + 1 * s + i * 6 * s, by + 3 * s + 5], [hx + 4 * s + i * 6 * s, by + 3 * s]], '#fff', null);
    }
    circle(ctx, hx + 2 * s, by - 10 * s, 2.6, OUT, null);
    ellipse(ctx, hx - 4 * s, by - 16 * s, 4 * s, 4 * s, '#8e6bc1');
    circle(ctx, hx + 12 * s, by - 6 * s, 2, OUT, null);
  },

  gorilla(ctx, a) {
    const s = 1.5;
    const by = -26 * s - a.bob * 2;
    roundRect(ctx, -10 * s + a.step * 3, -14 * s, 10 * s, 15 * s, 4 * s, '#3b3b3b');
    roundRect(ctx, 2 * s - a.step * 3, -14 * s, 10 * s, 15 * s, 4 * s, '#3b3b3b');
    ellipse(ctx, 0, by, 24 * s, 20 * s, '#4a4a4a');
    ellipse(ctx, 2 * s, by + 6 * s, 14 * s, 10 * s, '#8a7a6a', null);
    // うで（ドラミング）
    const pound = a.attacking ? Math.sin(Math.max(0, a.swing) * Math.PI * 3) * 8 * s : 0;
    circle(ctx, -22 * s, by + 10 * s - pound, 8 * s, '#3b3b3b');
    circle(ctx, 24 * s + Math.max(0, a.swing) * 10, by + 8 * s + pound, 8 * s, '#3b3b3b');
    // 顔
    ellipse(ctx, 10 * s, by - 10 * s, 13 * s, 11 * s, '#3b3b3b');
    ellipse(ctx, 13 * s, by - 7 * s, 9 * s, 6 * s, '#8a7a6a', null);
    circle(ctx, 9 * s, by - 13 * s, 2.5, '#ff5d8f', null);
    circle(ctx, 16 * s, by - 13 * s, 2.5, '#ff5d8f', null);
  },

  bear(ctx, a) {
    const s = 2.2;
    const by = -26 * s - a.bob * 2;
    roundRect(ctx, -14 * s + a.step * 3, -16 * s, 12 * s, 17 * s, 5 * s, '#6b3e1e');
    roundRect(ctx, 2 * s - a.step * 3, -16 * s, 12 * s, 17 * s, 5 * s, '#6b3e1e');
    // マント
    poly(ctx, [[-10 * s, by - 18 * s], [-30 * s + Math.sin(a.t * 3) * 3, by + 20 * s], [-6 * s, by + 14 * s]], '#c1121f');
    ellipse(ctx, 0, by, 26 * s, 22 * s, '#8a5a2b');
    ellipse(ctx, 4 * s, by + 8 * s, 14 * s, 10 * s, '#d9b48f', null);
    // うで
    const swipe = a.attacking ? Math.max(0, a.swing) : 0;
    circle(ctx, 26 * s + swipe * 14, by - 4 * s + swipe * 16, 9 * s, '#6b3e1e');
    for (let i = 0; i < 3; i++) line(ctx, 30 * s + swipe * 14 + i * 5, by + 2 * s + swipe * 16, 36 * s + swipe * 14 + i * 5, by + 8 * s + swipe * 16, '#fff', 2.5);
    circle(ctx, -24 * s, by + 4 * s, 8 * s, '#6b3e1e');
    // 顔
    circle(ctx, 8 * s, by - 16 * s, 11 * s, '#8a5a2b');
    circle(ctx, 0, by - 24 * s, 4 * s, '#6b3e1e');
    circle(ctx, 16 * s, by - 24 * s, 4 * s, '#6b3e1e');
    ellipse(ctx, 13 * s, by - 13 * s, 6 * s, 4 * s, '#d9b48f', null);
    circle(ctx, 15 * s, by - 14 * s, 2.2, OUT, null);
    circle(ctx, 5 * s, by - 18 * s, 2.5, '#fff', null); circle(ctx, 5.5 * s, by - 18 * s, 1.4, OUT, null);
    circle(ctx, 13 * s, by - 19 * s, 2.5, '#fff', null); circle(ctx, 13.5 * s, by - 19 * s, 1.4, OUT, null);
    // 王冠
    poly(ctx, [[0, by - 26 * s], [2 * s, by - 36 * s], [6 * s, by - 29 * s], [9 * s, by - 38 * s], [12 * s, by - 29 * s], [16 * s, by - 36 * s], [17 * s, by - 26 * s]], '#ffd166');
  },

  dragon(ctx, a) {
    const s = 2.0;
    const by = -26 * s - a.bob * 2;
    roundRect(ctx, -14 * s + a.step * 3, -16 * s, 11 * s, 17 * s, 5 * s, '#9b2226');
    roundRect(ctx, 4 * s - a.step * 3, -16 * s, 11 * s, 17 * s, 5 * s, '#9b2226');
    // はね
    const flap = Math.sin(a.t * 6) * 0.3;
    ctx.save(); ctx.translate(-6 * s, by - 10 * s); ctx.rotate(-0.6 + flap);
    poly(ctx, [[0, 0], [-30 * s, -26 * s], [-26 * s, -4 * s], [-40 * s, 2 * s], [-10 * s, 6 * s]], '#ae2012');
    ctx.restore();
    // しっぽ
    ctx.beginPath(); ctx.moveTo(-22 * s, by + 6 * s);
    ctx.quadraticCurveTo(-42 * s, by + 14 * s, -46 * s, by - 6 * s + Math.sin(a.t * 3) * 6);
    ctx.lineWidth = 8 * s; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke();
    ctx.lineWidth = 5 * s; ctx.strokeStyle = '#bb3e03'; ctx.stroke();
    ellipse(ctx, 0, by, 26 * s, 20 * s, '#bb3e03');
    ellipse(ctx, 4 * s, by + 8 * s, 14 * s, 9 * s, '#ffb703', null);
    // 首と頭
    const nx = 24 * s, ny = by - 20 * s;
    line(ctx, 14 * s, by - 8 * s, nx, ny, OUT, 12 * s);
    line(ctx, 14 * s, by - 8 * s, nx, ny, '#bb3e03', 9 * s);
    const open = a.attacking ? Math.max(0, Math.min(1, a.swing)) : 0;
    ellipse(ctx, nx + 6 * s, ny - 2 * s, 14 * s, 9 * s, '#bb3e03');
    ellipse(ctx, nx + 10 * s, ny + 6 * s + open * 8, 10 * s, 4 * s, '#9b2226');
    poly(ctx, [[nx - 2 * s, ny - 10 * s], [nx - 6 * s, ny - 22 * s], [nx + 4 * s, ny - 10 * s]], '#ffb703');
    poly(ctx, [[nx + 6 * s, ny - 10 * s], [nx + 4 * s, ny - 22 * s], [nx + 12 * s, ny - 10 * s]], '#ffb703');
    circle(ctx, nx + 8 * s, ny - 5 * s, 2.5 * s, '#ffd166', null);
    circle(ctx, nx + 9 * s, ny - 5 * s, 1.2 * s, OUT, null);
    // 火
    if (a.attacking && a.swing > 0.5 && a.swing < 1.6) {
      const p = Math.min(1, (a.swing - 0.5) * 1.5);
      ctx.globalAlpha = Math.max(0, 1.6 - a.swing) * 0.9;
      for (let i = 0; i < 6; i++) {
        const fx = nx + 20 * s + i * 14 * p;
        circle(ctx, fx, ny + 2 * s + Math.sin(a.t * 20 + i) * 4, (10 - i) * 1.2, i % 2 ? '#ffb703' : '#f48c06', null);
      }
      ctx.globalAlpha = 1;
    }
  },

  mech(ctx, a) {
    const s = 1.9;
    const by = -24 * s - a.bob;
    // キャタピラ
    roundRect(ctx, -26 * s, -14 * s, 52 * s, 14 * s, 7 * s, '#495057');
    for (let i = 0; i < 6; i++) circle(ctx, -20 * s + i * 8 * s, -7 * s, 3 * s, '#adb5bd', null);
    ellipse(ctx, 0, by, 26 * s, 16 * s, '#ced4da');
    roundRect(ctx, -12 * s, by - 6 * s, 24 * s, 12 * s, 3 * s, '#868e96');
    // 耳（ネズミ）
    circle(ctx, 2 * s, by - 20 * s, 7 * s, '#ced4da');
    circle(ctx, 18 * s, by - 20 * s, 7 * s, '#ced4da');
    circle(ctx, 2 * s, by - 20 * s, 3.5 * s, '#ff5d8f', null);
    circle(ctx, 18 * s, by - 20 * s, 3.5 * s, '#ff5d8f', null);
    // 顔
    const hx = 14 * s + Math.max(0, a.swing) * 6;
    ellipse(ctx, hx, by - 8 * s, 14 * s, 10 * s, '#ced4da');
    poly(ctx, [[hx + 10 * s, by - 10 * s], [hx + 24 * s, by - 6 * s], [hx + 10 * s, by - 2 * s]], '#adb5bd');
    const blink = (Math.sin(a.t * 10) + 1) / 2;
    circle(ctx, hx + 2 * s, by - 10 * s, 3 * s, `rgba(255,${Math.round(60 + blink * 60)},60,1)`, null);
    circle(ctx, hx + 2 * s, by - 10 * s, 3 * s, null, '#ff6b6b', 1);
    // アンテナ
    line(ctx, -6 * s, by - 16 * s, -10 * s, by - 32 * s, '#868e96', 3);
    circle(ctx, -10 * s, by - 33 * s, 3 * s, blink > 0.5 ? '#ffd166' : '#ff9f1c', null);
    // レーザー
    if (a.attacking && a.swing > 0.6 && a.swing < 1.4) {
      ctx.globalAlpha = Math.max(0, 1.4 - a.swing);
      line(ctx, hx + 4 * s, by - 10 * s, hx + 4 * s + 160, by - 12 * s, '#ff6b6b', 5);
      line(ctx, hx + 4 * s, by - 10 * s, hx + 4 * s + 160, by - 12 * s, '#fff', 2);
      ctx.globalAlpha = 1;
    }
  },

  demon(ctx, a) {
    const s = 2.4;
    const by = -28 * s - a.bob * 2;
    roundRect(ctx, -14 * s + a.step * 3, -18 * s, 12 * s, 19 * s, 5 * s, '#3c096c');
    roundRect(ctx, 2 * s - a.step * 3, -18 * s, 12 * s, 19 * s, 5 * s, '#3c096c');
    // マント
    poly(ctx, [[-12 * s, by - 20 * s], [-36 * s + Math.sin(a.t * 3) * 4, by + 22 * s], [-6 * s, by + 16 * s]], '#240046');
    ellipse(ctx, 0, by, 26 * s, 24 * s, '#5a189a');
    ellipse(ctx, 4 * s, by + 10 * s, 14 * s, 9 * s, '#9d4edd', null);
    // つの
    poly(ctx, [[-14 * s, by - 16 * s], [-22 * s, by - 40 * s], [-4 * s, by - 20 * s]], '#f1e3c6');
    poly(ctx, [[14 * s, by - 16 * s], [22 * s, by - 40 * s], [4 * s, by - 20 * s]], '#f1e3c6');
    // 顔
    circle(ctx, -6 * s, by - 6 * s, 3 * s, '#ffd166', null);
    circle(ctx, 8 * s, by - 6 * s, 3 * s, '#ffd166', null);
    circle(ctx, -5 * s, by - 6 * s, 1.4 * s, '#c1121f', null);
    circle(ctx, 9 * s, by - 6 * s, 1.4 * s, '#c1121f', null);
    ctx.beginPath(); ctx.arc(1 * s, by + 2 * s, 8 * s, 0.1, Math.PI - 0.1); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    for (let i = 0; i < 4; i++) poly(ctx, [[-5 * s + i * 3.5 * s, by + 4 * s], [-3.5 * s + i * 3.5 * s, by + 8 * s], [-2 * s + i * 3.5 * s, by + 4 * s]], '#fff', null);
    // トライデント
    const tx = 24 * s + Math.max(0, a.swing) * 20;
    line(ctx, tx - 4 * s, by + 16 * s, tx + 6 * s, by - 30 * s, OUT, 7);
    line(ctx, tx - 4 * s, by + 16 * s, tx + 6 * s, by - 30 * s, '#ffd166', 4);
    poly(ctx, [[tx - 2 * s, by - 28 * s], [tx + 6 * s, by - 44 * s], [tx + 14 * s, by - 28 * s], [tx + 10 * s, by - 28 * s], [tx + 6 * s, by - 36 * s], [tx + 2 * s, by - 28 * s]], '#ffd166');
    // オーラ
    ctx.globalAlpha = 0.25 + Math.sin(a.t * 4) * 0.1;
    circle(ctx, 0, by, 36 * s, null, '#c77dff', 6);
    ctx.globalAlpha = 1;
  }
};

/** スプライトのおおよその高さ（HPバー等の配置用） */
export const SPRITE_HEIGHT = {
  neko: 50, tank: 56, axe: 60, legs: 90, cow: 66, bird: 66, fish: 56, ninja: 50, mage: 80, lizard: 54, knight: 66, titan: 100,
  dog: 42, snake: 26, boar: 50, crow: 56, rhino: 76, ghost: 60, hippo: 76, gorilla: 80, bear: 130, dragon: 130, mech: 110, demon: 150
};

/** スプライトのおおよその幅の半分（当たり/シャドウ用） */
export const SPRITE_HALF_W = {
  neko: 22, tank: 26, axe: 24, legs: 18, cow: 34, bird: 30, fish: 30, ninja: 24, mage: 26, lizard: 24, knight: 30, titan: 48,
  dog: 28, snake: 40, boar: 40, crow: 32, rhino: 60, ghost: 20, hippo: 70, gorilla: 50, bear: 70, dragon: 80, mech: 60, demon: 80
};

/**
 * エンティティを描く。ctx は足もと原点、+x が進行方向になるように変換済みであること。
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} id ユニットID or 敵ID
 * @param {Anim} a
 */
export function drawSprite(ctx, id, a) {
  const fn = CATS[id] || ENEMIES[id];
  if (!fn) { circle(ctx, 0, -20, 18, '#f0f'); return; }
  fn(ctx, a);
}

export function isCat(id) { return !!CATS[id]; }

/** アイコン用: 静止ポーズの Anim を返す */
export function idleAnim(t = 0) {
  return { t, bob: 0, step: 0, swing: 0, attacking: false, hurt: 0, dead: 0, squash: 0 };
}

// ---------- 城 ----------
export function drawPlayerCastle(ctx, hpRatio, t, flash) {
  // ねこ城（クリーム色のタワー、ねこ耳の屋根）
  ctx.save();
  const dmg = 1 - hpRatio;
  // 土台
  roundRect(ctx, -70, -30, 140, 34, 6, '#c9a27a');
  // 本体
  roundRect(ctx, -56, -150, 112, 124, 10, flash ? '#fff' : '#fff1dc');
  // 石のライン
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 2;
  for (let y = -140; y < -30; y += 18) { ctx.beginPath(); ctx.moveTo(-54, y); ctx.lineTo(54, y); ctx.stroke(); }
  // 窓
  roundRect(ctx, -14, -120, 28, 36, 14, '#5b6ee1');
  roundRect(ctx, -40, -90, 16, 22, 8, '#5b6ee1');
  roundRect(ctx, 24, -90, 16, 22, 8, '#5b6ee1');
  // ドア
  roundRect(ctx, -18, -66, 36, 40, 10, '#8d5a2b');
  // 屋根（ねこ顔）
  roundRect(ctx, -62, -176, 124, 32, 12, '#ff9fb2');
  poly(ctx, [[-58, -170], [-46, -206], [-30, -172]], '#ff9fb2');
  poly(ctx, [[58, -170], [46, -206], [30, -172]], '#ff9fb2');
  catFace(ctx, 0, -162, 1.4, { eye: hpRatio > 0.3 ? 'happy' : 'dot', blush: true });
  // 旗
  line(ctx, 0, -176, 0, -230, '#8d5a2b', 4);
  poly(ctx, [[0, -230], [34 + Math.sin(t * 4) * 3, -222], [0, -212]], '#e63946');
  // ひび
  if (dmg > 0.3) {
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(-30, -140); ctx.lineTo(-22, -120); ctx.lineTo(-32, -104); ctx.lineTo(-24, -84); ctx.stroke();
  }
  if (dmg > 0.6) {
    ctx.beginPath(); ctx.moveTo(34, -130); ctx.lineTo(28, -112); ctx.lineTo(40, -96); ctx.lineTo(30, -70); ctx.stroke();
  }
  ctx.restore();
}

export function drawEnemyCastle(ctx, hpRatio, t, flash, theme) {
  ctx.save();
  const dmg = 1 - hpRatio;
  const wall = flash ? '#fff' : '#5c5f6b';
  roundRect(ctx, -76, -30, 152, 34, 6, '#3d3f48');
  roundRect(ctx, -60, -160, 120, 134, 8, wall);
  // 石
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
  for (let y = -150; y < -30; y += 20) { ctx.beginPath(); ctx.moveTo(-58, y); ctx.lineTo(58, y); ctx.stroke(); }
  // 銃眼
  for (let i = -2; i <= 2; i++) roundRect(ctx, i * 24 - 8, -180, 16, 22, 2, wall);
  roundRect(ctx, -60, -168, 120, 10, 2, '#4a4d57');
  // 窓（光る）
  const glow = 0.6 + Math.sin(t * 3) * 0.3;
  roundRect(ctx, -12, -130, 24, 30, 4, `rgba(255,${Math.round(90 * glow)},60,${0.6 + glow * 0.3})`);
  roundRect(ctx, -40, -100, 14, 18, 3, `rgba(255,120,60,${0.5 + glow * 0.3})`);
  roundRect(ctx, 26, -100, 14, 18, 3, `rgba(255,120,60,${0.5 + glow * 0.3})`);
  // 門
  ctx.beginPath(); ctx.moveTo(-20, -26); ctx.lineTo(-20, -58); ctx.arc(0, -58, 20, Math.PI, 0); ctx.lineTo(20, -26); ctx.closePath();
  ctx.fillStyle = '#1f2027'; ctx.fill(); ctx.lineWidth = LW; ctx.strokeStyle = OUT; ctx.stroke();
  // とげ
  for (let i = -2; i <= 2; i++) poly(ctx, [[i * 24 - 7, -180], [i * 24, -200], [i * 24 + 7, -180]], '#2b2b2b');
  // 旗
  line(ctx, 0, -200, 0, -246, '#2b2b2b', 4);
  poly(ctx, [[0, -246], [-36 - Math.sin(t * 4) * 3, -238], [0, -228]], theme && theme.night ? '#9d4edd' : '#c1121f');
  // ひび
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
  if (dmg > 0.25) { ctx.beginPath(); ctx.moveTo(-34, -150); ctx.lineTo(-26, -128); ctx.lineTo(-38, -110); ctx.lineTo(-28, -90); ctx.stroke(); }
  if (dmg > 0.5) { ctx.beginPath(); ctx.moveTo(36, -140); ctx.lineTo(30, -118); ctx.lineTo(44, -100); ctx.lineTo(32, -70); ctx.stroke(); }
  if (dmg > 0.75) { ctx.beginPath(); ctx.moveTo(0, -160); ctx.lineTo(6, -140); ctx.lineTo(-4, -124); ctx.stroke(); }
  ctx.restore();
}

// ---------- 背景の飾り ----------
export function drawDeco(ctx, kind, x, y, scale, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  const s1 = (Math.sin(seed * 12.9898) + 1) / 2;
  switch (kind) {
    case 'tree':
      roundRect(ctx, -6, -40, 12, 42, 4, '#8d5a2b', null);
      circle(ctx, 0, -58, 28, '#4fa63f', null);
      circle(ctx, -18, -44, 18, '#5fb95f', null);
      circle(ctx, 18, -46, 18, '#5fb95f', null);
      break;
    case 'pine':
      roundRect(ctx, -5, -30, 10, 32, 3, '#6f5230', null);
      poly(ctx, [[-30, -28], [0, -70], [30, -28]], '#357a43', null);
      poly(ctx, [[-22, -56], [0, -96], [22, -56]], '#3e8a30', null);
      break;
    case 'cactus':
      roundRect(ctx, -8, -60, 16, 62, 8, '#4fa63f', null);
      roundRect(ctx, -26, -44, 20, 10, 5, '#4fa63f', null);
      roundRect(ctx, -26, -58, 10, 24, 5, '#4fa63f', null);
      roundRect(ctx, 6, -36, 20, 10, 5, '#4fa63f', null);
      roundRect(ctx, 16, -52, 10, 26, 5, '#4fa63f', null);
      break;
    case 'dead':
      line(ctx, 0, 0, 0, -60, '#3a3024', 7);
      line(ctx, 0, -40, -22, -62, '#3a3024', 5);
      line(ctx, 0, -30, 18, -58, '#3a3024', 5);
      line(ctx, 18, -58, 28, -70, '#3a3024', 3);
      break;
    case 'reed':
      for (let i = -2; i <= 2; i++) { line(ctx, i * 6, 0, i * 6 + s1 * 4, -40 - Math.abs(i) * -6, '#4f9e55', 3); ellipse(ctx, i * 6 + s1 * 4, -44 + Math.abs(i) * 6, 3, 8, '#6f5230', null); }
      break;
    case 'rock':
      ellipse(ctx, 0, -14, 30, 16, '#8f9bb0', null);
      ellipse(ctx, 18, -10, 16, 10, '#a3adb8', null);
      break;
    case 'house':
      roundRect(ctx, -30, -50, 60, 52, 4, '#3a4a7a', null);
      poly(ctx, [[-36, -50], [0, -84], [36, -50]], '#2a2d3a', null);
      roundRect(ctx, -8, -36, 16, 16, 2, 'rgba(255,220,120,0.9)', null);
      break;
    case 'lava':
      ellipse(ctx, 0, -6, 34, 10, '#ff7b00', null);
      ellipse(ctx, 6, -6, 20, 5, '#ffd166', null);
      break;
    case 'pipe':
      roundRect(ctx, -10, -70, 20, 72, 4, '#6b7580', null);
      roundRect(ctx, -14, -76, 28, 10, 3, '#4f5963', null);
      circle(ctx, 0, -84 - s1 * 6, 8, 'rgba(200,210,220,0.5)', null);
      break;
    case 'spike':
      poly(ctx, [[-14, 0], [0, -60], [14, 0]], '#2d1b4d', null);
      poly(ctx, [[-30, 0], [-22, -34], [-14, 0]], '#3d2566', null);
      break;
    default:
      break;
  }
  ctx.restore();
}
