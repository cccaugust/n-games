/**
 * シティチェイス - AI（犯人 / 警察）
 *
 * 警察AI: 推理モデル（belief.js）で「犯人が今いる確率」「痕跡が眠っている確率」を出し、
 *         各ヘリの「捜索」or「移動（先読み）」の期待値が最大の行動を選ぶ。
 *         1機ずつ決定し、捜索結果を反映してから次のヘリを決める（人間の警察と同じ）。
 * 犯人AI: 生存（包囲されない）・即時リスク・ヘリからの距離・警察の推理上の目立ちにくさ・
 *         逃げ道の多さをスコア化。hard は警察AIの行動をシミュレーションして回避する。
 */
import {
  MAX_ROUNDS, NUM_INTERSECTIONS, adjacentBuildings, adjacentIntersections, buildingsAround,
  buildingToIntersectionDistance, iRow, iCol, createRng,
} from './rules.js';
import { buildBelief } from './belief.js';

export const DIFFICULTIES = [
  { key: 'easy', name: 'やさしい', desc: 'のんびり。はじめてでも勝てる' },
  { key: 'normal', name: 'ふつう', desc: '手ごたえあり。推理して動く' },
  { key: 'hard', name: 'むずかしい', desc: '本気。先読みして追いつめる' },
];

const POLICE_CFG = {
  easy: { randomness: 0.45, lambda: 0.25, gamma: 0.85, lookahead: 1, alpha: 0, noise: 0.03 },
  normal: { randomness: 0.0, lambda: 0.45, gamma: 0.9, lookahead: 1, alpha: 0, noise: 0.004 },
  hard: { randomness: 0.0, lambda: 0.5, gamma: 0.92, lookahead: 2, alpha: 0.8, noise: 0.001 },
};

const THIEF_CFG = {
  easy: { wRisk: 1.2, wDist: 0.25, wExposure: 2, wFlex: 0.15, wRoom: 0.08, wTrace: 0.3, temp: 0.9, simulate: false, searchProb: 0.5 },
  normal: { wRisk: 3.0, wDist: 0.45, wExposure: 6, wFlex: 0.35, wRoom: 0.15, wTrace: 0.8, temp: 0.35, simulate: false, searchProb: 0.75 },
  hard: { wRisk: 4.0, wDist: 0.5, wExposure: 8, wFlex: 0.45, wRoom: 0.2, wTrace: 1.0, temp: 0.12, simulate: true, searchProb: 0.85 },
};

function ensureRng(rng) {
  if (typeof rng === 'function' && rng.pick) return rng;
  return createRng();
}

/** b から visited を避けて何手進めるか（cap で打ち切り） */
export function longestEscape(b, visitedSet, cap) {
  if (cap <= 0) return 0;
  const visited = new Uint8Array(25);
  for (const v of visitedSet) visited[v] = 1;
  visited[b] = 1;
  let best = 0;
  const dfs = (cur, depth) => {
    if (depth > best) best = depth;
    if (best >= cap) return;
    for (const nb of adjacentBuildings(cur)) {
      if (visited[nb]) continue;
      visited[nb] = 1;
      dfs(nb, depth + 1);
      visited[nb] = 0;
      if (best >= cap) return;
    }
  };
  dfs(b, 0);
  return best;
}

// ======================= 警察AI =======================

/** セットアップ: ヘリ3機の初期配置（散らばった配置を好む） */
export function policePlaceHelis(difficulty = 'normal', rng) {
  rng = ensureRng(rng);
  let best = null;
  let bestScore = -Infinity;
  const tries = difficulty === 'easy' ? 6 : 60;
  for (let t = 0; t < tries; t++) {
    const set = [];
    while (set.length < 3) {
      const i = rng.int(NUM_INTERSECTIONS);
      if (!set.includes(i)) set.push(i);
    }
    let minD = Infinity, sumD = 0, center = 0;
    for (let a = 0; a < 3; a++) {
      center += Math.abs(iRow(set[a]) - 1.5) + Math.abs(iCol(set[a]) - 1.5);
      for (let b2 = a + 1; b2 < 3; b2++) {
        const d = Math.abs(iRow(set[a]) - iRow(set[b2])) + Math.abs(iCol(set[a]) - iCol(set[b2]));
        minD = Math.min(minD, d);
        sumD += d;
      }
    }
    const score = minD * 2 + sumD * 0.5 - center * 0.35 + rng() * 0.8;
    if (score > bestScore) { bestScore = score; best = set; }
  }
  return best;
}

/**
 * 警察の次の1行動を決める。
 * @returns {{heliId:number,type:'move'|'search',target:number,info?:object}|null}
 */
export function policeDecide(game, difficulty = 'normal', rng) {
  rng = ensureRng(rng);
  const cfg = POLICE_CFG[difficulty] || POLICE_CFG.normal;
  const view = game.publicView();
  const unacted = view.helis.filter((h) => !h.acted);
  if (view.phase !== 'police' || !unacted.length) return null;

  const actions = [];
  for (const h of unacted) {
    const { moves, searches } = game.heliOptions(h.id);
    for (const b of searches) actions.push({ heliId: h.id, type: 'search', target: b });
    for (const i of moves) actions.push({ heliId: h.id, type: 'move', target: i });
  }
  if (!actions.length) return null;
  if (cfg.randomness > 0 && rng() < cfg.randomness) return rng.pick(actions);

  const belief = buildBelief(view, view.round);
  const remaining = MAX_ROUNDS - view.round; // 残りラウンド数（この後に犯人が動ける回数）
  const horizon = Math.min(cfg.lookahead, remaining);
  const preds = horizon > 0 ? belief.predict(horizon, { alpha: cfg.alpha, helis: view.helis }) : [];
  const pNow = belief.pNow;
  const tp = belief.traceProb;
  const revealed = view.revealed;

  const occupied = new Set(view.helis.map((h) => h.pos));

  // 交差点 i に「s ラウンド後」にいる価値
  const memo = new Map();
  const valueAt = (i, s) => {
    if (s > horizon) return 0;
    const key = i * 8 + s;
    if (memo.has(key)) return memo.get(key);
    let searchBest = 0;
    const dist = preds[s - 1];
    for (const b of buildingsAround(i)) {
      if (revealed[b]) continue;
      const v = dist[b] + cfg.lambda * tp[b] * 0.6;
      if (v > searchBest) searchBest = v;
    }
    let moveBest = 0;
    if (s < horizon) {
      for (const j of adjacentIntersections(i)) moveBest = Math.max(moveBest, cfg.gamma * valueAt(j, s + 1));
    }
    const v = Math.max(searchBest, moveBest);
    memo.set(key, v);
    return v;
  };

  let best = null;
  let bestScore = -Infinity;
  const scored = [];
  for (const a of actions) {
    let score;
    if (a.type === 'search') {
      score = pNow[a.target] + cfg.lambda * tp[a.target];
    } else {
      if (horizon === 0) score = -0.001;
      else {
        score = cfg.gamma * valueAt(a.target, 1);
        // 他のヘリがいる所の隣へ固まりすぎない
        let crowd = 0;
        for (const o of view.helis) if (o.id !== a.heliId && o.pos !== null && adjacentIntersections(a.target).includes(o.pos)) crowd++;
        score -= crowd * 0.004;
      }
    }
    score += rng() * cfg.noise;
    scored.push({ ...a, score });
    if (score > bestScore) { bestScore = score; best = a; }
  }
  return { ...best, info: { count: belief.count, pNow: Array.from(pNow), scored } };
}

// ======================= 犯人AI =======================

function softmaxPick(items, temp, rng) {
  const max = Math.max(...items.map((x) => x.score));
  const ws = items.map((x) => Math.exp((x.score - max) / Math.max(1e-6, temp)));
  const total = ws.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let k = 0; k < items.length; k++) {
    r -= ws[k];
    if (r <= 0) return items[k];
  }
  return items[items.length - 1];
}

/** 警察AI（ふつう）がこのラウンドに b を捜索するかシミュレーション */
function simulatePoliceRound(game, b, rng) {
  const g = game.clone();
  g.thiefMove(b);
  const simRng = createRng(12345 + b * 7 + game.round * 31);
  let guard = 0;
  while (g.phase === 'police' && guard++ < 6) {
    const act = policeDecide(g, 'normal', simRng);
    if (!act) break;
    if (act.type === 'move') g.heliMove(act.heliId, act.target);
    else g.heliSearch(act.heliId, act.target);
  }
  const caught = g.phase === 'over' && g.result && g.result.reason === 'arrested';
  // 次ラウンドの自分の候補がどれだけ安全に残るか
  let nextSafe = 0;
  if (!caught && g.phase === 'thief') {
    const cands = g.thiefCandidates();
    const heliPos = g.helis.map((h) => h.pos);
    for (const c of cands) {
      const adjacentToHeli = heliPos.some((i) => buildingsAround(i).includes(c));
      nextSafe += adjacentToHeli ? 0.35 : 1;
    }
  }
  return { caught, nextSafe };
}

/**
 * 犯人の次の隠れ先を決める。
 * @returns {number} ビル index
 */
export function thiefDecide(game, difficulty = 'normal', rng) {
  rng = ensureRng(rng);
  const cfg = THIEF_CFG[difficulty] || THIEF_CFG.normal;
  const cands = game.thiefCandidates();
  if (!cands.length) return null;
  if (cands.length === 1) return cands[0];

  const round = game.round;
  const remaining = MAX_ROUNDS - round; // この移動の後、さらに必要な移動回数
  const view = game.publicView();
  const belief = buildBelief(view, round); // 自分が動いた後に警察が持つ推理
  const pPolice = belief.pNow;
  const heliPos = game.helis.map((h) => h.pos).filter((p) => p !== null);
  const visited = new Set(game.thief.path);

  const items = cands.map((b) => {
    const room = longestEscape(b, visited, remaining);
    const survive = room >= remaining;

    // 即時リスク: このラウンドに捜索される確率の見積もり
    let risk = 0;
    for (const i of heliPos) {
      const around = buildingsAround(i);
      if (!around.includes(b)) continue;
      const live = around.filter((x) => !view.revealed[x]);
      let sum = 0;
      for (const x of live) sum += pPolice[x] + 0.02;
      const share = (pPolice[b] + 0.02) / Math.max(1e-9, sum);
      risk = 1 - (1 - risk) * (1 - Math.min(1, share * cfg.searchProb));
    }

    let dist = Infinity;
    for (const i of heliPos) dist = Math.min(dist, buildingToIntersectionDistance(b, i));
    if (!isFinite(dist)) dist = 2;

    const exposure = pPolice[b];
    const nextMoves = adjacentBuildings(b).filter((x) => !visited.has(x));
    const flexibility = nextMoves.length;
    const nearTrace = adjacentBuildings(b).some((x) => view.revealed[x]) ? 1 : 0;

    let score = (survive ? 0 : -100 + room * 5)
      + room * cfg.wRoom
      - risk * cfg.wRisk
      + Math.min(dist, 3) * cfg.wDist
      - exposure * cfg.wExposure
      + flexibility * cfg.wFlex
      - nearTrace * cfg.wTrace;

    if (cfg.simulate && survive) {
      const sim = simulatePoliceRound(game, b, rng);
      if (sim.caught) score -= 6;
      score += sim.nextSafe * 0.3;
    }
    return { b, score, room, risk, dist, exposure };
  });

  const pick = softmaxPick(items, cfg.temp, rng);
  return pick.b;
}
