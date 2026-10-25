/**
 * ワールド：チャンクの保持、ブロックの読み書き、編集の記録、ライト＋メッシュ用リージョンの作成
 */
import { CHUNK, WorldGen } from './worldgen.js';
import { BLOCKS, B, getDef } from './blocks.js';
import { PAD, computeLight } from './lighting.js';
import { meshChunk } from './mesher.js';

export const WORLD_HEIGHT = 96;

export class World {
  constructor(seed, edits = null) {
    this.seed = seed >>> 0;
    this.H = WORLD_HEIGHT;
    this.gen = new WorldGen(this.seed, this.H);
    /** @type {Map<string, Chunk>} */
    this.chunks = new Map();
    /** 変更したブロック：key → Map(idx → id) */
    this.edits = new Map();
    if (edits) {
      for (const k of Object.keys(edits)) {
        const arr = edits[k];
        const m = new Map();
        for (let i = 0; i + 1 < arr.length; i += 2) m.set(arr[i], arr[i + 1]);
        this.edits.set(k, m);
      }
    }
    this.RW = CHUNK + PAD * 2;
    this.region = new Uint8Array(this.RW * this.RW * this.H);
    this.sky = new Uint8Array(this.RW * this.RW * this.H);
    this.blk = new Uint8Array(this.RW * this.RW * this.H);
    this.onChunkDirty = null;
  }

  static key(cx, cz) { return cx + ',' + cz; }

  getChunk(cx, cz) { return this.chunks.get(World.key(cx, cz)); }

  /** 無ければ生成して返す */
  ensureChunk(cx, cz) {
    const key = World.key(cx, cz);
    let c = this.chunks.get(key);
    if (c) return c;
    const blocks = new Uint8Array(CHUNK * CHUNK * this.H);
    this.gen.generate(cx, cz, blocks);
    const ed = this.edits.get(key);
    if (ed) for (const [idx, id] of ed) blocks[idx] = id;
    c = { cx, cz, key, blocks, light: null, dirty: true, mesh: null, waterMesh: null, meshed: false, mobsSpawned: false };
    this.chunks.set(key, c);
    return c;
  }

  unloadChunk(c) {
    this.chunks.delete(c.key);
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= this.H) return B.AIR;
    const cx = x >> 4, cz = z >> 4;
    const c = this.chunks.get(World.key(cx, cz));
    if (!c) return B.AIR;
    return c.blocks[((x & 15) * CHUNK + (z & 15)) * this.H + y];
  }

  getDefAt(x, y, z) { return getDef(this.getBlock(x, y, z)); }

  /** 空の光 / ブロックの光（0..15）。未計算なら空 15 */
  getLight(x, y, z) {
    if (y >= this.H) return [15, 0];
    if (y < 0) return [0, 0];
    const c = this.chunks.get(World.key(x >> 4, z >> 4));
    if (!c || !c.light) return [15, 0];
    const v = c.light[((x & 15) * CHUNK + (z & 15)) * this.H + y];
    return [v >> 4, v & 15];
  }

  /**
   * ブロックを置く / 壊す。影響を受けるチャンクを dirty にする
   * @returns {boolean} 変化したか
   */
  setBlock(x, y, z, id, record = true) {
    if (y < 0 || y >= this.H) return false;
    const cx = x >> 4, cz = z >> 4;
    const c = this.ensureChunk(cx, cz);
    const lx = x & 15, lz = z & 15;
    const idx = (lx * CHUNK + lz) * this.H + y;
    if (c.blocks[idx] === id) return false;
    c.blocks[idx] = id;
    if (record) {
      let m = this.edits.get(c.key);
      if (!m) { m = new Map(); this.edits.set(c.key, m); }
      m.set(idx, id);
    }
    this.markDirtyAround(x, z);
    // 上に乗っていたものが支えを失ったら壊す
    const above = this.getBlock(x, y + 1, z);
    const ad = getDef(above);
    if (ad.needsSupport && !ad.wall && !getDef(id).solid) {
      this.setBlock(x, y + 1, z, B.AIR, record);
      if (this.onBlockBroken) this.onBlockBroken(x, y + 1, z, above);
    }
    // 壁のたいまつ
    if (!getDef(id).solid) {
      const sides = [[0, 0, -1, 's'], [0, 0, 1, 'n'], [-1, 0, 0, 'e'], [1, 0, 0, 'w']];
      for (const [dx, dy, dz, wall] of sides) {
        const nid = this.getBlock(x + dx, y + dy, z + dz);
        const nd = getDef(nid);
        if (nd.wall === wall) {
          this.setBlock(x + dx, y + dy, z + dz, B.AIR, record);
          if (this.onBlockBroken) this.onBlockBroken(x + dx, y + dy, z + dz, nid);
        }
      }
    }
    return true;
  }

  markDirtyAround(x, z) {
    const cx = x >> 4, cz = z >> 4;
    const lx = x & 15, lz = z & 15;
    const xs = [0], zs = [0];
    if (lx < PAD) xs.push(-1);
    if (lx >= CHUNK - PAD) xs.push(1);
    if (lz < PAD) zs.push(-1);
    if (lz >= CHUNK - PAD) zs.push(1);
    for (const dx of xs) for (const dz of zs) {
      const c = this.chunks.get(World.key(cx + dx, cz + dz));
      if (c) { c.dirty = true; if (this.onChunkDirty) this.onChunkDirty(c); }
    }
  }

  /** 3x3 の近所が全部生成済みか */
  neighborsReady(cx, cz) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!this.chunks.has(World.key(cx + dx, cz + dz))) return false;
    }
    return true;
  }

  /** リージョン（周囲 PAD ぶん含む）を組み立て、光とメッシュを計算 */
  buildChunkMesh(c) {
    const RW = this.RW, H = this.H;
    const region = this.region;
    region.fill(0);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const n = this.chunks.get(World.key(c.cx + dx, c.cz + dz));
        if (!n) continue;
        for (let lx = 0; lx < CHUNK; lx++) {
          const rx = lx + dx * CHUNK + PAD;
          if (rx < 0 || rx >= RW) continue;
          for (let lz = 0; lz < CHUNK; lz++) {
            const rz = lz + dz * CHUNK + PAD;
            if (rz < 0 || rz >= RW) continue;
            const src = (lx * CHUNK + lz) * H;
            const dst = (rx * RW + rz) * H;
            region.set(n.blocks.subarray(src, src + H), dst);
          }
        }
      }
    }
    computeLight(region, RW, H, this.sky, this.blk);
    // 内側の光を保存（モブ・プレイヤー・パーティクルの明るさ用）
    if (!c.light) c.light = new Uint8Array(CHUNK * CHUNK * H);
    for (let lx = 0; lx < CHUNK; lx++) for (let lz = 0; lz < CHUNK; lz++) {
      const src = ((lx + PAD) * RW + (lz + PAD)) * H;
      const dst = (lx * CHUNK + lz) * H;
      for (let y = 0; y < H; y++) c.light[dst + y] = (this.sky[src + y] << 4) | this.blk[src + y];
    }
    const result = meshChunk(region, this.sky, this.blk, RW, PAD, H);
    c.dirty = false;
    c.meshed = true;
    return result;
  }

  /** 保存用に編集を配列化 */
  serializeEdits() {
    const out = {};
    for (const [k, m] of this.edits) {
      if (m.size === 0) continue;
      const arr = [];
      for (const [idx, id] of m) arr.push(idx, id);
      out[k] = arr;
    }
    return out;
  }

  /** 列の一番上のかたいブロックの y（なければ -1） */
  topSolidY(x, z) {
    for (let y = this.H - 1; y >= 0; y--) {
      const d = getDef(this.getBlock(x, y, z));
      if (d.collide) return y;
    }
    return -1;
  }
}
