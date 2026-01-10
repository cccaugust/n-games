/**
 * モンスターデータ定義
 * 企画書に基づく全52種のモンスター
 */

export const MONSTERS = {
  // 1-10F: 黄泉路
  skeleton_soldier: {
    id: 'skeleton_soldier',
    name: '骸骨丸',
    hp: 5, attack: 3, defense: 1, exp: 3,
    floors: [1, 4],
    special: null,
    sprite: 'gaikotsu_32'
  },
  skeleton_general: {
    id: 'skeleton_general',
    name: '骸骨将',
    hp: 20, attack: 12, defense: 6, exp: 25,
    floors: [15, 25],
    special: null,
    sprite: 'gaikotsu_32'
  },
  nurikabe_child: {
    id: 'nurikabe_child',
    name: 'ぬりかべ童子',
    hp: 10, attack: 4, defense: 4, exp: 5,
    floors: [1, 5],
    special: 'immobile', // 攻撃されるまで動かない
    sprite: 'nurikabe_32'
  },
  nurikabe: {
    id: 'nurikabe',
    name: 'ぬりかべ',
    hp: 40, attack: 18, defense: 18, exp: 60,
    floors: [30, 45],
    special: 'immobile',
    sprite: 'nurikabe_32'
  },
  kappa_boy: {
    id: 'kappa_boy',
    name: '河童小僧',
    hp: 8, attack: 5, defense: 2, exp: 6,
    floors: [3, 8],
    special: 'catch_throw', // 投げたアイテムをキャッチして投げ返す
    sprite: 'kappa_32'
  },
  kappa_boss: {
    id: 'kappa_boss',
    name: '河童大将',
    hp: 30, attack: 22, defense: 10, exp: 55,
    floors: [35, 50],
    special: 'catch_throw',
    sprite: 'kappa_32'
  },
  hitodama: {
    id: 'hitodama',
    name: '火の玉',
    hp: 6, attack: 4, defense: 0, exp: 4,
    floors: [2, 6],
    special: 'explode_5', // 倒すと周囲1マスに5ダメージ
    sprite: 'onibi_32'
  },
  onibi: {
    id: 'onibi',
    name: '鬼火',
    hp: 25, attack: 15, defense: 0, exp: 35,
    floors: [25, 40],
    special: 'explode_15',
    sprite: 'onibi_32'
  },
  nogitsune: {
    id: 'nogitsune',
    name: '野狐',
    hp: 7, attack: 6, defense: 1, exp: 5,
    floors: [4, 10],
    special: 'confuse_20', // 20%で混乱状態にする攻撃
    sprite: 'kitsune_32'
  },
  youko: {
    id: 'youko',
    name: '妖狐',
    hp: 28, attack: 24, defense: 8, exp: 50,
    floors: [45, 60],
    special: 'confuse_40',
    sprite: 'kitsune_32'
  },

  // 11-25F: 古戦場
  ochimusha: {
    id: 'ochimusha',
    name: '落武者',
    hp: 15, attack: 10, defense: 5, exp: 12,
    floors: [8, 15],
    special: null,
    sprite: 'ochimusha_32'
  },
  ghost_general: {
    id: 'ghost_general',
    name: '亡霊武将',
    hp: 45, attack: 30, defense: 15, exp: 80,
    floors: [50, 65],
    special: null,
    sprite: 'ochimusha_32'
  },
  spear_ashigaru: {
    id: 'spear_ashigaru',
    name: '槍足軽',
    hp: 12, attack: 8, defense: 3, exp: 10,
    floors: [10, 18],
    special: 'range_2', // 2マス先の敵を攻撃可能
    sprite: 'ochimusha_32'
  },
  spear_daimyo: {
    id: 'spear_daimyo',
    name: '槍大名',
    hp: 38, attack: 28, defense: 12, exp: 70,
    floors: [55, 70],
    special: 'range_2',
    sprite: 'ochimusha_32'
  },
  karakasa: {
    id: 'karakasa',
    name: 'からかさ',
    hp: 10, attack: 7, defense: 2, exp: 8,
    floors: [11, 20],
    special: 'disarm_30', // 30%で装備中の武器を弾く
    sprite: 'gaikotsu_32'
  },
  old_umbrella: {
    id: 'old_umbrella',
    name: '古傘の主',
    hp: 35, attack: 25, defense: 10, exp: 65,
    floors: [50, 65],
    special: 'disarm_50',
    sprite: 'gaikotsu_32'
  },
  kooni: {
    id: 'kooni',
    name: '小鬼',
    hp: 14, attack: 11, defense: 4, exp: 14,
    floors: [12, 22],
    special: 'double_action_50', // 2回行動（50%確率）
    sprite: 'hannya_32'
  },
  akaoni: {
    id: 'akaoni',
    name: '赤鬼',
    hp: 50, attack: 35, defense: 16, exp: 100,
    floors: [60, 75],
    special: 'double_action_100',
    sprite: 'hannya_32'
  },
  zeninage_tanuki: {
    id: 'zeninage_tanuki',
    name: '銭投げ狸',
    hp: 11, attack: 6, defense: 3, exp: 11,
    floors: [15, 25],
    special: 'steal_gold_50', // 所持金を10〜50盗む
    sprite: 'kitsune_32'
  },
  bakedanuki_boss: {
    id: 'bakedanuki_boss',
    name: '化け狸頭',
    hp: 36, attack: 20, defense: 12, exp: 75,
    floors: [60, 75],
    special: 'steal_gold_300',
    sprite: 'kitsune_32'
  },

  // 26-40F: 餓鬼道
  gaki: {
    id: 'gaki',
    name: '餓鬼',
    hp: 18, attack: 12, defense: 5, exp: 16,
    floors: [20, 30],
    special: 'eat_item', // 足元のアイテムを食べる
    sprite: 'gaki_32'
  },
  gaki_king: {
    id: 'gaki_king',
    name: '餓鬼大王',
    hp: 48, attack: 32, defense: 14, exp: 90,
    floors: [55, 70],
    special: 'rot_onigiri', // 持ち物のおにぎりを腐らせる
    sprite: 'gaki_32'
  },
  nezumikozou: {
    id: 'nezumikozou',
    name: '鼠小僧',
    hp: 12, attack: 8, defense: 2, exp: 13,
    floors: [22, 32],
    special: 'steal_item_1', // アイテムを1つ盗んでワープ
    sprite: 'gaki_32'
  },
  oonezumi: {
    id: 'oonezumi',
    name: '大鼠',
    hp: 32, attack: 22, defense: 8, exp: 60,
    floors: [50, 65],
    special: 'steal_item_2',
    sprite: 'gaki_32'
  },
  dorodoro: {
    id: 'dorodoro',
    name: 'どろどろ',
    hp: 16, attack: 10, defense: 3, exp: 15,
    floors: [25, 35],
    special: 'rust_weapon_1', // 武器の強化値を1下げる
    sprite: 'gaki_32'
  },
  namekuji: {
    id: 'namekuji',
    name: '大なめくじ',
    hp: 42, attack: 26, defense: 10, exp: 75,
    floors: [60, 75],
    special: 'rust_weapon_2',
    sprite: 'gaki_32'
  },
  hiruko: {
    id: 'hiruko',
    name: '蛭童',
    hp: 15, attack: 9, defense: 4, exp: 14,
    floors: [26, 36],
    special: 'drain_50', // HPを吸収（与ダメージの50%回復）
    sprite: 'gaki_32'
  },
  yamabiru: {
    id: 'yamabiru',
    name: '山蛭の主',
    hp: 40, attack: 28, defense: 12, exp: 80,
    floors: [65, 80],
    special: 'drain_100',
    sprite: 'gaki_32'
  },
  tobienma: {
    id: 'tobienma',
    name: '飛縁魔',
    hp: 14, attack: 7, defense: 2, exp: 12,
    floors: [28, 38],
    special: 'reduce_maxhp_3', // 最大HPを3下げる
    sprite: 'hannya_32'
  },
  jorogumo: {
    id: 'jorogumo',
    name: '絡新婦',
    hp: 38, attack: 24, defense: 8, exp: 70,
    floors: [60, 75],
    special: 'reduce_maxhp_5',
    sprite: 'hannya_32'
  },

  // 41-55F: 修羅道
  yoroimusha: {
    id: 'yoroimusha',
    name: '鎧武者',
    hp: 25, attack: 18, defense: 10, exp: 25,
    floors: [35, 48],
    special: null,
    sprite: 'ochimusha_32'
  },
  kuroyoroi: {
    id: 'kuroyoroi',
    name: '黒鎧武者',
    hp: 60, attack: 42, defense: 22, exp: 120,
    floors: [75, 90],
    special: null,
    sprite: 'ochimusha_32'
  },
  hannya_mask: {
    id: 'hannya_mask',
    name: '般若',
    hp: 22, attack: 20, defense: 6, exp: 28,
    floors: [38, 50],
    special: 'reduce_str_1', // ちからを1下げる
    sprite: 'hannya_32'
  },
  kishin: {
    id: 'kishin',
    name: '鬼神',
    hp: 55, attack: 45, defense: 18, exp: 130,
    floors: [80, 95],
    special: 'reduce_str_2',
    sprite: 'hannya_32'
  },
  tsuchigumo: {
    id: 'tsuchigumo',
    name: '土蜘蛛',
    hp: 20, attack: 14, defense: 7, exp: 22,
    floors: [40, 52],
    special: 'slow_5', // 糸を吐いて5ターン鈍足にする
    sprite: 'gaki_32'
  },
  ootsuchigumo: {
    id: 'ootsuchigumo',
    name: '大土蜘蛛',
    hp: 50, attack: 36, defense: 16, exp: 100,
    floors: [75, 90],
    special: 'slow_10',
    sprite: 'gaki_32'
  },
  tengu: {
    id: 'tengu',
    name: '天狗',
    hp: 18, attack: 16, defense: 5, exp: 26,
    floors: [42, 55],
    special: 'disguise', // 他の敵に化けている
    sprite: 'tengu_32'
  },
  daitengu: {
    id: 'daitengu',
    name: '大天狗',
    hp: 45, attack: 38, defense: 14, exp: 110,
    floors: [80, 95],
    special: 'disguise_fast', // 他の敵に化けている。倍速移動
    sprite: 'tengu_32'
  },
  wanyuudou: {
    id: 'wanyuudou',
    name: '輪入道',
    hp: 24, attack: 22, defense: 8, exp: 30,
    floors: [45, 55],
    special: 'fire_20', // 炎攻撃（固定20ダメージ、射程5マス直線）
    sprite: 'onibi_32'
  },
  gouka_nyuudou: {
    id: 'gouka_nyuudou',
    name: '業火入道',
    hp: 55, attack: 40, defense: 18, exp: 120,
    floors: [85, 99],
    special: 'fire_40',
    sprite: 'onibi_32'
  },

  // 56-70F: 畜生道
  bakeneko: {
    id: 'bakeneko',
    name: '化け猫',
    hp: 22, attack: 18, defense: 6, exp: 32,
    floors: [50, 62],
    special: 'wall_pass', // 壁抜け移動
    sprite: 'kitsune_32'
  },
  nekomata: {
    id: 'nekomata',
    name: '猫又',
    hp: 52, attack: 40, defense: 15, exp: 115,
    floors: [85, 99],
    special: 'wall_pass_fast', // 壁抜け移動。倍速
    sprite: 'kitsune_32'
  },
  yamauba: {
    id: 'yamauba',
    name: '山姥',
    hp: 26, attack: 15, defense: 8, exp: 28,
    floors: [52, 65],
    special: 'use_staff_seal', // 杖を使う（封印の杖効果）
    sprite: 'hannya_32'
  },
  onibaba: {
    id: 'onibaba',
    name: '鬼婆',
    hp: 55, attack: 35, defense: 18, exp: 105,
    floors: [80, 95],
    special: 'use_staff_swap', // 杖を使う（身代わりの杖効果）
    sprite: 'hannya_32'
  },
  aobouzu: {
    id: 'aobouzu',
    name: '青坊主',
    hp: 20, attack: 17, defense: 7, exp: 30,
    floors: [55, 68],
    special: 'curse_20', // 隣接時、装備を呪う（20%）
    sprite: 'gaikotsu_32'
  },
  mikoshi_nyuudou: {
    id: 'mikoshi_nyuudou',
    name: '見越し入道',
    hp: 50, attack: 38, defense: 16, exp: 100,
    floors: [82, 99],
    special: 'curse_40',
    sprite: 'gaikotsu_32'
  },
  hyakume: {
    id: 'hyakume',
    name: '百目',
    hp: 24, attack: 19, defense: 9, exp: 34,
    floors: [58, 70],
    special: 'paralyze_5', // 睨み（5ターン金縛り、射程3マス）
    sprite: 'gaki_32'
  },
  senme: {
    id: 'senme',
    name: '千目',
    hp: 54, attack: 42, defense: 20, exp: 125,
    floors: [88, 99],
    special: 'paralyze_10', // 睨み（10ターン金縛り、射程5マス）
    sprite: 'gaki_32'
  },

  // 71-99F: 人道・天道
  shinigami: {
    id: 'shinigami',
    name: '死神',
    hp: 35, attack: 30, defense: 12, exp: 50,
    floors: [65, 80],
    special: 'instant_death_30', // ワープ移動。一定確率で即死攻撃（HP30以下のみ）
    sprite: 'gaikotsu_32'
  },
  daishinigami: {
    id: 'daishinigami',
    name: '大死神',
    hp: 65, attack: 50, defense: 22, exp: 150,
    floors: [90, 99],
    special: 'instant_death_50',
    sprite: 'gaikotsu_32'
  },
  yamata_no_orochi: {
    id: 'yamata_no_orochi',
    name: '八岐大蛇',
    hp: 80, attack: 45, defense: 20, exp: 200,
    floors: [95, 99],
    special: 'multi_attack_breath', // 8方向同時攻撃。炎ブレス（全体30ダメージ）
    sprite: 'rinnemori_32'
  },

  // 100F: ボス
  rinnemori: {
    id: 'rinnemori',
    name: '輪廻守',
    hp: 500, attack: 60, defense: 30, exp: 10000,
    floors: [100, 100],
    special: 'boss',
    isBoss: true,
    sprite: 'rinnemori_32'
  }
};

/**
 * 指定階層に出現するモンスターリストを取得
 */
export function getMonstersForFloor(floor) {
  return Object.values(MONSTERS).filter(m => {
    const [minFloor, maxFloor] = m.floors;
    return floor >= minFloor && floor <= maxFloor;
  });
}

/**
 * ランダムにモンスターを選択
 */
export function getRandomMonster(floor) {
  const candidates = getMonstersForFloor(floor);
  if (candidates.length === 0) {
    // フォールバック: 骸骨丸
    return MONSTERS.skeleton_soldier;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}
