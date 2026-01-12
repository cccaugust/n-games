/**
 * ステージデータ
 * 学年・分野ごとにステージを構成
 */

import { GRADES, CATEGORIES, CATEGORY_NAMES, GRADE_CATEGORIES } from './questions.js';
import { TYPES, TYPE_NAMES } from './monsters.js';

// ステージの敵モンスタータイプ（分野に対応）
const CATEGORY_ENEMY_TYPES = {
    [CATEGORIES.ADDITION]: [TYPES.NORMAL],
    [CATEGORIES.SUBTRACTION]: [TYPES.NORMAL],
    [CATEGORIES.MULTIPLICATION]: [TYPES.FIRE],
    [CATEGORIES.DIVISION]: [TYPES.WATER],
    [CATEGORIES.MIXED]: [TYPES.ELECTRIC],
    [CATEGORIES.FRACTION]: [TYPES.PSYCHIC],
    [CATEGORIES.DECIMAL]: [TYPES.GRASS],
    [CATEGORIES.PERCENTAGE]: [TYPES.STEEL],
    [CATEGORIES.GEOMETRY]: [TYPES.DRAGON],
    [CATEGORIES.UNITS]: [TYPES.GHOST],
    [CATEGORIES.TIME]: [TYPES.FAIRY],
    [CATEGORIES.WORD_PROBLEM]: [TYPES.FIGHTING]
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

/**
 * ステージの基本報酬を計算
 * 高学年ほど報酬が多い
 */
function calculateBaseReward(grade, category) {
    const gradeMultiplier = grade * 10; // 1年=10, 6年=60
    const categoryBonus = {
        [CATEGORIES.ADDITION]: 0,
        [CATEGORIES.SUBTRACTION]: 0,
        [CATEGORIES.MULTIPLICATION]: 5,
        [CATEGORIES.DIVISION]: 5,
        [CATEGORIES.MIXED]: 15,
        [CATEGORIES.FRACTION]: 20,
        [CATEGORIES.DECIMAL]: 15,
        [CATEGORIES.PERCENTAGE]: 25,
        [CATEGORIES.GEOMETRY]: 20,
        [CATEGORIES.UNITS]: 10,
        [CATEGORIES.TIME]: 10,
        [CATEGORIES.WORD_PROBLEM]: 30
    };
    return gradeMultiplier + (categoryBonus[category] || 0);
}

/**
 * ステージ敵のHP・攻撃力を計算
 */
function calculateEnemyStats(grade, stageNumber) {
    const baseHp = 20 + (grade - 1) * 15 + stageNumber * 5;
    const baseAttack = 5 + (grade - 1) * 3 + stageNumber * 2;
    return {
        hp: baseHp,
        attack: baseAttack
    };
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
            // 各分野に3つのステージ（初級・中級・上級）
            stages[grade][category] = [];

            for (let level = 1; level <= 3; level++) {
                const enemyStats = calculateEnemyStats(grade, level);
                const baseReward = calculateBaseReward(grade, category);

                stages[grade][category].push({
                    id: `${grade}-${category}-${level}`,
                    grade: grade,
                    category: category,
                    level: level,
                    name: `${CATEGORY_NAMES[category]} ${getLevelName(level)}`,
                    description: getStageDescription(category, level),
                    questionCount: 3 + level * 2, // 5, 7, 9問
                    enemy: {
                        name: getEnemyName(category, level),
                        types: CATEGORY_ENEMY_TYPES[category] || [TYPES.NORMAL],
                        hp: enemyStats.hp,
                        attack: enemyStats.attack
                    },
                    rewards: {
                        base: baseReward * level,
                        firstClear: baseReward * level * 3, // 初回クリアは3倍
                        rankBonus: {
                            [RANKS.C]: 0,
                            [RANKS.B]: Math.floor(baseReward * level * 0.2),
                            [RANKS.A]: Math.floor(baseReward * level * 0.5),
                            [RANKS.S]: Math.floor(baseReward * level * 1.0)
                        }
                    },
                    requirements: {
                        // 初級は解放済み、中級以降は前のステージクリアが必要
                        prevStage: level > 1 ? `${grade}-${category}-${level - 1}` : null
                    }
                });
            }
        }
    }

    return stages;
}

// レベル名
function getLevelName(level) {
    switch (level) {
        case 1: return 'しょきゅう';
        case 2: return 'ちゅうきゅう';
        case 3: return 'じょうきゅう';
        default: return '';
    }
}

// ステージ説明
function getStageDescription(category, level) {
    const descriptions = {
        [CATEGORIES.ADDITION]: ['たしざんのきほん', 'もっとたしざん', 'たしざんマスター'],
        [CATEGORIES.SUBTRACTION]: ['ひきざんのきほん', 'もっとひきざん', 'ひきざんマスター'],
        [CATEGORIES.MULTIPLICATION]: ['九九をおぼえよう', '大きな数のかけ算', 'かけ算マスター'],
        [CATEGORIES.DIVISION]: ['わり算のきほん', 'わり切れるかな？', 'わり算マスター'],
        [CATEGORIES.MIXED]: ['たし算とかけ算', 'カッコを使おう', '四則マスター'],
        [CATEGORIES.FRACTION]: ['分数のきほん', '分数のたし算', '分数マスター'],
        [CATEGORIES.DECIMAL]: ['小数のきほん', '小数の計算', '小数マスター'],
        [CATEGORIES.PERCENTAGE]: ['割合のきほん', '百分率を使おう', '割合マスター'],
        [CATEGORIES.GEOMETRY]: ['かたちをしろう', '面積を求めよう', '図形マスター'],
        [CATEGORIES.UNITS]: ['たんいをしろう', 'たんいの変換', 'たんいマスター'],
        [CATEGORIES.TIME]: ['とけいをよもう', '時間の計算', '時間マスター'],
        [CATEGORIES.WORD_PROBLEM]: ['もんだいをよもう', 'むずかしい問題', '文章題マスター']
    };
    return descriptions[category]?.[level - 1] || '';
}

// 敵の名前
function getEnemyName(category, level) {
    const prefixes = ['プチ', '', 'キング'];
    const names = {
        [CATEGORIES.ADDITION]: 'タスン',
        [CATEGORIES.SUBTRACTION]: 'ヒクン',
        [CATEGORIES.MULTIPLICATION]: 'カケルン',
        [CATEGORIES.DIVISION]: 'ワルン',
        [CATEGORIES.MIXED]: 'シソクン',
        [CATEGORIES.FRACTION]: 'ブンスウン',
        [CATEGORIES.DECIMAL]: 'ショウスウン',
        [CATEGORIES.PERCENTAGE]: 'ワリアイン',
        [CATEGORIES.GEOMETRY]: 'ズケイン',
        [CATEGORIES.UNITS]: 'タンイン',
        [CATEGORIES.TIME]: 'ジカン',
        [CATEGORIES.WORD_PROBLEM]: 'モンダイン'
    };
    return prefixes[level - 1] + (names[category] || 'モンスター');
}

/**
 * ランクを計算
 * @param {number} clearTime - クリア時間（秒）
 * @param {number} correctRate - 正答率（0-1）
 * @param {number} questionCount - 問題数
 */
export function calculateRank(clearTime, correctRate, questionCount) {
    // 目標時間: 1問あたり10秒
    const targetTime = questionCount * 10;

    if (correctRate < 0.6) {
        return RANKS.NONE; // クリア失敗
    }

    // スコア計算
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

    // 初回クリアボーナス
    if (isFirstClear) {
        coins += stage.rewards.firstClear;
    }

    // ランクボーナス
    coins += stage.rewards.rankBonus[rank] || 0;

    return {
        coins,
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
