/**
 * シティチェイス - 推理モデル（警察視点）
 *
 * 公開情報（ラウンド数・捜索結果・発見済み痕跡）と矛盾しない「犯人の逃走経路」を
 * すべて列挙して、犯人が今いるビルの確率・痕跡が眠っているビルの確率を求める。
 * 5×5の盤で11手の自己回避経路は最大でも約4.3万通りなので、厳密に全列挙できる。
 *
 * 経路の制約
 *  - タテヨコ隣接のみ・同じビルには二度と入れない（痕跡が残るため）
 *  - ラウンド k に捜索して「何もなし」→ ラウンド k までにそのビルを通っていない
 *  - ラウンド k に捜索して「痕跡（色）」→ それより前のラウンド（色に合う番号）に通っている
 */
import {
  NUM_BUILDINGS, MAX_ROUNDS, adjacentBuildings, buildingsAround, traceColor,
} from './rules.js';

export class Belief {
  /**
   * @param {object} view  CityChaseGame#publicView()
   * @param {number} pathLen  経路の長さ（= 犯人が動いた回数）。警察フェーズなら view.round
   */
  constructor(view, pathLen = view.round) {
    this.view = view;
    this.pathLen = Math.max(1, Math.min(MAX_ROUNDS, pathLen));
    this.paths = [];
    this._enumerate();
    this.count = this.paths.length;
    this.pNow = new Float64Array(NUM_BUILDINGS);
    this.traceProb = new Float64Array(NUM_BUILDINGS);
    this.visitProb = new Float64Array(NUM_BUILDINGS);
    if (this.count > 0) {
      const inv = 1 / this.count;
      for (const p of this.paths) {
        const last = p[p.length - 1];
        this.pNow[last] += inv;
        for (let t = 0; t < p.length; t++) {
          this.visitProb[p[t]] += inv;
          if (t < p.length - 1) this.traceProb[p[t]] += inv;
        }
      }
      // 発見済みの痕跡は「未発見の痕跡の確率」から外す
      for (let b = 0; b < NUM_BUILDINGS; b++) if (view.revealed[b]) this.traceProb[b] = 0;
    }
  }

  _enumerate() {
    const view = this.view;
    const L = this.pathLen;
    // blockedUntil[b]: このラウンド以前にはビル b に居られない（「何もなし」の捜索）
    const blockedUntil = new Int8Array(NUM_BUILDINGS);
    // traceReq[b]: {k: 発見ラウンド, color}
    const traceReq = new Array(NUM_BUILDINGS).fill(null);
    for (const s of view.searches) {
      if (s.result === 'nothing') {
        if (s.round > blockedUntil[s.building]) blockedUntil[s.building] = s.round;
      } else if (s.result === 'trace') {
        const cur = traceReq[s.building];
        if (!cur || s.round < cur.k) traceReq[s.building] = { k: s.round, color: s.color };
      } else if (s.result === 'car') {
        traceReq[s.building] = { k: s.round + 1, color: s.color, car: true };
      }
    }
    const reqList = [];
    for (let b = 0; b < NUM_BUILDINGS; b++) if (traceReq[b]) reqList.push({ b, ...traceReq[b] });
    const reqCount = reqList.length;

    const path = new Array(L);
    const visited = new Uint8Array(NUM_BUILDINGS);
    const paths = this.paths;
    let metCount = 0;

    const okAt = (b, round) => {
      if (round <= blockedUntil[b]) return false;
      const req = traceReq[b];
      if (req) {
        if (round >= req.k) return false;
        if (traceColor(round) !== req.color) return false;
      }
      return true;
    };

    const dfs = (b, t) => {
      const round = t + 1;
      path[t] = b;
      visited[b] = 1;
      const req = traceReq[b];
      if (req) metCount++;
      let prune = false;
      if (metCount < reqCount) {
        // まだ満たしていない痕跡条件: 次のラウンド以降で満たせるか
        for (let q = 0; q < reqCount; q++) {
          const r = reqList[q];
          if (!visited[r.b] && round + 1 >= r.k) { prune = true; break; }
        }
      }
      if (!prune) {
        if (round === L) {
          if (metCount === reqCount) paths.push(path.slice());
        } else {
          const adj = adjacentBuildings(b);
          for (let k = 0; k < adj.length; k++) {
            const nb = adj[k];
            if (visited[nb]) continue;
            if (!okAt(nb, round + 1)) continue;
            dfs(nb, t + 1);
          }
        }
      }
      if (req) metCount--;
      visited[b] = 0;
    };

    for (let s = 0; s < NUM_BUILDINGS; s++) {
      if (!okAt(s, 1)) continue;
      dfs(s, 0);
    }
  }

  /**
   * 次の数ラウンドの犯人位置の予測分布。
   * @param {number} steps 先読みラウンド数
   * @param {object} model 犯人モデル { alpha: ヘリ隣接ビルを避ける強さ, helis: [{pos}] }
   * @returns {Float64Array[]} steps 個の分布（各 25要素）
   */
  predict(steps = 1, model = {}) {
    const out = [];
    const alpha = model.alpha || 0;
    const danger = new Float64Array(NUM_BUILDINGS);
    if (alpha > 0 && model.helis) {
      for (const h of model.helis) if (h.pos !== null && h.pos !== undefined) for (const b of buildingsAround(h.pos)) danger[b] += 1;
    }
    let cur = this.paths.map((p) => ({ p, w: 1 / Math.max(1, this.count) }));
    const maxSteps = Math.min(steps, MAX_ROUNDS - this.pathLen);
    for (let s = 0; s < steps; s++) {
      const dist = new Float64Array(NUM_BUILDINGS);
      if (s >= maxSteps) { out.push(dist); continue; }
      const next = [];
      for (const { p, w } of cur) {
        const last = p[p.length - 1];
        const cands = [];
        let total = 0;
        for (const nb of adjacentBuildings(last)) {
          if (p.includes(nb)) continue;
          const wt = alpha > 0 ? Math.exp(-alpha * danger[nb]) : 1;
          cands.push([nb, wt]);
          total += wt;
        }
        if (!cands.length) continue; // 包囲 → 犯人の負け（分布には乗らない）
        for (const [nb, wt] of cands) {
          const nw = (w * wt) / total;
          dist[nb] += nw;
          next.push({ p: p.concat(nb), w: nw });
        }
      }
      out.push(dist);
      cur = next;
    }
    return out;
  }

  /** 情報エントロピー（推理の進み具合の指標） */
  entropy() {
    let e = 0;
    for (let b = 0; b < NUM_BUILDINGS; b++) {
      const p = this.pNow[b];
      if (p > 0) e -= p * Math.log2(p);
    }
    return e;
  }
}

export function buildBelief(view, pathLen) {
  return new Belief(view, pathLen);
}
