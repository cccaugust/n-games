/**
 * 算数問題データ
 * 学習指導要領を参考に学年・分野別に構成
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

// 分野定義
export const CATEGORIES = {
    ADDITION: 'addition',           // 足し算
    SUBTRACTION: 'subtraction',     // 引き算
    MULTIPLICATION: 'multiplication', // 掛け算
    DIVISION: 'division',           // 割り算
    MIXED: 'mixed',                 // 四則混合
    FRACTION: 'fraction',           // 分数
    DECIMAL: 'decimal',             // 小数
    PERCENTAGE: 'percentage',       // 割合・百分率
    GEOMETRY: 'geometry',           // 図形
    UNITS: 'units',                 // 単位
    TIME: 'time',                   // 時間
    WORD_PROBLEM: 'word_problem'    // 文章題
};

// 分野の日本語名
export const CATEGORY_NAMES = {
    [CATEGORIES.ADDITION]: 'たし算',
    [CATEGORIES.SUBTRACTION]: 'ひき算',
    [CATEGORIES.MULTIPLICATION]: 'かけ算',
    [CATEGORIES.DIVISION]: 'わり算',
    [CATEGORIES.MIXED]: '四則まぜ',
    [CATEGORIES.FRACTION]: '分数',
    [CATEGORIES.DECIMAL]: '小数',
    [CATEGORIES.PERCENTAGE]: '割合',
    [CATEGORIES.GEOMETRY]: '図形',
    [CATEGORIES.UNITS]: '単位',
    [CATEGORIES.TIME]: '時間',
    [CATEGORIES.WORD_PROBLEM]: '文章題'
};

// 学年ごとに解放される分野
export const GRADE_CATEGORIES = {
    [GRADES.GRADE_1]: [CATEGORIES.ADDITION, CATEGORIES.SUBTRACTION],
    [GRADES.GRADE_2]: [CATEGORIES.ADDITION, CATEGORIES.SUBTRACTION, CATEGORIES.MULTIPLICATION, CATEGORIES.TIME],
    [GRADES.GRADE_3]: [CATEGORIES.ADDITION, CATEGORIES.SUBTRACTION, CATEGORIES.MULTIPLICATION, CATEGORIES.DIVISION, CATEGORIES.TIME, CATEGORIES.UNITS],
    [GRADES.GRADE_4]: [CATEGORIES.ADDITION, CATEGORIES.SUBTRACTION, CATEGORIES.MULTIPLICATION, CATEGORIES.DIVISION, CATEGORIES.MIXED, CATEGORIES.DECIMAL, CATEGORIES.GEOMETRY, CATEGORIES.UNITS],
    [GRADES.GRADE_5]: [CATEGORIES.ADDITION, CATEGORIES.SUBTRACTION, CATEGORIES.MULTIPLICATION, CATEGORIES.DIVISION, CATEGORIES.MIXED, CATEGORIES.FRACTION, CATEGORIES.DECIMAL, CATEGORIES.PERCENTAGE, CATEGORIES.GEOMETRY],
    [GRADES.GRADE_6]: Object.values(CATEGORIES)
};

/**
 * 問題生成関数
 * 動的に問題を生成することで無限の問題パターンを提供
 */

// ランダム整数を生成
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 配列からランダムに選択
function randChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 1年生の問題生成
function generateGrade1Question(category) {
    switch (category) {
        case CATEGORIES.ADDITION: {
            // 繰り上がりなし → 繰り上がりあり
            const type = randChoice(['simple', 'carry']);
            if (type === 'simple') {
                const a = randInt(1, 9);
                const b = randInt(1, 9 - a);
                return {
                    question: `${a} + ${b} = ?`,
                    answer: a + b,
                    choices: generateChoices(a + b, 1, 18)
                };
            } else {
                const a = randInt(5, 9);
                const b = randInt(10 - a + 1, 9);
                return {
                    question: `${a} + ${b} = ?`,
                    answer: a + b,
                    choices: generateChoices(a + b, 2, 18)
                };
            }
        }
        case CATEGORIES.SUBTRACTION: {
            const a = randInt(5, 18);
            const b = randInt(1, a - 1);
            return {
                question: `${a} - ${b} = ?`,
                answer: a - b,
                choices: generateChoices(a - b, 0, 17)
            };
        }
        default:
            return generateGrade1Question(CATEGORIES.ADDITION);
    }
}

// 2年生の問題生成
function generateGrade2Question(category) {
    switch (category) {
        case CATEGORIES.ADDITION: {
            // 2桁 + 1桁、2桁 + 2桁
            const type = randChoice(['2d1d', '2d2d']);
            if (type === '2d1d') {
                const a = randInt(10, 90);
                const b = randInt(1, 9);
                return {
                    question: `${a} + ${b} = ?`,
                    answer: a + b,
                    choices: generateChoices(a + b, 11, 99)
                };
            } else {
                const a = randInt(10, 50);
                const b = randInt(10, 49);
                return {
                    question: `${a} + ${b} = ?`,
                    answer: a + b,
                    choices: generateChoices(a + b, 20, 99)
                };
            }
        }
        case CATEGORIES.SUBTRACTION: {
            const a = randInt(20, 99);
            const b = randInt(1, a - 10);
            return {
                question: `${a} - ${b} = ?`,
                answer: a - b,
                choices: generateChoices(a - b, 1, 98)
            };
        }
        case CATEGORIES.MULTIPLICATION: {
            // 九九
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            return {
                question: `${a} × ${b} = ?`,
                answer: a * b,
                choices: generateChoices(a * b, 1, 81)
            };
        }
        case CATEGORIES.TIME: {
            // 時計の読み方
            const hour = randInt(1, 12);
            const minute = randChoice([0, 15, 30, 45]);
            const minuteStr = minute === 0 ? 'ちょうど' : `${minute}ふん`;
            return {
                question: `${hour}じ${minuteStr}の${randInt(1, 2)}時間後は？`,
                answer: ((hour + randInt(1, 2) - 1) % 12) + 1,
                choices: generateChoices(((hour + randInt(1, 2) - 1) % 12) + 1, 1, 12),
                suffix: 'じ'
            };
        }
        default:
            return generateGrade2Question(CATEGORIES.MULTIPLICATION);
    }
}

// 3年生の問題生成
function generateGrade3Question(category) {
    switch (category) {
        case CATEGORIES.ADDITION: {
            // 3桁 + 2桁, 3桁 + 3桁
            const a = randInt(100, 500);
            const b = randInt(100, 499);
            return {
                question: `${a} + ${b} = ?`,
                answer: a + b,
                choices: generateChoices(a + b, 200, 999)
            };
        }
        case CATEGORIES.SUBTRACTION: {
            const a = randInt(200, 999);
            const b = randInt(100, a - 100);
            return {
                question: `${a} - ${b} = ?`,
                answer: a - b,
                choices: generateChoices(a - b, 1, 899)
            };
        }
        case CATEGORIES.MULTIPLICATION: {
            // 2桁 × 1桁
            const a = randInt(10, 30);
            const b = randInt(2, 9);
            return {
                question: `${a} × ${b} = ?`,
                answer: a * b,
                choices: generateChoices(a * b, 20, 270)
            };
        }
        case CATEGORIES.DIVISION: {
            // 割り切れる割り算
            const b = randInt(2, 9);
            const answer = randInt(2, 9);
            const a = b * answer;
            return {
                question: `${a} ÷ ${b} = ?`,
                answer: answer,
                choices: generateChoices(answer, 1, 20)
            };
        }
        case CATEGORIES.UNITS: {
            // 長さの単位
            const type = randChoice(['cm_m', 'm_km']);
            if (type === 'cm_m') {
                const cm = randInt(1, 9) * 100;
                return {
                    question: `${cm}cmは何m？`,
                    answer: cm / 100,
                    choices: generateChoices(cm / 100, 1, 10),
                    suffix: 'm'
                };
            } else {
                const m = randInt(1, 9) * 1000;
                return {
                    question: `${m}mは何km？`,
                    answer: m / 1000,
                    choices: generateChoices(m / 1000, 1, 10),
                    suffix: 'km'
                };
            }
        }
        case CATEGORIES.TIME: {
            // 時間の計算
            const start = randInt(8, 14);
            const duration = randInt(1, 4);
            return {
                question: `${start}時から${duration}時間後は？`,
                answer: start + duration,
                choices: generateChoices(start + duration, 9, 18),
                suffix: '時'
            };
        }
        default:
            return generateGrade3Question(CATEGORIES.DIVISION);
    }
}

// 4年生の問題生成
function generateGrade4Question(category) {
    switch (category) {
        case CATEGORIES.ADDITION:
        case CATEGORIES.SUBTRACTION: {
            // 大きな数
            const a = randInt(1000, 5000);
            const b = randInt(1000, 4999);
            if (category === CATEGORIES.ADDITION) {
                return {
                    question: `${a} + ${b} = ?`,
                    answer: a + b,
                    choices: generateChoices(a + b, 2000, 9999)
                };
            } else {
                const larger = Math.max(a, b);
                const smaller = Math.min(a, b);
                return {
                    question: `${larger} - ${smaller} = ?`,
                    answer: larger - smaller,
                    choices: generateChoices(larger - smaller, 1, 4000)
                };
            }
        }
        case CATEGORIES.MULTIPLICATION: {
            // 2桁 × 2桁
            const a = randInt(10, 30);
            const b = randInt(10, 30);
            return {
                question: `${a} × ${b} = ?`,
                answer: a * b,
                choices: generateChoices(a * b, 100, 900)
            };
        }
        case CATEGORIES.DIVISION: {
            // 2桁 ÷ 1桁（あまりなし）
            const b = randInt(2, 9);
            const answer = randInt(10, 20);
            const a = b * answer;
            return {
                question: `${a} ÷ ${b} = ?`,
                answer: answer,
                choices: generateChoices(answer, 5, 30)
            };
        }
        case CATEGORIES.MIXED: {
            // 四則混合（カッコなし）
            const a = randInt(5, 15);
            const b = randInt(2, 5);
            const c = randInt(1, 10);
            const op = randChoice(['+', '-']);
            if (op === '+') {
                return {
                    question: `${a} × ${b} + ${c} = ?`,
                    answer: a * b + c,
                    choices: generateChoices(a * b + c, 10, 100)
                };
            } else {
                const product = a * b;
                const sub = randInt(1, Math.min(product - 1, 20));
                return {
                    question: `${a} × ${b} - ${sub} = ?`,
                    answer: product - sub,
                    choices: generateChoices(product - sub, 1, 80)
                };
            }
        }
        case CATEGORIES.DECIMAL: {
            // 小数の足し算・引き算
            const a = (randInt(10, 50) / 10).toFixed(1);
            const b = (randInt(10, 50) / 10).toFixed(1);
            const op = randChoice(['+', '-']);
            if (op === '+') {
                const ans = (parseFloat(a) + parseFloat(b)).toFixed(1);
                return {
                    question: `${a} + ${b} = ?`,
                    answer: parseFloat(ans),
                    choices: generateDecimalChoices(parseFloat(ans), 1, 10)
                };
            } else {
                const larger = Math.max(parseFloat(a), parseFloat(b));
                const smaller = Math.min(parseFloat(a), parseFloat(b));
                const ans = (larger - smaller).toFixed(1);
                return {
                    question: `${larger.toFixed(1)} - ${smaller.toFixed(1)} = ?`,
                    answer: parseFloat(ans),
                    choices: generateDecimalChoices(parseFloat(ans), 0, 5)
                };
            }
        }
        case CATEGORIES.GEOMETRY: {
            // 角度
            const type = randChoice(['triangle', 'square']);
            if (type === 'triangle') {
                const a = randInt(30, 70);
                const b = randInt(30, 70);
                return {
                    question: `三角形の2つの角が${a}°と${b}°のとき、残りの角は？`,
                    answer: 180 - a - b,
                    choices: generateChoices(180 - a - b, 20, 120),
                    suffix: '°'
                };
            } else {
                const a = randInt(30, 120);
                return {
                    question: `長方形の1つの角は${a}°...ではなく何度？`,
                    answer: 90,
                    choices: [90, 60, 45, 120]
                };
            }
        }
        case CATEGORIES.UNITS: {
            // 面積
            const a = randInt(2, 10);
            const b = randInt(2, 10);
            return {
                question: `たて${a}cm、よこ${b}cmの長方形の面積は？`,
                answer: a * b,
                choices: generateChoices(a * b, 4, 100),
                suffix: 'cm²'
            };
        }
        default:
            return generateGrade4Question(CATEGORIES.MIXED);
    }
}

// 5年生の問題生成
function generateGrade5Question(category) {
    switch (category) {
        case CATEGORIES.MULTIPLICATION: {
            // 小数のかけ算
            const a = (randInt(10, 30) / 10).toFixed(1);
            const b = randInt(2, 9);
            const ans = (parseFloat(a) * b).toFixed(1);
            return {
                question: `${a} × ${b} = ?`,
                answer: parseFloat(ans),
                choices: generateDecimalChoices(parseFloat(ans), 1, 30)
            };
        }
        case CATEGORIES.DIVISION: {
            // 小数のわり算
            const b = randInt(2, 5);
            const ans = randInt(2, 9);
            const a = (b * ans).toFixed(1);
            return {
                question: `${a} ÷ ${b} = ?`,
                answer: ans,
                choices: generateChoices(ans, 1, 15)
            };
        }
        case CATEGORIES.FRACTION: {
            // 分数の足し算（同分母）
            const denom = randChoice([2, 3, 4, 5, 6, 8]);
            const a = randInt(1, denom - 1);
            const b = randInt(1, denom - a);
            return {
                question: `${a}/${denom} + ${b}/${denom} = ?/${denom}`,
                answer: a + b,
                choices: generateChoices(a + b, 1, denom),
                prefix: '?/'
            };
        }
        case CATEGORIES.DECIMAL: {
            // 小数×小数
            const a = (randInt(10, 30) / 10).toFixed(1);
            const b = (randInt(10, 30) / 10).toFixed(1);
            const ans = (parseFloat(a) * parseFloat(b)).toFixed(2);
            return {
                question: `${a} × ${b} = ?`,
                answer: parseFloat(ans),
                choices: generateDecimalChoices(parseFloat(ans), 1, 15, 2)
            };
        }
        case CATEGORIES.PERCENTAGE: {
            // 割合の基本
            const whole = randChoice([100, 200, 500, 1000]);
            const percent = randChoice([10, 20, 25, 50]);
            return {
                question: `${whole}の${percent}%は？`,
                answer: whole * percent / 100,
                choices: generateChoices(whole * percent / 100, 10, 500)
            };
        }
        case CATEGORIES.GEOMETRY: {
            // 三角形の面積
            const base = randInt(4, 12);
            const height = randInt(4, 12);
            return {
                question: `底辺${base}cm、高さ${height}cmの三角形の面積は？`,
                answer: base * height / 2,
                choices: generateChoices(base * height / 2, 8, 72),
                suffix: 'cm²'
            };
        }
        case CATEGORIES.MIXED: {
            // カッコあり計算
            const a = randInt(2, 10);
            const b = randInt(2, 10);
            const c = randInt(2, 5);
            return {
                question: `(${a} + ${b}) × ${c} = ?`,
                answer: (a + b) * c,
                choices: generateChoices((a + b) * c, 10, 100)
            };
        }
        default:
            return generateGrade5Question(CATEGORIES.FRACTION);
    }
}

// 6年生の問題生成
function generateGrade6Question(category) {
    switch (category) {
        case CATEGORIES.FRACTION: {
            // 分数の四則演算
            const type = randChoice(['add_diff', 'mult', 'div']);
            if (type === 'add_diff') {
                // 異分母の足し算
                const d1 = randChoice([2, 3, 4]);
                const d2 = randChoice([3, 4, 6]);
                if (d1 === d2) return generateGrade6Question(category);
                const n1 = randInt(1, d1 - 1);
                const n2 = randInt(1, d2 - 1);
                const lcm = findLCM(d1, d2);
                const ans = (n1 * (lcm / d1) + n2 * (lcm / d2));
                return {
                    question: `${n1}/${d1} + ${n2}/${d2} = ?/${lcm}`,
                    answer: ans,
                    choices: generateChoices(ans, 1, lcm)
                };
            } else if (type === 'mult') {
                // 分数のかけ算
                const n1 = randInt(1, 3);
                const d1 = randInt(2, 5);
                const n2 = randInt(1, 3);
                const d2 = randInt(2, 5);
                const ansN = n1 * n2;
                const ansD = d1 * d2;
                return {
                    question: `${n1}/${d1} × ${n2}/${d2} の分子は？`,
                    answer: ansN,
                    choices: generateChoices(ansN, 1, 12)
                };
            } else {
                // 分数のわり算
                const n1 = randInt(2, 4);
                const d1 = randInt(3, 6);
                const n2 = randInt(1, 2);
                const d2 = randInt(2, 4);
                const ansN = n1 * d2;
                return {
                    question: `${n1}/${d1} ÷ ${n2}/${d2} の分子は？`,
                    answer: ansN,
                    choices: generateChoices(ansN, 2, 16)
                };
            }
        }
        case CATEGORIES.PERCENTAGE: {
            // 比と割合
            const type = randChoice(['ratio', 'percent_of']);
            if (type === 'ratio') {
                const a = randInt(2, 6);
                const b = randInt(2, 6);
                const total = randChoice([20, 30, 40, 50]);
                return {
                    question: `${a}:${b}の比で${total}を分けると、大きい方は？`,
                    answer: Math.max(a, b) * total / (a + b),
                    choices: generateChoices(Math.max(a, b) * total / (a + b), 5, 40)
                };
            } else {
                const base = randChoice([80, 120, 150, 200]);
                const percent = randChoice([25, 40, 60, 75]);
                return {
                    question: `ある数の${percent}%が${base * percent / 100}のとき、ある数は？`,
                    answer: base,
                    choices: generateChoices(base, 50, 250)
                };
            }
        }
        case CATEGORIES.GEOMETRY: {
            // 円の面積・円周
            const type = randChoice(['area', 'circumference']);
            const r = randChoice([2, 3, 5, 7]);
            if (type === 'circumference') {
                return {
                    question: `半径${r}cmの円周は？（円周率3.14）`,
                    answer: parseFloat((2 * r * 3.14).toFixed(2)),
                    choices: generateDecimalChoices(2 * r * 3.14, 5, 50, 2)
                };
            } else {
                return {
                    question: `半径${r}cmの円の面積は？（円周率3.14）`,
                    answer: parseFloat((r * r * 3.14).toFixed(2)),
                    choices: generateDecimalChoices(r * r * 3.14, 10, 160, 2),
                    suffix: 'cm²'
                };
            }
        }
        case CATEGORIES.MIXED: {
            // 複雑な計算
            const a = randInt(10, 30);
            const b = randInt(2, 5);
            const c = randInt(10, 30);
            const d = randInt(2, 5);
            return {
                question: `${a} × ${b} - ${c} × ${d} = ?`,
                answer: a * b - c * d,
                choices: generateChoices(a * b - c * d, -50, 100)
            };
        }
        case CATEGORIES.WORD_PROBLEM: {
            // 文章題
            const type = randChoice(['speed', 'concentration', 'work']);
            if (type === 'speed') {
                const speed = randChoice([40, 50, 60, 80]);
                const time = randChoice([2, 3, 4, 5]);
                return {
                    question: `時速${speed}kmで${time}時間走ると何km？`,
                    answer: speed * time,
                    choices: generateChoices(speed * time, 50, 400),
                    suffix: 'km'
                };
            } else if (type === 'concentration') {
                const total = randChoice([100, 200, 500]);
                const percent = randChoice([5, 10, 15, 20]);
                return {
                    question: `${total}gの食塩水に${percent}%の塩が入っています。塩は何g？`,
                    answer: total * percent / 100,
                    choices: generateChoices(total * percent / 100, 5, 100),
                    suffix: 'g'
                };
            } else {
                const total = randChoice([12, 18, 24, 30]);
                const aRate = randChoice([3, 4, 6]);
                const bRate = total / aRate;
                return {
                    question: `${total}時間かかる仕事を、Aは${aRate}時間、Bは${bRate}時間でできます。一緒にやると？`,
                    answer: parseFloat((total / (total / aRate + total / bRate)).toFixed(1)),
                    choices: generateDecimalChoices(total / (total / aRate + total / bRate), 1, 10, 1),
                    suffix: '時間'
                };
            }
        }
        default:
            return generateGrade6Question(CATEGORIES.FRACTION);
    }
}

// 選択肢を生成（整数）
function generateChoices(answer, min, max) {
    const choices = new Set([answer]);
    while (choices.size < 4) {
        // 答えの近くに誤答を配置
        const offset = randInt(-5, 5);
        let wrong = answer + offset;
        if (offset === 0) continue;
        if (wrong < min) wrong = min + randInt(0, 5);
        if (wrong > max) wrong = max - randInt(0, 5);
        if (wrong !== answer) {
            choices.add(wrong);
        }
    }
    return shuffleArray([...choices]);
}

// 選択肢を生成（小数）
function generateDecimalChoices(answer, min, max, precision = 1) {
    const choices = new Set([answer]);
    const factor = Math.pow(10, precision);
    while (choices.size < 4) {
        const offset = randInt(-5, 5) / factor * 10;
        let wrong = parseFloat((answer + offset).toFixed(precision));
        if (offset === 0) continue;
        if (wrong < min) wrong = parseFloat((min + randInt(1, 5) / factor).toFixed(precision));
        if (wrong > max) wrong = parseFloat((max - randInt(1, 5) / factor).toFixed(precision));
        if (wrong !== answer) {
            choices.add(wrong);
        }
    }
    return shuffleArray([...choices]);
}

// 配列をシャッフル
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// 最小公倍数を求める
function findLCM(a, b) {
    return (a * b) / findGCD(a, b);
}

// 最大公約数を求める
function findGCD(a, b) {
    return b === 0 ? a : findGCD(b, a % b);
}

/**
 * メイン問題生成関数
 */
export function generateQuestion(grade, category) {
    switch (grade) {
        case GRADES.GRADE_1:
            return generateGrade1Question(category);
        case GRADES.GRADE_2:
            return generateGrade2Question(category);
        case GRADES.GRADE_3:
            return generateGrade3Question(category);
        case GRADES.GRADE_4:
            return generateGrade4Question(category);
        case GRADES.GRADE_5:
            return generateGrade5Question(category);
        case GRADES.GRADE_6:
            return generateGrade6Question(category);
        default:
            return generateGrade1Question(CATEGORIES.ADDITION);
    }
}

/**
 * ステージの問題セットを生成
 */
export function generateStageQuestions(grade, category, count = 5) {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push(generateQuestion(grade, category));
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
            // 1桁 + 1桁（答えが18以下）
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            return {
                question: `${a} + ${b}`,
                answer: a + b
            };
        }
        case 'sub': {
            // 1桁 - 1桁（答えが正の数）
            const a = randInt(2, 9);
            const b = randInt(1, a - 1);
            return {
                question: `${a} - ${b}`,
                answer: a - b
            };
        }
        case 'mult': {
            // 1桁 × 1桁（九九の範囲）
            const a = randInt(1, 9);
            const b = randInt(1, 9);
            return {
                question: `${a} × ${b}`,
                answer: a * b
            };
        }
        case 'div': {
            // 割り切れる割り算（答えが1桁）
            const b = randInt(1, 9);
            const answer = randInt(1, 9);
            const a = b * answer;
            return {
                question: `${a} ÷ ${b}`,
                answer: answer
            };
        }
    }
}
