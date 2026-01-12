/**
 * ステージデータ
 * 学習指導要領準拠・各単元3ステージ
 */

import { GRADES, CATEGORIES, CATEGORY_NAMES, GRADE_CATEGORIES } from './questions.js';
import { TYPES, TYPE_NAMES } from './monsters.js';

// 単元ごとの敵タイプ（分野のイメージに合わせる）
const CATEGORY_ENEMY_TYPES = {
    // 1年生
    [CATEGORIES.COUNT_10]: [TYPES.NORMAL],
    [CATEGORIES.COUNT_20]: [TYPES.NORMAL],
    [CATEGORIES.COUNT_100]: [TYPES.NORMAL],
    [CATEGORIES.ADD_1]: [TYPES.FIRE],
    [CATEGORIES.ADD_CARRY]: [TYPES.FIRE],
    [CATEGORIES.SUB_1]: [TYPES.WATER],
    [CATEGORIES.SUB_BORROW]: [TYPES.WATER],
    [CATEGORIES.COMPARE_NUM]: [TYPES.PSYCHIC],
    [CATEGORIES.CLOCK_READ]: [TYPES.FAIRY],
    [CATEGORIES.SHAPES_BASIC]: [TYPES.GRASS],

    // 2年生
    [CATEGORIES.ADD_2DIGIT]: [TYPES.FIRE],
    [CATEGORIES.SUB_2DIGIT]: [TYPES.WATER],
    [CATEGORIES.HISSAN_ADD]: [TYPES.FIRE, TYPES.STEEL],
    [CATEGORIES.HISSAN_SUB]: [TYPES.WATER, TYPES.STEEL],
    [CATEGORIES.MULT_KUKU]: [TYPES.ELECTRIC],
    [CATEGORIES.LENGTH]: [TYPES.GROUND],
    [CATEGORIES.CLOCK_CALC]: [TYPES.FAIRY],
    [CATEGORIES.TRIANGLE_SQUARE]: [TYPES.GRASS],
    [CATEGORIES.BOX_SHAPE]: [TYPES.ROCK],

    // 3年生
    [CATEGORIES.LARGE_NUM]: [TYPES.NORMAL, TYPES.PSYCHIC],
    [CATEGORIES.HISSAN_ADD_3]: [TYPES.FIRE, TYPES.STEEL],
    [CATEGORIES.HISSAN_SUB_3]: [TYPES.WATER, TYPES.STEEL],
    [CATEGORIES.MULT_2DIGIT]: [TYPES.ELECTRIC],
    [CATEGORIES.HISSAN_MULT]: [TYPES.ELECTRIC, TYPES.STEEL],
    [CATEGORIES.DIVISION]: [TYPES.DARK],
    [CATEGORIES.REMAINDER]: [TYPES.DARK, TYPES.GHOST],
    [CATEGORIES.FRACTION_INTRO]: [TYPES.PSYCHIC],
    [CATEGORIES.DECIMAL_INTRO]: [TYPES.PSYCHIC],
    [CATEGORIES.CIRCLE]: [TYPES.FAIRY],
    [CATEGORIES.TIME_CALC]: [TYPES.FAIRY, TYPES.PSYCHIC],
    [CATEGORIES.WEIGHT]: [TYPES.ROCK],

    // 4年生
    [CATEGORIES.BILLION]: [TYPES.DRAGON],
    [CATEGORIES.HISSAN_DIV]: [TYPES.DARK, TYPES.STEEL],
    [CATEGORIES.MULT_2X2]: [TYPES.ELECTRIC, TYPES.FIGHTING],
    [CATEGORIES.DECIMAL_ADD]: [TYPES.PSYCHIC],
    [CATEGORIES.ANGLE]: [TYPES.FLYING],
    [CATEGORIES.PERPENDICULAR]: [TYPES.FLYING],
    [CATEGORIES.AREA_RECT]: [TYPES.GRASS, TYPES.GROUND],
    [CATEGORIES.MIXED_CALC]: [TYPES.FIGHTING],
    [CATEGORIES.APPROX]: [TYPES.GHOST],

    // 5年生
    [CATEGORIES.DECIMAL_MULT]: [TYPES.PSYCHIC, TYPES.ELECTRIC],
    [CATEGORIES.DECIMAL_DIV]: [TYPES.PSYCHIC, TYPES.DARK],
    [CATEGORIES.FRACTION_SAME]: [TYPES.PSYCHIC],
    [CATEGORIES.FRACTION_DIFF]: [TYPES.PSYCHIC, TYPES.FIGHTING],
    [CATEGORIES.AVERAGE]: [TYPES.NORMAL, TYPES.PSYCHIC],
    [CATEGORIES.PERCENTAGE]: [TYPES.GHOST],
    [CATEGORIES.AREA_TRI]: [TYPES.GRASS, TYPES.FLYING],
    [CATEGORIES.VOLUME]: [TYPES.ROCK, TYPES.GROUND],
    [CATEGORIES.PRISM]: [TYPES.ROCK],
    [CATEGORIES.UNIT_AMOUNT]: [TYPES.NORMAL],
    [CATEGORIES.RATIO_BASIC]: [TYPES.PSYCHIC],

    // 6年生
    [CATEGORIES.FRACTION_MULT]: [TYPES.PSYCHIC, TYPES.DRAGON],
    [CATEGORIES.FRACTION_DIV]: [TYPES.PSYCHIC, TYPES.DRAGON],
    [CATEGORIES.RATIO]: [TYPES.PSYCHIC],
    [CATEGORIES.PROPORTION]: [TYPES.PSYCHIC, TYPES.FAIRY],
    [CATEGORIES.CIRCLE_AREA]: [TYPES.FAIRY, TYPES.DRAGON],
    [CATEGORIES.SYMMETRY]: [TYPES.FAIRY],
    [CATEGORIES.SPEED]: [TYPES.FLYING, TYPES.ELECTRIC],
    [CATEGORIES.CONCENTRATION]: [TYPES.WATER, TYPES.GHOST],
    [CATEGORIES.WORD_BASIC]: [TYPES.FIGHTING],
    [CATEGORIES.WORD_ADV]: [TYPES.FIGHTING, TYPES.DRAGON],
    [CATEGORIES.DATA]: [TYPES.STEEL, TYPES.PSYCHIC]
};

// 学年の日本語名
export const GRADE_NAMES = {
    [GRADES.GRADE_1]: '1ねんせい',
    [GRADES.GRADE_2]: '2年生',
    [GRADES.GRADE_3]: '3年生',
    [GRADES.GRADE_4]: '4年生',
    [GRADES.GRADE_5]: '5年生',
    [GRADES.GRADE_6]: '6年生'
};

// ステージランク
export const RANKS = {
    NONE: '',
    C: 'C',
    B: 'B',
    A: 'A',
    S: 'S'
};

// ランクの色
export const RANK_COLORS = {
    [RANKS.C]: '#888',
    [RANKS.B]: '#4a4',
    [RANKS.A]: '#48f',
    [RANKS.S]: '#fa0'
};

// 単元ごとの敵名
const CATEGORY_ENEMY_NAMES = {
    [CATEGORIES.COUNT_10]: 'カズン',
    [CATEGORIES.COUNT_20]: 'ニジュウン',
    [CATEGORIES.COUNT_100]: 'ヒャックン',
    [CATEGORIES.ADD_1]: 'タスン',
    [CATEGORIES.ADD_CARRY]: 'クリアゲン',
    [CATEGORIES.SUB_1]: 'ヒクン',
    [CATEGORIES.SUB_BORROW]: 'クリサゲン',
    [CATEGORIES.COMPARE_NUM]: 'クラベン',
    [CATEGORIES.CLOCK_READ]: 'トケイン',
    [CATEGORIES.SHAPES_BASIC]: 'カタチン',

    [CATEGORIES.ADD_2DIGIT]: 'フタケタスン',
    [CATEGORIES.SUB_2DIGIT]: 'フタケヒクン',
    [CATEGORIES.HISSAN_ADD]: 'ヒッサタスン',
    [CATEGORIES.HISSAN_SUB]: 'ヒッサヒクン',
    [CATEGORIES.MULT_KUKU]: 'ククルン',
    [CATEGORIES.LENGTH]: 'ナガサン',
    [CATEGORIES.CLOCK_CALC]: 'ジカン',
    [CATEGORIES.TRIANGLE_SQUARE]: 'サンシカクン',
    [CATEGORIES.BOX_SHAPE]: 'ハコン',

    [CATEGORIES.LARGE_NUM]: 'オオカズン',
    [CATEGORIES.HISSAN_ADD_3]: 'サンケタスン',
    [CATEGORIES.HISSAN_SUB_3]: 'サンケヒクン',
    [CATEGORIES.MULT_2DIGIT]: 'カケルン',
    [CATEGORIES.HISSAN_MULT]: 'ヒッサカケン',
    [CATEGORIES.DIVISION]: 'ワルン',
    [CATEGORIES.REMAINDER]: 'アマリン',
    [CATEGORIES.FRACTION_INTRO]: 'ブンスウン',
    [CATEGORIES.DECIMAL_INTRO]: 'ショウスウン',
    [CATEGORIES.CIRCLE]: 'エンマルン',
    [CATEGORIES.TIME_CALC]: 'ジコクン',
    [CATEGORIES.WEIGHT]: 'オモサン',

    [CATEGORIES.BILLION]: 'オクチョウン',
    [CATEGORIES.HISSAN_DIV]: 'ヒッサワルン',
    [CATEGORIES.MULT_2X2]: 'カケカケルン',
    [CATEGORIES.DECIMAL_ADD]: 'ショウスウケン',
    [CATEGORIES.ANGLE]: 'カクドン',
    [CATEGORIES.PERPENDICULAR]: 'スイチョクン',
    [CATEGORIES.AREA_RECT]: 'メンセキン',
    [CATEGORIES.MIXED_CALC]: 'シソクン',
    [CATEGORIES.APPROX]: 'ガイスウン',

    [CATEGORIES.DECIMAL_MULT]: 'ショウカケン',
    [CATEGORIES.DECIMAL_DIV]: 'ショウワルン',
    [CATEGORIES.FRACTION_SAME]: 'ドウブンン',
    [CATEGORIES.FRACTION_DIFF]: 'ツウブンン',
    [CATEGORIES.AVERAGE]: 'ヘイキン',
    [CATEGORIES.PERCENTAGE]: 'ワリアイン',
    [CATEGORIES.AREA_TRI]: 'サンカクメン',
    [CATEGORIES.VOLUME]: 'タイセキン',
    [CATEGORIES.PRISM]: 'カクチュウン',
    [CATEGORIES.UNIT_AMOUNT]: 'タンイン',
    [CATEGORIES.RATIO_BASIC]: 'ヒキソン',

    [CATEGORIES.FRACTION_MULT]: 'ブンスウカケン',
    [CATEGORIES.FRACTION_DIV]: 'ブンスウワルン',
    [CATEGORIES.RATIO]: 'ヒノアタイン',
    [CATEGORIES.PROPORTION]: 'ヒレイン',
    [CATEGORIES.CIRCLE_AREA]: 'エンメンセキン',
    [CATEGORIES.SYMMETRY]: 'タイショウン',
    [CATEGORIES.SPEED]: 'ハヤサン',
    [CATEGORIES.CONCENTRATION]: 'ノウドン',
    [CATEGORIES.WORD_BASIC]: 'モンダイン',
    [CATEGORIES.WORD_ADV]: 'ナンモンン',
    [CATEGORIES.DATA]: 'データン'
};

// 単元ごとのステージ説明
const STAGE_DESCRIPTIONS = {
    [CATEGORIES.COUNT_10]: ['かずを かぞえよう', 'ならべて かぞえよう', 'かず マスター'],
    [CATEGORIES.COUNT_20]: ['10より おおきい かず', '10といくつ', '20までの かず マスター'],
    [CATEGORIES.COUNT_100]: ['10のまとまり', '大きな かずを よもう', '100までの かず マスター'],
    [CATEGORIES.ADD_1]: ['たしざんの きほん', 'いろいろな たしざん', 'たしざん マスター'],
    [CATEGORIES.ADD_CARRY]: ['10をつくろう', 'くりあがりを マスター', 'スピード けいさん'],
    [CATEGORIES.SUB_1]: ['ひきざんの きほん', 'いろいろな ひきざん', 'ひきざん マスター'],
    [CATEGORIES.SUB_BORROW]: ['10から ひこう', 'くりさがりを マスター', 'スピード けいさん'],
    [CATEGORIES.COMPARE_NUM]: ['おおきいのは どっち？', 'ならべて くらべよう', 'くらべっこ マスター'],
    [CATEGORIES.CLOCK_READ]: ['なんじかな？', 'なんじはんかな？', 'とけい マスター'],
    [CATEGORIES.SHAPES_BASIC]: ['かたちを みつけよう', 'かたちの なまえ', 'かたち マスター'],

    [CATEGORIES.ADD_2DIGIT]: ['2けたの たしざん', '大きな かずの たしざん', 'たしざん マスター'],
    [CATEGORIES.SUB_2DIGIT]: ['2けたの ひきざん', '大きな かずの ひきざん', 'ひきざん マスター'],
    [CATEGORIES.HISSAN_ADD]: ['ひっ算の きほん', 'くりあがりの ひっ算', 'ひっ算 マスター'],
    [CATEGORIES.HISSAN_SUB]: ['ひっ算の きほん', 'くりさがりの ひっ算', 'ひっ算 マスター'],
    [CATEGORIES.MULT_KUKU]: ['九九を おぼえよう', '九九の れんしゅう', '九九 マスター'],
    [CATEGORIES.LENGTH]: ['cmと mmを しろう', 'ながさを はかろう', 'ながさ マスター'],
    [CATEGORIES.CLOCK_CALC]: ['時間と 分', '何時間後？', '時間 マスター'],
    [CATEGORIES.TRIANGLE_SQUARE]: ['三角形と 四角形', '辺と 角', '図形 マスター'],
    [CATEGORIES.BOX_SHAPE]: ['はこの かたち', '面と 辺', 'はこ マスター'],

    [CATEGORIES.LARGE_NUM]: ['万の くらい', '大きな 数を 読もう', '大きな数 マスター'],
    [CATEGORIES.HISSAN_ADD_3]: ['3けたの ひっ算', 'くりあがりに ちゅうい', 'ひっ算 マスター'],
    [CATEGORIES.HISSAN_SUB_3]: ['3けたの ひっ算', 'くりさがりに ちゅうい', 'ひっ算 マスター'],
    [CATEGORIES.MULT_2DIGIT]: ['2けた×1けた', 'かけ算の ひっ算', 'かけ算 マスター'],
    [CATEGORIES.HISSAN_MULT]: ['かけ算 ひっ算の 基本', '大きな かけ算', 'ひっ算 マスター'],
    [CATEGORIES.DIVISION]: ['わり算の きほん', 'わり算の れんしゅう', 'わり算 マスター'],
    [CATEGORIES.REMAINDER]: ['あまりって なに？', 'あまりの けいさん', 'あまり マスター'],
    [CATEGORIES.FRACTION_INTRO]: ['分数って なに？', '分数を くらべよう', '分数 マスター'],
    [CATEGORIES.DECIMAL_INTRO]: ['小数って なに？', '小数を くらべよう', '小数 マスター'],
    [CATEGORIES.CIRCLE]: ['円の 部分の なまえ', '半径と 直径', '円 マスター'],
    [CATEGORIES.TIME_CALC]: ['時刻と 時間', '時間の けいさん', '時間 マスター'],
    [CATEGORIES.WEIGHT]: ['gと kgを しろう', '重さを はかろう', '重さ マスター'],

    [CATEGORIES.BILLION]: ['億と 兆', '大きな 数を 書こう', '大きな数 マスター'],
    [CATEGORIES.HISSAN_DIV]: ['わり算の ひっ算', '2けた÷1けた', 'ひっ算 マスター'],
    [CATEGORIES.MULT_2X2]: ['2けた×2けた', 'ひっ算で けいさん', 'かけ算 マスター'],
    [CATEGORIES.DECIMAL_ADD]: ['小数の たし算', '小数の ひき算', '小数 マスター'],
    [CATEGORIES.ANGLE]: ['角度って なに？', '三角形の 角', '角度 マスター'],
    [CATEGORIES.PERPENDICULAR]: ['垂直と 平行', '図形を かこう', '垂直平行 マスター'],
    [CATEGORIES.AREA_RECT]: ['面積って なに？', '長方形の 面積', '面積 マスター'],
    [CATEGORIES.MIXED_CALC]: ['けいさんの じゅんじょ', 'カッコを つかおう', '四則 マスター'],
    [CATEGORIES.APPROX]: ['四捨五入', '概数で けいさん', '概数 マスター'],

    [CATEGORIES.DECIMAL_MULT]: ['小数×整数', '小数×小数', 'かけ算 マスター'],
    [CATEGORIES.DECIMAL_DIV]: ['小数÷整数', 'わり進み', 'わり算 マスター'],
    [CATEGORIES.FRACTION_SAME]: ['同分母の たし算', '同分母の ひき算', '分数 マスター'],
    [CATEGORIES.FRACTION_DIFF]: ['通分しよう', '異分母の けいさん', '通分 マスター'],
    [CATEGORIES.AVERAGE]: ['平均って なに？', '平均を 求めよう', '平均 マスター'],
    [CATEGORIES.PERCENTAGE]: ['割合って なに？', '百分率', '割合 マスター'],
    [CATEGORIES.AREA_TRI]: ['三角形の 面積', '四角形の 面積', '面積 マスター'],
    [CATEGORIES.VOLUME]: ['体積って なに？', '直方体の 体積', '体積 マスター'],
    [CATEGORIES.PRISM]: ['角柱と 円柱', '展開図', '立体 マスター'],
    [CATEGORIES.UNIT_AMOUNT]: ['単位量あたり', 'くらべ方', '単位量 マスター'],
    [CATEGORIES.RATIO_BASIC]: ['比って なに？', '比を つかおう', '比 マスター'],

    [CATEGORIES.FRACTION_MULT]: ['分数×整数', '分数×分数', 'かけ算 マスター'],
    [CATEGORIES.FRACTION_DIV]: ['分数÷整数', '分数÷分数', 'わり算 マスター'],
    [CATEGORIES.RATIO]: ['比の 値', '等しい 比', '比 マスター'],
    [CATEGORIES.PROPORTION]: ['比例', '反比例', '比例 マスター'],
    [CATEGORIES.CIRCLE_AREA]: ['円周の 長さ', '円の 面積', '円 マスター'],
    [CATEGORIES.SYMMETRY]: ['線対称', '点対称', '対称 マスター'],
    [CATEGORIES.SPEED]: ['速さって なに？', '道のりと 時間', '速さ マスター'],
    [CATEGORIES.CONCENTRATION]: ['濃度って なに？', '食塩水の 問題', '濃度 マスター'],
    [CATEGORIES.WORD_BASIC]: ['文章を 読もう', '式を たてよう', '文章題 マスター'],
    [CATEGORIES.WORD_ADV]: ['和差算', '割合の 文章題', '応用 マスター'],
    [CATEGORIES.DATA]: ['データの 整理', '平均・中央値', 'データ マスター']
};

// レベル名
function getLevelName(level) {
    switch (level) {
        case 1: return 'しょきゅう';
        case 2: return 'ちゅうきゅう';
        case 3: return 'じょうきゅう';
        default: return '';
    }
}

// 敵のステータス計算
function calculateEnemyStats(grade, stageNumber) {
    const baseHp = 20 + (grade - 1) * 15 + stageNumber * 5;
    const baseAttack = 5 + (grade - 1) * 3 + stageNumber * 2;
    return { hp: baseHp, attack: baseAttack };
}

// 報酬計算（バランス調整済み）
// 小1: 約10回初回クリアでガチャ1回
// 小4: 約2回初回クリアでガチャ1回
function calculateBaseReward(grade, level) {
    return grade * 3 * level;
}

// 学年コイン報酬計算
// 学年が高いほど多くもらえる
function calculateGradeCoinReward(grade, level) {
    return grade * level * 2;
}

/**
 * 全ステージデータを生成
 */
export function generateAllStages() {
    const stages = {};

    for (const grade of Object.values(GRADES)) {
        stages[grade] = {};
        const categories = GRADE_CATEGORIES[grade];

        for (const category of categories) {
            stages[grade][category] = [];
            const descriptions = STAGE_DESCRIPTIONS[category] || ['きほん', 'れんしゅう', 'マスター'];
            const enemyName = CATEGORY_ENEMY_NAMES[category] || 'モンスター';
            const enemyTypes = CATEGORY_ENEMY_TYPES[category] || [TYPES.NORMAL];

            for (let level = 1; level <= 3; level++) {
                const enemyStats = calculateEnemyStats(grade, level);
                const baseReward = calculateBaseReward(grade, level);
                const gradeReward = calculateGradeCoinReward(grade, level);

                stages[grade][category].push({
                    id: `${grade}-${category}-${level}`,
                    grade: grade,
                    category: category,
                    level: level,
                    name: `${CATEGORY_NAMES[category]} ${getLevelName(level)}`,
                    description: descriptions[level - 1],
                    questionCount: 4 + level, // 5, 6, 7問
                    enemy: {
                        name: ['プチ', '', 'キング'][level - 1] + enemyName,
                        types: enemyTypes,
                        hp: enemyStats.hp,
                        attack: enemyStats.attack
                    },
                    rewards: {
                        base: baseReward,
                        firstClear: Math.floor(baseReward * 2.5),
                        rankBonus: {
                            [RANKS.C]: 0,
                            [RANKS.B]: Math.floor(baseReward * 0.2),
                            [RANKS.A]: Math.floor(baseReward * 0.5),
                            [RANKS.S]: Math.floor(baseReward * 1.0)
                        },
                        // 学年コイン報酬
                        gradeBase: gradeReward,
                        gradeFirstClear: Math.floor(gradeReward * 2),
                        gradeRankBonus: {
                            [RANKS.C]: 0,
                            [RANKS.B]: Math.floor(gradeReward * 0.2),
                            [RANKS.A]: Math.floor(gradeReward * 0.5),
                            [RANKS.S]: Math.floor(gradeReward * 1.0)
                        }
                    },
                    requirements: {
                        prevStage: level > 1 ? `${grade}-${category}-${level - 1}` : null
                    }
                });
            }
        }
    }

    return stages;
}

/**
 * ランクを計算
 */
export function calculateRank(clearTime, correctRate, questionCount) {
    const targetTime = questionCount * 10;

    if (correctRate < 0.6) {
        return RANKS.NONE;
    }

    const timeScore = Math.max(0, 100 - (clearTime - targetTime) * 2);
    const accuracyScore = correctRate * 100;
    const totalScore = (timeScore + accuracyScore) / 2;

    if (totalScore >= 95 && correctRate === 1) {
        return RANKS.S;
    } else if (totalScore >= 80) {
        return RANKS.A;
    } else if (totalScore >= 65) {
        return RANKS.B;
    } else {
        return RANKS.C;
    }
}

/**
 * ステージクリア報酬を計算
 */
export function calculateRewards(stage, rank, isFirstClear) {
    let coins = stage.rewards.base;
    let gradeCoins = stage.rewards.gradeBase || 0;

    if (isFirstClear) {
        coins += stage.rewards.firstClear;
        gradeCoins += stage.rewards.gradeFirstClear || 0;
    }

    coins += stage.rewards.rankBonus[rank] || 0;
    gradeCoins += (stage.rewards.gradeRankBonus && stage.rewards.gradeRankBonus[rank]) || 0;

    return {
        coins,
        gradeCoins,
        grade: stage.grade,
        isFirstClear,
        rank
    };
}

// 全ステージデータをエクスポート
export const STAGES = generateAllStages();

// ステージを取得
export function getStage(grade, category, level) {
    return STAGES[grade]?.[category]?.[level - 1];
}

// 学年の全ステージを取得
export function getGradeStages(grade) {
    return STAGES[grade] || {};
}

// ステージがアンロックされているかチェック
export function isStageUnlocked(stageId, clearedStages) {
    const [grade, category, level] = stageId.split('-');
    const stage = getStage(parseInt(grade), category, parseInt(level));

    if (!stage) return false;
    if (!stage.requirements.prevStage) return true;

    return clearedStages.includes(stage.requirements.prevStage);
}
