/**
 * ブロック / アイテム定義
 * - id 0..199: ブロック（ワールドに置ける）
 * - id 200..: アイテム（置けない：棒・石炭・りんご など）
 */
import { buildAtlas, TILE } from './textures.js';

export const B = {
  AIR: 0, STONE: 1, GRASS: 2, DIRT: 3, COBBLE: 4, PLANKS: 5, SAND: 6, GRAVEL: 7,
  LOG_OAK: 8, LEAVES_OAK: 9, LOG_BIRCH: 10, LEAVES_BIRCH: 11, LOG_SPRUCE: 12, LEAVES_SPRUCE: 13,
  WATER: 14, GLASS: 15, BEDROCK: 16, ORE_COAL: 17, ORE_IRON: 18, ORE_GOLD: 19, ORE_DIAMOND: 20,
  SNOW_BLOCK: 21, SNOW_LAYER: 22, SANDSTONE: 23, BRICK: 24, STONE_BRICKS: 25, TORCH: 26, GLOWSTONE: 27,
  TALL_GRASS: 28, POPPY: 29, DANDELION: 30, CORNFLOWER: 31, CACTUS: 32,
  WOOL_WHITE: 33, WOOL_RED: 34, WOOL_YELLOW: 35, WOOL_BLUE: 36, WOOL_GREEN: 37, WOOL_BLACK: 38,
  BOOKSHELF: 39, CRAFTING_TABLE: 40, ICE: 41, MOSSY_COBBLE: 42,
  TORCH_WALL_N: 43, TORCH_WALL_S: 44, TORCH_WALL_E: 45, TORCH_WALL_W: 46,
  // アイテム
  STICK: 200, COAL: 201, APPLE: 202
};

export const ITEM_START = 200;

/**
 * 各定義:
 *  name     表示名
 *  tex      文字列（全面同じ） or {top, bottom, side} / {top, bottom, north,...}
 *  shape    'cube' | 'cross' | 'torch' | 'liquid' | 'layer'
 *  solid    レイキャストや AO の対象になる「かたい」ブロックか
 *  opaque   隣の面を隠すか
 *  collide  当たり判定があるか
 *  lightOpacity 光をどれだけさえぎるか（0..15）
 *  emit     放つ光（0..15）
 *  hardness 壊すのにかかる秒数（サバイバル）。-1 は壊せない
 *  drop     壊したときに出るもの（省略時は自分自身、null なら何も出ない）
 *  sound    音の種類
 *  creative クリエイティブのパレットに出すか
 *  needsSupport 下のブロックが無くなったら壊れるか
 */
const defs = [];
const def = (id, d) => { defs[id] = { id, shape: 'cube', solid: true, opaque: true, collide: true, lightOpacity: 15, emit: 0, hardness: 1, sound: 'stone', creative: true, ...d }; };

def(B.AIR, { name: '空気', tex: null, solid: false, opaque: false, collide: false, lightOpacity: 0, creative: false });
def(B.STONE, { name: '石', tex: 'stone', hardness: 2.2, drop: B.COBBLE });
def(B.GRASS, { name: '草ブロック', tex: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, hardness: 0.8, drop: B.DIRT, sound: 'grass' });
def(B.DIRT, { name: '土', tex: 'dirt', hardness: 0.7, sound: 'gravel' });
def(B.COBBLE, { name: '丸石', tex: 'cobblestone', hardness: 2.4 });
def(B.PLANKS, { name: '木材', tex: 'planks', hardness: 1.6, sound: 'wood' });
def(B.SAND, { name: '砂', tex: 'sand', hardness: 0.7, sound: 'sand' });
def(B.GRAVEL, { name: '砂利', tex: 'gravel', hardness: 0.8, sound: 'gravel' });
def(B.LOG_OAK, { name: 'オークの原木', tex: { top: 'log_oak_top', bottom: 'log_oak_top', side: 'log_oak' }, hardness: 1.8, sound: 'wood' });
def(B.LEAVES_OAK, { name: 'オークの葉', tex: 'leaves_oak', opaque: false, lightOpacity: 1, hardness: 0.35, drop: null, sound: 'grass', cutout: true });
def(B.LOG_BIRCH, { name: 'シラカバの原木', tex: { top: 'log_birch_top', bottom: 'log_birch_top', side: 'log_birch' }, hardness: 1.8, sound: 'wood' });
def(B.LEAVES_BIRCH, { name: 'シラカバの葉', tex: 'leaves_birch', opaque: false, lightOpacity: 1, hardness: 0.35, drop: null, sound: 'grass', cutout: true });
def(B.LOG_SPRUCE, { name: 'マツの原木', tex: { top: 'log_spruce_top', bottom: 'log_spruce_top', side: 'log_spruce' }, hardness: 1.8, sound: 'wood' });
def(B.LEAVES_SPRUCE, { name: 'マツの葉', tex: 'leaves_spruce', opaque: false, lightOpacity: 1, hardness: 0.35, drop: null, sound: 'grass', cutout: true });
def(B.WATER, { name: '水', tex: 'water', shape: 'liquid', solid: false, opaque: false, collide: false, lightOpacity: 2, hardness: -1, sound: 'water', cullSame: true, height: 0.875 });
def(B.GLASS, { name: 'ガラス', tex: 'glass', opaque: false, lightOpacity: 0, hardness: 0.5, drop: null, sound: 'glass', cullSame: true, cutout: true });
def(B.BEDROCK, { name: '岩盤', tex: 'bedrock', hardness: -1, creative: false });
def(B.ORE_COAL, { name: '石炭鉱石', tex: 'ore_coal', hardness: 3, drop: B.COAL });
def(B.ORE_IRON, { name: '鉄鉱石', tex: 'ore_iron', hardness: 3.2 });
def(B.ORE_GOLD, { name: '金鉱石', tex: 'ore_gold', hardness: 3.2 });
def(B.ORE_DIAMOND, { name: 'ダイヤモンド鉱石', tex: 'ore_diamond', hardness: 3.6 });
def(B.SNOW_BLOCK, { name: '雪ブロック', tex: 'snow', hardness: 0.4, sound: 'snow' });
def(B.SNOW_LAYER, { name: '雪', tex: 'snow', shape: 'layer', height: 0.125, opaque: false, collide: false, lightOpacity: 0, hardness: 0.2, sound: 'snow', needsSupport: true, cullSame: true });
def(B.SANDSTONE, { name: '砂岩', tex: { top: 'sandstone_top', bottom: 'sandstone_top', side: 'sandstone' }, hardness: 1.6 });
def(B.BRICK, { name: 'レンガ', tex: 'brick', hardness: 2.4 });
def(B.STONE_BRICKS, { name: '石レンガ', tex: 'stone_bricks', hardness: 2.4 });
def(B.TORCH, { name: 'たいまつ', tex: 'torch', shape: 'torch', solid: false, opaque: false, collide: false, lightOpacity: 0, emit: 14, hardness: 0.1, sound: 'wood', needsSupport: true });
def(B.GLOWSTONE, { name: 'ひかる石', tex: 'glowstone', emit: 15, hardness: 0.6, sound: 'glass' });
def(B.TALL_GRASS, { name: '草', tex: 'tall_grass', shape: 'cross', solid: false, opaque: false, collide: false, lightOpacity: 0, hardness: 0.05, drop: null, sound: 'grass', needsSupport: true, replaceable: true, plant: true });
def(B.POPPY, { name: 'ポピー', tex: 'poppy', shape: 'cross', solid: false, opaque: false, collide: false, lightOpacity: 0, hardness: 0.05, sound: 'grass', needsSupport: true, plant: true });
def(B.DANDELION, { name: 'タンポポ', tex: 'dandelion', shape: 'cross', solid: false, opaque: false, collide: false, lightOpacity: 0, hardness: 0.05, sound: 'grass', needsSupport: true, plant: true });
def(B.CORNFLOWER, { name: 'ヤグルマギク', tex: 'cornflower', shape: 'cross', solid: false, opaque: false, collide: false, lightOpacity: 0, hardness: 0.05, sound: 'grass', needsSupport: true, plant: true });
def(B.CACTUS, { name: 'サボテン', tex: { top: 'cactus_top', bottom: 'cactus_top', side: 'cactus_side' }, hardness: 0.6, sound: 'wool', needsSupport: true, opaque: false, cullSame: true });
def(B.WOOL_WHITE, { name: '白い羊毛', tex: 'wool_white', hardness: 0.9, sound: 'wool' });
def(B.WOOL_RED, { name: '赤い羊毛', tex: 'wool_red', hardness: 0.9, sound: 'wool' });
def(B.WOOL_YELLOW, { name: '黄色い羊毛', tex: 'wool_yellow', hardness: 0.9, sound: 'wool' });
def(B.WOOL_BLUE, { name: '青い羊毛', tex: 'wool_blue', hardness: 0.9, sound: 'wool' });
def(B.WOOL_GREEN, { name: '緑の羊毛', tex: 'wool_green', hardness: 0.9, sound: 'wool' });
def(B.WOOL_BLACK, { name: '黒い羊毛', tex: 'wool_black', hardness: 0.9, sound: 'wool' });
def(B.BOOKSHELF, { name: '本棚', tex: { top: 'planks', bottom: 'planks', side: 'bookshelf' }, hardness: 1.6, sound: 'wood' });
def(B.CRAFTING_TABLE, { name: '作業台', tex: { top: 'crafting_table_top', bottom: 'planks', side: 'crafting_table_side' }, hardness: 1.6, sound: 'wood' });
def(B.ICE, { name: '氷', tex: 'ice', hardness: 0.6, sound: 'glass' });
def(B.MOSSY_COBBLE, { name: '苔むした丸石', tex: 'mossy_cobblestone', hardness: 2.4 });
for (const [id, dir] of [[B.TORCH_WALL_N, 'n'], [B.TORCH_WALL_S, 's'], [B.TORCH_WALL_E, 'e'], [B.TORCH_WALL_W, 'w']]) {
  def(id, { name: 'たいまつ', tex: 'torch', shape: 'torch', wall: dir, solid: false, opaque: false, collide: false, lightOpacity: 0, emit: 14, hardness: 0.1, sound: 'wood', drop: B.TORCH, creative: false });
}

// アイテム
def(B.STICK, { name: '棒', tex: 'item_stick', shape: 'item', solid: false, opaque: false, collide: false, creative: false });
def(B.COAL, { name: '石炭', tex: 'item_coal', shape: 'item', solid: false, opaque: false, collide: false, creative: false });
def(B.APPLE, { name: 'りんご', tex: 'item_apple', shape: 'item', solid: false, opaque: false, collide: false, creative: false, food: 4 });

export const BLOCKS = defs;
export const isBlock = (id) => id > 0 && id < ITEM_START && !!defs[id];
export const isItem = (id) => id >= ITEM_START && !!defs[id];
export const getDef = (id) => defs[id] || defs[0];

/** クリエイティブのパレットに出す順番 */
export const CREATIVE_PALETTE = [
  B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.MOSSY_COBBLE, B.STONE_BRICKS, B.BRICK, B.SAND, B.SANDSTONE, B.GRAVEL,
  B.LOG_OAK, B.PLANKS, B.LEAVES_OAK, B.LOG_BIRCH, B.LEAVES_BIRCH, B.LOG_SPRUCE, B.LEAVES_SPRUCE,
  B.GLASS, B.TORCH, B.GLOWSTONE, B.CRAFTING_TABLE, B.BOOKSHELF,
  B.WOOL_WHITE, B.WOOL_RED, B.WOOL_YELLOW, B.WOOL_BLUE, B.WOOL_GREEN, B.WOOL_BLACK,
  B.SNOW_BLOCK, B.SNOW_LAYER, B.ICE, B.WATER, B.CACTUS, B.TALL_GRASS, B.POPPY, B.DANDELION, B.CORNFLOWER,
  B.ORE_COAL, B.ORE_IRON, B.ORE_GOLD, B.ORE_DIAMOND
];

/** クラフトレシピ（順不同、材料があれば作れる） */
export const RECIPES = [
  { out: { id: B.PLANKS, count: 4 }, in: [{ id: B.LOG_OAK, count: 1 }], hint: '原木から木材' },
  { out: { id: B.PLANKS, count: 4 }, in: [{ id: B.LOG_BIRCH, count: 1 }], hint: 'シラカバからも作れる' },
  { out: { id: B.PLANKS, count: 4 }, in: [{ id: B.LOG_SPRUCE, count: 1 }], hint: 'マツからも作れる' },
  { out: { id: B.STICK, count: 4 }, in: [{ id: B.PLANKS, count: 2 }], hint: 'たいまつの材料' },
  { out: { id: B.TORCH, count: 4 }, in: [{ id: B.STICK, count: 1 }, { id: B.COAL, count: 1 }], hint: '暗いところを照らす' },
  { out: { id: B.CRAFTING_TABLE, count: 1 }, in: [{ id: B.PLANKS, count: 4 }], hint: 'かざり用' },
  { out: { id: B.BOOKSHELF, count: 1 }, in: [{ id: B.PLANKS, count: 6 }], hint: 'おうちのかざり' },
  { out: { id: B.GLASS, count: 1 }, in: [{ id: B.SAND, count: 1 }, { id: B.COAL, count: 1 }], hint: '砂を焼いてガラスに' },
  { out: { id: B.STONE, count: 1 }, in: [{ id: B.COBBLE, count: 1 }, { id: B.COAL, count: 1 }], hint: '丸石を焼いて石に' },
  { out: { id: B.STONE_BRICKS, count: 4 }, in: [{ id: B.STONE, count: 4 }], hint: 'きれいな石の建材' },
  { out: { id: B.BRICK, count: 1 }, in: [{ id: B.DIRT, count: 2 }, { id: B.COAL, count: 1 }], hint: '土を焼いてレンガに' },
  { out: { id: B.SANDSTONE, count: 1 }, in: [{ id: B.SAND, count: 4 }], hint: '砂をかためる' },
  { out: { id: B.SNOW_BLOCK, count: 1 }, in: [{ id: B.SNOW_LAYER, count: 4 }], hint: '雪をかためる' },
  { out: { id: B.WOOL_RED, count: 1 }, in: [{ id: B.WOOL_WHITE, count: 1 }, { id: B.POPPY, count: 1 }], hint: '花で染める' },
  { out: { id: B.WOOL_YELLOW, count: 1 }, in: [{ id: B.WOOL_WHITE, count: 1 }, { id: B.DANDELION, count: 1 }], hint: '花で染める' },
  { out: { id: B.WOOL_BLUE, count: 1 }, in: [{ id: B.WOOL_WHITE, count: 1 }, { id: B.CORNFLOWER, count: 1 }], hint: '花で染める' },
  { out: { id: B.WOOL_GREEN, count: 1 }, in: [{ id: B.WOOL_WHITE, count: 1 }, { id: B.CACTUS, count: 1 }], hint: 'サボテンで染める' },
  { out: { id: B.WOOL_BLACK, count: 1 }, in: [{ id: B.WOOL_WHITE, count: 1 }, { id: B.COAL, count: 1 }], hint: '石炭で染める' },
  { out: { id: B.GLOWSTONE, count: 1 }, in: [{ id: B.GLASS, count: 1 }, { id: B.COAL, count: 2 }, { id: B.ORE_GOLD, count: 1 }], hint: 'とても明るい石' }
];

/* ---------- アトラス / UV ---------- */
let atlas = null;
export function getAtlas() {
  if (!atlas) atlas = buildAtlas();
  return atlas;
}

/** テクスチャ名 → タイル番号 */
export function tileIndex(name) {
  const a = getAtlas();
  const i = a.index.get(name);
  if (i === undefined) throw new Error('texture not found: ' + name);
  return i;
}

/** face: 0:+x 1:-x 2:+y 3:-y 4:+z 5:-z */
export function faceTexture(def, face) {
  const t = def.tex;
  if (typeof t === 'string') return t;
  if (face === 2) return t.top;
  if (face === 3) return t.bottom;
  return t.side;
}

/**
 * タイルの UV 範囲（flipY=true の CanvasTexture 前提）
 * @returns {{u0:number,v0:number,u1:number,v1:number}}
 */
export function tileUV(tile) {
  const a = getAtlas();
  const cols = a.cols, rows = a.rows;
  const col = tile % cols, row = Math.floor(tile / cols);
  const eps = 1 / (TILE * 32);
  const tw = 1 / cols, th = 1 / rows;
  return {
    u0: col * tw + eps * tw, u1: (col + 1) * tw - eps * tw,
    v0: 1 - (row + 1) * th + eps * th, v1: 1 - row * th - eps * th
  };
}

/* ---------- アイコン（ホットバー / インベントリ用） ---------- */
const iconCache = new Map();
export function getIcon(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const d = getDef(id);
  const a = getAtlas();
  const S = 64;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (!d.tex) { iconCache.set(id, ''); return ''; }
  if (d.shape === 'cube' || d.shape === 'liquid' || d.shape === 'layer') {
    const top = a.tileCanvas(faceTexture(d, 2));
    const left = a.tileCanvas(faceTexture(d, 1));
    const right = a.tileCanvas(faceTexture(d, 4));
    const h = d.shape === 'cube' ? 1 : (d.height || 1);
    drawIsoCube(ctx, S, top, left, right, h);
  } else {
    const t = a.tileCanvas(d.tex);
    ctx.drawImage(t, 8, 8, S - 16, S - 16);
  }
  const url = c.toDataURL();
  iconCache.set(id, url);
  return url;
}

function drawIsoCube(ctx, S, top, left, right, h) {
  // 等角投影っぽい見た目：上面はひし形、左右の面は平行四辺形
  const w = S * 0.46;        // 半幅
  const cx = S / 2, cy = S / 2;
  const topH = w * 0.5;      // ひし形の高さの半分
  const sideH = w * h;       // 側面の高さ
  const yTop = cy - topH - sideH / 2 + topH * 0.2;
  // 上面
  ctx.save();
  ctx.setTransform(w / 16, topH / 16, -w / 16, topH / 16, cx, yTop);
  ctx.drawImage(top, 0, 0, 16, 16);
  ctx.restore();
  // 左面
  ctx.save();
  ctx.setTransform(w / 16, topH / 16, 0, sideH / 16, cx - w, yTop + topH);
  ctx.drawImage(left, 0, 0, 16, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.restore();
  // 右面
  ctx.save();
  ctx.setTransform(w / 16, -topH / 16, 0, sideH / 16, cx, yTop + topH * 2);
  ctx.drawImage(right, 0, 0, 16, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.restore();
}

/** 破壊時のドロップ id（null = 何も出ない） */
export function dropOf(id) {
  const d = getDef(id);
  if (d.drop === null) return null;
  if (d.drop === undefined) return id;
  return d.drop;
}
