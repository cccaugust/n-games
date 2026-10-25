/**
 * 地形生成
 * - 高さマップ（大陸 + 山のリッジ + 細かい丘）
 * - バイオーム（海 / 浜 / 平原 / 森 / 砂漠 / 雪原 / 山 / 雪山）
 * - 洞窟（2本のリッジノイズの交差 = トンネル、低周波ノイズ = 大空洞）
 * - 鉱石、木、サボテン、花、雪
 * すべて座標とシードから決定的に求まる（チャンク境界をまたぐ木も再現できる）
 */
import { Simplex, hash2, hash3, clamp, smoothstep } from './noise.js';
import { B } from './blocks.js';

export const CHUNK = 16;
export const SEA_LEVEL = 32;

export const BIOME = { OCEAN: 0, BEACH: 1, PLAINS: 2, FOREST: 3, DESERT: 4, SNOWY: 5, MOUNTAIN: 6, SNOWY_MOUNTAIN: 7 };
export const BIOME_NAME = ['海', '浜辺', '平原', '森', '砂漠', '雪原', '山', '雪山'];

export class WorldGen {
  constructor(seed, height) {
    this.seed = seed >>> 0;
    this.H = height;
    this.n = new Simplex(this.seed);
    this.n2 = new Simplex(this.seed ^ 0x9e3779b9);
    this.n3 = new Simplex(this.seed ^ 0x51a7f00d);
    this.colCache = new Map();
  }

  /** 1列ぶんの情報（高さ・バイオーム・温度）。キャッシュつき */
  column(x, z) {
    const key = x * 1048576 + z; // 十分に広い範囲でユニーク
    let c = this.colCache.get(key);
    if (c) return c;
    const n = this.n;
    const cont = n.fbm2(x * 0.0028, z * 0.0028, 4);
    let h = 34 + cont * 16;
    const ridgeRaw = this.n2.fbm2((x + 1000) * 0.006, (z + 1000) * 0.006, 3);
    const ridge = 1 - Math.abs(ridgeRaw);
    const mountMask = smoothstep(0.08, 0.6, cont);
    h += ridge * ridge * 40 * mountMask;
    h += this.n3.fbm2(x * 0.02, z * 0.02, 2) * 3.2;
    h = clamp(Math.round(h), 4, this.H - 14);

    let temp = n.fbm2((x + 5000) * 0.0015, (z - 3000) * 0.0015, 2);
    temp -= Math.max(0, h - 52) * 0.02;
    const humid = this.n2.fbm2((x - 7000) * 0.0018, (z + 9000) * 0.0018, 2);

    let biome;
    if (h < SEA_LEVEL - 1) biome = BIOME.OCEAN;
    else if (h <= SEA_LEVEL + 1) biome = BIOME.BEACH;
    else if (h > 64) biome = (temp < -0.1 || h > 76) ? BIOME.SNOWY_MOUNTAIN : BIOME.MOUNTAIN;
    else if (temp < -0.4) biome = BIOME.SNOWY;
    else if (temp > 0.35 && humid < 0.05) biome = BIOME.DESERT;
    else if (humid > 0.2) biome = BIOME.FOREST;
    else biome = BIOME.PLAINS;

    c = { h, biome, temp, humid };
    if (this.colCache.size > 20000) this.colCache.clear();
    this.colCache.set(key, c);
    return c;
  }

  heightAt(x, z) { return this.column(x, z).h; }
  biomeAt(x, z) { return this.column(x, z).biome; }

  /** 木が生えるか（近所でハッシュが最大の列だけ = 間隔が空く） */
  treeAt(x, z) {
    const col = this.column(x, z);
    let p = 0;
    if (col.biome === BIOME.PLAINS) p = 0.012;
    else if (col.biome === BIOME.FOREST) p = 0.075;
    else if (col.biome === BIOME.SNOWY) p = 0.03;
    else if (col.biome === BIOME.MOUNTAIN) p = 0.006;
    if (p === 0) return null;
    const r = hash2(x, z, this.seed ^ 0x7a3e);
    if (r >= p) return null;
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
      if (dx === 0 && dz === 0) continue;
      if (hash2(x + dx, z + dz, this.seed ^ 0x7a3e) < r) return null;
    }
    const kind = col.biome === BIOME.SNOWY ? 'spruce' : (col.biome === BIOME.FOREST && hash2(x, z, this.seed ^ 0x33) < 0.3 ? 'birch' : 'oak');
    const r2 = hash2(x, z, this.seed ^ 0xbeef);
    const height = kind === 'spruce' ? 6 + Math.floor(r2 * 4) : 4 + Math.floor(r2 * 3);
    return { kind, height, h: col.h };
  }

  cactusAt(x, z) {
    const col = this.column(x, z);
    if (col.biome !== BIOME.DESERT) return 0;
    const r = hash2(x, z, this.seed ^ 0xcac7);
    if (r >= 0.006) return 0;
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (dx === 0 && dz === 0) continue;
      if (hash2(x + dx, z + dz, this.seed ^ 0xcac7) < r) return 0;
    }
    return 1 + Math.floor(hash2(x, z, this.seed ^ 0x99) * 3);
  }

  /**
   * チャンクを生成する
   * @param {number} cx
   * @param {number} cz
   * @param {Uint8Array} blocks  サイズ 16*16*H。idx = (lx*16 + lz)*H + y
   */
  generate(cx, cz, blocks) {
    const H = this.H;
    const seed = this.seed;
    const n = this.n, n2 = this.n2, n3 = this.n3;
    blocks.fill(0);
    const x0 = cx * CHUNK, z0 = cz * CHUNK;

    const put = (wx, wy, wz, id, onlyAir = false) => {
      const lx = wx - x0, lz = wz - z0;
      if (lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 0 || wy >= H) return;
      const idx = (lx * CHUNK + lz) * H + wy;
      if (onlyAir && blocks[idx] !== B.AIR) return;
      blocks[idx] = id;
    };

    for (let lx = 0; lx < CHUNK; lx++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        const wx = x0 + lx, wz = z0 + lz;
        const col = this.column(wx, wz);
        const h = col.h, biome = col.biome;
        const base = (lx * CHUNK + lz) * H;
        const underWater = h <= SEA_LEVEL + 1;

        for (let y = 0; y <= h; y++) {
          let id;
          const depth = h - y;
          if (y === 0 || (y === 1 && hash3(wx, y, wz, seed) < 0.5)) {
            id = B.BEDROCK;
          } else if (depth > 4) {
            id = B.STONE;
            if (y < h - 5) {
              // 鉱石の脈
              const coal = n2.noise3D((wx + 300) * 0.09, y * 0.09, wz * 0.09);
              if (coal > 0.66) id = B.ORE_COAL;
              else {
                const vein = n3.noise3D(wx * 0.12, (y + 100) * 0.12, wz * 0.12);
                if (vein > 0.7) {
                  const r = hash3(wx, y, wz, seed ^ 0x0e);
                  if (y < 14 && r < 0.25) id = B.ORE_DIAMOND;
                  else if (y < 28 && r < 0.4) id = B.ORE_GOLD;
                  else if (y < 48) id = B.ORE_IRON;
                  else id = B.ORE_COAL;
                }
              }
              if (id === B.STONE) {
                const pocket = n.noise3D(wx * 0.05, y * 0.05, wz * 0.05);
                if (pocket > 0.74) id = hash3(wx, y, wz, seed ^ 0x77) < 0.35 ? B.GRAVEL : B.DIRT;
              }
            }
          } else {
            // 表面〜4ブロック
            switch (biome) {
              case BIOME.OCEAN:
                id = depth === 0 ? (hash3(wx, y, wz, seed) < 0.65 ? B.SAND : B.GRAVEL) : (depth < 3 ? B.SAND : B.STONE);
                break;
              case BIOME.BEACH:
                id = B.SAND;
                break;
              case BIOME.DESERT:
                id = depth < 3 ? B.SAND : B.SANDSTONE;
                break;
              case BIOME.MOUNTAIN:
                id = depth === 0 ? (h < 70 && hash3(wx, 0, wz, seed ^ 0x5) < 0.35 ? B.GRASS : B.STONE) : (depth < 2 && h < 70 ? B.DIRT : B.STONE);
                if (depth === 0 && id === B.STONE && hash3(wx, 1, wz, seed ^ 0x6) < 0.15) id = B.GRAVEL;
                break;
              case BIOME.SNOWY_MOUNTAIN:
                id = depth === 0 ? B.SNOW_BLOCK : (depth < 2 ? B.STONE : B.STONE);
                break;
              default: // PLAINS / FOREST / SNOWY
                id = depth === 0 ? B.GRASS : B.DIRT;
            }
          }

          // 洞窟
          if (y > 2 && depth >= 1 && id !== B.BEDROCK && !(underWater && y >= SEA_LEVEL - 4)) {
            const a = n.noise3D(wx * 0.035, y * 0.07, wz * 0.035);
            const b = n2.noise3D((wx + 500) * 0.035, y * 0.07, (wz + 500) * 0.035);
            if (a * a + b * b < 0.011) id = B.AIR;
            else if (depth > 9) {
              const c = n3.noise3D(wx * 0.025, y * 0.045, wz * 0.025);
              if (c > 0.56) id = B.AIR;
            }
          }
          blocks[base + y] = id;
        }

        // 水
        if (h < SEA_LEVEL) {
          for (let y = h + 1; y <= SEA_LEVEL; y++) if (blocks[base + y] === B.AIR) blocks[base + y] = B.WATER;
          if (col.temp < -0.42) blocks[base + SEA_LEVEL] = B.ICE;
        }

        // 洞窟の天井・床の調整：表面が洞窟で削られて草が浮いた場合は土に
        if (blocks[base + h] === B.GRASS && blocks[base + h - 1] === B.AIR) blocks[base + h] = B.DIRT;

        // サボテン
        const cac = this.cactusAt(wx, wz);
        if (cac > 0 && blocks[base + h] === B.SAND) {
          for (let k = 1; k <= cac; k++) if (h + k < H) blocks[base + h + k] = B.CACTUS;
        }

        // 植物
        if ((biome === BIOME.PLAINS || biome === BIOME.FOREST) && blocks[base + h] === B.GRASS && blocks[base + h + 1] === B.AIR) {
          const r = hash2(wx, wz, seed ^ 0xf10);
          const grassP = biome === BIOME.PLAINS ? 0.14 : 0.1;
          if (r < grassP) blocks[base + h + 1] = B.TALL_GRASS;
          else if (r < grassP + 0.035) {
            const f = hash2(wx, wz, seed ^ 0xf11);
            blocks[base + h + 1] = f < 0.4 ? B.DANDELION : f < 0.8 ? B.POPPY : B.CORNFLOWER;
          }
        }
      }
    }

    // 木（境界をまたぐものも含めて周囲 3 ブロックまで見る）
    for (let lx = -3; lx < CHUNK + 3; lx++) {
      for (let lz = -3; lz < CHUNK + 3; lz++) {
        const wx = x0 + lx, wz = z0 + lz;
        const t = this.treeAt(wx, wz);
        if (!t) continue;
        // 木の根元が洞窟で削られていたら生やさない（自分のチャンク内のみ確認できる）
        if (lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK) {
          const top = blocks[(lx * CHUNK + lz) * H + t.h];
          if (top !== B.GRASS && top !== B.DIRT) continue;
          // 植物を踏みつぶす
          blocks[(lx * CHUNK + lz) * H + t.h + 1] = B.AIR;
        }
        this.stampTree(put, wx, t.h + 1, wz, t);
      }
    }

    // 雪：雪のバイオームは一番上のブロック（木の葉も含む）の上に雪の層
    for (let lx = 0; lx < CHUNK; lx++) {
      for (let lz = 0; lz < CHUNK; lz++) {
        const col = this.column(x0 + lx, z0 + lz);
        if (col.biome !== BIOME.SNOWY && col.biome !== BIOME.SNOWY_MOUNTAIN) continue;
        const base = (lx * CHUNK + lz) * H;
        for (let y = H - 2; y > 0; y--) {
          const id = blocks[base + y];
          if (id !== B.AIR) {
            if (id !== B.WATER && id !== B.ICE && id !== B.TALL_GRASS && id !== B.SNOW_LAYER && blocks[base + y + 1] === B.AIR) blocks[base + y + 1] = B.SNOW_LAYER;
            break;
          }
        }
      }
    }
  }

  stampTree(put, x, y, z, t) {
    const { kind, height } = t;
    if (kind === 'spruce') {
      for (let k = 0; k < height; k++) put(x, y + k, z, B.LOG_SPRUCE);
      // 円錐：下から太く上で細く
      let r = 2;
      for (let k = height - 1; k >= 2; k--) {
        const rr = (k === height - 1) ? 0 : (((height - 1 - k) % 2 === 1) ? r : Math.max(1, r - 1));
        for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) {
          if (dx === 0 && dz === 0) continue;
          if (Math.abs(dx) === rr && Math.abs(dz) === rr && rr > 1) continue;
          put(x + dx, y + k, z + dz, B.LEAVES_SPRUCE, true);
        }
        if ((height - 1 - k) % 2 === 1 && k < height - 4) r = Math.min(3, r + 1);
      }
      put(x, y + height, z, B.LEAVES_SPRUCE, true);
      put(x, y + height + 1, z, B.LEAVES_SPRUCE, true);
      return;
    }
    const log = kind === 'birch' ? B.LOG_BIRCH : B.LOG_OAK;
    const leaf = kind === 'birch' ? B.LEAVES_BIRCH : B.LEAVES_OAK;
    for (let k = 0; k < height; k++) put(x, y + k, z, log);
    const top = y + height - 1;
    // 下2段：半径2、上2段：半径1、頂点
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy <= -1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (dx === 0 && dz === 0 && dy <= 0) continue;
        if (Math.abs(dx) === r && Math.abs(dz) === r) {
          if (r === 1 && dy === 1) continue;
          if (hash3(x + dx, top + dy, z + dz, this.seed) < 0.45) continue;
        }
        put(x + dx, top + dy, z + dz, leaf, true);
      }
    }
    put(x, top + 2, z, leaf, true);
    put(x + 1, top + 2, z, leaf, true); put(x - 1, top + 2, z, leaf, true);
    put(x, top + 2, z + 1, leaf, true); put(x, top + 2, z - 1, leaf, true);
  }

  /** 最初に立つ場所を探す（陸で、木が無い列） */
  findSpawn() {
    for (let r = 0; r < 200; r += 2) {
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const x = Math.round(Math.cos(ang) * r), z = Math.round(Math.sin(ang) * r);
        const col = this.column(x, z);
        if (col.biome === BIOME.PLAINS || col.biome === BIOME.FOREST || col.biome === BIOME.SNOWY || col.biome === BIOME.BEACH) {
          if (col.h > SEA_LEVEL && !this.treeAt(x, z)) return { x: x + 0.5, y: col.h + 1, z: z + 0.5 };
        }
      }
    }
    return { x: 0.5, y: this.column(0, 0).h + 1, z: 0.5 };
  }
}
