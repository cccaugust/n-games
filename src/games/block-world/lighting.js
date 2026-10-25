/**
 * ライティング（マインクラフト式の 0..15 の光レベル）
 * - 空の光：上から下へ届き、横にも広がる（1ブロックごとに 1 減る、葉は 1、水は 2 ぶん余計に減る）
 * - ブロックの光：たいまつ・ひかる石などから広がる
 * チャンクの周り PAD ブロックぶんを含んだ「リージョン」に対して BFS で計算する。
 */
import { BLOCKS } from './blocks.js';

export const PAD = 12;

const opacityTable = new Uint8Array(256);
const emitTable = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
  const d = BLOCKS[i];
  opacityTable[i] = d ? d.lightOpacity : 0;
  emitTable[i] = d ? d.emit : 0;
}
export { opacityTable, emitTable };

let queue = null;
let colTop = null;

/**
 * @param {Uint8Array} region  ブロック id（RW*RW*H、idx = (x*RW + z)*H + y）
 * @param {number} RW
 * @param {number} H
 * @param {Uint8Array} sky     出力：空の光
 * @param {Uint8Array} blk     出力：ブロックの光
 */
export function computeLight(region, RW, H, sky, blk) {
  const N = RW * RW * H;
  if (!queue || queue.length < N * 2) queue = new Int32Array(N * 2);
  sky.fill(0);
  blk.fill(0);

  // 1) 空の光：各列を上から下へ
  //    colTop = その列で最初に光をさえぎるブロックの y（なければ -1）
  if (!colTop || colTop.length < RW * RW) colTop = new Int16Array(RW * RW);
  for (let x = 0; x < RW; x++) {
    for (let z = 0; z < RW; z++) {
      const base = (x * RW + z) * H;
      let top = -1;
      for (let y = H - 1; y >= 0; y--) { if (opacityTable[region[base + y]] > 0) { top = y; break; } }
      colTop[x * RW + z] = top;
    }
  }
  let qh = 0, qt = 0;
  for (let x = 0; x < RW; x++) {
    for (let z = 0; z < RW; z++) {
      const base = (x * RW + z) * H;
      // まわり 4 列のうち一番高いさえぎり。これより上の空気は広がる必要がない
      let nb = colTop[x * RW + z];
      if (x > 0) nb = Math.max(nb, colTop[(x - 1) * RW + z]);
      if (x < RW - 1) nb = Math.max(nb, colTop[(x + 1) * RW + z]);
      if (z > 0) nb = Math.max(nb, colTop[x * RW + z - 1]);
      if (z < RW - 1) nb = Math.max(nb, colTop[x * RW + z + 1]);
      let l = 15;
      for (let y = H - 1; y >= 0; y--) {
        const op = opacityTable[region[base + y]];
        if (op >= 15) { l = 0; }
        else if (op > 0) { l = Math.max(0, l - op); }
        if (l === 0) break;
        sky[base + y] = l;
        if (y <= nb + 1 || l < 15) queue[qt++] = base + y;
      }
    }
  }
  propagate(region, RW, H, sky, qh, qt);

  // 2) ブロックの光
  qh = 0; qt = 0;
  for (let i = 0; i < N; i++) {
    const e = emitTable[region[i]];
    if (e > 0) { blk[i] = e; queue[qt++] = i; }
  }
  if (qt > 0) propagate(region, RW, H, blk, qh, qt);
}

function propagate(region, RW, H, light, qh, qt) {
  const strideX = RW * H, strideZ = H;
  const q = queue;
  while (qh < qt) {
    const idx = q[qh++];
    const l = light[idx];
    if (l <= 1) continue;
    const y = idx % H;
    const xz = (idx - y) / H;
    const z = xz % RW;
    const x = (xz - z) / RW;
    // 6 方向
    if (x > 0) qt = spread(region, light, q, qt, idx - strideX, l);
    if (x < RW - 1) qt = spread(region, light, q, qt, idx + strideX, l);
    if (z > 0) qt = spread(region, light, q, qt, idx - strideZ, l);
    if (z < RW - 1) qt = spread(region, light, q, qt, idx + strideZ, l);
    if (y > 0) qt = spread(region, light, q, qt, idx - 1, l);
    if (y < H - 1) qt = spread(region, light, q, qt, idx + 1, l);
    if (qt > q.length - 8) {
      // 先頭の消費済み領域へ詰め直す（安全策）
      q.copyWithin(0, qh, qt); qt -= qh; qh = 0;
    }
  }
}

function spread(region, light, q, qt, n, l) {
  const op = opacityTable[region[n]];
  if (op >= 15) return qt;
  const nl = l - 1 - op;
  if (nl > light[n]) { light[n] = nl; q[qt++] = n; }
  return qt;
}
