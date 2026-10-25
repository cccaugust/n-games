// ねこぐんだん大戦争 - ゲームデータ定義
// ユニット / 敵 / ステージ / 強化の計算式をここに集約する。

export const WORLD = Object.freeze({
  W: 2000,          // フィールドの横幅（ワールド座標）
  H: 420,           // フィールドの高さ（ワールド座標）
  GROUND_Y: 330,    // 地面のY
  ENEMY_BASE_X: 120,   // 敵城のあたり判定X
  PLAYER_BASE_X: 1880, // ねこ城のあたり判定X
  ENEMY_SPAWN_X: 190,
  PLAYER_SPAWN_X: 1810,
  KB_DIST: 70,
  KB_DUR: 0.45,
  HIT_SLACK: 36
});

export const MAX_UNIT_LEVEL = 20;
export const MAX_CASTLE_LEVEL = 10;
export const MAX_WORKER_LEVEL = 8;
export const DECK_SIZE = 10;

/** ユニットのレベル倍率（HP/攻撃） */
export function levelMult(level) {
  return 1 + 0.15 * (Math.max(1, level) - 1);
}

/** ユニットを level → level+1 にするのに必要なXP */
export function unitLevelCost(level) {
  return Math.round((150 * level + 60 * level * level) / 10) * 10;
}

/** お城を level → level+1 にするのに必要なXP */
export function castleLevelCost(level) {
  return Math.round((400 * level + 120 * level * level) / 10) * 10;
}

export function castleStats(level) {
  const l = Math.max(1, level);
  return {
    baseHp: 5000 + 1500 * (l - 1),
    cannonDamage: 400 + 150 * (l - 1),
    cannonCooldown: Math.max(18, 30 - (l - 1) * 1.2)
  };
}

/** 働きねこ（お金） */
export const WORKER_UPGRADE_COST = [0, 60, 120, 200, 300, 420, 560, 720]; // index = 現在Lv → 次Lvへの費用
export function workerStats(level) {
  const l = Math.max(1, Math.min(MAX_WORKER_LEVEL, level));
  return {
    rate: 20 + 15 * (l - 1),      // 1秒あたり
    cap: 1000 + 500 * (l - 1)     // 所持上限
  };
}

/**
 * ねこユニット
 * cost: 出撃費用 / cd: 再出撃までの秒 / hp / atk / range: 射程 / speed: 移動(px/s)
 * kb: ノックバック回数 / atkInterval: 攻撃間隔(秒) / foreswing: 攻撃発生までの秒
 * area: 範囲攻撃 / crit: クリティカル率 / slow: 鈍足 / knockback: ふっとばし率
 */
export const UNITS = [
  { id: 'neko', name: 'ねこ', emoji: '🐱', role: 'きほん',
    desc: 'いちばんふつうのねこ。やすくて すぐ出せる。',
    cost: 75, cd: 2.0, hp: 250, atk: 25, range: 140, speed: 70, kb: 3, atkInterval: 1.2, foreswing: 0.35,
    unlock: null },
  { id: 'tank', name: 'タンクねこ', emoji: '🛡️', role: 'かべ',
    desc: 'かたい！ まえで こうげきを うけとめる かべやく。',
    cost: 150, cd: 2.5, hp: 1200, atk: 8, range: 110, speed: 60, kb: 1, atkInterval: 2.0, foreswing: 0.4,
    unlock: null },
  { id: 'axe', name: 'バトルねこ', emoji: '🪓', role: 'アタッカー',
    desc: 'オノで ガツン！ こうげき力が 高い。',
    cost: 200, cd: 3.0, hp: 450, atk: 95, range: 150, speed: 80, kb: 3, atkInterval: 1.1, foreswing: 0.3,
    unlock: null },
  { id: 'legs', name: 'キモねこ', emoji: '🦵', role: 'はんい',
    desc: 'あしが なが〜い。はんいこうげきで まとめて たたく。',
    cost: 400, cd: 4.0, hp: 320, atk: 140, range: 330, speed: 60, kb: 2, atkInterval: 2.3, foreswing: 0.6, area: true,
    unlock: null },
  { id: 'cow', name: 'ウシねこ', emoji: '🐄', role: 'とっこう',
    desc: 'とっても はやい！ てきじんに とっこうする。',
    cost: 450, cd: 4.5, hp: 650, atk: 45, range: 115, speed: 240, kb: 3, atkInterval: 0.9, foreswing: 0.25,
    unlock: 2 },
  { id: 'bird', name: 'トリねこ', emoji: '🐦', role: 'はんい',
    desc: 'そらから つっつく はんいこうげき。',
    cost: 500, cd: 5.0, hp: 600, atk: 170, range: 190, speed: 90, kb: 3, atkInterval: 2.0, foreswing: 0.5, area: true,
    unlock: 3 },
  { id: 'ninja', name: 'ニンジャねこ', emoji: '🥷', role: 'クリティカル',
    desc: 'すばやく うごき、クリティカルを ねらう。',
    cost: 350, cd: 4.0, hp: 480, atk: 70, range: 135, speed: 200, kb: 4, atkInterval: 0.8, foreswing: 0.2, crit: 0.25,
    unlock: 4 },
  { id: 'fish', name: 'サカナねこ', emoji: '🐟', role: 'アタッカー',
    desc: 'たいりょくも こうげきも つよい バランスがた。',
    cost: 600, cd: 6.0, hp: 1000, atk: 330, range: 160, speed: 70, kb: 3, atkInterval: 1.6, foreswing: 0.45,
    unlock: 5 },
  { id: 'mage', name: 'まほうねこ', emoji: '🧙', role: 'サポート',
    desc: 'てきを おそくする まほうを つかう。',
    cost: 700, cd: 7.0, hp: 450, atk: 120, range: 360, speed: 55, kb: 2, atkInterval: 2.4, foreswing: 0.6, area: true,
    slow: { chance: 0.6, dur: 2.2 },
    unlock: 6 },
  { id: 'lizard', name: 'トカゲねこ', emoji: '🦎', role: 'ちょう遠距離',
    desc: 'とおくから ベロで ピシッ！ 超ながい しゃてい。',
    cost: 900, cd: 7.0, hp: 550, atk: 380, range: 460, speed: 60, kb: 2, atkInterval: 2.8, foreswing: 0.7,
    unlock: 7 },
  { id: 'knight', name: 'ナイトねこ', emoji: '⚔️', role: 'ふっとばし',
    desc: 'ランスで てきを ふきとばす！ かたくて たよれる。',
    cost: 850, cd: 8.0, hp: 1400, atk: 230, range: 170, speed: 75, kb: 2, atkInterval: 1.8, foreswing: 0.5,
    knockback: 0.4,
    unlock: 9 },
  { id: 'titan', name: 'きょじんねこ', emoji: '🗿', role: 'さいきょう',
    desc: 'どっしり。すべてを なぎはらう さいきょうの ねこ。',
    cost: 1800, cd: 14.0, hp: 3500, atk: 1400, range: 210, speed: 45, kb: 2, atkInterval: 3.6, foreswing: 1.0, area: true,
    unlock: 10 }
];

export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));

/**
 * 敵ユニット
 * money: たおしたときに もらえるお金 / boss: ボス（登場時に衝撃波）
 */
export const ENEMIES = [
  { id: 'dog', name: 'ワンコ', hp: 200, atk: 15, range: 100, speed: 60, kb: 1, atkInterval: 1.5, foreswing: 0.4, money: 30 },
  { id: 'snake', name: 'ニョロ', hp: 150, atk: 22, range: 90, speed: 130, kb: 1, atkInterval: 1.0, foreswing: 0.3, money: 35 },
  { id: 'boar', name: 'イノシシ', hp: 650, atk: 60, range: 120, speed: 160, kb: 2, atkInterval: 1.2, foreswing: 0.35, money: 120 },
  { id: 'crow', name: 'クロウ', hp: 420, atk: 45, range: 170, speed: 110, kb: 2, atkInterval: 1.4, foreswing: 0.4, money: 100, area: true, float: true },
  { id: 'rhino', name: 'サイゾウ', hp: 3000, atk: 80, range: 130, speed: 35, kb: 3, atkInterval: 2.2, foreswing: 0.6, money: 400 },
  { id: 'ghost', name: 'オバケ', hp: 230, atk: 32, range: 150, speed: 140, kb: 1, atkInterval: 1.0, foreswing: 0.3, money: 60, float: true },
  { id: 'hippo', name: 'カバゴン', hp: 5500, atk: 45, range: 110, speed: 25, kb: 4, atkInterval: 2.5, foreswing: 0.7, money: 600 },
  { id: 'gorilla', name: 'ゴリドン', hp: 3000, atk: 380, range: 160, speed: 55, kb: 3, atkInterval: 2.4, foreswing: 0.8, money: 700, area: true, knockback: 0.5 },
  { id: 'bear', name: 'クマボス', hp: 9000, atk: 700, range: 200, speed: 40, kb: 6, atkInterval: 3.0, foreswing: 1.1, money: 2500, boss: true, area: true },
  { id: 'dragon', name: 'ドラゴン', hp: 13000, atk: 1000, range: 380, speed: 35, kb: 7, atkInterval: 3.8, foreswing: 1.4, money: 3500, boss: true, area: true },
  { id: 'mech', name: 'メカネズミ', hp: 15000, atk: 500, range: 250, speed: 60, kb: 8, atkInterval: 1.6, foreswing: 0.6, money: 4000, boss: true, area: true, knockback: 0.3 },
  { id: 'demon', name: 'まおう', hp: 28000, atk: 1600, range: 300, speed: 30, kb: 10, atkInterval: 3.5, foreswing: 1.3, money: 8000, boss: true, area: true, knockback: 0.5 }
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

/**
 * ステージ
 * spawns: { id, at(秒), every(秒), count, mag? }  時間で出てくる敵
 * triggers: { pct, spawns:[...] }  敵城のHPが pct 以下になったら出てくる敵（ボス等）
 * mag: ステージ全体の敵の強さ倍率 / enemyBaseHp / xp: 初回クリアXP
 */
const INF = 9999;
export const STAGES = [
  { id: 1, name: 'はじまりの草原', theme: 'grass', mag: 1.0, enemyBaseHp: 3000, xp: 400,
    hint: 'まずは「ねこ」を たくさん出そう！ お金は 自動でふえるよ。',
    spawns: [
      { id: 'dog', at: 3, every: 6, count: INF },
      { id: 'dog', at: 30, every: 4, count: INF },
      { id: 'snake', at: 50, every: 10, count: INF }
    ],
    triggers: [{ pct: 0.9, spawns: [{ id: 'dog', at: 0, every: 1.5, count: 5 }] }] },
  { id: 2, name: 'ニョロの小道', theme: 'grass', mag: 1.0, enemyBaseHp: 4500, xp: 500,
    hint: 'はやい ニョロが来る。タンクねこで うけとめよう。',
    spawns: [
      { id: 'dog', at: 2, every: 5, count: INF },
      { id: 'snake', at: 8, every: 6, count: INF },
      { id: 'snake', at: 30, every: 3, count: INF }
    ],
    triggers: [{ pct: 0.8, spawns: [{ id: 'snake', at: 0, every: 1, count: 6 }] }] },
  { id: 3, name: 'イノシシ街道', theme: 'forest', mag: 1.1, enemyBaseHp: 6000, xp: 700,
    hint: 'イノシシは とっこうしてくる！ かべを 切らさないように。',
    spawns: [
      { id: 'dog', at: 2, every: 5, count: INF },
      { id: 'boar', at: 12, every: 14, count: INF },
      { id: 'snake', at: 20, every: 6, count: INF },
      { id: 'boar', at: 45, every: 9, count: INF }
    ],
    triggers: [
      { pct: 0.9, spawns: [{ id: 'boar', at: 0, every: 4, count: 4 }] },
      { pct: 0.5, spawns: [{ id: 'boar', at: 0, every: 3, count: 4 }, { id: 'snake', at: 1, every: 3, count: INF }] }
    ] },
  { id: 4, name: 'クロウの森', theme: 'forest', mag: 1.3, enemyBaseHp: 7500, xp: 900,
    hint: 'クロウは はんいこうげき。遠くから たたける ねこが ゆうこう。',
    spawns: [
      { id: 'dog', at: 2, every: 5, count: INF },
      { id: 'crow', at: 10, every: 10, count: INF },
      { id: 'snake', at: 15, every: 7, count: INF },
      { id: 'crow', at: 40, every: 6, count: INF },
      { id: 'boar', at: 50, every: 15, count: INF }
    ],
    triggers: [
      { pct: 0.8, spawns: [{ id: 'crow', at: 0, every: 3, count: 5 }] },
      { pct: 0.4, spawns: [{ id: 'boar', at: 0, every: 4, count: 5 }] }
    ] },
  { id: 5, name: 'サイゾウの砂漠', theme: 'desert', mag: 1.4, enemyBaseHp: 9000, xp: 1200,
    hint: 'サイゾウは とてもかたい。お金を ためて 強いねこを。',
    spawns: [
      { id: 'dog', at: 2, every: 4, count: INF },
      { id: 'rhino', at: 15, every: 35, count: INF },
      { id: 'boar', at: 25, every: 14, count: INF },
      { id: 'snake', at: 40, every: 5, count: INF },
      { id: 'crow', at: 60, every: 12, count: INF }
    ],
    triggers: [
      { pct: 0.7, spawns: [{ id: 'rhino', at: 0, every: 15, count: 2 }, { id: 'boar', at: 2, every: 8, count: INF }] },
      { pct: 0.3, spawns: [{ id: 'rhino', at: 0, every: 10, count: 2 }] }
    ] },
  { id: 6, name: 'おばけ沼', theme: 'swamp', mag: 1.6, enemyBaseHp: 10000, xp: 1500,
    hint: 'オバケが どんどん わいてくる。はんいこうげきで まとめて。',
    spawns: [
      { id: 'ghost', at: 2, every: 3.5, count: INF },
      { id: 'dog', at: 5, every: 6, count: INF },
      { id: 'crow', at: 25, every: 12, count: INF },
      { id: 'ghost', at: 50, every: 2.5, count: INF },
      { id: 'rhino', at: 70, every: 40, count: INF }
    ],
    triggers: [
      { pct: 0.6, spawns: [{ id: 'ghost', at: 0, every: 1, count: 12 }] },
      { pct: 0.3, spawns: [{ id: 'ghost', at: 0, every: 1.5, count: INF }, { id: 'crow', at: 1, every: 5, count: 3 }] }
    ] },
  { id: 7, name: 'カバゴンの川', theme: 'river', mag: 1.9, enemyBaseHp: 12000, xp: 1800,
    hint: 'カバゴンは 動かない かべ。トカゲねこの しゃていで 一方的に！',
    spawns: [
      { id: 'hippo', at: 5, every: 45, count: INF },
      { id: 'dog', at: 8, every: 4, count: INF },
      { id: 'snake', at: 18, every: 5, count: INF },
      { id: 'boar', at: 40, every: 15, count: INF },
      { id: 'crow', at: 55, every: 12, count: INF }
    ],
    triggers: [
      { pct: 0.5, spawns: [{ id: 'hippo', at: 0, every: 20, count: 2 }, { id: 'rhino', at: 5, every: 25, count: 2 }, { id: 'ghost', at: 2, every: 3, count: INF }] }
    ] },
  { id: 8, name: 'ゴリドン山', theme: 'mountain', mag: 2.1, enemyBaseHp: 15000, xp: 2500,
    hint: 'ゴリドンは ふっとばしてくる。はじめてのボスも 待っている…',
    spawns: [
      { id: 'dog', at: 2, every: 4, count: INF },
      { id: 'gorilla', at: 25, every: 40, count: INF },
      { id: 'boar', at: 35, every: 14, count: INF },
      { id: 'crow', at: 45, every: 12, count: INF },
      { id: 'snake', at: 60, every: 5, count: INF }
    ],
    triggers: [
      { pct: 0.99, spawns: [{ id: 'bear', at: 0, every: 1, count: 1 }, { id: 'dog', at: 2, every: 3, count: INF }, { id: 'boar', at: 6, every: 14, count: INF }] },
      { pct: 0.5, spawns: [{ id: 'gorilla', at: 0, every: 15, count: 2 }] }
    ] },
  { id: 9, name: '夜の城下町', theme: 'night', mag: 2.4, enemyBaseHp: 18000, xp: 2800,
    hint: 'いろんな てきが いっぺんに来る。デッキを よく考えよう。',
    spawns: [
      { id: 'snake', at: 2, every: 5, count: INF },
      { id: 'ghost', at: 10, every: 4, count: INF },
      { id: 'rhino', at: 30, every: 35, count: INF },
      { id: 'crow', at: 35, every: 10, count: INF },
      { id: 'gorilla', at: 55, every: 40, count: INF },
      { id: 'boar', at: 70, every: 12, count: INF }
    ],
    triggers: [
      { pct: 0.75, spawns: [{ id: 'hippo', at: 0, every: 25, count: 2 }, { id: 'boar', at: 3, every: 8, count: INF }] },
      { pct: 0.4, spawns: [{ id: 'gorilla', at: 0, every: 10, count: 2 }, { id: 'ghost', at: 1, every: 1.5, count: INF }] }
    ] },
  { id: 10, name: 'ドラゴンの火山', theme: 'volcano', mag: 2.7, enemyBaseHp: 22000, xp: 3500,
    hint: 'ドラゴンの しゃていは とても長い。トカゲねこで そのさらに外から！',
    spawns: [
      { id: 'dog', at: 2, every: 4, count: INF },
      { id: 'boar', at: 15, every: 14, count: INF },
      { id: 'crow', at: 30, every: 10, count: INF },
      { id: 'rhino', at: 50, every: 35, count: INF },
      { id: 'ghost', at: 60, every: 3, count: INF }
    ],
    triggers: [
      { pct: 0.99, spawns: [{ id: 'dragon', at: 0, every: 1, count: 1 }, { id: 'ghost', at: 5, every: 5, count: INF }, { id: 'dog', at: 3, every: 4, count: INF }] },
      { pct: 0.5, spawns: [{ id: 'rhino', at: 0, every: 15, count: 2 }, { id: 'gorilla', at: 5, every: 1, count: 1 }] }
    ] },
  { id: 11, name: 'メカの工場', theme: 'factory', mag: 3.1, enemyBaseHp: 26000, xp: 4000,
    hint: 'メカネズミは はやくて こうげきが はやい。ふっとばしが きく。',
    spawns: [
      { id: 'snake', at: 2, every: 4, count: INF },
      { id: 'gorilla', at: 20, every: 35, count: INF },
      { id: 'crow', at: 25, every: 9, count: INF },
      { id: 'hippo', at: 40, every: 45, count: INF },
      { id: 'boar', at: 50, every: 10, count: INF }
    ],
    triggers: [
      { pct: 0.99, spawns: [{ id: 'mech', at: 0, every: 1, count: 1 }, { id: 'boar', at: 4, every: 10, count: INF }, { id: 'snake', at: 2, every: 4, count: INF }] },
      { pct: 0.5, spawns: [{ id: 'gorilla', at: 0, every: 12, count: 2 }, { id: 'rhino', at: 3, every: 20, count: 2 }] }
    ] },
  { id: 12, name: 'まおうの城', theme: 'castle', mag: 3.6, enemyBaseHp: 32000, xp: 6000,
    hint: 'さいごの たたかい。すべての ねこの 力を 合わせよう！',
    spawns: [
      { id: 'dog', at: 2, every: 3.5, count: INF },
      { id: 'ghost', at: 8, every: 4, count: INF },
      { id: 'rhino', at: 25, every: 30, count: INF },
      { id: 'crow', at: 30, every: 9, count: INF },
      { id: 'gorilla', at: 45, every: 35, count: INF },
      { id: 'boar', at: 60, every: 10, count: INF }
    ],
    triggers: [
      { pct: 0.99, spawns: [{ id: 'bear', at: 0, every: 1, count: 1 }, { id: 'hippo', at: 5, every: 40, count: INF }] },
      { pct: 0.6, spawns: [{ id: 'mech', at: 0, every: 1, count: 1 }, { id: 'ghost', at: 2, every: 2, count: INF }] },
      { pct: 0.3, spawns: [{ id: 'demon', at: 0, every: 1, count: 1 }, { id: 'gorilla', at: 10, every: 30, count: INF }] }
    ] }
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

/** ステージの背景テーマ */
export const THEMES = {
  grass:    { sky: ['#7fd4ff', '#d9f3ff'], far: '#8fd18f', mid: '#5fb95f', ground: '#6cc04a', groundDark: '#55a33a', dirt: '#8a6a3f', deco: 'tree', night: false },
  forest:   { sky: ['#5fb0e0', '#cfeeff'], far: '#4e9b5c', mid: '#357a43', ground: '#4fa63f', groundDark: '#3e8a30', dirt: '#6f5230', deco: 'pine', night: false },
  desert:   { sky: ['#ffd27a', '#ffeec2'], far: '#e4b86a', mid: '#d4a24f', ground: '#e8c777', groundDark: '#d3ad5f', dirt: '#b58a46', deco: 'cactus', night: false },
  swamp:    { sky: ['#8aa89a', '#d4e3d6'], far: '#5f7f68', mid: '#44614c', ground: '#6b8f4e', groundDark: '#55763c', dirt: '#4f4634', deco: 'dead', night: false },
  river:    { sky: ['#73c7ff', '#e3f6ff'], far: '#7fcc9b', mid: '#58b07a', ground: '#67b86b', groundDark: '#4f9e55', dirt: '#5d8ab0', deco: 'reed', night: false },
  mountain: { sky: ['#8fb7e8', '#e6f0fb'], far: '#8f9bb0', mid: '#6b7a93', ground: '#8aa86a', groundDark: '#718f55', dirt: '#6e6a62', deco: 'rock', night: false },
  night:    { sky: ['#101a3d', '#2f3f80'], far: '#1e2a52', mid: '#2a3b6a', ground: '#3f5a52', groundDark: '#324842', dirt: '#2a2d3a', deco: 'house', night: true },
  volcano:  { sky: ['#3a1216', '#a8402a'], far: '#5a2422', mid: '#3c1a18', ground: '#5c3b35', groundDark: '#47302b', dirt: '#2d1d1a', deco: 'lava', night: true },
  factory:  { sky: ['#5a6472', '#aeb8c2'], far: '#6b7580', mid: '#4f5963', ground: '#7a8088', groundDark: '#656b73', dirt: '#3e434a', deco: 'pipe', night: false },
  castle:   { sky: ['#1b0f33', '#5a2a7a'], far: '#2d1b4d', mid: '#3d2566', ground: '#4b3b63', groundDark: '#3b2e50', dirt: '#241a33', deco: 'spike', night: true }
};
