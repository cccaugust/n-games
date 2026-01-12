/**
 * 算数バトル専用モンスターデータ
 * 既存のポケモン図鑑とは別管理
 * パラメータは小学生が計算しやすい範囲に設定（1~100程度）
 */

import { resolvePath } from '../../js/config.js';

// ポケモン図鑑由来の画像（算数バトル側に複製したもの）
// - 図鑑と算数バトルのデータは別管理にする前提
// - 画像だけは算数バトルの public 配下から参照する
const POKEDEX_IMAGE_MAP = {
    // id here is "pokedex id" for reference only; math-battle monsters use Mxxx.
    'カイケフポトリ': 'kaikefupotori.png',
    'ヒノコン': 'hinokon.png',
    'フレイマー': 'flamer.png',
    'インフェルノ': 'inferno.png',
    'アクアン': 'aquan.png',
    'ウェイビー': 'wavy.png',
    'タイダル': 'tidal.png',
    'ゴダンギル': 'godangiru.png',
    'カメラマン': 'cameraman.png',
    'カマサウルス': 'kamasaurus.png',
    'グレートマイテシ': 'greatmaitesh.png',
    'メガグレートマイテシ': 'mega_greatmaitesh.png',
    'ボトルマン': 'bottleman.png',
    'ヘビキング': 'hebiking.png',
    'カワボウ': 'kawabo.png',
    'タマウソ': 'tamauso.png',
    'ライジュウソ': 'raijuuso.png',
    'ピコチャージ': 'picocharge.png',
    'メガハブ': 'megahub.png',
    'ギガアウトレット': 'gigaoutlet.png',
    'ガイアドライバー': 'gaiadriver.png',
    'プロミネンス': 'prominess.png',
    'アビスウォーカー': 'abysswalker.png',
    'プラズマカイザー': 'plasmakaiser.png',
    'ウォンプ': 'womp.png',
    'ダイコ': 'daiko.png',
    'コインコイ': 'coinkoi.png'
};

function resolveMonsterImageByName(name) {
    const file = POKEDEX_IMAGE_MAP[name];
    return file ? resolvePath(`/games/math-battle/assets/monsters/${file}`) : null;
}

// タイプ定義
export const TYPES = {
    FIRE: 'fire',
    WATER: 'water',
    GRASS: 'grass',
    ELECTRIC: 'electric',
    PSYCHIC: 'psychic',
    FIGHTING: 'fighting',
    DRAGON: 'dragon',
    STEEL: 'steel',
    GHOST: 'ghost',
    FAIRY: 'fairy',
    NORMAL: 'normal'
};

// タイプ相性表（攻撃側 → 防御側の倍率）
export const TYPE_CHART = {
    [TYPES.FIRE]: {
        [TYPES.GRASS]: 2,
        [TYPES.WATER]: 0.5,
        [TYPES.FIRE]: 0.5,
        [TYPES.STEEL]: 2,
        [TYPES.DRAGON]: 0.5
    },
    [TYPES.WATER]: {
        [TYPES.FIRE]: 2,
        [TYPES.GRASS]: 0.5,
        [TYPES.WATER]: 0.5,
        [TYPES.DRAGON]: 0.5,
        [TYPES.ELECTRIC]: 1
    },
    [TYPES.GRASS]: {
        [TYPES.WATER]: 2,
        [TYPES.FIRE]: 0.5,
        [TYPES.GRASS]: 0.5,
        [TYPES.DRAGON]: 0.5,
        [TYPES.STEEL]: 0.5
    },
    [TYPES.ELECTRIC]: {
        [TYPES.WATER]: 2,
        [TYPES.GRASS]: 0.5,
        [TYPES.ELECTRIC]: 0.5,
        [TYPES.DRAGON]: 0.5
    },
    [TYPES.PSYCHIC]: {
        [TYPES.FIGHTING]: 2,
        [TYPES.PSYCHIC]: 0.5,
        [TYPES.STEEL]: 0.5,
        [TYPES.GHOST]: 0
    },
    [TYPES.FIGHTING]: {
        [TYPES.NORMAL]: 2,
        [TYPES.STEEL]: 2,
        [TYPES.PSYCHIC]: 0.5,
        [TYPES.GHOST]: 0,
        [TYPES.FAIRY]: 0.5
    },
    [TYPES.DRAGON]: {
        [TYPES.DRAGON]: 2,
        [TYPES.STEEL]: 0.5,
        [TYPES.FAIRY]: 0
    },
    [TYPES.STEEL]: {
        [TYPES.FAIRY]: 2,
        [TYPES.FIRE]: 0.5,
        [TYPES.WATER]: 0.5,
        [TYPES.ELECTRIC]: 0.5,
        [TYPES.STEEL]: 0.5
    },
    [TYPES.GHOST]: {
        [TYPES.GHOST]: 2,
        [TYPES.PSYCHIC]: 2,
        [TYPES.NORMAL]: 0
    },
    [TYPES.FAIRY]: {
        [TYPES.DRAGON]: 2,
        [TYPES.FIGHTING]: 2,
        [TYPES.FIRE]: 0.5,
        [TYPES.STEEL]: 0.5
    },
    [TYPES.NORMAL]: {
        [TYPES.GHOST]: 0,
        [TYPES.STEEL]: 0.5
    }
};

// タイプ相性を計算
export function getTypeMultiplier(attackerType, defenderTypes) {
    let multiplier = 1;
    for (const defType of defenderTypes) {
        const chart = TYPE_CHART[attackerType];
        if (chart && chart[defType] !== undefined) {
            multiplier *= chart[defType];
        }
    }
    return multiplier;
}

// タイプの日本語名
export const TYPE_NAMES = {
    [TYPES.FIRE]: 'ほのお',
    [TYPES.WATER]: 'みず',
    [TYPES.GRASS]: 'くさ',
    [TYPES.ELECTRIC]: 'でんき',
    [TYPES.PSYCHIC]: 'エスパー',
    [TYPES.FIGHTING]: 'かくとう',
    [TYPES.DRAGON]: 'ドラゴン',
    [TYPES.STEEL]: 'はがね',
    [TYPES.GHOST]: 'ゴースト',
    [TYPES.FAIRY]: 'フェアリー',
    [TYPES.NORMAL]: 'ノーマル'
};

// タイプの色
export const TYPE_COLORS = {
    [TYPES.FIRE]: '#F08030',
    [TYPES.WATER]: '#6890F0',
    [TYPES.GRASS]: '#78C850',
    [TYPES.ELECTRIC]: '#F8D030',
    [TYPES.PSYCHIC]: '#F85888',
    [TYPES.FIGHTING]: '#C03028',
    [TYPES.DRAGON]: '#7038F8',
    [TYPES.STEEL]: '#B8B8D0',
    [TYPES.GHOST]: '#705898',
    [TYPES.FAIRY]: '#EE99AC',
    [TYPES.NORMAL]: '#A8A878'
};

// レアリティ定義
export const RARITY = {
    COMMON: 1,      // ★
    UNCOMMON: 2,    // ★★
    RARE: 3,        // ★★★
    EPIC: 4,        // ★★★★
    LEGENDARY: 5    // ★★★★★
};

// レアリティの色
export const RARITY_COLORS = {
    [RARITY.COMMON]: '#888',
    [RARITY.UNCOMMON]: '#4a4',
    [RARITY.RARE]: '#48f',
    [RARITY.EPIC]: '#a4f',
    [RARITY.LEGENDARY]: '#fa0'
};

// レアリティのドロップ率（ガチャ用）
export const RARITY_RATES = {
    [RARITY.COMMON]: 50,
    [RARITY.UNCOMMON]: 30,
    [RARITY.RARE]: 15,
    [RARITY.EPIC]: 4,
    [RARITY.LEGENDARY]: 1
};

/**
 * スキル定義
 * 全て数字に関連した効果
 */
export const SKILLS = {
    // 攻撃力アップ系
    POWER_UP_1_2: {
        id: 'power_up_1_2',
        name: '1.2ばいパワー',
        description: '次の攻撃が1.2倍になる',
        effect: (damage) => Math.floor(damage * 1.2),
        cooldown: 3
    },
    POWER_UP_1_5: {
        id: 'power_up_1_5',
        name: '1.5ばいパワー',
        description: '次の攻撃が1.5倍になる',
        effect: (damage) => Math.floor(damage * 1.5),
        cooldown: 4
    },
    POWER_UP_2: {
        id: 'power_up_2',
        name: '2ばいパワー',
        description: '次の攻撃が2倍になる',
        effect: (damage) => damage * 2,
        cooldown: 5
    },

    // 回復系
    HEAL_QUARTER: {
        id: 'heal_quarter',
        name: '4ぶんの1かいふく',
        description: 'HPを最大の1/4回復',
        effect: (monster) => Math.floor(monster.maxHp / 4),
        cooldown: 4,
        type: 'heal'
    },
    HEAL_THIRD: {
        id: 'heal_third',
        name: '3ぶんの1かいふく',
        description: 'HPを最大の1/3回復',
        effect: (monster) => Math.floor(monster.maxHp / 3),
        cooldown: 5,
        type: 'heal'
    },
    HEAL_HALF: {
        id: 'heal_half',
        name: 'はんぶんかいふく',
        description: 'HPを最大の1/2回復',
        effect: (monster) => Math.floor(monster.maxHp / 2),
        cooldown: 6,
        type: 'heal'
    },

    // 確率系
    LUCKY_70: {
        id: 'lucky_70',
        name: '70%ラッキー',
        description: '70%の確率で攻撃力2倍',
        effect: (damage) => Math.random() < 0.7 ? damage * 2 : damage,
        cooldown: 3
    },
    LUCKY_50: {
        id: 'lucky_50',
        name: '50%ラッキー',
        description: '50%の確率で攻撃力3倍',
        effect: (damage) => Math.random() < 0.5 ? damage * 3 : damage,
        cooldown: 4
    },

    // 減少系
    ENEMY_DEFENSE_DOWN: {
        id: 'enemy_defense_down',
        name: 'ぼうぎょダウン',
        description: '敵の防御を1/2にする（3ターン）',
        effect: null,
        cooldown: 5,
        type: 'debuff',
        debuffType: 'defense',
        multiplier: 0.5,
        duration: 3
    },

    // 追加ダメージ系
    PLUS_10: {
        id: 'plus_10',
        name: '+10ダメージ',
        description: 'ダメージに+10',
        effect: (damage) => damage + 10,
        cooldown: 2
    },
    PLUS_20: {
        id: 'plus_20',
        name: '+20ダメージ',
        description: 'ダメージに+20',
        effect: (damage) => damage + 20,
        cooldown: 3
    }
};

/**
 * モンスターデータ
 * - hp: 10~100（計算しやすい範囲）
 * - attack: 5~50
 * - defense: 5~30
 * - レベルアップで各ステータス+1~3程度
 */
export const MONSTERS = [
    // ★ コモン（8体）
    {
        id: 'M001',
        name: 'ヒノコン',
        description: 'しっぽの火が元気のバロメーター。計算問題を解くとよく燃える。',
        image: resolveMonsterImageByName('ヒノコン'),
        types: [TYPES.FIRE],
        rarity: RARITY.COMMON,
        baseStats: { hp: 30, attack: 12, defense: 8 },
        skill: SKILLS.PLUS_10,
        evolution: 'M009',
        evolutionLevel: 15
    },
    {
        id: 'M002',
        name: 'アクアン',
        description: '水たまりが大好き。間違えるとしょんぼり泳ぐ。',
        image: resolveMonsterImageByName('アクアン'),
        types: [TYPES.WATER],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 10, defense: 10 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M010',
        evolutionLevel: 15
    },
    {
        id: 'M003',
        name: 'リーフィ',
        description: '日向ぼっこが大好き。葉っぱで足し算を数える。',
        types: [TYPES.GRASS],
        rarity: RARITY.COMMON,
        baseStats: { hp: 32, attack: 11, defense: 9 },
        skill: SKILLS.POWER_UP_1_2,
        evolution: 'M011',
        evolutionLevel: 15
    },
    {
        id: 'M004',
        name: 'ビリット',
        description: '静電気でビリビリ。計算が速いとピカピカ光る。',
        types: [TYPES.ELECTRIC],
        rarity: RARITY.COMMON,
        baseStats: { hp: 28, attack: 14, defense: 6 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M012',
        evolutionLevel: 15
    },
    {
        id: 'M005',
        name: 'コロモチ',
        description: 'ふわふわのお餅みたい。のんびり屋だけど計算は得意。',
        types: [TYPES.NORMAL],
        rarity: RARITY.COMMON,
        baseStats: { hp: 40, attack: 8, defense: 10 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M006',
        name: 'イワゴロ',
        description: '岩のように頑丈。防御が自慢。',
        types: [TYPES.STEEL],
        rarity: RARITY.COMMON,
        baseStats: { hp: 38, attack: 9, defense: 15 },
        skill: SKILLS.PLUS_10,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M007',
        name: 'オバケン',
        description: 'ちょっといたずら好きなおばけ。暗算が得意。',
        types: [TYPES.GHOST],
        rarity: RARITY.COMMON,
        baseStats: { hp: 25, attack: 15, defense: 5 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M013',
        evolutionLevel: 15
    },
    {
        id: 'M008',
        name: 'キラリン',
        description: 'キラキラ光る妖精。正解するたびに輝きが増す。',
        types: [TYPES.FAIRY],
        rarity: RARITY.COMMON,
        baseStats: { hp: 30, attack: 10, defense: 8 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M014',
        evolutionLevel: 15
    },

    // ★★ アンコモン（6体）- コモンの進化形
    {
        id: 'M009',
        name: 'フレイマー',
        description: 'ヒノコンが成長した姿。炎の勢いが増した。',
        image: resolveMonsterImageByName('フレイマー'),
        types: [TYPES.FIRE],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 50, attack: 20, defense: 12 },
        skill: SKILLS.POWER_UP_1_5,
        evolution: 'M017',
        evolutionLevel: 30
    },
    {
        id: 'M010',
        name: 'ウェイビー',
        description: 'アクアンが成長した姿。波を自在に操る。',
        image: resolveMonsterImageByName('ウェイビー'),
        types: [TYPES.WATER],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 18, defense: 14 },
        skill: SKILLS.HEAL_THIRD,
        evolution: 'M018',
        evolutionLevel: 30
    },
    {
        id: 'M011',
        name: 'フォレスト',
        description: 'リーフィが成長した姿。森の力を宿した。',
        types: [TYPES.GRASS],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 52, attack: 19, defense: 13 },
        skill: SKILLS.POWER_UP_1_5,
        evolution: 'M019',
        evolutionLevel: 30
    },
    {
        id: 'M012',
        name: 'サンダン',
        description: 'ビリットが成長した姿。雷を自在に放つ。',
        types: [TYPES.ELECTRIC],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 45, attack: 24, defense: 10 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M020',
        evolutionLevel: 30
    },
    {
        id: 'M013',
        name: 'ゴースター',
        description: 'オバケンが成長した姿。いたずらも本格的に。',
        types: [TYPES.GHOST],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 42, attack: 25, defense: 8 },
        skill: SKILLS.ENEMY_DEFENSE_DOWN,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M014',
        name: 'フェアリナ',
        description: 'キラリンが成長した姿。輝きで仲間を癒す。',
        types: [TYPES.FAIRY],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 48, attack: 18, defense: 12 },
        skill: SKILLS.HEAL_THIRD,
        evolution: null,
        evolutionLevel: null
    },

    // ★★★ レア（6体）
    {
        id: 'M015',
        name: 'サイコロン',
        description: '念力で数字を操る。テレパシーで答えを見抜く。',
        types: [TYPES.PSYCHIC],
        rarity: RARITY.RARE,
        baseStats: { hp: 55, attack: 28, defense: 15 },
        skill: SKILLS.POWER_UP_1_5,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M016',
        name: 'バトルン',
        description: '闘志あふれる戦士。正解への情熱は誰にも負けない。',
        types: [TYPES.FIGHTING],
        rarity: RARITY.RARE,
        baseStats: { hp: 60, attack: 30, defense: 12 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M017',
        name: 'インフェルノ',
        description: 'フレイマーの最終進化。灼熱の炎を操る。',
        image: resolveMonsterImageByName('インフェルノ'),
        types: [TYPES.FIRE, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 70, attack: 35, defense: 18 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M018',
        name: 'タイダル',
        description: 'ウェイビーの最終進化。大波を呼ぶ力を持つ。',
        image: resolveMonsterImageByName('タイダル'),
        types: [TYPES.WATER, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 75, attack: 30, defense: 22 },
        skill: SKILLS.HEAL_HALF,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M019',
        name: 'エンシェント',
        description: 'フォレストの最終進化。古代の森の守護者。',
        types: [TYPES.GRASS, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 72, attack: 32, defense: 20 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M020',
        name: 'ボルテックス',
        description: 'サンダンの最終進化。嵐を呼ぶ雷神。',
        types: [TYPES.ELECTRIC, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 65, attack: 38, defense: 15 },
        skill: SKILLS.LUCKY_50,
        evolution: null,
        evolutionLevel: null
    },

    // ★★★★ エピック（4体）
    {
        id: 'M021',
        name: 'カイケフポトリ',
        description: '異次元から来た謎の存在。空間を操る。',
        image: resolveMonsterImageByName('カイケフポトリ'),
        types: [TYPES.PSYCHIC, TYPES.FAIRY],
        rarity: RARITY.EPIC,
        baseStats: { hp: 80, attack: 40, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M022',
        name: 'ゴダンギル',
        description: '5本の剣を持つ騎士。連続攻撃が得意。',
        image: resolveMonsterImageByName('ゴダンギル'),
        types: [TYPES.STEEL, TYPES.GHOST],
        rarity: RARITY.EPIC,
        baseStats: { hp: 75, attack: 45, defense: 28 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M023',
        name: 'カマサウルス',
        description: '3匹が一体となった海の支配者。',
        image: resolveMonsterImageByName('カマサウルス'),
        types: [TYPES.WATER, TYPES.DRAGON],
        rarity: RARITY.EPIC,
        baseStats: { hp: 78, attack: 42, defense: 24 },
        skill: SKILLS.LUCKY_50,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M024',
        name: 'プラズマカイザー',
        description: '雷の化身。稲妻のごとく素早い。',
        image: resolveMonsterImageByName('プラズマカイザー'),
        types: [TYPES.ELECTRIC, TYPES.FIGHTING],
        rarity: RARITY.EPIC,
        baseStats: { hp: 70, attack: 48, defense: 20 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },

    // ★★★★★ レジェンダリー（2体）
    {
        id: 'M025',
        name: 'マスマジシャン',
        description: '算数の魔術師。あらゆる数字を操る伝説のモンスター。',
        types: [TYPES.PSYCHIC, TYPES.DRAGON],
        rarity: RARITY.LEGENDARY,
        baseStats: { hp: 100, attack: 50, defense: 30 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    {
        id: 'M026',
        name: 'インフィニティ',
        description: '無限の力を秘めた究極のモンスター。',
        types: [TYPES.DRAGON, TYPES.FAIRY],
        rarity: RARITY.LEGENDARY,
        baseStats: { hp: 95, attack: 55, defense: 28 },
        skill: SKILLS.HEAL_HALF,
        evolution: null,
        evolutionLevel: null
    }
];

// モンスターをIDで取得
export function getMonsterById(id) {
    return MONSTERS.find(m => m.id === id);
}

// レアリティでフィルター
export function getMonstersByRarity(rarity) {
    return MONSTERS.filter(m => m.rarity === rarity);
}

// レベルに応じたステータスを計算
export function calculateStats(monster, level) {
    const base = monster.baseStats;
    // レベルアップごとに各ステータスが少しずつ上昇
    // HP: +2~3, Attack: +1~2, Defense: +1
    const levelBonus = level - 1;
    return {
        hp: base.hp + Math.floor(levelBonus * 2.5),
        attack: base.attack + Math.floor(levelBonus * 1.5),
        defense: base.defense + Math.floor(levelBonus * 1)
    };
}

// モンスターのイメージを生成（プレースホルダー - 実際はSVGで描画）
export function getMonsterImage(monsterId) {
    // モンスターごとに固有の色とシェイプを生成
    const monster = getMonsterById(monsterId);
    if (!monster) return null;

    const primaryColor = TYPE_COLORS[monster.types[0]] || '#888';
    const secondaryColor = monster.types[1] ? TYPE_COLORS[monster.types[1]] : primaryColor;

    return { primaryColor, secondaryColor };
}
