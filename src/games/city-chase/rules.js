/**
 * シティチェイス - ルールエンジン（純ロジック / DOM・Three.js 非依存）
 *
 * 盤面の構成（実物のボードゲームを再現）
 *  - ビル: 5×5 = 25棟（高いビル10・低いビル15）。index = row*5 + col
 *  - 交差点: ビルの間の道路が交わる 4×4 = 16か所。index = row*4 + col
 *      交差点(r,c) を囲む4つのビル = (r,c) (r,c+1) (r+1,c) (r+1,c+1)
 *  - ヘリコプター: 3機（ピンク / イエロー / グリーン）。交差点に1機まで
 *  - 車: 1台（犯人）。ビルの下に隠れる
 *  - 痕跡コマ: 11個（黄1 = 1ラウンド目、赤1 = 6ラウンド目、青9 = それ以外）
 *  - ラウンド: 最大11
 *
 * 1ラウンド = 犯人フェーズ → 警察フェーズ
 *  犯人フェーズ: 1R目は好きなビルへ。2R目以降は「タテヨコに隣接」かつ「痕跡が無い」ビルへ移動し、
 *               そのラウンドの痕跡コマを置く。動けなければ「包囲」= 警察の勝ち
 *  警察フェーズ: 各ヘリが「移動（タテヨコ1マス・他ヘリがいる所は不可）」か
 *               「捜索（交差点を囲む4つのビルから1つ）」を1回ずつ行う
 *               捜索結果: 何もなし / 痕跡発見（ビルの上に置いて公開）/ 車発見 = 逮捕（警察の勝ち）
 *  11ラウンド目の警察フェーズが終わっても捕まらなければ「逃走成功」= 犯人の勝ち
 */

export const GRID = 5;
export const IGRID = 4;
export const NUM_BUILDINGS = GRID * GRID;
export const NUM_INTERSECTIONS = IGRID * IGRID;
export const MAX_ROUNDS = 11;
export const NUM_HELIS = 3;
export const TALL_COUNT = 10;
export const SHORT_COUNT = 15;

export const HELIS = [
  { id: 0, key: 'pink', name: 'ピンク', label: 'P', color: 0xff4fa3, css: '#ff4fa3' },
  { id: 1, key: 'yellow', name: 'イエロー', label: 'Y', color: 0xffd53d, css: '#ffd53d' },
  { id: 2, key: 'green', name: 'グリーン', label: 'G', color: 0x4ade80, css: '#4ade80' },
];

export const TRACE_CSS = { yellow: '#ffd23f', red: '#ff5a36', blue: '#38bdf8' };

/** ラウンド番号 → 痕跡コマの色 */
export function traceColor(round) {
  if (round === 1) return 'yellow';
  if (round === 6) return 'red';
  return 'blue';
}

/** 痕跡の色から「あり得るラウンド」の一覧 */
export function roundsForColor(color) {
  const out = [];
  for (let r = 1; r <= MAX_ROUNDS; r++) if (traceColor(r) === color) out.push(r);
  return out;
}

// ---------- 座標ヘルパー ----------
export const bRow = (b) => Math.floor(b / GRID);
export const bCol = (b) => b % GRID;
export const bIndex = (r, c) => r * GRID + c;
export const iRow = (i) => Math.floor(i / IGRID);
export const iCol = (i) => i % IGRID;
export const iIndex = (r, c) => r * IGRID + c;

const _around = [];
const _adjB = [];
const _adjI = [];
const _intersOfB = [];
for (let i = 0; i < NUM_INTERSECTIONS; i++) {
  const r = iRow(i), c = iCol(i);
  _around[i] = [bIndex(r, c), bIndex(r, c + 1), bIndex(r + 1, c), bIndex(r + 1, c + 1)];
  const adj = [];
  if (r > 0) adj.push(iIndex(r - 1, c));
  if (c < IGRID - 1) adj.push(iIndex(r, c + 1));
  if (r < IGRID - 1) adj.push(iIndex(r + 1, c));
  if (c > 0) adj.push(iIndex(r, c - 1));
  _adjI[i] = adj;
}
for (let b = 0; b < NUM_BUILDINGS; b++) {
  const r = bRow(b), c = bCol(b);
  const adj = [];
  if (r > 0) adj.push(bIndex(r - 1, c));
  if (c < GRID - 1) adj.push(bIndex(r, c + 1));
  if (r < GRID - 1) adj.push(bIndex(r + 1, c));
  if (c > 0) adj.push(bIndex(r, c - 1));
  _adjB[b] = adj;
  const inters = [];
  for (let i = 0; i < NUM_INTERSECTIONS; i++) if (_around[i].includes(b)) inters.push(i);
  _intersOfB[b] = inters;
}

/** 交差点 i を囲む4つのビル */
export const buildingsAround = (i) => _around[i];
/** ビル b にタテヨコで隣接するビル */
export const adjacentBuildings = (b) => _adjB[b];
/** 交差点 i にタテヨコで隣接する交差点 */
export const adjacentIntersections = (i) => _adjI[i];
/** ビル b に接している交差点（最大4） */
export const intersectionsOfBuilding = (b) => _intersOfB[b];

/** マンハッタン距離（ビル同士） */
export function buildingDistance(a, b) {
  return Math.abs(bRow(a) - bRow(b)) + Math.abs(bCol(a) - bCol(b));
}

/** ビル b から交差点 i までの距離（交差点に接するビルなら 0） */
export function buildingToIntersectionDistance(b, i) {
  let best = Infinity;
  for (const nb of _around[i]) best = Math.min(best, buildingDistance(b, nb));
  return best;
}

// ---------- 乱数（シード付き） ----------
export function createRng(seed = Date.now() % 2147483647) {
  let a = seed >>> 0;
  const rng = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (n) => Math.floor(rng() * n);
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.shuffle = (arr) => {
    const a2 = arr.slice();
    for (let i = a2.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a2[i], a2[j]] = [a2[j], a2[i]];
    }
    return a2;
  };
  return rng;
}

/** 高いビル10・低いビル15をランダム配置（実物は「好きな順番で差し込む」） */
export function randomHeights(rng = createRng()) {
  const arr = [];
  for (let k = 0; k < TALL_COUNT; k++) arr.push('tall');
  for (let k = 0; k < SHORT_COUNT; k++) arr.push('short');
  return rng.shuffle(arr);
}

// ---------- ゲーム本体 ----------
export class CityChaseGame {
  /**
   * @param {object} opts
   * @param {Array<'tall'|'short'>} [opts.heights]
   * @param {function} [opts.rng]
   */
  constructor(opts = {}) {
    this.rng = opts.rng || createRng();
    this.heights = opts.heights || randomHeights(this.rng);
    this.phase = 'setup'; // setup | thief | police | over
    this.round = 0;
    this.helis = HELIS.map((h) => ({ id: h.id, key: h.key, pos: null, acted: false }));
    this.thief = { pos: null, path: [] };
    /** @type {Array<null|{round:number,color:string,found:boolean,foundRound:number|null}>} */
    this.traces = new Array(NUM_BUILDINGS).fill(null);
    /** 公開情報: 捜索履歴 */
    this.searches = [];
    /** 公開情報: ヘリの移動履歴 */
    this.moves = [];
    this.result = null;
    this.events = [];
  }

  // ---- 共通 ----
  _emit(ev) { this.events.push(ev); return ev; }
  isOver() { return this.phase === 'over'; }
  heli(id) { return this.helis[id]; }
  heliAt(i) { return this.helis.find((h) => h.pos === i) || null; }
  remainingRounds() { return MAX_ROUNDS - this.round; }

  // ---- セットアップ ----
  canPlaceHeli(heliId, i) {
    if (this.phase !== 'setup') return false;
    if (i < 0 || i >= NUM_INTERSECTIONS) return false;
    const occupied = this.helis.find((h) => h.pos === i && h.id !== heliId);
    return !occupied;
  }

  placeHeli(heliId, i) {
    if (!this.canPlaceHeli(heliId, i)) throw new Error('そこにはヘリを置けません');
    const h = this.helis[heliId];
    const prev = h.pos;
    h.pos = i;
    return this._emit({ type: 'place', heliId, from: prev, to: i });
  }

  isSetupComplete() { return this.phase === 'setup' && this.helis.every((h) => h.pos !== null); }

  /** セットアップ完了 → 1ラウンド目の犯人フェーズへ */
  start() {
    if (!this.isSetupComplete()) throw new Error('ヘリを3機とも配置してください');
    this.round = 1;
    this.phase = 'thief';
    return this._emit({ type: 'phase', phase: 'thief', round: 1 });
  }

  // ---- 犯人フェーズ ----
  /** 犯人が選べるビル一覧 */
  thiefCandidates() {
    if (this.phase !== 'thief') return [];
    if (this.round === 1) {
      const all = [];
      for (let b = 0; b < NUM_BUILDINGS; b++) all.push(b);
      return all;
    }
    return adjacentBuildings(this.thief.pos).filter((b) => !this.traces[b]);
  }

  isSurrounded() { return this.phase === 'thief' && this.round >= 2 && this.thiefCandidates().length === 0; }

  /** 犯人が移動して隠れる（痕跡コマを置く） */
  thiefMove(b) {
    if (this.phase !== 'thief') throw new Error('犯人フェーズではありません');
    if (!this.thiefCandidates().includes(b)) throw new Error('そのビルには移動できません');
    const from = this.thief.pos;
    const color = traceColor(this.round);
    this.traces[b] = { round: this.round, color, found: false, foundRound: null };
    this.thief.pos = b;
    this.thief.path.push(b);
    this.phase = 'police';
    for (const h of this.helis) h.acted = false;
    const ev = this._emit({ type: 'thiefMove', round: this.round, from, to: b, color });
    this._emit({ type: 'phase', phase: 'police', round: this.round });
    return ev;
  }

  /** 犯人が動けない → 包囲（自己申告）。警察の勝ち */
  declareSurrounded() {
    if (!this.isSurrounded()) throw new Error('まだ動けるビルがあります');
    this.phase = 'over';
    this.result = { winner: 'police', reason: 'surrounded', building: this.thief.pos, round: this.round };
    return this._emit({ type: 'gameover', ...this.result });
  }

  // ---- 警察フェーズ ----
  unactedHelis() { return this.phase === 'police' ? this.helis.filter((h) => !h.acted) : []; }

  /** ヘリの行動候補 */
  heliOptions(heliId) {
    const h = this.helis[heliId];
    if (this.phase !== 'police' || h.acted) return { moves: [], searches: [] };
    const moves = adjacentIntersections(h.pos).filter((i) => !this.heliAt(i));
    // 痕跡を発見済みのビルには車はあり得ない（犯人は痕跡のあるビルへ戻れない）ので候補から外す
    const searches = buildingsAround(h.pos).filter((b) => !(this.traces[b] && this.traces[b].found));
    return { moves, searches };
  }

  heliMove(heliId, i) {
    const opts = this.heliOptions(heliId);
    if (!opts.moves.includes(i)) throw new Error('そこには移動できません');
    const h = this.helis[heliId];
    const from = h.pos;
    h.pos = i;
    h.acted = true;
    this.moves.push({ round: this.round, heliId, from, to: i });
    const ev = this._emit({ type: 'heliMove', round: this.round, heliId, from, to: i });
    this._afterHeliAction();
    return ev;
  }

  heliSearch(heliId, b) {
    const opts = this.heliOptions(heliId);
    if (!opts.searches.includes(b)) throw new Error('そのビルは捜索できません');
    const h = this.helis[heliId];
    h.acted = true;
    let result = 'nothing';
    let color = null;
    if (this.thief.pos === b) {
      result = 'car';
      color = this.traces[b].color;
      this.traces[b].found = true;
      this.traces[b].foundRound = this.round;
    } else if (this.traces[b] && !this.traces[b].found) {
      result = 'trace';
      color = this.traces[b].color;
      this.traces[b].found = true;
      this.traces[b].foundRound = this.round;
    }
    this.searches.push({ round: this.round, heliId, building: b, result, color });
    const ev = this._emit({ type: 'search', round: this.round, heliId, building: b, result, color, height: this.heights[b] });
    if (result === 'car') {
      this.phase = 'over';
      this.result = { winner: 'police', reason: 'arrested', building: b, round: this.round, heliId };
      this._emit({ type: 'gameover', ...this.result });
      return ev;
    }
    this._afterHeliAction();
    return ev;
  }

  _afterHeliAction() {
    if (this.phase !== 'police') return;
    if (this.helis.some((h) => !h.acted)) return;
    // 全ヘリ行動済み → ラウンド終了
    if (this.round >= MAX_ROUNDS) {
      this.phase = 'over';
      this.result = { winner: 'thief', reason: 'escaped', building: this.thief.pos, round: this.round };
      this._emit({ type: 'gameover', ...this.result });
      return;
    }
    this.round += 1;
    this.phase = 'thief';
    this._emit({ type: 'phase', phase: 'thief', round: this.round });
  }

  // ---- 情報ビュー ----
  /** 警察が知っている情報だけを含むビュー（AI/推理用） */
  publicView() {
    return {
      round: this.round,
      phase: this.phase,
      helis: this.helis.map((h) => ({ id: h.id, pos: h.pos, acted: h.acted })),
      revealed: this.traces.map((t) => (t && t.found ? { color: t.color, foundRound: t.foundRound } : null)),
      searches: this.searches.map((s) => ({ ...s })),
      heights: this.heights.slice(),
    };
  }

  /** 公開済みの痕跡（ビル index → 色） */
  revealedTraces() {
    const out = [];
    this.traces.forEach((t, b) => { if (t && t.found) out.push({ building: b, color: t.color, round: t.round }); });
    return out;
  }

  /** 全情報（犯人用 / リザルト用） */
  fullPath() {
    return this.thief.path.map((b, k) => ({ building: b, round: k + 1, color: traceColor(k + 1), found: !!(this.traces[b] && this.traces[b].found) }));
  }

  /** 状態を複製（AIの先読み用） */
  clone() {
    const g = new CityChaseGame({ heights: this.heights.slice(), rng: this.rng });
    g.phase = this.phase;
    g.round = this.round;
    g.helis = this.helis.map((h) => ({ ...h }));
    g.thief = { pos: this.thief.pos, path: this.thief.path.slice() };
    g.traces = this.traces.map((t) => (t ? { ...t } : null));
    g.searches = this.searches.map((s) => ({ ...s }));
    g.moves = this.moves.map((m) => ({ ...m }));
    g.result = this.result ? { ...this.result } : null;
    g.events = [];
    return g;
  }

  /** 保存用スナップショット */
  toJSON() {
    return {
      heights: this.heights, phase: this.phase, round: this.round, helis: this.helis,
      thief: this.thief, traces: this.traces, searches: this.searches, moves: this.moves, result: this.result,
    };
  }

  static fromJSON(data) {
    const g = new CityChaseGame({ heights: data.heights });
    Object.assign(g, {
      phase: data.phase, round: data.round, helis: data.helis.map((h) => ({ ...h })),
      thief: { pos: data.thief.pos, path: data.thief.path.slice() },
      traces: data.traces.map((t) => (t ? { ...t } : null)),
      searches: data.searches.map((s) => ({ ...s })), moves: (data.moves || []).map((m) => ({ ...m })),
      result: data.result ? { ...data.result } : null,
    });
    return g;
  }
}
