/**
 * チャンクのメッシュ生成
 * - 面ごとのカリング（隣が不透明なら描かない）
 * - 頂点ごとの AO（アンビエントオクルージョン）とスムースライティング（隣接4セルの光の平均）
 * - 形状：cube / liquid（上面が少し低い）/ layer（雪）/ cross（草・花）/ torch（たいまつ・壁たいまつ）
 * 出力は opaque（不透明＋カットアウト）と water（半透明）の 2 グループ
 */
import { BLOCKS, faceTexture, tileIndex, tileUV, B } from './blocks.js';
import { CHUNK } from './worldgen.js';

// face: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z
const FACES = [
  { n: [1, 0, 0], o: [1, 0, 1], u: [0, 0, -1], v: [0, 1, 0], shade: 0.6 },
  { n: [-1, 0, 0], o: [0, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.6 },
  { n: [0, 1, 0], o: [0, 1, 1], u: [1, 0, 0], v: [0, 0, -1], shade: 1.0 },
  { n: [0, -1, 0], o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.5 },
  { n: [0, 0, 1], o: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.8 },
  { n: [0, 0, -1], o: [1, 0, 0], u: [-1, 0, 0], v: [0, 1, 0], shade: 0.8 }
];
const AO_CURVE = [0.45, 0.65, 0.82, 1.0];

const uvCache = new Map();
function uvFor(texName) {
  let r = uvCache.get(texName);
  if (!r) { r = tileUV(tileIndex(texName)); uvCache.set(texName, r); }
  return r;
}

class Builder {
  constructor() { this.pos = []; this.uv = []; this.light = []; this.idx = []; this.vcount = 0; }
  quad(p, uvs, lights, flip) {
    // p: 4 頂点 [x,y,z]、uvs: 4 [u,v]、lights: 4 [sky, blk, shade]
    const base = this.vcount;
    for (let i = 0; i < 4; i++) {
      this.pos.push(p[i][0], p[i][1], p[i][2]);
      this.uv.push(uvs[i][0], uvs[i][1]);
      this.light.push(lights[i][0], lights[i][1], lights[i][2]);
    }
    if (flip) this.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
    else this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.vcount += 4;
  }
  toArrays() {
    if (this.vcount === 0) return null;
    return {
      position: new Float32Array(this.pos),
      uv: new Float32Array(this.uv),
      light: new Float32Array(this.light),
      index: this.vcount > 65535 ? new Uint32Array(this.idx) : new Uint16Array(this.idx)
    };
  }
}

/**
 * @param {Uint8Array} region ブロック（RW*RW*H）
 * @param {Uint8Array} sky
 * @param {Uint8Array} blk
 * @param {number} RW
 * @param {number} PAD
 * @param {number} H
 */
export function meshChunk(region, sky, blk, RW, PAD, H) {
  const opaque = new Builder();
  const water = new Builder();
  const SX = RW * H, SZ = H;
  const at = (x, y, z) => region[(x * RW + z) * H + y];
  const defAt = (x, y, z) => BLOCKS[region[(x * RW + z) * H + y]] || BLOCKS[0];

  const cornerPos = [0, 0, 0];
  const lightsTmp = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const posTmp = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const uvTmp = [[0, 0], [0, 0], [0, 0], [0, 0]];

  for (let lx = 0; lx < CHUNK; lx++) {
    const rx = lx + PAD;
    for (let lz = 0; lz < CHUNK; lz++) {
      const rz = lz + PAD;
      const colBase = (rx * RW + rz) * H;
      for (let y = 0; y < H; y++) {
        const id = region[colBase + y];
        if (id === 0) continue;
        const def = BLOCKS[id];
        if (!def || def.shape === 'item') continue;

        if (def.shape === 'cross') { addCross(opaque, def, rx, y, rz, lx, lz, sky, blk, RW, H); continue; }
        if (def.shape === 'torch') { addTorch(opaque, def, rx, y, rz, lx, lz, sky, blk, RW, H); continue; }

        const isLiquid = def.shape === 'liquid';
        const target = isLiquid ? water : opaque;
        const height = def.height || 1;

        for (let f = 0; f < 6; f++) {
          const F = FACES[f];
          const nx = rx + F.n[0], ny = y + F.n[1], nz = rz + F.n[2];
          if (ny < 0) continue;              // 底の面は描かない
          let nid = 0;
          if (ny < H) nid = at(nx, ny, nz);
          const ndef = BLOCKS[nid] || BLOCKS[0];
          // カリング
          if (ndef.opaque) continue;
          if (def.cullSame && nid === id) continue;
          if (isLiquid && f !== 2 && ndef.shape === 'liquid') continue;
          // 液体や雪の上面：上に同じものがあれば描かない（cullSame で処理済み）

          // テクスチャ
          let texName = faceTexture(def, f);
          if (id === B.GRASS && f !== 2 && f !== 3 && y + 1 < H) {
            const above = at(rx, y + 1, rz);
            if (above === B.SNOW_LAYER || above === B.SNOW_BLOCK) texName = 'grass_side_snow';
          }
          const uv = uvFor(texName);

          // 4 頂点
          let aoSum02 = 0, aoSum13 = 0;
          for (let c = 0; c < 4; c++) {
            const a = (c === 1 || c === 2) ? 1 : 0;
            const b = (c === 2 || c === 3) ? 1 : 0;
            cornerPos[0] = F.o[0] + a * F.u[0] + b * F.v[0];
            cornerPos[1] = F.o[1] + a * F.u[1] + b * F.v[1];
            cornerPos[2] = F.o[2] + a * F.u[2] + b * F.v[2];
            let cy = cornerPos[1];
            if (height !== 1 && cy === 1) cy = height;
            posTmp[c][0] = lx + cornerPos[0];
            posTmp[c][1] = y + cy;
            posTmp[c][2] = lz + cornerPos[2];
            // uv（上面が低い液体の側面はテクスチャも縮める）
            let vv = b;
            if (height !== 1 && f !== 2 && f !== 3 && b === 1) vv = height;
            uvTmp[c][0] = uv.u0 + a * (uv.u1 - uv.u0);
            uvTmp[c][1] = uv.v0 + vv * (uv.v1 - uv.v0);

            // AO とスムースライト：面の前にあるセル群
            const du = a ? 1 : -1, dv = b ? 1 : -1;
            const s1x = nx + F.u[0] * du, s1y = ny + F.u[1] * du, s1z = nz + F.u[2] * du;
            const s2x = nx + F.v[0] * dv, s2y = ny + F.v[1] * dv, s2z = nz + F.v[2] * dv;
            const cxX = s1x + F.v[0] * dv, cxY = s1y + F.v[1] * dv, cxZ = s1z + F.v[2] * dv;
            const o1 = solidAt(region, RW, H, s1x, s1y, s1z);
            const o2 = solidAt(region, RW, H, s2x, s2y, s2z);
            const o3 = solidAt(region, RW, H, cxX, cxY, cxZ);
            let ao;
            if (o1 && o2) ao = 0; else ao = 3 - (o1 + o2 + o3);
            // 光の平均（不透明でないセルのみ）
            let sSum = 0, bSum = 0, cnt = 0;
            if (ny < H) {
              const fi = (nx * RW + nz) * H + ny;
              sSum += sky[fi]; bSum += blk[fi]; cnt++;
            } else { sSum += 15; cnt++; }
            if (!o1) { const r = lightAt(region, sky, blk, RW, H, s1x, s1y, s1z); if (r) { sSum += r[0]; bSum += r[1]; cnt++; } }
            if (!o2) { const r = lightAt(region, sky, blk, RW, H, s2x, s2y, s2z); if (r) { sSum += r[0]; bSum += r[1]; cnt++; } }
            if (!o3 && !(o1 && o2)) { const r = lightAt(region, sky, blk, RW, H, cxX, cxY, cxZ); if (r) { sSum += r[0]; bSum += r[1]; cnt++; } }
            const L = lightsTmp[c];
            L[0] = sSum / cnt / 15;
            L[1] = bSum / cnt / 15;
            L[2] = F.shade * AO_CURVE[ao];
            if (c === 0 || c === 2) aoSum02 += ao; else aoSum13 += ao;
          }
          target.quad(posTmp, uvTmp, lightsTmp, aoSum02 < aoSum13);
        }
      }
    }
  }
  return { opaque: opaque.toArrays(), water: water.toArrays() };
}

function solidAt(region, RW, H, x, y, z) {
  if (y < 0 || y >= H || x < 0 || z < 0 || x >= RW || z >= RW) return 0;
  const d = BLOCKS[region[(x * RW + z) * H + y]];
  return d && d.opaque ? 1 : 0;
}
const lightTmp = [0, 0];
function lightAt(region, sky, blk, RW, H, x, y, z) {
  if (y >= H) { lightTmp[0] = 15; lightTmp[1] = 0; return lightTmp; }
  if (y < 0 || x < 0 || z < 0 || x >= RW || z >= RW) return null;
  const i = (x * RW + z) * H + y;
  lightTmp[0] = sky[i]; lightTmp[1] = blk[i];
  return lightTmp;
}

function cellLight(sky, blk, RW, H, rx, y, rz) {
  const i = (rx * RW + rz) * H + y;
  return [sky[i] / 15, blk[i] / 15];
}

function addCross(b, def, rx, y, rz, lx, lz, sky, blk, RW, H) {
  const uv = uvFor(def.tex);
  const [s, k] = cellLight(sky, blk, RW, H, rx, y, rz);
  const L = [[s, k, 1], [s, k, 1], [s, k, 1], [s, k, 1]];
  const x0 = lx + 0.08, x1 = lx + 0.92, z0 = lz + 0.08, z1 = lz + 0.92;
  const uvs = [[uv.u0, uv.v0], [uv.u1, uv.v0], [uv.u1, uv.v1], [uv.u0, uv.v1]];
  const uvsR = [[uv.u1, uv.v0], [uv.u0, uv.v0], [uv.u0, uv.v1], [uv.u1, uv.v1]];
  // 対角線 2 枚 × 両面
  const q1 = [[x0, y, z0], [x1, y, z1], [x1, y + 1, z1], [x0, y + 1, z0]];
  const q2 = [[x0, y, z1], [x1, y, z0], [x1, y + 1, z0], [x0, y + 1, z1]];
  b.quad(q1, uvs, L, false);
  b.quad([q1[1], q1[0], q1[3], q1[2]], uvsR, L, false);
  b.quad(q2, uvs, L, false);
  b.quad([q2[1], q2[0], q2[3], q2[2]], uvsR, L, false);
}

function addTorch(b, def, rx, y, rz, lx, lz, sky, blk, RW, H) {
  const uv = uvFor('torch');
  const [s, k] = cellLight(sky, blk, RW, H, rx, y, rz);
  const tw = uv.u1 - uv.u0, th = uv.v1 - uv.v0;
  // テクスチャ内の棒の位置：x 7..9 / y 6..16（下から数えると 0..10）
  const su0 = uv.u0 + tw * (7 / 16), su1 = uv.u0 + tw * (9 / 16);
  const sv0 = uv.v0, sv1 = uv.v0 + th * (10 / 16);
  const topV0 = uv.v0 + th * (10 / 16), topV1 = uv.v0 + th * (12 / 16);
  const w = 1 / 16, hgt = 10 / 16;

  // ローカル座標（中心が原点、底が 0）
  let cx = lx + 0.5, cz = lz + 0.5, by = y;
  let tiltX = 0, tiltZ = 0;
  if (def.wall) {
    // wall = 壁がある方向。根元を壁に寄せ、先を壁から離す方向へ傾ける
    const d = def.wall;
    const off = 0.5 - 1.5 / 16;
    if (d === 'n') { cz = lz + 0.5 - off; tiltZ = 0.3; }
    if (d === 's') { cz = lz + 0.5 + off; tiltZ = -0.3; }
    if (d === 'w') { cx = lx + 0.5 - off; tiltX = 0.3; }
    if (d === 'e') { cx = lx + 0.5 + off; tiltX = -0.3; }
    by = y + 0.2;
  }
  // 8 頂点（傾きは高さに比例して横へずらす）
  const P = (dx, dy, dz) => [cx + dx + tiltX * (dy / hgt), by + dy, cz + dz + tiltZ * (dy / hgt)];
  const corners = {
    bnw: P(-w, 0, -w), bne: P(w, 0, -w), bse: P(w, 0, w), bsw: P(-w, 0, w),
    tnw: P(-w, hgt, -w), tne: P(w, hgt, -w), tse: P(w, hgt, w), tsw: P(-w, hgt, w)
  };
  const L = [[s, k, 1], [s, k, 1], [s, k, 1], [s, k, 1]];
  const Ld = [[s, k, 0.8], [s, k, 0.8], [s, k, 0.8], [s, k, 0.8]];
  const sideUV = [[su0, sv0], [su1, sv0], [su1, sv1], [su0, sv1]];
  // +x
  b.quad([corners.bse, corners.bne, corners.tne, corners.tse], sideUV, Ld, false);
  // -x
  b.quad([corners.bnw, corners.bsw, corners.tsw, corners.tnw], sideUV, Ld, false);
  // +z
  b.quad([corners.bsw, corners.bse, corners.tse, corners.tsw], sideUV, Ld, false);
  // -z
  b.quad([corners.bne, corners.bnw, corners.tnw, corners.tne], sideUV, Ld, false);
  // top
  b.quad([corners.tsw, corners.tse, corners.tne, corners.tnw], [[su0, topV0], [su1, topV0], [su1, topV1], [su0, topV1]], L, false);
}
