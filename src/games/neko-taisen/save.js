// ねこぐんだん大戦争 - セーブデータ（localStorage）
import { UNITS, STAGES, DECK_SIZE, MAX_UNIT_LEVEL, MAX_CASTLE_LEVEL, unitLevelCost, castleLevelCost } from './data.js';

const KEY = 'neko-taisen-save-v1';

function defaultSave() {
  return {
    xp: 0,
    castleLevel: 1,
    unitLevels: Object.fromEntries(UNITS.map((u) => [u.id, 1])),
    deck: UNITS.filter((u) => u.unlock === null).map((u) => u.id),
    stages: {}, // id -> { stars, bestTime, plays }
    settings: { sfx: true, bgm: true, speed: 1 },
    stats: { wins: 0, losses: 0, deploys: 0, kills: 0 }
  };
}

export function loadSave() {
  let data = defaultSave();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = { ...data, ...parsed };
      data.unitLevels = { ...defaultSave().unitLevels, ...(parsed.unitLevels || {}) };
      data.settings = { ...defaultSave().settings, ...(parsed.settings || {}) };
      data.stats = { ...defaultSave().stats, ...(parsed.stats || {}) };
      if (!Array.isArray(data.deck) || !data.deck.length) data.deck = defaultSave().deck;
    }
  } catch (e) {
    console.warn('[neko-taisen] セーブの読み込みに失敗', e);
  }
  return data;
}

export function persist(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) {
    console.warn('[neko-taisen] セーブに失敗', e);
  }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
  return defaultSave();
}

/** そのステージに挑戦できるか（前のステージをクリアしているか） */
export function isStageUnlocked(save, stageId) {
  if (stageId === 1) return true;
  const prev = save.stages[stageId - 1];
  return !!(prev && prev.stars > 0);
}

/** ユニットが解放されているか */
export function isUnitUnlocked(save, unit) {
  if (unit.unlock === null) return true;
  const st = save.stages[unit.unlock];
  return !!(st && st.stars > 0);
}

export function unlockedUnits(save) {
  return UNITS.filter((u) => isUnitUnlocked(save, u));
}

/** デッキの整合性を取る（解放されていないユニットを除く、上限） */
export function normalizeDeck(save) {
  const ok = new Set(unlockedUnits(save).map((u) => u.id));
  save.deck = save.deck.filter((id) => ok.has(id)).slice(0, DECK_SIZE);
  if (!save.deck.length) save.deck = ['neko'];
  return save.deck;
}

export function canLevelUpUnit(save, id) {
  const lv = save.unitLevels[id] || 1;
  if (lv >= MAX_UNIT_LEVEL) return false;
  return save.xp >= unitLevelCost(lv);
}

export function levelUpUnit(save, id) {
  if (!canLevelUpUnit(save, id)) return false;
  const lv = save.unitLevels[id] || 1;
  save.xp -= unitLevelCost(lv);
  save.unitLevels[id] = lv + 1;
  persist(save);
  return true;
}

export function canLevelUpCastle(save) {
  if (save.castleLevel >= MAX_CASTLE_LEVEL) return false;
  return save.xp >= castleLevelCost(save.castleLevel);
}

export function levelUpCastle(save) {
  if (!canLevelUpCastle(save)) return false;
  save.xp -= castleLevelCost(save.castleLevel);
  save.castleLevel += 1;
  persist(save);
  return true;
}

/**
 * ステージ結果を記録して獲得XPを返す
 * stars: 1=クリア, 2=城HP50%以上, 3=城HP100%
 */
export function recordResult(save, stage, { win, baseHpRatio, time, deploys, kills }) {
  const rec = save.stages[stage.id] || { stars: 0, bestTime: null, plays: 0 };
  rec.plays += 1;
  let xp = 0;
  const newUnlocks = [];
  if (win) {
    const stars = baseHpRatio >= 0.999 ? 3 : baseHpRatio >= 0.5 ? 2 : 1;
    const first = rec.stars === 0;
    xp = first ? stage.xp : Math.round(stage.xp / 3 / 10) * 10;
    if (stars > rec.stars) {
      // 星が増えたボーナス
      if (!first) xp += Math.round(stage.xp / 5 / 10) * 10;
      rec.stars = stars;
    }
    if (rec.bestTime === null || time < rec.bestTime) rec.bestTime = time;
    save.stats.wins += 1;
    if (first) {
      for (const u of UNITS) if (u.unlock === stage.id) newUnlocks.push(u);
    }
  } else {
    xp = Math.round(stage.xp / 10 / 10) * 10; // 負けても少し
    save.stats.losses += 1;
  }
  save.stages[stage.id] = rec;
  save.xp += xp;
  save.stats.deploys += deploys;
  save.stats.kills += kills;
  persist(save);
  return { xp, stars: rec.stars, newUnlocks, nextStage: win && STAGES.find((s) => s.id === stage.id + 1) ? stage.id + 1 : null };
}
