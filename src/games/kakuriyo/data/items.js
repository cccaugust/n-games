/**
 * アイテムデータ定義
 * 企画書に基づく全50種のアイテム
 */

// アイテム種別
export const ITEM_TYPE = {
  WEAPON: 'weapon',
  SHIELD: 'shield',
  GRASS: 'grass',
  SCROLL: 'scroll',
  STAFF: 'staff',
  ARROW: 'arrow',
  POT: 'pot',
  RING: 'ring',
  FOOD: 'food'
};

// 武器（10種）
export const WEAPONS = {
  bokutou: {
    id: 'bokutou', name: '木刀', type: ITEM_TYPE.WEAPON,
    attack: 2, seals: 3, effect: null,
    floors: [1, 15], rarity: 'common',
    buyPrice: 300, sellPrice: 150,
    sprite: 'bokutou_32'
  },
  uchigatana: {
    id: 'uchigatana', name: '打刀', type: ITEM_TYPE.WEAPON,
    attack: 5, seals: 4, effect: null,
    floors: [5, 30], rarity: 'common',
    buyPrice: 800, sellPrice: 400,
    sprite: 'uchigatana_32'
  },
  nodachi: {
    id: 'nodachi', name: '野太刀', type: ITEM_TYPE.WEAPON,
    attack: 8, seals: 5, effect: null,
    floors: [20, 50], rarity: 'common',
    buyPrice: 1500, sellPrice: 750,
    sprite: 'uchigatana_32'
  },
  youtou: {
    id: 'youtou', name: '妖刀', type: ITEM_TYPE.WEAPON,
    attack: 12, seals: 6, effect: 'hp_cost', // 攻撃時HP1消費
    floors: [30, 70], rarity: 'rare',
    buyPrice: 3000, sellPrice: 1500,
    sprite: 'uchigatana_32'
  },
  onikiri: {
    id: 'onikiri', name: '鬼切丸', type: ITEM_TYPE.WEAPON,
    attack: 10, seals: 5, effect: 'oni_slayer', // 鬼系に1.5倍ダメージ
    floors: [40, 80], rarity: 'rare',
    buyPrice: 4000, sellPrice: 2000,
    sprite: 'uchigatana_32'
  },
  taima_tachi: {
    id: 'taima_tachi', name: '退魔の太刀', type: ITEM_TYPE.WEAPON,
    attack: 9, seals: 6, effect: 'ghost_slayer', // 幽霊系に2倍ダメージ
    floors: [35, 75], rarity: 'rare',
    buyPrice: 3500, sellPrice: 1750,
    sprite: 'uchigatana_32'
  },
  mikazuki: {
    id: 'mikazuki', name: '三日月宗近', type: ITEM_TYPE.WEAPON,
    attack: 15, seals: 8, effect: 'crit_up', // 会心率+10%
    floors: [60, 99], rarity: 'legendary',
    buyPrice: 10000, sellPrice: 5000,
    sprite: 'uchigatana_32'
  },
  drain_blade: {
    id: 'drain_blade', name: 'ドレイン斬り', type: ITEM_TYPE.WEAPON,
    attack: 6, seals: 4, effect: 'drain_25', // 与ダメージの25%HP回復
    floors: [25, 60], rarity: 'rare',
    buyPrice: 2500, sellPrice: 1250,
    sprite: 'uchigatana_32'
  },
  growth_sword: {
    id: 'growth_sword', name: '成長の剣', type: ITEM_TYPE.WEAPON,
    attack: 1, seals: 10, effect: 'growth', // 敵を倒すと攻撃力+1（最大+30）
    floors: [1, 99], rarity: 'legendary',
    buyPrice: 8000, sellPrice: 4000,
    sprite: 'uchigatana_32'
  },
  disposable_sword: {
    id: 'disposable_sword', name: '使い捨ての刀', type: ITEM_TYPE.WEAPON,
    attack: 30, seals: 0, effect: 'disposable', // 攻撃するたび強化値-1。0で消滅
    floors: [15, 50], rarity: 'rare',
    buyPrice: 1000, sellPrice: 500,
    sprite: 'uchigatana_32'
  }
};

// 盾（10種）
export const SHIELDS = {
  mokutate: {
    id: 'mokutate', name: '木盾', type: ITEM_TYPE.SHIELD,
    defense: 2, seals: 3, effect: null,
    floors: [1, 15], rarity: 'common',
    buyPrice: 300, sellPrice: 150,
    sprite: 'mokutate_32'
  },
  tetsutate: {
    id: 'tetsutate', name: '鉄盾', type: ITEM_TYPE.SHIELD,
    defense: 5, seals: 4, effect: null,
    floors: [5, 30], rarity: 'common',
    buyPrice: 800, sellPrice: 400,
    sprite: 'tetsutate_32'
  },
  juusou_tate: {
    id: 'juusou_tate', name: '重装盾', type: ITEM_TYPE.SHIELD,
    defense: 10, seals: 5, effect: 'hunger_up', // 満腹度消費1.5倍
    floors: [25, 60], rarity: 'common',
    buyPrice: 1500, sellPrice: 750,
    sprite: 'tetsutate_32'
  },
  mikiri_tate: {
    id: 'mikiri_tate', name: '見切りの盾', type: ITEM_TYPE.SHIELD,
    defense: 4, seals: 5, effect: 'evasion_15', // 回避率+15%
    floors: [20, 55], rarity: 'rare',
    buyPrice: 2500, sellPrice: 1250,
    sprite: 'tetsutate_32'
  },
  uroko_tate: {
    id: 'uroko_tate', name: 'うろこの盾', type: ITEM_TYPE.SHIELD,
    defense: 6, seals: 4, effect: 'rust_proof', // どろどろ系の攻撃無効
    floors: [30, 70], rarity: 'rare',
    buyPrice: 2000, sellPrice: 1000,
    sprite: 'tetsutate_32'
  },
  jizou_tate: {
    id: 'jizou_tate', name: '地蔵の盾', type: ITEM_TYPE.SHIELD,
    defense: 8, seals: 6, effect: 'curse_proof', // 呪い攻撃無効
    floors: [40, 80], rarity: 'rare',
    buyPrice: 3500, sellPrice: 1750,
    sprite: 'tetsutate_32'
  },
  fudou_tate: {
    id: 'fudou_tate', name: '不動の盾', type: ITEM_TYPE.SHIELD,
    defense: 7, seals: 5, effect: 'immovable', // 吹き飛ばし・ワープ無効
    floors: [35, 75], rarity: 'rare',
    buyPrice: 3000, sellPrice: 1500,
    sprite: 'tetsutate_32'
  },
  kongou_tate: {
    id: 'kongou_tate', name: '金剛盾', type: ITEM_TYPE.SHIELD,
    defense: 12, seals: 7, effect: null,
    floors: [50, 99], rarity: 'rare',
    buyPrice: 6000, sellPrice: 3000,
    sprite: 'tetsutate_32'
  },
  onigiri_tate: {
    id: 'onigiri_tate', name: 'おにぎり盾', type: ITEM_TYPE.SHIELD,
    defense: 5, seals: 4, effect: 'satiety_up', // 被ダメージ時、満腹度+1
    floors: [25, 60], rarity: 'rare',
    buyPrice: 2000, sellPrice: 1000,
    sprite: 'tetsutate_32'
  },
  disposable_shield: {
    id: 'disposable_shield', name: '使い捨ての盾', type: ITEM_TYPE.SHIELD,
    defense: 25, seals: 0, effect: 'disposable', // 被ダメージごとに強化値-1。0で消滅
    floors: [15, 50], rarity: 'rare',
    buyPrice: 1000, sellPrice: 500,
    sprite: 'tetsutate_32'
  }
};

// 草（8種）
export const GRASSES = {
  yakusou: {
    id: 'yakusou', name: '薬草', type: ITEM_TYPE.GRASS,
    effect: 'heal_30', // HP30回復
    floors: [1, 99], rarity: 'common',
    buyPrice: 100, sellPrice: 50,
    sprite: 'yakusou_32'
  },
  otogirisou: {
    id: 'otogirisou', name: '弟切草', type: ITEM_TYPE.GRASS,
    effect: 'heal_100', // HP100回復
    floors: [1, 99], rarity: 'common',
    buyPrice: 200, sellPrice: 100,
    sprite: 'yakusou_32'
  },
  inochi_grass: {
    id: 'inochi_grass', name: '命の草', type: ITEM_TYPE.GRASS,
    effect: 'max_hp_up', // 最大HP+5
    floors: [10, 99], rarity: 'rare',
    buyPrice: 500, sellPrice: 250,
    sprite: 'yakusou_32'
  },
  chikara_grass: {
    id: 'chikara_grass', name: 'ちからの草', type: ITEM_TYPE.GRASS,
    effect: 'strength_up', // ちから+1
    floors: [15, 99], rarity: 'rare',
    buyPrice: 700, sellPrice: 350,
    sprite: 'yakusou_32'
  },
  dokukeshi: {
    id: 'dokukeshi', name: '毒消し草', type: ITEM_TYPE.GRASS,
    effect: 'cure_poison', // ちから低下を回復
    floors: [1, 99], rarity: 'common',
    buyPrice: 300, sellPrice: 150,
    sprite: 'yakusou_32'
  },
  konran_grass: {
    id: 'konran_grass', name: '混乱草', type: ITEM_TYPE.GRASS,
    effect: 'confuse', // 10ターン混乱（投げると敵に効果）
    floors: [1, 99], rarity: 'common',
    buyPrice: 200, sellPrice: 100,
    sprite: 'yakusou_32'
  },
  suimin_grass: {
    id: 'suimin_grass', name: '睡眠草', type: ITEM_TYPE.GRASS,
    effect: 'sleep', // 5ターン睡眠（投げると敵に効果）
    floors: [1, 99], rarity: 'common',
    buyPrice: 200, sellPrice: 100,
    sprite: 'yakusou_32'
  },
  fukkatsu_grass: {
    id: 'fukkatsu_grass', name: '復活の草', type: ITEM_TYPE.GRASS,
    effect: 'revive', // 所持中HP0で自動発動。HP全回復で復活
    floors: [30, 99], rarity: 'legendary',
    buyPrice: 1500, sellPrice: 750,
    sprite: 'yakusou_32'
  }
};

// 巻物（8種）
export const SCROLLS = {
  akari_scroll: {
    id: 'akari_scroll', name: 'あかりの巻物', type: ITEM_TYPE.SCROLL,
    effect: 'reveal_map', // フロア全体のマップを表示
    floors: [1, 99], rarity: 'common',
    buyPrice: 300, sellPrice: 150,
    sprite: 'makimono_32'
  },
  konran_scroll: {
    id: 'konran_scroll', name: '混乱の巻物', type: ITEM_TYPE.SCROLL,
    effect: 'confuse_all', // フロアの全敵を10ターン混乱
    floors: [10, 99], rarity: 'rare',
    buyPrice: 500, sellPrice: 250,
    sprite: 'makimono_32'
  },
  oobeya_scroll: {
    id: 'oobeya_scroll', name: '大部屋の巻物', type: ITEM_TYPE.SCROLL,
    effect: 'big_room', // フロアを大部屋にする
    floors: [15, 99], rarity: 'rare',
    buyPrice: 400, sellPrice: 200,
    sprite: 'makimono_32'
  },
  shikibetsu_scroll: {
    id: 'shikibetsu_scroll', name: '識別の巻物', type: ITEM_TYPE.SCROLL,
    effect: 'identify', // 選択したアイテムを識別
    floors: [1, 99], rarity: 'common',
    buyPrice: 300, sellPrice: 150,
    sprite: 'makimono_32'
  },
  harai_scroll: {
    id: 'harai_scroll', name: '祓いの巻物', type: ITEM_TYPE.SCROLL,
    effect: 'remove_curse', // 持ち物の呪いを全て解除
    floors: [20, 99], rarity: 'rare',
    buyPrice: 400, sellPrice: 200,
    sprite: 'makimono_32'
  },
  gousei_scroll: {
    id: 'gousei_scroll', name: '合成の巻物', type: ITEM_TYPE.SCROLL,
    effect: 'synthesis', // 同種武器/盾を合成
    floors: [25, 99], rarity: 'rare',
    buyPrice: 1000, sellPrice: 500,
    sprite: 'makimono_32'
  },
  seiiki_scroll: {
    id: 'seiiki_scroll', name: '聖域の巻物', type: ITEM_TYPE.SCROLL,
    effect: 'sanctuary', // 床に置くと敵が侵入不可
    floors: [30, 99], rarity: 'rare',
    buyPrice: 800, sellPrice: 400,
    sprite: 'makimono_32'
  },
  nedayashi_scroll: {
    id: 'nedayashi_scroll', name: 'ねだやしの巻物', type: ITEM_TYPE.SCROLL,
    effect: 'extinction', // 投げた敵の種族を以降出現しなくする
    floors: [50, 99], rarity: 'legendary',
    buyPrice: 3000, sellPrice: 1500,
    sprite: 'makimono_32'
  }
};

// 杖（8種）
export const STAFFS = {
  fuuin_staff: {
    id: 'fuuin_staff', name: '封印の杖', type: ITEM_TYPE.STAFF,
    effect: 'seal', // 敵の特殊能力を封印
    uses: [4, 6], // 使用回数範囲
    floors: [1, 99], rarity: 'common',
    buyPrice: 500, sellPrice: 250,
    sprite: 'tsue_32'
  },
  migawari_staff: {
    id: 'migawari_staff', name: '身代わりの杖', type: ITEM_TYPE.STAFF,
    effect: 'decoy', // 敵を身代わり状態に
    uses: [3, 5],
    floors: [15, 99], rarity: 'rare',
    buyPrice: 800, sellPrice: 400,
    sprite: 'tsue_32'
  },
  kanashibari_staff: {
    id: 'kanashibari_staff', name: 'かなしばりの杖', type: ITEM_TYPE.STAFF,
    effect: 'paralyze', // 敵を金縛り状態
    uses: [4, 6],
    floors: [1, 99], rarity: 'common',
    buyPrice: 600, sellPrice: 300,
    sprite: 'tsue_32'
  },
  bashogae_staff: {
    id: 'bashogae_staff', name: '場所替えの杖', type: ITEM_TYPE.STAFF,
    effect: 'swap', // 対象と位置を入れ替え
    uses: [4, 6],
    floors: [1, 99], rarity: 'common',
    buyPrice: 500, sellPrice: 250,
    sprite: 'tsue_32'
  },
  fukitobashi_staff: {
    id: 'fukitobashi_staff', name: '吹き飛ばしの杖', type: ITEM_TYPE.STAFF,
    effect: 'knockback', // 対象を10マス吹き飛ばす
    uses: [5, 7],
    floors: [1, 99], rarity: 'common',
    buyPrice: 400, sellPrice: 200,
    sprite: 'tsue_32'
  },
  ichijishinogi_staff: {
    id: 'ichijishinogi_staff', name: '一時しのぎの杖', type: ITEM_TYPE.STAFF,
    effect: 'warp_stairs', // 敵を階段の上にワープ+金縛り
    uses: [3, 5],
    floors: [20, 99], rarity: 'rare',
    buyPrice: 700, sellPrice: 350,
    sprite: 'tsue_32'
  },
  korobanu_staff: {
    id: 'korobanu_staff', name: '転ばぬ先の杖', type: ITEM_TYPE.STAFF,
    effect: 'trip_proof', // 罠・転倒無効（装備中効果）
    uses: [0, 0], // 振らない
    floors: [25, 99], rarity: 'rare',
    buyPrice: 600, sellPrice: 300,
    sprite: 'tsue_32'
  },
  fukkatsu_staff: {
    id: 'fukkatsu_staff', name: '復活の杖', type: ITEM_TYPE.STAFF,
    effect: 'revive_monster', // 倒した敵を仲間として復活
    uses: [1, 2],
    floors: [50, 99], rarity: 'legendary',
    buyPrice: 1500, sellPrice: 750,
    sprite: 'tsue_32'
  }
};

// 矢（3種）
export const ARROWS = {
  wood_arrow: {
    id: 'wood_arrow', name: '木の矢', type: ITEM_TYPE.ARROW,
    damage: 5,
    floors: [1, 99], rarity: 'common',
    buyPrice: 10, sellPrice: 5,
    sprite: 'ya_32'
  },
  iron_arrow: {
    id: 'iron_arrow', name: '鉄の矢', type: ITEM_TYPE.ARROW,
    damage: 12,
    floors: [15, 99], rarity: 'common',
    buyPrice: 30, sellPrice: 15,
    sprite: 'ya_32'
  },
  silver_arrow: {
    id: 'silver_arrow', name: '銀の矢', type: ITEM_TYPE.ARROW,
    damage: 20, effect: 'pierce', // 壁貫通
    floors: [40, 99], rarity: 'rare',
    buyPrice: 100, sellPrice: 50,
    sprite: 'ya_32'
  }
};

// 壺（6種）
export const POTS = {
  hozon_pot: {
    id: 'hozon_pot', name: '保存の壺', type: ITEM_TYPE.POT,
    effect: 'storage', // 自由に出し入れ可能
    capacity: [3, 5],
    floors: [1, 99], rarity: 'common',
    buyPrice: 600, sellPrice: 300,
    sprite: 'tsubo_32'
  },
  shikibetsu_pot: {
    id: 'shikibetsu_pot', name: '識別の壺', type: ITEM_TYPE.POT,
    effect: 'identify_pot', // 入れたアイテムを識別
    capacity: [3, 5],
    floors: [1, 99], rarity: 'common',
    buyPrice: 500, sellPrice: 250,
    sprite: 'tsubo_32'
  },
  gousei_pot: {
    id: 'gousei_pot', name: '合成の壺', type: ITEM_TYPE.POT,
    effect: 'synthesis_pot', // 同種武器/盾を合成
    capacity: [3, 5],
    floors: [25, 99], rarity: 'rare',
    buyPrice: 1500, sellPrice: 750,
    sprite: 'tsubo_32'
  },
  kyouka_pot: {
    id: 'kyouka_pot', name: '強化の壺', type: ITEM_TYPE.POT,
    effect: 'enhance', // 入れた武器/盾の強化値+1
    capacity: [3, 5],
    floors: [40, 99], rarity: 'rare',
    buyPrice: 2000, sellPrice: 1000,
    sprite: 'tsubo_32'
  },
  jakka_pot: {
    id: 'jakka_pot', name: '弱化の壺', type: ITEM_TYPE.POT,
    effect: 'weaken', // 入れた武器/盾の強化値-3
    capacity: [3, 5],
    floors: [1, 99], rarity: 'common',
    buyPrice: 800, sellPrice: 400,
    sprite: 'tsubo_32'
  },
  sokonuke_pot: {
    id: 'sokonuke_pot', name: '底抜けの壺', type: ITEM_TYPE.POT,
    effect: 'bottomless', // 入れたアイテム消滅。足元に使うと落とし穴
    capacity: [2, 4],
    floors: [1, 99], rarity: 'common',
    buyPrice: 1000, sellPrice: 500,
    sprite: 'tsubo_32'
  }
};

// 指輪（5種）
export const RINGS = {
  chikara_ring: {
    id: 'chikara_ring', name: 'ちからの指輪', type: ITEM_TYPE.RING,
    effect: 'strength_3', // ちから+3
    floors: [30, 99], rarity: 'rare',
    buyPrice: 3000, sellPrice: 1500,
    sprite: 'tsubo_32'
  },
  kaifuku_ring: {
    id: 'kaifuku_ring', name: '回復の指輪', type: ITEM_TYPE.RING,
    effect: 'regen_2x', // 自然回復速度2倍
    floors: [40, 99], rarity: 'rare',
    buyPrice: 5000, sellPrice: 2500,
    sprite: 'tsubo_32'
  },
  haraherazu_ring: {
    id: 'haraherazu_ring', name: 'ハラヘラズの指輪', type: ITEM_TYPE.RING,
    effect: 'no_hunger', // 満腹度減少なし
    floors: [50, 99], rarity: 'legendary',
    buyPrice: 7500, sellPrice: 3750,
    sprite: 'tsubo_32'
  },
  entou_ring: {
    id: 'entou_ring', name: '遠投の指輪', type: ITEM_TYPE.RING,
    effect: 'pierce_throw', // 投げ物が壁を貫通
    floors: [25, 99], rarity: 'rare',
    buyPrice: 2000, sellPrice: 1000,
    sprite: 'tsubo_32'
  },
  curse_ring: {
    id: 'curse_ring', name: '呪いの指輪', type: ITEM_TYPE.RING,
    effect: 'cursed', // 装備すると外せない。毎ターンHP-1
    floors: [1, 99], rarity: 'common',
    buyPrice: 0, sellPrice: 100,
    isCursed: true,
    sprite: 'tsubo_32'
  }
};

// おにぎり（2種）
export const FOODS = {
  onigiri: {
    id: 'onigiri', name: 'おにぎり', type: ITEM_TYPE.FOOD,
    effect: 'satiety_50', // 満腹度+50
    floors: [1, 99], rarity: 'common',
    buyPrice: 100, sellPrice: 50,
    sprite: 'onigiri_32'
  },
  ookii_onigiri: {
    id: 'ookii_onigiri', name: '大きなおにぎり', type: ITEM_TYPE.FOOD,
    effect: 'satiety_100', // 満腹度+100
    floors: [1, 99], rarity: 'common',
    buyPrice: 200, sellPrice: 100,
    sprite: 'onigiri_32'
  }
};

// 全アイテムをまとめたオブジェクト
export const ALL_ITEMS = {
  ...WEAPONS,
  ...SHIELDS,
  ...GRASSES,
  ...SCROLLS,
  ...STAFFS,
  ...ARROWS,
  ...POTS,
  ...RINGS,
  ...FOODS
};

/**
 * 指定階層で出現するアイテムリストを取得
 */
export function getItemsForFloor(floor) {
  return Object.values(ALL_ITEMS).filter(item => {
    const [minFloor, maxFloor] = item.floors;
    return floor >= minFloor && floor <= maxFloor;
  });
}

/**
 * ランダムにアイテムを選択（レアリティ考慮）
 */
export function getRandomItem(floor) {
  const candidates = getItemsForFloor(floor);
  if (candidates.length === 0) return ALL_ITEMS.yakusou;

  // レアリティによる重み付け
  const weighted = [];
  for (const item of candidates) {
    const weight = item.rarity === 'common' ? 10 :
                   item.rarity === 'rare' ? 3 :
                   item.rarity === 'legendary' ? 1 : 5;
    for (let i = 0; i < weight; i++) weighted.push(item);
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}
