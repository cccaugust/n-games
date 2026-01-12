/**
 * 算数問題データ
 * 学習指導要領に基づいた学年・単元別構成
 * 問題形式: 選択式、入力式、ひっ算、穴埋め、並べ替え
 */

// 学年定義
export const GRADES = {
    GRADE_1: 1,
    GRADE_2: 2,
    GRADE_3: 3,
    GRADE_4: 4,
    GRADE_5: 5,
    GRADE_6: 6
};

// 問題形式の定義
export const QUESTION_TYPES = {
    CHOICE: 'choice',           // 選択式（従来）
    INPUT: 'input',             // テンキー入力
    HISSAN: 'hissan',          // ひっ算（D&D）
    FILL_BLANK: 'fill_blank',  // 穴埋め
    ARRANGE: 'arrange',        // 並べ替え
    COMPARE: 'compare',        // 大小比較
    CLOCK: 'clock'             // 時計問題
};

// 単元定義（学習指導要領準拠・大幅拡充）
export const CATEGORIES = {
    // 1年生
    COUNT_10: 'count_10',           // 10までの数
    COUNT_20: 'count_20',           // 20までの数
    COUNT_100: 'count_100',         // 100までの数
    ADD_1: 'add_1',                 // 1桁の足し算
    ADD_CARRY: 'add_carry',         // 繰り上がりのある足し算
    SUB_1: 'sub_1',                 // 1桁の引き算
    SUB_BORROW: 'sub_borrow',       // 繰り下がりのある引き算
    COMPARE_NUM: 'compare_num',     // 数の大小
    CLOCK_READ: 'clock_read',       // 時計の読み方
    SHAPES_BASIC: 'shapes_basic',   // かたちあそび

    // 2年生
    ADD_2DIGIT: 'add_2digit',       // 2桁のたし算
    SUB_2DIGIT: 'sub_2digit',       // 2桁のひき算
    HISSAN_ADD: 'hissan_add',       // たし算のひっ算
    HISSAN_SUB: 'hissan_sub',       // ひき算のひっ算
    MULT_KUKU: 'mult_kuku',         // かけ算九九
    LENGTH: 'length',               // 長さ（cm, mm）
    CLOCK_CALC: 'clock_calc',       // 時間の計算
    TRIANGLE_SQUARE: 'triangle_square', // 三角形と四角形
    BOX_SHAPE: 'box_shape',         // はこの形

    // 3年生
    LARGE_NUM: 'large_num',         // 大きな数（万の位）
    HISSAN_ADD_3: 'hissan_add_3',   // 3桁のたし算ひっ算
    HISSAN_SUB_3: 'hissan_sub_3',   // 3桁のひき算ひっ算
    MULT_2DIGIT: 'mult_2digit',     // 2桁×1桁のかけ算
    HISSAN_MULT: 'hissan_mult',     // かけ算のひっ算
    DIVISION: 'division',           // わり算の基本
    REMAINDER: 'remainder',         // あまりのあるわり算
    FRACTION_INTRO: 'fraction_intro', // 分数の基本
    DECIMAL_INTRO: 'decimal_intro', // 小数の基本
    CIRCLE: 'circle',               // 円と球
    TIME_CALC: 'time_calc',         // 時間と時刻の計算
    WEIGHT: 'weight',               // 重さ（g, kg）

    // 4年生
    BILLION: 'billion',             // 億・兆の数
    HISSAN_DIV: 'hissan_div',       // わり算のひっ算
    MULT_2X2: 'mult_2x2',           // 2桁×2桁
    DECIMAL_ADD: 'decimal_add',     // 小数のたし算ひき算
    ANGLE: 'angle',                 // 角度
    PERPENDICULAR: 'perpendicular', // 垂直・平行
    AREA_RECT: 'area_rect',         // 面積（長方形・正方形）
    MIXED_CALC: 'mixed_calc',       // 計算のきまり（四則混合）
    APPROX: 'approx',               // 概数とがい算

    // 5年生
    DECIMAL_MULT: 'decimal_mult',   // 小数のかけ算
    DECIMAL_DIV: 'decimal_div',     // 小数のわり算
    FRACTION_SAME: 'fraction_same', // 同分母の分数計算
    FRACTION_DIFF: 'fraction_diff', // 異分母の分数計算
    AVERAGE: 'average',             // 平均
    PERCENTAGE: 'percentage',       // 割合・百分率
    AREA_TRI: 'area_tri',           // 三角形・四角形の面積
    VOLUME: 'volume',               // 体積
    PRISM: 'prism',                 // 角柱・円柱
    UNIT_AMOUNT: 'unit_amount',     // 単位量あたり
    RATIO_BASIC: 'ratio_basic',     // 比の基本

    // 6年生
    FRACTION_MULT: 'fraction_mult', // 分数のかけ算
    FRACTION_DIV: 'fraction_div',   // 分数のわり算
    RATIO: 'ratio',                 // 比と比の値
    PROPORTION: 'proportion',       // 比例と反比例
    CIRCLE_AREA: 'circle_area',     // 円の面積
    SYMMETRY: 'symmetry',           // 対称な図形
    SPEED: 'speed',                 // 速さ
    CONCENTRATION: 'concentration', // 濃度
    WORD_BASIC: 'word_basic',       // 文章題（基本）
    WORD_ADV: 'word_adv',           // 文章題（応用）
    DATA: 'data'                    // データの活用
};

// 単元の日本語名
export const CATEGORY_NAMES = {
    [CATEGORIES.COUNT_10]: '10までのかず',
    [CATEGORIES.COUNT_20]: '20までのかず',
    [CATEGORIES.COUNT_100]: '100までのかず',
    [CATEGORIES.ADD_1]: 'たしざん',
    [CATEGORIES.ADD_CARRY]: 'くりあがりのあるたしざん',
    [CATEGORIES.SUB_1]: 'ひきざん',
    [CATEGORIES.SUB_BORROW]: 'くりさがりのあるひきざん',
    [CATEGORIES.COMPARE_NUM]: 'かずのおおきさ',
    [CATEGORIES.CLOCK_READ]: 'とけい',
    [CATEGORIES.SHAPES_BASIC]: 'かたちあそび',

    [CATEGORIES.ADD_2DIGIT]: '2けたのたし算',
    [CATEGORIES.SUB_2DIGIT]: '2けたのひき算',
    [CATEGORIES.HISSAN_ADD]: 'たし算のひっ算',
    [CATEGORIES.HISSAN_SUB]: 'ひき算のひっ算',
    [CATEGORIES.MULT_KUKU]: 'かけ算九九',
    [CATEGORIES.LENGTH]: 'ながさ',
    [CATEGORIES.CLOCK_CALC]: '時間の計算',
    [CATEGORIES.TRIANGLE_SQUARE]: '三角形と四角形',
    [CATEGORIES.BOX_SHAPE]: 'はこの形',

    [CATEGORIES.LARGE_NUM]: '大きな数',
    [CATEGORIES.HISSAN_ADD_3]: '3けたのたし算',
    [CATEGORIES.HISSAN_SUB_3]: '3けたのひき算',
    [CATEGORIES.MULT_2DIGIT]: '2けた×1けた',
    [CATEGORIES.HISSAN_MULT]: 'かけ算のひっ算',
    [CATEGORIES.DIVISION]: 'わり算',
    [CATEGORIES.REMAINDER]: 'あまりのあるわり算',
    [CATEGORIES.FRACTION_INTRO]: '分数',
    [CATEGORIES.DECIMAL_INTRO]: '小数',
    [CATEGORIES.CIRCLE]: '円と球',
    [CATEGORIES.TIME_CALC]: '時間と時刻',
    [CATEGORIES.WEIGHT]: '重さ',

    [CATEGORIES.BILLION]: '大きな数（億・兆）',
    [CATEGORIES.HISSAN_DIV]: 'わり算のひっ算',
    [CATEGORIES.MULT_2X2]: '2けた×2けた',
    [CATEGORIES.DECIMAL_ADD]: '小数のたし算ひき算',
    [CATEGORIES.ANGLE]: '角度',
    [CATEGORIES.PERPENDICULAR]: '垂直と平行',
    [CATEGORIES.AREA_RECT]: '面積',
    [CATEGORIES.MIXED_CALC]: '計算のきまり',
    [CATEGORIES.APPROX]: '概数',

    [CATEGORIES.DECIMAL_MULT]: '小数のかけ算',
    [CATEGORIES.DECIMAL_DIV]: '小数のわり算',
    [CATEGORIES.FRACTION_SAME]: '分数のたし算ひき算',
    [CATEGORIES.FRACTION_DIFF]: '通分と約分',
    [CATEGORIES.AVERAGE]: '平均',
    [CATEGORIES.PERCENTAGE]: '割合',
    [CATEGORIES.AREA_TRI]: '三角形・四角形の面積',
    [CATEGORIES.VOLUME]: '体積',
    [CATEGORIES.PRISM]: '角柱と円柱',
    [CATEGORIES.UNIT_AMOUNT]: '単位量あたり',
    [CATEGORIES.RATIO_BASIC]: '比の基本',

    [CATEGORIES.FRACTION_MULT]: '分数のかけ算',
    [CATEGORIES.FRACTION_DIV]: '分数のわり算',
    [CATEGORIES.RATIO]: '比と比の値',
    [CATEGORIES.PROPORTION]: '比例と反比例',
    [CATEGORIES.CIRCLE_AREA]: '円の面積',
    [CATEGORIES.SYMMETRY]: '対称な図形',
    [CATEGORIES.SPEED]: '速さ',
    [CATEGORIES.CONCENTRATION]: '濃度',
    [CATEGORIES.WORD_BASIC]: '文章題（基本）',
    [CATEGORIES.WORD_ADV]: '文章題（応用）',
    [CATEGORIES.DATA]: 'データの活用'
};

// 学年ごとの単元一覧
export const GRADE_CATEGORIES = {
    [GRADES.GRADE_1]: [
        CATEGORIES.COUNT_10,
        CATEGORIES.ADD_1,
        CATEGORIES.SUB_1,
        CATEGORIES.COUNT_20,
        CATEGORIES.ADD_CARRY,
        CATEGORIES.SUB_BORROW,
        CATEGORIES.COUNT_100,
        CATEGORIES.COMPARE_NUM,
        CATEGORIES.CLOCK_READ,
        CATEGORIES.SHAPES_BASIC
    ],
    [GRADES.GRADE_2]: [
        CATEGORIES.ADD_2DIGIT,
        CATEGORIES.SUB_2DIGIT,
        CATEGORIES.HISSAN_ADD,
        CATEGORIES.HISSAN_SUB,
        CATEGORIES.MULT_KUKU,
        CATEGORIES.LENGTH,
        CATEGORIES.CLOCK_CALC,
        CATEGORIES.TRIANGLE_SQUARE,
        CATEGORIES.BOX_SHAPE
    ],
    [GRADES.GRADE_3]: [
        CATEGORIES.LARGE_NUM,
        CATEGORIES.HISSAN_ADD_3,
        CATEGORIES.HISSAN_SUB_3,
        CATEGORIES.MULT_2DIGIT,
        CATEGORIES.HISSAN_MULT,
        CATEGORIES.DIVISION,
        CATEGORIES.REMAINDER,
        CATEGORIES.FRACTION_INTRO,
        CATEGORIES.DECIMAL_INTRO,
        CATEGORIES.CIRCLE,
        CATEGORIES.TIME_CALC,
        CATEGORIES.WEIGHT
    ],
    [GRADES.GRADE_4]: [
        CATEGORIES.BILLION,
        CATEGORIES.HISSAN_DIV,
        CATEGORIES.MULT_2X2,
        CATEGORIES.DECIMAL_ADD,
        CATEGORIES.ANGLE,
        CATEGORIES.PERPENDICULAR,
        CATEGORIES.AREA_RECT,
        CATEGORIES.MIXED_CALC,
        CATEGORIES.APPROX
    ],
    [GRADES.GRADE_5]: [
        CATEGORIES.DECIMAL_MULT,
        CATEGORIES.DECIMAL_DIV,
        CATEGORIES.FRACTION_SAME,
        CATEGORIES.FRACTION_DIFF,
        CATEGORIES.AVERAGE,
        CATEGORIES.PERCENTAGE,
        CATEGORIES.AREA_TRI,
        CATEGORIES.VOLUME,
        CATEGORIES.PRISM,
        CATEGORIES.UNIT_AMOUNT,
        CATEGORIES.RATIO_BASIC
    ],
    [GRADES.GRADE_6]: [
        CATEGORIES.FRACTION_MULT,
        CATEGORIES.FRACTION_DIV,
        CATEGORIES.RATIO,
        CATEGORIES.PROPORTION,
        CATEGORIES.CIRCLE_AREA,
        CATEGORIES.SYMMETRY,
        CATEGORIES.SPEED,
        CATEGORIES.CONCENTRATION,
        CATEGORIES.WORD_BASIC,
        CATEGORIES.WORD_ADV,
        CATEGORIES.DATA
    ]
};

// ユーティリティ関数
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 選択肢を生成（整数）
function generateChoices(answer, min, max, count = 4) {
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
    // 足りない場合はランダムに追加
    while (choices.size < count) {
        const wrong = randInt(min, max);
        if (wrong !== answer) choices.add(wrong);
    }
    return shuffleArray([...choices]);
}

// 選択肢を生成（小数）
function generateDecimalChoices(answer, min, max, precision = 1, count = 4) {
    const choices = new Set([parseFloat(answer.toFixed(precision))]);
    const factor = Math.pow(10, precision);
    let attempts = 0;
    while (choices.size < count && attempts < 100) {
        attempts++;
        const offset = randInt(-5, 5) / factor * 10;
        if (Math.abs(offset) < 0.001) continue;
        let wrong = parseFloat((answer + offset).toFixed(precision));
        if (wrong < min) wrong = parseFloat((min + randInt(1, 5) / factor).toFixed(precision));
        if (wrong > max) wrong = parseFloat((max - randInt(1, 5) / factor).toFixed(precision));
        if (Math.abs(wrong - answer) > 0.001) {
            choices.add(wrong);
        }
    }
    while (choices.size < count) {
        const wrong = parseFloat((randInt(min * factor, max * factor) / factor).toFixed(precision));
        if (Math.abs(wrong - answer) > 0.001) choices.add(wrong);
    }
    return shuffleArray([...choices]);
}

// 最大公約数
function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

// 最小公倍数
function lcm(a, b) {
    return (a * b) / gcd(a, b);
}

// ===========================================
// 問題生成関数（学年・単元別）
// ===========================================

// 1年生の問題
function generateGrade1Question(category, level = 1) {
    switch (category) {
        case CATEGORIES.COUNT_10: {
            const n = randInt(1, 10);
            const questionTypes = [
                { q: `🍎が ${n}こ あります。いくつ？`, a: n },
                { q: `${n} のつぎの かずは？`, a: Math.min(n + 1, 10), max: 11 },
                { q: `${n} のまえの かずは？`, a: Math.max(n - 1, 0), min: 0 }
            ];
            const qt = randChoice(questionTypes);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: qt.q,
                answer: qt.a,
                choices: generateChoices(qt.a, qt.min || 0, qt.max || 10),
                hint: 'かずを かぞえてみよう'
            };
        }

        case CATEGORIES.COUNT_20: {
            const n = randInt(10, 20);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${n} のつぎの かずは？`,
                answer: n + 1,
                choices: generateChoices(n + 1, 10, 21),
                hint: '10といくつかな？'
            };
        }

        case CATEGORIES.COUNT_100: {
            const tens = randInt(1, 9) * 10;
            const ones = randInt(0, 9);
            const n = tens + ones;
            const qTypes = [
                { q: `${tens} と ${ones} をあわせると？`, a: n },
                { q: `${n} は 10が いくつ？`, a: Math.floor(n / 10), max: 10 }
            ];
            const qt = randChoice(qTypes);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: qt.q,
                answer: qt.a,
                choices: generateChoices(qt.a, 0, qt.max || 100),
                hint: '10のまとまりを かんがえよう'
            };
        }

        case CATEGORIES.ADD_1: {
            const a = randInt(1, 5);
            const b = randInt(1, 5);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} + ${b} = ?`,
                answer: a + b,
                choices: generateChoices(a + b, 2, 10),
                hint: 'あわせて いくつかな？'
            };
        }

        case CATEGORIES.ADD_CARRY: {
            // 繰り上がりのある足し算 (答えが10を超える)
            const a = randInt(6, 9);
            const b = randInt(10 - a + 1, 9);
            return {
                type: level <= 2 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} + ${b} = ?`,
                answer: a + b,
                choices: generateChoices(a + b, 10, 18),
                hint: '10をつくって かんがえよう'
            };
        }

        case CATEGORIES.SUB_1: {
            const a = randInt(5, 10);
            const b = randInt(1, a - 1);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} - ${b} = ?`,
                answer: a - b,
                choices: generateChoices(a - b, 0, 9),
                hint: 'のこりは いくつかな？'
            };
        }

        case CATEGORIES.SUB_BORROW: {
            // 繰り下がりのある引き算
            const a = randInt(11, 18);
            const b = randInt(a - 9, 9);
            return {
                type: level <= 2 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} - ${b} = ?`,
                answer: a - b,
                choices: generateChoices(a - b, 2, 17),
                hint: '10から ひいて かんがえよう'
            };
        }

        case CATEGORIES.COMPARE_NUM: {
            const a = randInt(1, 20);
            let b = randInt(1, 20);
            while (b === a) b = randInt(1, 20);
            return {
                type: QUESTION_TYPES.COMPARE,
                question: `${a} と ${b} では どちらが おおきい？`,
                answer: Math.max(a, b),
                choices: shuffleArray([a, b]),
                leftValue: a,
                rightValue: b,
                hint: 'かずを くらべてみよう'
            };
        }

        case CATEGORIES.CLOCK_READ: {
            const hour = randInt(1, 12);
            const minute = randChoice([0, 30]);
            return {
                type: QUESTION_TYPES.CLOCK,
                question: 'いま なんじ？',
                answer: hour,
                clockHour: hour,
                clockMinute: minute,
                choices: generateChoices(hour, 1, 12),
                suffix: minute === 0 ? 'じ' : 'じはん',
                hint: 'みじかいはりを みてね'
            };
        }

        case CATEGORIES.SHAPES_BASIC: {
            const shapes = [
                { name: 'さんかく', sides: 3 },
                { name: 'しかく', sides: 4 },
                { name: 'まる', sides: 0 }
            ];
            const shape = randChoice(shapes);
            if (shape.sides > 0) {
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: `${shape.name}の かどは いくつ？`,
                    answer: shape.sides,
                    choices: generateChoices(shape.sides, 0, 6),
                    hint: 'かどを かぞえてみよう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: 'かどが ない かたちは？',
                    answer: 'まる',
                    choices: ['さんかく', 'しかく', 'まる', 'ながしかく'],
                    hint: 'ころがる かたちだよ'
                };
            }
        }

        default:
            return generateGrade1Question(CATEGORIES.ADD_1, level);
    }
}

// 2年生の問題
function generateGrade2Question(category, level = 1) {
    switch (category) {
        case CATEGORIES.ADD_2DIGIT: {
            const a = randInt(10, 50);
            const b = randInt(10, 49);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} + ${b} = ?`,
                answer: a + b,
                choices: generateChoices(a + b, 20, 99),
                hint: '位ごとに計算しよう'
            };
        }

        case CATEGORIES.SUB_2DIGIT: {
            const a = randInt(50, 99);
            const b = randInt(10, a - 20);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} - ${b} = ?`,
                answer: a - b,
                choices: generateChoices(a - b, 10, 89),
                hint: '位ごとに計算しよう'
            };
        }

        case CATEGORIES.HISSAN_ADD: {
            // ひっ算（たし算）
            const a = randInt(20, 60);
            const b = randInt(20, 39);
            const sum = a + b;
            const ones = sum % 10;
            const tens = Math.floor(sum / 10);

            if (level === 1) {
                // 一の位を埋める
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'add',
                    num1: a,
                    num2: b,
                    answer: sum,
                    blanks: [{ position: 'ones', answer: ones }],
                    hint: '一の位から計算しよう'
                };
            } else if (level === 2) {
                // 十の位も埋める
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'add',
                    num1: a,
                    num2: b,
                    answer: sum,
                    blanks: [
                        { position: 'ones', answer: ones },
                        { position: 'tens', answer: tens }
                    ],
                    hint: '一の位から順に計算しよう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.INPUT,
                    question: `${a} + ${b} = ?（ひっ算で計算）`,
                    answer: sum,
                    hint: 'ひっ算で計算しよう'
                };
            }
        }

        case CATEGORIES.HISSAN_SUB: {
            // ひっ算（ひき算）
            const a = randInt(50, 99);
            const b = randInt(10, Math.min(a - 10, 49));
            const diff = a - b;
            const ones = diff % 10;
            const tens = Math.floor(diff / 10);

            if (level === 1) {
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'sub',
                    num1: a,
                    num2: b,
                    answer: diff,
                    blanks: [{ position: 'ones', answer: ones }],
                    hint: '一の位から計算しよう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'sub',
                    num1: a,
                    num2: b,
                    answer: diff,
                    blanks: [
                        { position: 'ones', answer: ones },
                        { position: 'tens', answer: tens }
                    ],
                    hint: 'くりさがりに気をつけよう'
                };
            }
        }

        case CATEGORIES.MULT_KUKU: {
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            const qTypes = [
                { q: `${a} × ${b} = ?`, a: a * b },
                { q: `${a} の だん、${a}×${b} は？`, a: a * b }
            ];
            const qt = randChoice(qTypes);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: qt.q,
                answer: qt.a,
                choices: generateChoices(qt.a, 1, 81),
                hint: '九九を思い出そう'
            };
        }

        case CATEGORIES.LENGTH: {
            const cm = randInt(1, 9);
            const mm = randInt(1, 9);
            const qTypes = [
                { q: `${cm}cm${mm}mm は 何mm？`, a: cm * 10 + mm, unit: 'mm' },
                { q: `${cm * 10 + mm}mm は 何cm何mm？`, a: cm, unit: 'cm', extra: mm }
            ];
            const qt = randChoice(qTypes);
            return {
                type: QUESTION_TYPES.CHOICE,
                question: qt.q,
                answer: qt.a,
                choices: generateChoices(qt.a, 1, 99),
                suffix: qt.unit,
                hint: '1cm = 10mm だよ'
            };
        }

        case CATEGORIES.CLOCK_CALC: {
            const startHour = randInt(8, 14);
            const duration = randInt(1, 3);
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${startHour}時から ${duration}時間後は 何時？`,
                answer: startHour + duration,
                choices: generateChoices(startHour + duration, 9, 17),
                suffix: '時',
                hint: '時計の針を動かして考えよう'
            };
        }

        case CATEGORIES.TRIANGLE_SQUARE: {
            const shape = randChoice(['triangle', 'rectangle', 'square']);
            if (shape === 'triangle') {
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: '三角形の辺は いくつ？',
                    answer: 3,
                    choices: [2, 3, 4, 5],
                    hint: '三角形は3つの辺でできている'
                };
            } else if (shape === 'rectangle') {
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: '長方形の角は 何度？',
                    answer: 90,
                    choices: [45, 60, 90, 120],
                    suffix: '度',
                    hint: '長方形の角は直角だよ'
                };
            } else {
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: '正方形の辺は すべて…',
                    answer: '同じ長さ',
                    choices: ['同じ長さ', '違う長さ', '2種類', '3種類'],
                    hint: '正方形は特別な四角形'
                };
            }
        }

        case CATEGORIES.BOX_SHAPE: {
            const faces = randChoice([
                { shape: 'さいころ', count: 6 },
                { shape: '直方体', count: 6 }
            ]);
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${faces.shape}の面は いくつ？`,
                answer: faces.count,
                choices: [4, 5, 6, 8],
                hint: 'すべての面を数えよう'
            };
        }

        default:
            return generateGrade2Question(CATEGORIES.MULT_KUKU, level);
    }
}

// 3年生の問題
function generateGrade3Question(category, level = 1) {
    switch (category) {
        case CATEGORIES.LARGE_NUM: {
            const man = randInt(1, 9);
            const sen = randInt(0, 9);
            const n = man * 10000 + sen * 1000;
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${man}万${sen > 0 ? sen + '千' : ''}を 数字で書くと？`,
                answer: n,
                choices: generateChoices(n, 10000, 99000),
                hint: '1万 = 10000 だよ'
            };
        }

        case CATEGORIES.HISSAN_ADD_3: {
            const a = randInt(100, 500);
            const b = randInt(100, 499);
            const sum = a + b;

            if (level <= 2) {
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'add',
                    num1: a,
                    num2: b,
                    answer: sum,
                    blanks: [
                        { position: 'ones', answer: sum % 10 },
                        { position: 'tens', answer: Math.floor((sum % 100) / 10) },
                        { position: 'hundreds', answer: Math.floor(sum / 100) }
                    ],
                    hint: '一の位から順に計算しよう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.INPUT,
                    question: `${a} + ${b} = ?`,
                    answer: sum,
                    hint: 'ひっ算で計算しよう'
                };
            }
        }

        case CATEGORIES.HISSAN_SUB_3: {
            const a = randInt(500, 999);
            const b = randInt(100, Math.min(a - 100, 499));
            const diff = a - b;

            if (level <= 2) {
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'sub',
                    num1: a,
                    num2: b,
                    answer: diff,
                    blanks: [
                        { position: 'ones', answer: diff % 10 },
                        { position: 'tens', answer: Math.floor((diff % 100) / 10) },
                        { position: 'hundreds', answer: Math.floor(diff / 100) }
                    ],
                    hint: 'くりさがりに注意しよう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.INPUT,
                    question: `${a} - ${b} = ?`,
                    answer: diff,
                    hint: 'ひっ算で計算しよう'
                };
            }
        }

        case CATEGORIES.MULT_2DIGIT: {
            const a = randInt(10, 30);
            const b = randInt(2, 9);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} × ${b} = ?`,
                answer: a * b,
                choices: generateChoices(a * b, 20, 270),
                hint: '位ごとにかけ算しよう'
            };
        }

        case CATEGORIES.HISSAN_MULT: {
            const a = randInt(10, 50);
            const b = randInt(2, 9);
            const prod = a * b;

            if (level <= 2) {
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'mult',
                    num1: a,
                    num2: b,
                    answer: prod,
                    blanks: [
                        { position: 'ones', answer: prod % 10 },
                        { position: 'tens', answer: Math.floor((prod % 100) / 10) },
                        { position: 'hundreds', answer: Math.floor(prod / 100) || null }
                    ].filter(b => b.answer !== null),
                    hint: '一の位からかけていこう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.INPUT,
                    question: `${a} × ${b} = ?`,
                    answer: prod,
                    hint: 'ひっ算で計算しよう'
                };
            }
        }

        case CATEGORIES.DIVISION: {
            const b = randInt(2, 9);
            const answer = randInt(2, 9);
            const a = b * answer;
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} ÷ ${b} = ?`,
                answer: answer,
                choices: generateChoices(answer, 1, 15),
                hint: 'わり算は かけ算の逆だよ'
            };
        }

        case CATEGORIES.REMAINDER: {
            const b = randInt(2, 9);
            const quotient = randInt(2, 9);
            const remainder = randInt(1, b - 1);
            const a = b * quotient + remainder;
            return {
                type: QUESTION_TYPES.FILL_BLANK,
                question: `${a} ÷ ${b} = ? あまり ?`,
                answers: [quotient, remainder],
                blanks: ['quotient', 'remainder'],
                hint: 'あまりは わる数より小さいよ'
            };
        }

        case CATEGORIES.FRACTION_INTRO: {
            const denom = randChoice([2, 3, 4]);
            const numer = randInt(1, denom - 1);
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `1を ${denom}つに分けた ${numer}つ分は？`,
                answer: `${numer}/${denom}`,
                choices: [`${numer}/${denom}`, `${denom}/${numer}`, `1/${denom}`, `${numer}/1`],
                hint: '分数は「分けた数」と「取った数」'
            };
        }

        case CATEGORIES.DECIMAL_INTRO: {
            const ones = randInt(0, 9);
            const tenths = randInt(1, 9);
            const n = ones + tenths / 10;
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${ones}と 0.${tenths}を あわせると？`,
                answer: n,
                choices: generateDecimalChoices(n, 0, 10, 1),
                hint: '小数点の位置に注意しよう'
            };
        }

        case CATEGORIES.CIRCLE: {
            const qTypes = [
                { q: '円の中心から 円周までの長さを なんという？', a: '半径', choices: ['半径', '直径', '円周', '面積'] },
                { q: '直径は 半径の何倍？', a: 2, choices: [1, 2, 3, 4] }
            ];
            const qt = randChoice(qTypes);
            return {
                type: QUESTION_TYPES.CHOICE,
                question: qt.q,
                answer: qt.a,
                choices: qt.choices,
                hint: '円の性質を思い出そう'
            };
        }

        case CATEGORIES.TIME_CALC: {
            const hours = randInt(1, 3);
            const minutes = randInt(10, 50);
            const totalMinutes = hours * 60 + minutes;
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${hours}時間${minutes}分は 何分？`,
                answer: totalMinutes,
                choices: generateChoices(totalMinutes, 60, 300),
                suffix: '分',
                hint: '1時間 = 60分 だよ'
            };
        }

        case CATEGORIES.WEIGHT: {
            const kg = randInt(1, 5);
            const g = randInt(100, 900);
            const totalG = kg * 1000 + g;
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${kg}kg${g}g は 何g？`,
                answer: totalG,
                choices: generateChoices(totalG, 1000, 6000),
                suffix: 'g',
                hint: '1kg = 1000g だよ'
            };
        }

        default:
            return generateGrade3Question(CATEGORIES.DIVISION, level);
    }
}

// 4年生の問題
function generateGrade4Question(category, level = 1) {
    switch (category) {
        case CATEGORIES.BILLION: {
            const oku = randInt(1, 9);
            const n = oku * 100000000;
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${oku}億を 数字で書くと？`,
                answer: n,
                choices: [n, n / 10, n * 10, n + 10000000],
                hint: '1億 = 100000000 だよ'
            };
        }

        case CATEGORIES.HISSAN_DIV: {
            const b = randInt(2, 9);
            const quotient = randInt(10, 30);
            const a = b * quotient;

            if (level <= 2) {
                return {
                    type: QUESTION_TYPES.HISSAN,
                    question: 'ひっ算でけいさんしよう',
                    operation: 'div',
                    num1: a,
                    num2: b,
                    answer: quotient,
                    blanks: [
                        { position: 'tens', answer: Math.floor(quotient / 10) },
                        { position: 'ones', answer: quotient % 10 }
                    ],
                    hint: '大きい位から順にわっていこう'
                };
            } else {
                return {
                    type: QUESTION_TYPES.INPUT,
                    question: `${a} ÷ ${b} = ?`,
                    answer: quotient,
                    hint: 'ひっ算で計算しよう'
                };
            }
        }

        case CATEGORIES.MULT_2X2: {
            const a = randInt(10, 30);
            const b = randInt(10, 30);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} × ${b} = ?`,
                answer: a * b,
                choices: generateChoices(a * b, 100, 900),
                hint: '筆算で計算しよう'
            };
        }

        case CATEGORIES.DECIMAL_ADD: {
            const a = parseFloat((randInt(10, 50) / 10).toFixed(1));
            const b = parseFloat((randInt(10, 50) / 10).toFixed(1));
            const op = randChoice(['+', '-']);
            if (op === '+') {
                const ans = parseFloat((a + b).toFixed(1));
                return {
                    type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                    question: `${a} + ${b} = ?`,
                    answer: ans,
                    choices: generateDecimalChoices(ans, 1, 12),
                    hint: '小数点をそろえて計算しよう'
                };
            } else {
                const larger = Math.max(a, b);
                const smaller = Math.min(a, b);
                const ans = parseFloat((larger - smaller).toFixed(1));
                return {
                    type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                    question: `${larger} - ${smaller} = ?`,
                    answer: ans,
                    choices: generateDecimalChoices(ans, 0, 5),
                    hint: '小数点をそろえて計算しよう'
                };
            }
        }

        case CATEGORIES.ANGLE: {
            const qTypes = [
                () => {
                    const a = randInt(30, 70);
                    const b = randInt(30, 70);
                    return {
                        question: `三角形の2つの角が ${a}°と ${b}°のとき、残りの角は？`,
                        answer: 180 - a - b,
                        hint: '三角形の内角の和は180°'
                    };
                },
                () => {
                    return {
                        question: '直角は何度？',
                        answer: 90,
                        hint: '直角は特別な角度'
                    };
                }
            ];
            const qt = randChoice(qTypes)();
            return {
                type: QUESTION_TYPES.CHOICE,
                question: qt.question,
                answer: qt.answer,
                choices: generateChoices(qt.answer, 20, 150),
                suffix: '°',
                hint: qt.hint
            };
        }

        case CATEGORIES.PERPENDICULAR: {
            return {
                type: QUESTION_TYPES.CHOICE,
                question: '垂直に交わる2本の線が作る角度は？',
                answer: 90,
                choices: [45, 60, 90, 180],
                suffix: '°',
                hint: '垂直 = 直角'
            };
        }

        case CATEGORIES.AREA_RECT: {
            const a = randInt(3, 12);
            const b = randInt(3, 12);
            const qTypes = [
                { q: `たて${a}cm、横${b}cmの長方形の面積は？`, ans: a * b },
                { q: `1辺が${a}cmの正方形の面積は？`, ans: a * a }
            ];
            const qt = randChoice(qTypes);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: qt.q,
                answer: qt.ans,
                choices: generateChoices(qt.ans, 9, 150),
                suffix: 'cm²',
                hint: '面積 = たて × 横'
            };
        }

        case CATEGORIES.MIXED_CALC: {
            const a = randInt(3, 10);
            const b = randInt(2, 5);
            const c = randInt(5, 15);
            const qTypes = [
                { q: `${a} × ${b} + ${c} = ?`, ans: a * b + c },
                { q: `(${a} + ${b}) × ${randInt(2, 4)} = ?`, ans: (a + b) * randInt(2, 4) }
            ];
            const qt = qTypes[0];
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: qt.q,
                answer: qt.ans,
                choices: generateChoices(qt.ans, 10, 80),
                hint: 'かけ算・わり算を先に計算しよう'
            };
        }

        case CATEGORIES.APPROX: {
            const n = randInt(1234, 9876);
            const type = randChoice(['hundreds', 'thousands']);
            if (type === 'hundreds') {
                const approx = Math.round(n / 100) * 100;
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: `${n}を 百の位で四捨五入すると？`,
                    answer: approx,
                    choices: generateChoices(approx, 1000, 10000),
                    hint: '四捨五入する位の次の位を見よう'
                };
            } else {
                const approx = Math.round(n / 1000) * 1000;
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: `${n}を 千の位で四捨五入すると？`,
                    answer: approx,
                    choices: generateChoices(approx, 1000, 10000),
                    hint: '四捨五入する位の次の位を見よう'
                };
            }
        }

        default:
            return generateGrade4Question(CATEGORIES.AREA_RECT, level);
    }
}

// 5年生の問題
function generateGrade5Question(category, level = 1) {
    switch (category) {
        case CATEGORIES.DECIMAL_MULT: {
            const a = parseFloat((randInt(10, 30) / 10).toFixed(1));
            const b = randInt(2, 9);
            const ans = parseFloat((a * b).toFixed(1));
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} × ${b} = ?`,
                answer: ans,
                choices: generateDecimalChoices(ans, 1, 30),
                hint: '整数のかけ算をしてから小数点を移動'
            };
        }

        case CATEGORIES.DECIMAL_DIV: {
            const b = randInt(2, 5);
            const ans = randInt(2, 9);
            const a = b * ans;
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${a} ÷ ${b} = ?`,
                answer: ans,
                choices: generateChoices(ans, 1, 15),
                hint: '小数のわり算に注意'
            };
        }

        case CATEGORIES.FRACTION_SAME: {
            const denom = randChoice([3, 4, 5, 6, 8]);
            const a = randInt(1, denom - 2);
            const b = randInt(1, denom - a - 1);
            return {
                type: QUESTION_TYPES.FILL_BLANK,
                question: `${a}/${denom} + ${b}/${denom} = ?/${denom}`,
                answers: [a + b],
                blanks: ['numerator'],
                hint: '分母が同じなら分子だけ足す'
            };
        }

        case CATEGORIES.FRACTION_DIFF: {
            const d1 = randChoice([2, 3, 4]);
            const d2 = randChoice([3, 4, 6]);
            if (d1 === d2) return generateGrade5Question(category, level);
            const n1 = randInt(1, d1 - 1);
            const n2 = randInt(1, d2 - 1);
            const commonDenom = lcm(d1, d2);
            const ans = n1 * (commonDenom / d1) + n2 * (commonDenom / d2);
            return {
                type: QUESTION_TYPES.FILL_BLANK,
                question: `${n1}/${d1} + ${n2}/${d2} = ?/${commonDenom}`,
                answers: [ans],
                blanks: ['numerator'],
                hint: '通分してから計算しよう'
            };
        }

        case CATEGORIES.AVERAGE: {
            const count = randInt(3, 5);
            const values = Array.from({ length: count }, () => randInt(60, 100));
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / count;
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${values.join('、')}の平均は？`,
                answer: avg,
                choices: generateChoices(avg, 50, 100),
                hint: '合計 ÷ 個数 = 平均'
            };
        }

        case CATEGORIES.PERCENTAGE: {
            const whole = randChoice([100, 200, 500]);
            const percent = randChoice([10, 20, 25, 50]);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${whole}の ${percent}% は？`,
                answer: whole * percent / 100,
                choices: generateChoices(whole * percent / 100, 10, 300),
                hint: '% = 100分のいくつ'
            };
        }

        case CATEGORIES.AREA_TRI: {
            const base = randInt(4, 12);
            const height = randInt(4, 12);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `底辺${base}cm、高さ${height}cmの三角形の面積は？`,
                answer: base * height / 2,
                choices: generateChoices(base * height / 2, 8, 80),
                suffix: 'cm²',
                hint: '三角形の面積 = 底辺 × 高さ ÷ 2'
            };
        }

        case CATEGORIES.VOLUME: {
            const a = randInt(2, 6);
            const b = randInt(2, 6);
            const c = randInt(2, 6);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `たて${a}cm、横${b}cm、高さ${c}cmの直方体の体積は？`,
                answer: a * b * c,
                choices: generateChoices(a * b * c, 8, 220),
                suffix: 'cm³',
                hint: '体積 = たて × 横 × 高さ'
            };
        }

        case CATEGORIES.PRISM: {
            return {
                type: QUESTION_TYPES.CHOICE,
                question: '三角柱の面の数は？',
                answer: 5,
                choices: [3, 4, 5, 6],
                hint: '底面2つ + 側面3つ'
            };
        }

        case CATEGORIES.UNIT_AMOUNT: {
            const total = randInt(100, 500);
            const count = randInt(5, 20);
            const perUnit = total / count;
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${total}円で ${count}個買えます。1個あたり何円？`,
                answer: perUnit,
                choices: generateChoices(perUnit, 5, 100),
                suffix: '円',
                hint: '合計 ÷ 個数'
            };
        }

        case CATEGORIES.RATIO_BASIC: {
            const a = randInt(2, 5);
            const b = randInt(2, 5);
            const total = (a + b) * randInt(2, 5);
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${a}:${b}の比で${total}を分けると、大きい方は？`,
                answer: Math.max(a, b) * total / (a + b),
                choices: generateChoices(Math.max(a, b) * total / (a + b), 5, 50),
                hint: '比の合計で割ってから比をかける'
            };
        }

        default:
            return generateGrade5Question(CATEGORIES.PERCENTAGE, level);
    }
}

// 6年生の問題
function generateGrade6Question(category, level = 1) {
    switch (category) {
        case CATEGORIES.FRACTION_MULT: {
            const n1 = randInt(1, 3);
            const d1 = randInt(2, 5);
            const n2 = randInt(1, 3);
            const d2 = randInt(2, 5);
            const ansN = n1 * n2;
            const ansD = d1 * d2;
            const g = gcd(ansN, ansD);
            return {
                type: QUESTION_TYPES.FILL_BLANK,
                question: `${n1}/${d1} × ${n2}/${d2} = ?/?`,
                answers: [ansN / g, ansD / g],
                blanks: ['numerator', 'denominator'],
                hint: '分子同士、分母同士をかける'
            };
        }

        case CATEGORIES.FRACTION_DIV: {
            const n1 = randInt(2, 4);
            const d1 = randInt(3, 6);
            const n2 = randInt(1, 2);
            const d2 = randInt(2, 4);
            const ansN = n1 * d2;
            const ansD = d1 * n2;
            const g = gcd(ansN, ansD);
            return {
                type: QUESTION_TYPES.FILL_BLANK,
                question: `${n1}/${d1} ÷ ${n2}/${d2} = ?/?`,
                answers: [ansN / g, ansD / g],
                blanks: ['numerator', 'denominator'],
                hint: 'わり算は逆数のかけ算'
            };
        }

        case CATEGORIES.RATIO: {
            const a = randInt(2, 6);
            const b = randInt(2, 6);
            const g = gcd(a, b);
            return {
                type: QUESTION_TYPES.FILL_BLANK,
                question: `${a}:${b}を最も簡単な比にすると？`,
                answers: [a / g, b / g],
                blanks: ['left', 'right'],
                hint: '両方を同じ数でわる'
            };
        }

        case CATEGORIES.PROPORTION: {
            const k = randInt(2, 5);
            const x = randInt(2, 8);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `y = ${k}x のとき、x = ${x} なら y は？`,
                answer: k * x,
                choices: generateChoices(k * x, 4, 50),
                hint: 'xの値を式に代入'
            };
        }

        case CATEGORIES.CIRCLE_AREA: {
            const r = randChoice([2, 3, 5, 7]);
            const qTypes = randChoice(['area', 'circumference']);
            if (qTypes === 'area') {
                const ans = parseFloat((r * r * 3.14).toFixed(2));
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: `半径${r}cmの円の面積は？（円周率3.14）`,
                    answer: ans,
                    choices: generateDecimalChoices(ans, 10, 160, 2),
                    suffix: 'cm²',
                    hint: '円の面積 = 半径 × 半径 × 3.14'
                };
            } else {
                const ans = parseFloat((2 * r * 3.14).toFixed(2));
                return {
                    type: QUESTION_TYPES.CHOICE,
                    question: `半径${r}cmの円周は？（円周率3.14）`,
                    answer: ans,
                    choices: generateDecimalChoices(ans, 5, 50, 2),
                    suffix: 'cm',
                    hint: '円周 = 直径 × 3.14'
                };
            }
        }

        case CATEGORIES.SYMMETRY: {
            return {
                type: QUESTION_TYPES.CHOICE,
                question: '正六角形の対称の軸は何本？',
                answer: 6,
                choices: [3, 4, 6, 12],
                hint: '正n角形の対称軸はn本'
            };
        }

        case CATEGORIES.SPEED: {
            const speed = randChoice([40, 50, 60, 80]);
            const time = randChoice([2, 3, 4, 5]);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `時速${speed}kmで${time}時間走ると何km進む？`,
                answer: speed * time,
                choices: generateChoices(speed * time, 50, 400),
                suffix: 'km',
                hint: '道のり = 速さ × 時間'
            };
        }

        case CATEGORIES.CONCENTRATION: {
            const total = randChoice([100, 200, 500]);
            const percent = randChoice([5, 10, 15, 20]);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `${total}gの食塩水に${percent}%の塩が入っています。塩は何g？`,
                answer: total * percent / 100,
                choices: generateChoices(total * percent / 100, 5, 100),
                suffix: 'g',
                hint: '塩の量 = 食塩水 × 濃度'
            };
        }

        case CATEGORIES.WORD_BASIC: {
            const price = randInt(100, 500);
            const count = randInt(3, 8);
            return {
                type: level === 1 ? QUESTION_TYPES.CHOICE : QUESTION_TYPES.INPUT,
                question: `1個${price}円のりんごを${count}個買います。代金は？`,
                answer: price * count,
                choices: generateChoices(price * count, 300, 4000),
                suffix: '円',
                hint: '代金 = 単価 × 個数'
            };
        }

        case CATEGORIES.WORD_ADV: {
            const a = randInt(50, 200);
            const b = randInt(50, 200);
            const total = a + b;
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `兄と弟のお金の合計は${total}円。兄は弟より${Math.abs(a - b)}円多いです。兄のお金は？`,
                answer: Math.max(a, b),
                choices: generateChoices(Math.max(a, b), 50, 250),
                suffix: '円',
                hint: '和差算を使おう'
            };
        }

        case CATEGORIES.DATA: {
            const values = [randInt(10, 30), randInt(20, 40), randInt(30, 50), randInt(40, 60)];
            const sorted = [...values].sort((a, b) => a - b);
            const median = (sorted[1] + sorted[2]) / 2;
            return {
                type: QUESTION_TYPES.CHOICE,
                question: `${values.join('、')}の中央値は？`,
                answer: median,
                choices: generateChoices(median, 15, 55),
                hint: '小さい順に並べて真ん中の値'
            };
        }

        default:
            return generateGrade6Question(CATEGORIES.SPEED, level);
    }
}

/**
 * メイン問題生成関数
 */
export function generateQuestion(grade, category, level = 1) {
    switch (grade) {
        case GRADES.GRADE_1:
            return generateGrade1Question(category, level);
        case GRADES.GRADE_2:
            return generateGrade2Question(category, level);
        case GRADES.GRADE_3:
            return generateGrade3Question(category, level);
        case GRADES.GRADE_4:
            return generateGrade4Question(category, level);
        case GRADES.GRADE_5:
            return generateGrade5Question(category, level);
        case GRADES.GRADE_6:
            return generateGrade6Question(category, level);
        default:
            return generateGrade1Question(CATEGORIES.ADD_1, level);
    }
}

/**
 * ステージの問題セットを生成
 */
export function generateStageQuestions(grade, category, count = 5, level = 1) {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push(generateQuestion(grade, category, level));
    }
    return questions;
}

/**
 * ガチャ用の簡単な問題を生成（1桁の四則演算）
 */
export function generateGachaQuestion() {
    const type = randChoice(['add', 'sub', 'mult', 'div']);
    switch (type) {
        case 'add': {
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            return { question: `${a} + ${b}`, answer: a + b };
        }
        case 'sub': {
            const a = randInt(2, 9);
            const b = randInt(1, a - 1);
            return { question: `${a} - ${b}`, answer: a - b };
        }
        case 'mult': {
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            return { question: `${a} × ${b}`, answer: a * b };
        }
        case 'div': {
            const b = randInt(1, 9);
            const answer = randInt(1, 9);
            const a = b * answer;
            return { question: `${a} ÷ ${b}`, answer: answer };
        }
    }
}
