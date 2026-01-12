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
    'リーフィ': 'leafy.png',
    'フォレスト': 'forest.png',
    'エンシェント': 'ancient.png',
    'ビリット': 'bilit.png',
    'サンダン': 'sandan.png',
    'ボルテックス': 'vortex.png',
    'オバケン': 'obaken.png',
    'ゴースター': 'ghoster.png',
    'キラリン': 'kirarin.png',
    'フェアリナ': 'fairina.png',
    'コロモチ': 'koromochi.png',
    'イワゴロ': 'iwagoro.png',
    'イワディン': 'iwadin.png',
    'コンゴウ': 'kongou.png',
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
    'コンゴウ': 'kongou.png',
    'サイコロン': 'psychoron.png',
    'ヘキサマインド': 'hexamind.png',
    'テサロード': 'tesserlord.png',
    'バトルン': 'battleun.png',
    'ウォーベア': 'warbear.png',
    'マスマジシャン': 'mathmagician.png',
    'インフィニティ': 'infinity.png',
    'ボムペン': 'bombpen.png',
    'ダイナペン': 'dynapen.png',
    'バクゲキング': 'blastking.png',
    'スクショッピ': 'scushoppi.png',
    'キャプチャル': 'captural.png',
    '４Ｋドン': 'fourkdon.png',
    'ワルラッコ': 'warurakko.png',
    'グレラッコ': 'gurerakko.png',
    'ゴクアクラッコ': 'gokuakurakko.png',
    'クラドペン': 'cloudpen.png',
    'レインペン': 'rainpen.png',
    'サンダペン': 'thunderpen.png',
    'ジャキリン': 'jakirin.png',
    'マガキリン': 'magakirin.png',
    'デモキリン': 'demokirin.png',
    'トゲマル': 'togemaru.png',
    'アイストゲウォー': 'icetogewar.png',
    'ブリザホッグ': 'blizzhog.png',
    'フライマウス': 'flymouse.png',
    'ウインラット': 'wingrat.png',
    'ジェットラット': 'jetrat.png',
    'キノコ': 'kinoko.png',
    'マッシュランナー': 'mashrunner.png',
    'キングファンガス': 'kingfungus.png',
    'フェアリル': 'fairill.png',
    'ピクシリル': 'pixrill.png',
    'オベリル': 'oberill.png',
    'イシキ': 'ishiki.png',
    'モクガン': 'mokugan.png',
    'ガイアフォート': 'gaiafort.png',
    'ファイピダー': 'firepider.png',
    'バーンウェブ': 'burnweb.png',
    'ヴォルカニド': 'volcanid.png',
    'トリケラボルト': 'triceravolt.png',
    'スパークトップス': 'sparktops.png',
    'ギガボルトプス': 'gigavoltops.png',
    'ティラノフラワー': 'tyranoflower.png',
    'ジュラシックブルーム': 'jurassicbloom.png',
    'フォレストキング': 'forestking.png',
    'ステゴクリスタル': 'stegocrystal.png',
    'ステゴフロスト': 'stegofrost.png',
    'ステゴグラシア': 'stegoglacier.png',
    'スピノエンバー': 'spinoember.png',
    'スピノマグマ': 'spinomagma.png',
    'スピノボルケーノ': 'spinovolcano.png',
    'ポヨン': 'poyon.png',
    'ベトベト': 'betobeto.png',
    'ドクイキング': 'dokuking.png',
    'シャドウパップ': 'shadowpup.png',
    'ナイトメアハウンド': 'nightmarehound.png',
    'コインコイ': 'coinkoi.png',
    'M080': 'm080.png',
    'M081': 'm081.png'
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
    NORMAL: 'normal',
    ICE: 'ice',
    POISON: 'poison',
    FLYING: 'flying',
    GROUND: 'ground',
    ROCK: 'rock',
    BUG: 'bug',
    DARK: 'dark'
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
    },
    [TYPES.ICE]: {},
    [TYPES.POISON]: {},
    [TYPES.FLYING]: {},
    [TYPES.GROUND]: {},
    [TYPES.ROCK]: {},
    [TYPES.BUG]: {},
    [TYPES.DARK]: {}
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
    [TYPES.NORMAL]: 'ノーマル',
    [TYPES.ICE]: 'こおり',
    [TYPES.POISON]: 'どく',
    [TYPES.FLYING]: 'ひこう',
    [TYPES.GROUND]: 'じめん',
    [TYPES.ROCK]: 'いわ',
    [TYPES.BUG]: 'むし',
    [TYPES.DARK]: 'あく'
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
    [TYPES.NORMAL]: '#A8A878',
    [TYPES.ICE]: '#96D9D6',
    [TYPES.POISON]: '#A040A0',
    [TYPES.FLYING]: '#A890F0',
    [TYPES.GROUND]: '#E0C068',
    [TYPES.ROCK]: '#B8A038',
    [TYPES.BUG]: '#A8B820',
    [TYPES.DARK]: '#705848'
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
        image: resolveMonsterImageByName('リーフィ'),
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
        image: resolveMonsterImageByName('ビリット'),
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
        image: resolveMonsterImageByName('コロモチ'),
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
        image: resolveMonsterImageByName('イワゴロ'),
        types: [TYPES.STEEL],
        rarity: RARITY.COMMON,
        baseStats: { hp: 38, attack: 9, defense: 15 },
        skill: SKILLS.PLUS_10,
        evolution: 'M027',
        evolutionLevel: 15
    },
    {
        id: 'M007',
        name: 'オバケン',
        description: 'ちょっといたずら好きなおばけ。暗算が得意。',
        image: resolveMonsterImageByName('オバケン'),
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
        image: resolveMonsterImageByName('キラリン'),
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
        image: resolveMonsterImageByName('フォレスト'),
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
        image: resolveMonsterImageByName('サンダン'),
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
        image: resolveMonsterImageByName('ゴースター'),
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
        image: resolveMonsterImageByName('フェアリナ'),
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
        image: resolveMonsterImageByName('サイコロン'),
        types: [TYPES.PSYCHIC],
        rarity: RARITY.RARE,
        baseStats: { hp: 55, attack: 28, defense: 15 },
        skill: SKILLS.POWER_UP_1_5,
        evolution: 'M029',
        evolutionLevel: 30
    },
    {
        id: 'M016',
        name: 'バトルン',
        description: '闘志あふれる戦士。正解への情熱は誰にも負けない。',
        image: resolveMonsterImageByName('バトルン'),
        types: [TYPES.FIGHTING],
        rarity: RARITY.RARE,
        baseStats: { hp: 60, attack: 30, defense: 12 },
        skill: SKILLS.POWER_UP_2,
        evolution: 'M031',
        evolutionLevel: 30
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
        image: resolveMonsterImageByName('エンシェント'),
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
        image: resolveMonsterImageByName('ボルテックス'),
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
        image: resolveMonsterImageByName('マスマジシャン'),
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
        image: resolveMonsterImageByName('インフィニティ'),
        types: [TYPES.DRAGON, TYPES.FAIRY],
        rarity: RARITY.LEGENDARY,
        baseStats: { hp: 95, attack: 55, defense: 28 },
        skill: SKILLS.HEAL_HALF,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：イワゴロ進化系
    {
        id: 'M027',
        name: 'イワディン',
        description: 'イワゴロが成長した姿。強固な岩の鎧をまとっている。',
        image: resolveMonsterImageByName('イワディン'),
        types: [TYPES.STEEL],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 18, defense: 25 },
        skill: SKILLS.PLUS_20,
        evolution: 'M028',
        evolutionLevel: 30
    },
    {
        id: 'M028',
        name: 'コンゴウ',
        description: 'イワディンの最終進化。ダイヤモンドのように硬い体を持つ。',
        image: resolveMonsterImageByName('コンゴウ'),
        types: [TYPES.STEEL, TYPES.FIGHTING],
        rarity: RARITY.RARE,
        baseStats: { hp: 75, attack: 35, defense: 35 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：サイコロン進化系
    {
        id: 'M029',
        name: 'ヘキサマインド',
        description: 'サイコロンが成長した姿。複数のサイコロを宙に浮かせ、並列思考で計算する。',
        image: resolveMonsterImageByName('ヘキサマインド'),
        types: [TYPES.PSYCHIC],
        rarity: RARITY.EPIC,
        baseStats: { hp: 70, attack: 42, defense: 22 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M030',
        evolutionLevel: 50
    },
    {
        id: 'M030',
        name: 'テサロード',
        description: 'ヘキサマインドの最終進化。4次元の演算能力を持つ思考の帝王。',
        image: resolveMonsterImageByName('テサロード'),
        types: [TYPES.PSYCHIC, TYPES.STEEL],
        rarity: RARITY.EPIC, // 設定上はほぼレジェンダリー
        baseStats: { hp: 85, attack: 52, defense: 38 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：バトルン進化系
    {
        id: 'M031',
        name: 'ウォーベア',
        description: 'バトルンが成長した姿。強靭な肉体と鎧で戦場を駆ける。',
        image: resolveMonsterImageByName('ウォーベア'),
        types: [TYPES.FIGHTING, TYPES.STEEL],
        rarity: RARITY.EPIC,
        baseStats: { hp: 80, attack: 45, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：爆弾ペンギン系
    {
        id: 'M032',
        name: 'ボムペン',
        description: '導火線のついたペンギン。怒ると爆発する。',
        image: resolveMonsterImageByName('ボムペン'),
        types: [TYPES.WATER],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 15, defense: 5 },
        skill: SKILLS.PLUS_10,
        evolution: 'M033',
        evolutionLevel: 15
    },
    {
        id: 'M033',
        name: 'ダイナペン',
        description: 'ボムペンが成長した姿。ダイナマイトを抱えて突撃する。',
        image: resolveMonsterImageByName('ダイナペン'),
        types: [TYPES.WATER, TYPES.FIRE],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 50, attack: 25, defense: 10 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M034',
        evolutionLevel: 30
    },
    {
        id: 'M034',
        name: 'バクゲキング',
        description: 'ダイナペンの最終進化。全身兵器の破壊王。',
        image: resolveMonsterImageByName('バクゲキング'),
        types: [TYPES.WATER, TYPES.FIRE],
        rarity: RARITY.RARE,
        baseStats: { hp: 70, attack: 40, defense: 20 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：スクショッピ系
    {
        id: 'M035',
        name: 'スクショッピ',
        description: '瞬間を切り取る能力を持つ。大事な場面を見逃さない。',
        image: resolveMonsterImageByName('スクショッピ'),
        types: [TYPES.ELECTRIC, TYPES.NORMAL],
        rarity: RARITY.COMMON,
        baseStats: { hp: 30, attack: 12, defense: 8 },
        skill: SKILLS.LUCKY_50,
        evolution: 'M036',
        evolutionLevel: 15
    },
    {
        id: 'M036',
        name: 'キャプチャル',
        description: 'あらゆるデータを保存する。記憶力は無限大。',
        image: resolveMonsterImageByName('キャプチャル'),
        types: [TYPES.ELECTRIC, TYPES.STEEL],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 50, attack: 20, defense: 15 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M037',
        evolutionLevel: 30
    },
    {
        id: 'M037',
        name: '４Ｋドン',
        description: '超高画質で世界を記録する巨体。その瞳には世界の全てが映る。',
        image: resolveMonsterImageByName('４Ｋドン'),
        types: [TYPES.ELECTRIC, TYPES.STEEL],
        rarity: RARITY.RARE,
        baseStats: { hp: 80, attack: 35, defense: 30 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：悪いラッコ系
    {
        id: 'M038',
        name: 'ワルラッコ',
        description: '悪戯好きなラッコ。気に入らない石は投げつける。',
        image: resolveMonsterImageByName('ワルラッコ'),
        types: [TYPES.WATER, TYPES.FIGHTING],
        rarity: RARITY.COMMON,
        baseStats: { hp: 40, attack: 15, defense: 10 },
        skill: SKILLS.PLUS_10,
        evolution: 'M039',
        evolutionLevel: 15
    },
    {
        id: 'M039',
        name: 'グレラッコ',
        description: 'ワルラッコが成長して更に凶暴になった。貝殻を砕く腕力を持つ。',
        image: resolveMonsterImageByName('グレラッコ'),
        types: [TYPES.WATER, TYPES.FIGHTING],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 60, attack: 25, defense: 15 },
        skill: SKILLS.LUCKY_50,
        evolution: 'M040',
        evolutionLevel: 30
    },
    {
        id: 'M040',
        name: 'ゴクアクラッコ',
        description: '海のギャングスター。その強さは海を支配するほど。',
        image: resolveMonsterImageByName('ゴクアクラッコ'),
        types: [TYPES.WATER, TYPES.FIGHTING],
        rarity: RARITY.RARE,
        baseStats: { hp: 85, attack: 45, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：雷雲ペンギン系
    {
        id: 'M041',
        name: 'クラドペン',
        description: '雲のような体毛を持つペンギン。空をふわふわと飛ぶ。',
        image: resolveMonsterImageByName('クラドペン'),
        types: [TYPES.FLYING],
        rarity: RARITY.COMMON,
        baseStats: { hp: 30, attack: 10, defense: 10 },
        skill: SKILLS.PLUS_10,
        evolution: 'M042',
        evolutionLevel: 15
    },
    {
        id: 'M042',
        name: 'レインペン',
        description: '雨雲を呼ぶペンギン。常に涙目で雨を降らせている。',
        image: resolveMonsterImageByName('レインペン'),
        types: [TYPES.FLYING, TYPES.WATER],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 50, attack: 20, defense: 15 },
        skill: SKILLS.HEAL_HALF,
        evolution: 'M043',
        evolutionLevel: 30
    },
    {
        id: 'M043',
        name: 'サンダペン',
        description: '雷雲を纏ったペンギン王。怒りの雷撃で敵を貫く。',
        image: resolveMonsterImageByName('サンダペン'),
        types: [TYPES.FLYING, TYPES.ELECTRIC],
        rarity: RARITY.RARE,
        baseStats: { hp: 75, attack: 40, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：悪キリン系
    {
        id: 'M044',
        name: 'ジャキリン',
        description: '邪悪な心を宿したキリン。闇の力で植物を枯らす。',
        image: resolveMonsterImageByName('ジャキリン'),
        types: [TYPES.DARK],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 15, defense: 5 },
        skill: SKILLS.PLUS_10,
        evolution: 'M045',
        evolutionLevel: 15
    },
    {
        id: 'M045',
        name: 'マガキリン',
        description: '禍々しいオーラを纏ったキリン。その視線は相手をすくませる。',
        image: resolveMonsterImageByName('マガキリン'),
        types: [TYPES.DARK, TYPES.GHOST],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 25, defense: 10 },
        skill: SKILLS.LUCKY_50,
        evolution: 'M046',
        evolutionLevel: 30
    },
    {
        id: 'M046',
        name: 'デモキリン',
        description: '悪魔の契約を結んだキリン。漆黒の雷で全てを焼き尽くす。',
        image: resolveMonsterImageByName('デモキリン'),
        types: [TYPES.DARK, TYPES.ELECTRIC],
        rarity: RARITY.RARE,
        baseStats: { hp: 80, attack: 45, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：氷トゲネズミ系
    {
        id: 'M047',
        name: 'トゲマル',
        description: '氷のトゲで身を守る臆病なモンスター。寒い場所を好む。',
        image: resolveMonsterImageByName('トゲマル'),
        types: [TYPES.WATER],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 12, defense: 18 },
        skill: SKILLS.PLUS_10,
        evolution: 'M048',
        evolutionLevel: 15
    },
    {
        id: 'M048',
        name: 'アイストゲウォー',
        description: '氷の鎧が厚くなり、二足歩行を始めた。トゲを飛ばして攻撃する。',
        image: resolveMonsterImageByName('アイストゲウォー'),
        types: [TYPES.WATER, TYPES.STEEL],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 22, defense: 28 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M049',
        evolutionLevel: 30
    },
    {
        id: 'M049',
        name: 'ブリザホッグ',
        description: '絶対零度の冷気を操る氷の要塞。近づくもの全てを凍らせる。',
        image: resolveMonsterImageByName('ブリザホッグ'),
        types: [TYPES.WATER, TYPES.STEEL],
        rarity: RARITY.RARE,
        baseStats: { hp: 80, attack: 40, defense: 40 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：飛行ネズミ系
    {
        id: 'M050',
        name: 'フライマウス',
        description: '翼を持つネズミ。小回りの利く飛行で攻撃をかわす。',
        image: resolveMonsterImageByName('フライマウス'),
        types: [TYPES.FLYING],
        rarity: RARITY.COMMON,
        baseStats: { hp: 30, attack: 14, defense: 6 },
        skill: SKILLS.PLUS_10,
        evolution: 'M051',
        evolutionLevel: 15
    },
    {
        id: 'M051',
        name: 'ウインラット',
        description: '大きな翼で自在に空を飛ぶ。素早い動きで相手を翻弄する。',
        image: resolveMonsterImageByName('ウインラット'),
        types: [TYPES.FLYING],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 50, attack: 24, defense: 12 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M052',
        evolutionLevel: 30
    },
    {
        id: 'M052',
        name: 'ジェットラット',
        description: 'ジェットパックで音速を超える。空の王者として君臨する。',
        image: resolveMonsterImageByName('ジェットラット'),
        types: [TYPES.FLYING, TYPES.STEEL],
        rarity: RARITY.RARE,
        baseStats: { hp: 75, attack: 42, defense: 28 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：キノコ系
    {
        id: 'M053',
        name: 'キノコ',
        description: '森の奥深くに住む小さなキノコ。踏まれると怒る。',
        image: resolveMonsterImageByName('キノコ'),
        types: [TYPES.GRASS],
        rarity: RARITY.COMMON,
        baseStats: { hp: 40, attack: 10, defense: 10 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M054',
        evolutionLevel: 15
    },
    {
        id: 'M054',
        name: 'マッシュランナー',
        description: '旅をするキノコ。胞子をまき散らしながら各地を巡る。',
        image: resolveMonsterImageByName('マッシュランナー'),
        types: [TYPES.GRASS, TYPES.GROUND],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 60, attack: 20, defense: 15 },
        skill: SKILLS.LUCKY_50,
        evolution: 'M055',
        evolutionLevel: 30
    },
    {
        id: 'M055',
        name: 'キングファンガス',
        description: '森の賢者と呼ばれるキノコの王。杖から不思議な魔力を放つ。',
        image: resolveMonsterImageByName('キングファンガス'),
        types: [TYPES.GRASS, TYPES.PSYCHIC],
        rarity: RARITY.RARE,
        baseStats: { hp: 85, attack: 35, defense: 35 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：マンドリフェアリー系
    {
        id: 'M056',
        name: 'フェアリル',
        description: 'カラフルな体毛を持つサルの妖精。森の中でダンスを踊る。',
        image: resolveMonsterImageByName('フェアリル'),
        types: [TYPES.FAIRY],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 14, defense: 8 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M057',
        evolutionLevel: 15
    },
    {
        id: 'M057',
        name: 'ピクシリル',
        description: '羽が生えたマンドリル。いたずら好きで、幻を見せる魔法を使う。',
        image: resolveMonsterImageByName('ピクシリル'),
        types: [TYPES.FAIRY, TYPES.NORMAL],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 24, defense: 14 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M058',
        evolutionLevel: 30
    },
    {
        id: 'M058',
        name: 'オベリル',
        description: '妖精界の王とも呼ばれる。虹色のオーラで味方を守る。',
        image: resolveMonsterImageByName('オベリル'),
        types: [TYPES.FAIRY, TYPES.NORMAL],
        rarity: RARITY.RARE,
        baseStats: { hp: 80, attack: 42, defense: 30 },
        skill: SKILLS.HEAL_HALF,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：石×木系
    {
        id: 'M059',
        name: 'イシキ',
        description: '石のかけらから生えた木の芽。動くとポロポロと小石が落ちる。',
        image: resolveMonsterImageByName('イシキ'),
        types: [TYPES.GRASS, TYPES.STEEL],
        rarity: RARITY.COMMON,
        baseStats: { hp: 38, attack: 12, defense: 15 },
        skill: SKILLS.PLUS_10,
        evolution: 'M060',
        evolutionLevel: 15
    },
    {
        id: 'M060',
        name: 'モクガン',
        description: '木と岩が融合したモンスター。硬い皮と強い根を持つ。',
        image: resolveMonsterImageByName('モクガン'),
        types: [TYPES.GRASS, TYPES.STEEL],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 60, attack: 22, defense: 25 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M061',
        evolutionLevel: 30
    },
    {
        id: 'M061',
        name: 'ガイアフォート',
        description: '大地の要塞。背中の木々はあらゆる生命の源となる。',
        image: resolveMonsterImageByName('ガイアフォート'),
        types: [TYPES.GRASS, TYPES.STEEL],
        rarity: RARITY.RARE,
        baseStats: { hp: 90, attack: 38, defense: 45 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：炎×蜘蛛系
    {
        id: 'M062',
        name: 'ファイピダー',
        description: '燃える体を持つ子蜘蛛。糸も熱を帯びている。',
        image: resolveMonsterImageByName('ファイピダー'),
        types: [TYPES.FIRE, TYPES.GHOST],
        rarity: RARITY.COMMON,
        baseStats: { hp: 30, attack: 14, defense: 8 },
        skill: SKILLS.PLUS_10,
        evolution: 'M063',
        evolutionLevel: 15
    },
    {
        id: 'M063',
        name: 'バーンウェブ',
        description: '背中が溶岩のように煮えたぎる蜘蛛。炎の巣で獲物を捕らえる。',
        image: resolveMonsterImageByName('バーンウェブ'),
        types: [TYPES.FIRE, TYPES.GHOST],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 50, attack: 26, defense: 12 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M064',
        evolutionLevel: 30
    },
    {
        id: 'M064',
        name: 'ヴォルカニド',
        description: '火山の主と呼ばれる巨大蜘蛛。足先からマグマを噴出する。',
        image: resolveMonsterImageByName('ヴォルカニド'),
        types: [TYPES.FIRE, TYPES.GHOST],
        rarity: RARITY.RARE,
        baseStats: { hp: 75, attack: 45, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：トリケラトプス×電気系
    {
        id: 'M065',
        name: 'トリケラボルト',
        description: '電気を帯びた角を持つ恐竜の子供。怒ると放電する。',
        image: resolveMonsterImageByName('トリケラボルト'),
        types: [TYPES.ELECTRIC, TYPES.DRAGON],
        rarity: RARITY.COMMON,
        baseStats: { hp: 32, attack: 13, defense: 9 },
        skill: SKILLS.PLUS_10,
        evolution: 'M066',
        evolutionLevel: 15
    },
    {
        id: 'M066',
        name: 'スパークトップス',
        description: '3本の角から激しい電流を放つ。その威力は雷並み。',
        image: resolveMonsterImageByName('スパークトップス'),
        types: [TYPES.ELECTRIC, TYPES.DRAGON],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 22, defense: 14 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M067',
        evolutionLevel: 30
    },
    {
        id: 'M067',
        name: 'ギガボルトプス',
        description: '雷雲を呼び寄せる伝説の雷竜。全身が発電器官となっている。',
        image: resolveMonsterImageByName('ギガボルトプス'),
        types: [TYPES.ELECTRIC, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 80, attack: 42, defense: 28 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：ティラノサウルス×草系
    {
        id: 'M068',
        name: 'ティラノフラワー',
        description: '花を頭に乗せた恐竜の子供。日向ぼっこで光合成をする。',
        image: resolveMonsterImageByName('ティラノフラワー'),
        types: [TYPES.GRASS, TYPES.DRAGON],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 15, defense: 8 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M069',
        evolutionLevel: 15
    },
    {
        id: 'M069',
        name: 'ジュラシックブルーム',
        description: '全身に美しい花を咲かせた恐竜。香りにつられて虫が集まる。',
        image: resolveMonsterImageByName('ジュラシックブルーム'),
        types: [TYPES.GRASS, TYPES.DRAGON],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 60, attack: 25, defense: 12 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M070',
        evolutionLevel: 30
    },
    {
        id: 'M070',
        name: 'フォレストキング',
        description: '背中に森を背負う巨大な恐竜。歩く姿は移動する森そのもの。',
        image: resolveMonsterImageByName('フォレストキング'),
        types: [TYPES.GRASS, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 90, attack: 45, defense: 30 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：氷×ステゴサウルス系
    {
        id: 'M071',
        name: 'ステゴクリスタル',
        description: '背中の結晶で冷気を集めるステゴサウルスの子供。',
        image: resolveMonsterImageByName('ステゴクリスタル'),
        types: [TYPES.ICE, TYPES.DRAGON],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 12, defense: 15 },
        skill: SKILLS.PLUS_10,
        evolution: 'M072',
        evolutionLevel: 15
    },
    {
        id: 'M072',
        name: 'ステゴフロスト',
        description: '全身が氷の鎧で覆われた。鋭い背びれで体当たりする。',
        image: resolveMonsterImageByName('ステゴフロスト'),
        types: [TYPES.ICE, TYPES.DRAGON],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 22, defense: 25 },
        skill: SKILLS.HEAL_QUARTER,
        evolution: 'M073',
        evolutionLevel: 30
    },
    {
        id: 'M073',
        name: 'ステゴグラシア',
        description: '氷河の如く巨大な体を誇る。吹雪を起こしてあたりを凍らせる。',
        image: resolveMonsterImageByName('ステゴグラシア'),
        types: [TYPES.ICE, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 90, attack: 40, defense: 45 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：炎×スピノサウルス系
    {
        id: 'M074',
        name: 'スピノエンバー',
        description: '背中の帆が赤く燃えるスピノサウルスの子供。水辺を好むが泳ぐと水が沸騰する。',
        image: resolveMonsterImageByName('スピノエンバー'),
        types: [TYPES.FIRE, TYPES.DRAGON],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 16, defense: 6 },
        skill: SKILLS.PLUS_10,
        evolution: 'M075',
        evolutionLevel: 15
    },
    {
        id: 'M075',
        name: 'スピノマグマ',
        description: '体内をマグマが循環している。怒ると背中の帆から炎を噴き上げる。',
        image: resolveMonsterImageByName('スピノマグマ'),
        types: [TYPES.FIRE, TYPES.DRAGON],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 55, attack: 28, defense: 10 },
        skill: SKILLS.LUCKY_70,
        evolution: 'M076',
        evolutionLevel: 30
    },
    {
        id: 'M076',
        name: 'スピノボルケーノ',
        description: '背中に火山を背負ったような姿。咆哮と共に周囲を火の海に変える。',
        image: resolveMonsterImageByName('スピノボルケーノ'),
        types: [TYPES.FIRE, TYPES.DRAGON],
        rarity: RARITY.RARE,
        baseStats: { hp: 85, attack: 50, defense: 25 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：毒タイプ（スライム系）
    {
        id: 'M077',
        name: 'ポヨン',
        description: '紫色のスライム。いつも気だるげな表情をしている。',
        image: resolveMonsterImageByName('ポヨン'),
        types: [TYPES.POISON],
        rarity: RARITY.COMMON,
        baseStats: { hp: 40, attack: 10, defense: 10 },
        skill: SKILLS.PLUS_10,
        evolution: 'M078',
        evolutionLevel: 15
    },
    {
        id: 'M078',
        name: 'ベトベト',
        description: 'ポヨンが成長した姿。体が溶けて地面を汚しながら進む。',
        image: resolveMonsterImageByName('ベトベト'),
        types: [TYPES.POISON],
        rarity: RARITY.UNCOMMON,
        baseStats: { hp: 65, attack: 18, defense: 15 },
        skill: SKILLS.ENEMY_DEFENSE_DOWN,
        evolution: 'M079',
        evolutionLevel: 30
    },
    {
        id: 'M079',
        name: 'ドクイキング',
        description: '毒の沼地の王様。体から生える結晶には猛毒が含まれている。',
        image: resolveMonsterImageByName('ドクイキング'),
        types: [TYPES.POISON],
        rarity: RARITY.RARE,
        baseStats: { hp: 100, attack: 35, defense: 30 },
        skill: SKILLS.POWER_UP_2,
        evolution: null,
        evolutionLevel: null
    },
    // 追加分：悪×犬系
    {
        id: 'M080',
        name: 'シャドウパップ',
        description: '影から生まれた子犬。暗闇に溶け込んで移動する。',
        image: resolveMonsterImageByName('シャドウパップ'),
        types: [TYPES.DARK],
        rarity: RARITY.COMMON,
        baseStats: { hp: 35, attack: 18, defense: 5 },
        skill: SKILLS.PLUS_10,
        evolution: 'M081',
        evolutionLevel: 25
    },
    {
        id: 'M081',
        name: 'ナイトメアハウンド',
        description: '悪夢を具現化した魔獣。その遠吠えは聞く者を恐怖に陥れる。',
        image: resolveMonsterImageByName('ナイトメアハウンド'),
        types: [TYPES.DARK, TYPES.GHOST],
        rarity: RARITY.RARE, // 2段階進化なのでレア扱い
        baseStats: { hp: 80, attack: 45, defense: 20 },
        skill: SKILLS.LUCKY_50,
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
