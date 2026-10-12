#!/usr/bin/env node
/**
 * シティチェイス AI 対戦シミュレーター（開発用）
 *   node scripts/city-chase-sim.mjs [games=200] [thiefDifficulty=normal] [policeDifficulty=normal] [seed=1]
 * ルールエンジン・推理モデル・AIの整合性チェックと勝率バランスの確認に使う。
 */
import { CityChaseGame, createRng, randomHeights, MAX_ROUNDS } from '../src/games/city-chase/rules.js';
import { policeDecide, policePlaceHelis, thiefDecide } from '../src/games/city-chase/ai.js';

const games = Number(process.argv[2] || 200);
const thiefDiff = process.argv[3] || 'normal';
const policeDiff = process.argv[4] || 'normal';
const seed = Number(process.argv[5] || 1);

const rng = createRng(seed);
const stats = { police: 0, thief: 0, reasons: {}, rounds: 0, maxThinkMs: 0 };
const t0 = Date.now();
for (let g = 0; g < games; g++) {
  const game = new CityChaseGame({ heights: randomHeights(rng), rng });
  const pos = policePlaceHelis(policeDiff, rng);
  pos.forEach((i, id) => game.placeHeli(id, i));
  game.start();
  let guard = 0;
  while (!game.isOver() && guard++ < 200) {
    if (game.phase === 'thief') {
      if (game.isSurrounded()) { game.declareSurrounded(); break; }
      const t1 = Date.now();
      const b = thiefDecide(game, thiefDiff, rng);
      stats.maxThinkMs = Math.max(stats.maxThinkMs, Date.now() - t1);
      game.thiefMove(b);
    } else if (game.phase === 'police') {
      const t1 = Date.now();
      const act = policeDecide(game, policeDiff, rng);
      stats.maxThinkMs = Math.max(stats.maxThinkMs, Date.now() - t1);
      if (!act) throw new Error('police has no action');
      if (act.type === 'move') game.heliMove(act.heliId, act.target);
      else game.heliSearch(act.heliId, act.target);
    }
  }
  if (!game.isOver()) throw new Error('game did not finish');
  stats[game.result.winner]++;
  stats.reasons[game.result.reason] = (stats.reasons[game.result.reason] || 0) + 1;
  stats.rounds += game.result.round;
}
console.log(JSON.stringify({
  games, thiefDiff, policeDiff, seed,
  policeWinRate: (stats.police / games).toFixed(3),
  thiefWinRate: (stats.thief / games).toFixed(3),
  reasons: stats.reasons,
  avgEndRound: (stats.rounds / games).toFixed(2),
  maxThinkMs: stats.maxThinkMs,
  totalMs: Date.now() - t0,
}, null, 2));
