/**
 * 挑戦ステージ - ダンジョン形式の算数チャレンジ
 * 「数学の王者」風の段階的な問題
 */

// ユーティリティ関数
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ダンジョン定義
export const DUNGEONS = {
    ADDITION: 'addition',
    SUBTRACTION: 'subtraction',
    MULTIPLICATION: 'multiplication',
    DIVISION: 'division'
};

export const DUNGEON_NAMES = {
    [DUNGEONS.ADDITION]: '足し算ダンジョン',
    [DUNGEONS.SUBTRACTION]: '引き算ダンジョン',
    [DUNGEONS.MULTIPLICATION]: '掛け算ダンジョン',
    [DUNGEONS.DIVISION]: '割り算ダンジョン'
};

export const DUNGEON_ICONS = {
    [DUNGEONS.ADDITION]: '➕',
    [DUNGEONS.SUBTRACTION]: '➖',
    [DUNGEONS.MULTIPLICATION]: '✖️',
    [DUNGEONS.DIVISION]: '➗'
};

export const MAX_FLOOR = 9;
export const QUESTIONS_PER_FLOOR = 10;
export const QUESTIONS_FOR_MIXED_FLOOR = 16; // 9F（混合）は16問

// 階層ごとの問題タイプ（足し算の場合）
export const FLOOR_TYPES = {
    1: 'basic',           // ①2＋3（答えは四択から選ぶ）
    2: 'find_missing',    // ②4＋？＝6（答えは四択から選ぶ）
    3: 'reverse',         // ③11（答えとして「2＋9」など四択ででる）
    4: 'find_min',        // ④最小は？（答えとして「2＋9」など四択ででる）
    5: 'triple',          // ⑤2＋3＋2（答えは四択から選ぶ）
    6: 'large',           // ⑥87＋11（答えは四択から選ぶ。1の位だけで特定できない）
    7: 'find_max',        // ⑦最大は？（答えとして「2＋9」など四択ででる）
    8: 'equivalent',      // ⑧10+3（答えとして「9+4」などが四択で出る）
    9: 'mixed'            // ⑨①～⑧の混合
};

export const FLOOR_DESCRIPTIONS = {
    1: 'きほんの けいさん',
    2: '□を みつけよう',
    3: 'しきを つくろう',
    4: 'いちばん ちいさいのは？',
    5: '3つの かず',
    6: 'おおきな かず',
    7: 'いちばん おおきいのは？',
    8: 'おなじ こたえ',
    9: 'なんでも チャレンジ'
};

// ポイントシステム
export const POINT_CONFIG = {
    // 初期ポイント（階層 × ダンジョン難易度）
    getInitialPoints: (floor, dungeon) => {
        const basePoints = 1000;
        const floorBonus = floor * 100;
        const dungeonMultiplier = {
            [DUNGEONS.ADDITION]: 1.0,
            [DUNGEONS.SUBTRACTION]: 1.1,
            [DUNGEONS.MULTIPLICATION]: 1.2,
            [DUNGEONS.DIVISION]: 1.3
        };
        return Math.floor((basePoints + floorBonus) * (dungeonMultiplier[dungeon] || 1.0));
    },
    // 時間経過によるポイント減少（1秒あたり）
    getTimeDecay: (floor) => {
        return 2 + floor; // 階層が上がるほど厳しく
    },
    // 不正解時のペナルティ
    getMissPenalty: (floor) => {
        return 50 + floor * 10;
    }
};

// 報酬計算
export const REWARD_CONFIG = {
    // 通常コイン報酬
    getCoins: (floor, points, maxPoints) => {
        const ratio = points / maxPoints;
        const baseReward = floor * 5;
        return Math.floor(baseReward * ratio);
    },
    // 学年コイン報酬（高い階層でより多く）
    getGradeCoins: (floor, points, maxPoints) => {
        if (floor < 3) return { grade: 1, amount: 0 };
        const ratio = points / maxPoints;
        const grade = Math.min(6, Math.ceil(floor / 2));
        const baseReward = Math.floor(floor / 2);
        return {
            grade,
            amount: Math.floor(baseReward * ratio)
        };
    }
};

/**
 * 足し算の問題を生成
 */
function generateAdditionQuestion(floorType) {
    switch (floorType) {
        case 'basic': {
            // ①2＋3（答えは四択から選ぶ）
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            const answer = a + b;
            const choices = generateNumericChoices(answer, 2, 18);
            return {
                question: `${a} + ${b} = ?`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'find_missing': {
            // ②4＋？＝6（答えは四択から選ぶ）
            const answer = randInt(1, 9);
            const total = randInt(answer + 1, answer + 9);
            const known = total - answer;
            const choices = generateNumericChoices(answer, 1, 9);
            return {
                question: `${known} + ? = ${total}`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'reverse': {
            // ③11（答えとして「2＋9」など四択ででる）
            const target = randInt(5, 15);
            const a = randInt(1, target - 1);
            const b = target - a;
            const correctExpr = `${a} + ${b}`;

            // 不正解の式を生成
            const wrongExprs = [];
            while (wrongExprs.length < 3) {
                const wa = randInt(1, 9);
                const wb = randInt(1, 9);
                const wrongSum = wa + wb;
                const expr = `${wa} + ${wb}`;
                if (wrongSum !== target && !wrongExprs.includes(expr)) {
                    wrongExprs.push(expr);
                }
            }

            return {
                question: `${target} になる しきは？`,
                answer: correctExpr,
                choices: shuffleArray([correctExpr, ...wrongExprs]),
                type: 'expression'
            };
        }

        case 'find_min': {
            // ④最小は？（答えとして「2＋9」など四択ででる）
            const expressions = [];
            const sums = new Set();

            while (expressions.length < 4) {
                const a = randInt(1, 9);
                const b = randInt(1, 9);
                const sum = a + b;
                const expr = `${a} + ${b}`;
                if (!sums.has(sum)) {
                    sums.add(sum);
                    expressions.push({ expr, sum });
                }
            }

            expressions.sort((x, y) => x.sum - y.sum);
            const minExpr = expressions[0].expr;

            return {
                question: 'いちばん ちいさいのは？',
                answer: minExpr,
                choices: shuffleArray(expressions.map(e => e.expr)),
                type: 'expression'
            };
        }

        case 'triple': {
            // ⑤2＋3＋2（答えは四択から選ぶ）
            const a = randInt(1, 6);
            const b = randInt(1, 6);
            const c = randInt(1, 6);
            const answer = a + b + c;
            const choices = generateNumericChoices(answer, 3, 18);
            return {
                question: `${a} + ${b} + ${c} = ?`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'large': {
            // ⑥87＋11（答えは四択から選ぶ。1の位だけで特定できない）
            const a = randInt(20, 89);
            const b = randInt(10, 30);
            const answer = a + b;

            // 1の位が同じになる不正解を含める
            const onesDigit = answer % 10;
            const wrongAnswers = [];

            // 10の位が違うが1の位が同じものを追加
            const wrongWithSameOnes = answer + 10;
            if (wrongWithSameOnes !== answer && wrongWithSameOnes < 130) {
                wrongAnswers.push(wrongWithSameOnes);
            }
            const wrongWithSameOnes2 = answer - 10;
            if (wrongWithSameOnes2 !== answer && wrongWithSameOnes2 > 20) {
                wrongAnswers.push(wrongWithSameOnes2);
            }

            // 1の位が違うものも追加
            while (wrongAnswers.length < 3) {
                const wrong = answer + randInt(-15, 15);
                if (wrong !== answer && wrong > 20 && wrong < 130 && !wrongAnswers.includes(wrong)) {
                    wrongAnswers.push(wrong);
                }
            }

            return {
                question: `${a} + ${b} = ?`,
                answer,
                choices: shuffleArray([answer, ...wrongAnswers.slice(0, 3)]),
                type: 'numeric'
            };
        }

        case 'find_max': {
            // ⑦最大は？（答えとして「2＋9」など四択ででる）
            const expressions = [];
            const sums = new Set();

            while (expressions.length < 4) {
                const a = randInt(1, 9);
                const b = randInt(1, 9);
                const sum = a + b;
                const expr = `${a} + ${b}`;
                if (!sums.has(sum)) {
                    sums.add(sum);
                    expressions.push({ expr, sum });
                }
            }

            expressions.sort((x, y) => y.sum - x.sum);
            const maxExpr = expressions[0].expr;

            return {
                question: 'いちばん おおきいのは？',
                answer: maxExpr,
                choices: shuffleArray(expressions.map(e => e.expr)),
                type: 'expression'
            };
        }

        case 'equivalent': {
            // ⑧10+3（答えとして「9+4」などが四択で出る）
            const target = randInt(8, 16);
            const a = randInt(1, target - 1);
            const b = target - a;
            const questionExpr = `${a} + ${b}`;

            // 同じ答えになる別の式
            let ca, cb;
            do {
                ca = randInt(1, target - 1);
                cb = target - ca;
            } while (ca === a && cb === b);
            const correctExpr = `${ca} + ${cb}`;

            // 違う答えになる式
            const wrongExprs = [];
            while (wrongExprs.length < 3) {
                const wa = randInt(1, 9);
                const wb = randInt(1, 9);
                const wrongSum = wa + wb;
                const expr = `${wa} + ${wb}`;
                if (wrongSum !== target && !wrongExprs.includes(expr)) {
                    wrongExprs.push(expr);
                }
            }

            return {
                question: `${questionExpr} と おなじ こたえは？`,
                answer: correctExpr,
                choices: shuffleArray([correctExpr, ...wrongExprs]),
                type: 'expression'
            };
        }

        case 'mixed':
        default: {
            // ⑨①～⑧の混合
            const types = ['basic', 'find_missing', 'reverse', 'find_min', 'triple', 'large', 'find_max', 'equivalent'];
            const randomType = types[randInt(0, types.length - 1)];
            return generateAdditionQuestion(randomType);
        }
    }
}

/**
 * 数値選択肢を生成
 */
function generateNumericChoices(answer, min, max, count = 4) {
    const choices = new Set([answer]);
    let attempts = 0;

    while (choices.size < count && attempts < 100) {
        attempts++;
        const offset = randInt(-5, 5);
        if (offset === 0) continue;
        let wrong = answer + offset;
        if (wrong < min) wrong = randInt(min, Math.min(min + 10, max));
        if (wrong > max) wrong = randInt(Math.max(min, max - 10), max);
        if (wrong !== answer && wrong >= min && wrong <= max) {
            choices.add(wrong);
        }
    }

    while (choices.size < count) {
        const wrong = randInt(min, max);
        if (wrong !== answer) choices.add(wrong);
    }

    return shuffleArray([...choices]);
}

/**
 * 挑戦ステージの問題を生成
 */
export function generateChallengeQuestions(dungeon, floor) {
    const questions = [];
    const floorType = FLOOR_TYPES[floor] || 'mixed';
    // 9F（混合）は16問、それ以外は10問
    const questionCount = floor === 9 ? QUESTIONS_FOR_MIXED_FLOOR : QUESTIONS_PER_FLOOR;

    for (let i = 0; i < questionCount; i++) {
        let question;

        switch (dungeon) {
            case DUNGEONS.ADDITION:
                question = generateAdditionQuestion(floorType);
                break;
            case DUNGEONS.SUBTRACTION:
                // 準備中 - とりあえず基本問題
                question = generateSubtractionQuestion(floorType);
                break;
            case DUNGEONS.MULTIPLICATION:
                // 準備中 - とりあえず基本問題
                question = generateMultiplicationQuestion(floorType);
                break;
            case DUNGEONS.DIVISION:
                // 準備中 - とりあえず基本問題
                question = generateDivisionQuestion(floorType);
                break;
            default:
                question = generateAdditionQuestion(floorType);
        }

        questions.push(question);
    }

    return questions;
}

/**
 * 引き算の問題を生成
 */
function generateSubtractionQuestion(floorType) {
    switch (floorType) {
        case 'basic': {
            // ①8-1など（答えは四択から選ぶ）
            const a = randInt(2, 10);
            const b = randInt(1, a - 1);
            const answer = a - b;
            const choices = generateNumericChoices(answer, 1, 9);
            return {
                question: `${a} - ${b} = ?`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'find_missing': {
            // ②4-？=1 など（答えは四択から選ぶ）
            const answer = randInt(1, 8);
            const result = randInt(1, 9 - answer);
            const total = answer + result;
            const choices = generateNumericChoices(answer, 1, 9);
            return {
                question: `${total} - ? = ${result}`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'reverse': {
            // ③1（答えとして「7-6」など四択ででる）
            const target = randInt(1, 5);
            const a = randInt(target + 1, target + 8);
            const b = a - target;
            const correctExpr = `${a} - ${b}`;

            // 不正解の式を生成
            const wrongExprs = [];
            while (wrongExprs.length < 3) {
                const wa = randInt(2, 15);
                const wb = randInt(1, wa - 1);
                const wrongResult = wa - wb;
                const expr = `${wa} - ${wb}`;
                if (wrongResult !== target && !wrongExprs.includes(expr)) {
                    wrongExprs.push(expr);
                }
            }

            return {
                question: `${target} になる しきは？`,
                answer: correctExpr,
                choices: shuffleArray([correctExpr, ...wrongExprs]),
                type: 'expression'
            };
        }

        case 'find_min': {
            // ④最小は？（答えとして「8-1」など四択ででる）
            const expressions = [];
            const results = new Set();

            while (expressions.length < 4) {
                const a = randInt(3, 15);
                const b = randInt(1, a - 1);
                const result = a - b;
                const expr = `${a} - ${b}`;
                if (!results.has(result)) {
                    results.add(result);
                    expressions.push({ expr, result });
                }
            }

            expressions.sort((x, y) => x.result - y.result);
            const minExpr = expressions[0].expr;

            return {
                question: 'いちばん ちいさいのは？',
                answer: minExpr,
                choices: shuffleArray(expressions.map(e => e.expr)),
                type: 'expression'
            };
        }

        case 'triple': {
            // ⑤-1+9-6（符号混合の計算、答えは四択から選ぶ）
            // 結果が正の整数になるように調整
            let a, b, c, answer;
            do {
                a = randInt(-5, 5);
                b = randInt(1, 9);
                c = randInt(1, 8);
                answer = a + b - c;
            } while (answer < 0 || answer > 10);

            // 式の表示を調整（最初が負の場合も自然に表示）
            let questionText;
            if (a >= 0) {
                questionText = `${a} + ${b} - ${c} = ?`;
            } else {
                questionText = `${a} + ${b} - ${c} = ?`;
            }

            const choices = generateNumericChoices(answer, 0, 10);
            return {
                question: questionText,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'large': {
            // ⑥93-28（大きな数の引き算、答えは四択から選ぶ）
            const a = randInt(50, 99);
            const b = randInt(10, a - 10);
            const answer = a - b;

            // 1の位が同じになる不正解を含める
            const wrongAnswers = [];

            // 10の位が違うが1の位が同じものを追加
            const wrongWithSameOnes = answer + 10;
            if (wrongWithSameOnes !== answer && wrongWithSameOnes < 100) {
                wrongAnswers.push(wrongWithSameOnes);
            }
            const wrongWithSameOnes2 = answer - 10;
            if (wrongWithSameOnes2 !== answer && wrongWithSameOnes2 > 0) {
                wrongAnswers.push(wrongWithSameOnes2);
            }

            // 追加の不正解
            while (wrongAnswers.length < 3) {
                const wrong = answer + randInt(-15, 15);
                if (wrong !== answer && wrong > 0 && wrong < 100 && !wrongAnswers.includes(wrong)) {
                    wrongAnswers.push(wrong);
                }
            }

            return {
                question: `${a} - ${b} = ?`,
                answer,
                choices: shuffleArray([answer, ...wrongAnswers.slice(0, 3)]),
                type: 'numeric'
            };
        }

        case 'find_max': {
            // ⑦最大は？（答えとして「19-6」など四択ででる）
            const expressions = [];
            const results = new Set();

            while (expressions.length < 4) {
                const a = randInt(10, 20);
                const b = randInt(1, a - 1);
                const result = a - b;
                const expr = `${a} - ${b}`;
                if (!results.has(result)) {
                    results.add(result);
                    expressions.push({ expr, result });
                }
            }

            expressions.sort((x, y) => y.result - x.result);
            const maxExpr = expressions[0].expr;

            return {
                question: 'いちばん おおきいのは？',
                answer: maxExpr,
                choices: shuffleArray(expressions.map(e => e.expr)),
                type: 'expression'
            };
        }

        case 'equivalent': {
            // ⑧7-5（答えとして「11-9」などが四択で出る）
            const target = randInt(1, 8);
            const a = randInt(target + 1, target + 5);
            const b = a - target;
            const questionExpr = `${a} - ${b}`;

            // 同じ答えになる別の式
            let ca, cb;
            do {
                ca = randInt(target + 1, target + 10);
                cb = ca - target;
            } while (ca === a && cb === b);
            const correctExpr = `${ca} - ${cb}`;

            // 違う答えになる式
            const wrongExprs = [];
            while (wrongExprs.length < 3) {
                const wa = randInt(3, 15);
                const wb = randInt(1, wa - 1);
                const wrongResult = wa - wb;
                const expr = `${wa} - ${wb}`;
                if (wrongResult !== target && !wrongExprs.includes(expr)) {
                    wrongExprs.push(expr);
                }
            }

            return {
                question: `${questionExpr} と おなじ こたえは？`,
                answer: correctExpr,
                choices: shuffleArray([correctExpr, ...wrongExprs]),
                type: 'expression'
            };
        }

        case 'mixed':
        default: {
            // ⑨①～⑧の混合
            const types = ['basic', 'find_missing', 'reverse', 'find_min', 'triple', 'large', 'find_max', 'equivalent'];
            const randomType = types[randInt(0, types.length - 1)];
            return generateSubtractionQuestion(randomType);
        }
    }
}

/**
 * 掛け算の問題を生成
 */
function generateMultiplicationQuestion(floorType) {
    switch (floorType) {
        case 'basic': {
            // ①3×7、0×10など（1〜10までの数字の掛け算、4択）
            const a = randInt(0, 10);
            const b = randInt(0, 10);
            const answer = a * b;
            const choices = generateNumericChoices(answer, 0, 100);
            return {
                question: `${a} × ${b} = ?`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'find_missing': {
            // ②?×8=64（穴埋め、4択）
            const answer = randInt(1, 10);
            const b = randInt(1, 10);
            const product = answer * b;
            const choices = generateNumericChoices(answer, 0, 10);
            return {
                question: `? × ${b} = ${product}`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'reverse': {
            // ③24（答えとして「3×8」など四択ででる）
            // 計算しやすい積を選ぶ
            const products = [6, 8, 10, 12, 15, 16, 18, 20, 24, 30, 36, 40, 42, 48, 56, 63, 72];
            const target = products[randInt(0, products.length - 1)];

            // 積がtargetになる組み合わせを探す
            let a, b;
            const pairs = [];
            for (let i = 1; i <= 10; i++) {
                for (let j = 1; j <= 10; j++) {
                    if (i * j === target) {
                        pairs.push([i, j]);
                    }
                }
            }
            if (pairs.length > 0) {
                [a, b] = pairs[randInt(0, pairs.length - 1)];
            } else {
                a = 3;
                b = 8;
            }
            const correctExpr = `${a} × ${b}`;

            // 不正解の式を生成
            const wrongExprs = [];
            while (wrongExprs.length < 3) {
                const wa = randInt(1, 10);
                const wb = randInt(1, 10);
                const wrongProduct = wa * wb;
                const expr = `${wa} × ${wb}`;
                if (wrongProduct !== target && !wrongExprs.includes(expr)) {
                    wrongExprs.push(expr);
                }
            }

            return {
                question: `${target} になる しきは？`,
                answer: correctExpr,
                choices: shuffleArray([correctExpr, ...wrongExprs]),
                type: 'expression'
            };
        }

        case 'find_min': {
            // ④最小は？（「4×5」など4択）
            const expressions = [];
            const products = new Set();

            while (expressions.length < 4) {
                const a = randInt(1, 10);
                const b = randInt(1, 10);
                const product = a * b;
                const expr = `${a} × ${b}`;
                if (!products.has(product)) {
                    products.add(product);
                    expressions.push({ expr, product });
                }
            }

            expressions.sort((x, y) => x.product - y.product);
            const minExpr = expressions[0].expr;

            return {
                question: 'いちばん ちいさいのは？',
                answer: minExpr,
                choices: shuffleArray(expressions.map(e => e.expr)),
                type: 'expression'
            };
        }

        case 'triple': {
            // ⑤9×(5-3)（かっこ内の足し算引き算の結果は0〜10になるように、4択）
            const multiplier = randInt(1, 9);
            // かっこ内の結果（0〜10）
            const bracketResult = randInt(0, 10);
            // かっこ内の式を生成
            let bracketExpr;
            if (Math.random() < 0.5) {
                // 足し算: a + b = bracketResult
                const a = randInt(0, bracketResult);
                const b = bracketResult - a;
                bracketExpr = `${a} + ${b}`;
            } else {
                // 引き算: a - b = bracketResult
                const b = randInt(0, 9);
                const a = bracketResult + b;
                bracketExpr = `${a} - ${b}`;
            }

            const answer = multiplier * bracketResult;
            const choices = generateNumericChoices(answer, 0, 90);

            return {
                question: `${multiplier} × (${bracketExpr}) = ?`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'large': {
            // ⑥4×6×2（1〜10の三つの掛け算。数字のどれか2個をかけたら1〜10になるように）
            // まず2つかけて1〜10になる組み合わせを作る
            const smallPairs = [
                [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10],
                [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
                [3, 1], [3, 2], [3, 3],
                [4, 1], [4, 2],
                [5, 1], [5, 2],
                [6, 1],
                [7, 1],
                [8, 1],
                [9, 1],
                [10, 1]
            ];
            const [a, b] = smallPairs[randInt(0, smallPairs.length - 1)];
            const c = randInt(2, 10);

            const answer = a * b * c;
            const choices = generateNumericChoices(answer, 1, 100);

            return {
                question: `${a} × ${b} × ${c} = ?`,
                answer,
                choices,
                type: 'numeric'
            };
        }

        case 'find_max': {
            // ⑦最大は？（10×8などが4択に）
            const expressions = [];
            const products = new Set();

            while (expressions.length < 4) {
                const a = randInt(5, 10);
                const b = randInt(5, 10);
                const product = a * b;
                const expr = `${a} × ${b}`;
                if (!products.has(product)) {
                    products.add(product);
                    expressions.push({ expr, product });
                }
            }

            expressions.sort((x, y) => y.product - x.product);
            const maxExpr = expressions[0].expr;

            return {
                question: 'いちばん おおきいのは？',
                answer: maxExpr,
                choices: shuffleArray(expressions.map(e => e.expr)),
                type: 'expression'
            };
        }

        case 'equivalent': {
            // ⑧6×2（「3×4」などが4択で出る）
            // 同じ答えになる掛け算を選ぶ
            const products = [12, 18, 20, 24, 30, 36];
            const target = products[randInt(0, products.length - 1)];

            // 積がtargetになる組み合わせを集める
            const pairs = [];
            for (let i = 1; i <= 10; i++) {
                for (let j = i; j <= 10; j++) {
                    if (i * j === target) {
                        pairs.push([i, j]);
                    }
                }
            }

            if (pairs.length < 2) {
                // フォールバック: 12を使う (2×6, 3×4)
                const [a, b] = [2, 6];
                const [ca, cb] = [3, 4];
                const questionExpr = `${a} × ${b}`;
                const correctExpr = `${ca} × ${cb}`;

                const wrongExprs = [];
                while (wrongExprs.length < 3) {
                    const wa = randInt(1, 10);
                    const wb = randInt(1, 10);
                    const wrongProduct = wa * wb;
                    const expr = `${wa} × ${wb}`;
                    if (wrongProduct !== 12 && !wrongExprs.includes(expr)) {
                        wrongExprs.push(expr);
                    }
                }

                return {
                    question: `${questionExpr} と おなじ こたえは？`,
                    answer: correctExpr,
                    choices: shuffleArray([correctExpr, ...wrongExprs]),
                    type: 'expression'
                };
            }

            // ランダムに2つのペアを選ぶ
            const shuffledPairs = shuffleArray(pairs);
            const [a, b] = shuffledPairs[0];
            const [ca, cb] = shuffledPairs[1];
            const questionExpr = `${a} × ${b}`;
            const correctExpr = `${ca} × ${cb}`;

            // 違う答えになる式
            const wrongExprs = [];
            while (wrongExprs.length < 3) {
                const wa = randInt(1, 10);
                const wb = randInt(1, 10);
                const wrongProduct = wa * wb;
                const expr = `${wa} × ${wb}`;
                if (wrongProduct !== target && !wrongExprs.includes(expr)) {
                    wrongExprs.push(expr);
                }
            }

            return {
                question: `${questionExpr} と おなじ こたえは？`,
                answer: correctExpr,
                choices: shuffleArray([correctExpr, ...wrongExprs]),
                type: 'expression'
            };
        }

        case 'mixed':
        default: {
            // ⑨①～⑧の混合
            const types = ['basic', 'find_missing', 'reverse', 'find_min', 'triple', 'large', 'find_max', 'equivalent'];
            const randomType = types[randInt(0, types.length - 1)];
            return generateMultiplicationQuestion(randomType);
        }
    }
}

/**
 * 割り算の問題を生成（準備中 - 基本のみ）
 */
function generateDivisionQuestion(floorType) {
    const b = randInt(1, 9);
    const answer = randInt(1, 9);
    const a = b * answer;
    const choices = generateNumericChoices(answer, 1, 9);
    return {
        question: `${a} ÷ ${b} = ?`,
        answer,
        choices,
        type: 'numeric'
    };
}

/**
 * ダンジョンが利用可能かどうか
 */
export function isDungeonAvailable(dungeon) {
    return dungeon === DUNGEONS.ADDITION ||
           dungeon === DUNGEONS.SUBTRACTION ||
           dungeon === DUNGEONS.MULTIPLICATION;
}

/**
 * 階層がアンロックされているか
 * @param {Object} playerData - プレイヤーデータ
 * @param {string} dungeon - ダンジョンID
 * @param {number} floor - 階層（1-9）
 */
export function isFloorUnlocked(playerData, dungeon, floor) {
    if (floor === 1) return true;

    const challengeData = playerData.challengeData || {};
    const dungeonData = challengeData[dungeon] || {};
    const clearedFloors = dungeonData.clearedFloors || [];

    return clearedFloors.includes(floor - 1);
}

/**
 * 階層クリアを記録
 */
export function recordFloorClear(playerData, dungeon, floor, points, maxPoints) {
    if (!playerData.challengeData) {
        playerData.challengeData = {};
    }
    if (!playerData.challengeData[dungeon]) {
        playerData.challengeData[dungeon] = {
            clearedFloors: [],
            bestPoints: {}
        };
    }

    const dungeonData = playerData.challengeData[dungeon];

    // クリア記録
    if (!dungeonData.clearedFloors.includes(floor)) {
        dungeonData.clearedFloors.push(floor);
    }

    // ベストポイント更新
    const bestKey = `floor_${floor}`;
    if (!dungeonData.bestPoints[bestKey] || points > dungeonData.bestPoints[bestKey]) {
        dungeonData.bestPoints[bestKey] = points;
    }

    return dungeonData;
}
