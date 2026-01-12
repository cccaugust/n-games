/**
 * 算数バトル - メインゲームファイル
 */

import {
    MONSTERS, TYPES, TYPE_NAMES, TYPE_COLORS,
    RARITY, RARITY_COLORS, RARITY_RATES,
    getMonsterById, calculateStats, getTypeMultiplier
} from './monsters.js';

import {
    GRADES, CATEGORIES, CATEGORY_NAMES, GRADE_CATEGORIES,
    generateQuestion, generateStageQuestions, generateGachaQuestion
} from './questions.js';

import {
    STAGES, GRADE_NAMES, RANKS, RANK_COLORS,
    getStage, getGradeStages, isStageUnlocked,
    calculateRank, calculateRewards
} from './stages.js';

import {
    getPlayerList, addPlayer, loadPlayerData, savePlayerData,
    addMonsterToPlayer, addExpToMonster, addToParty, removeFromParty,
    recordStageClear, spendCoins, updateStats, recordGachaRoll,
    canEvolve, evolveMonster, giveStarterMonster
} from './save.js';

// ===========================================
// グローバル状態
// ===========================================
let currentPlayer = null;
let currentScreen = 'title';
let battleState = null;
let gachaState = null;
let audioContext = null;

// DOM要素
const app = document.getElementById('app');

// ===========================================
// 効果音
// ===========================================
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioContext) return;

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.connect(gain);
    gain.connect(audioContext.destination);

    switch (type) {
        case 'correct':
            osc.frequency.setValueAtTime(523.25, audioContext.currentTime);
            osc.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            osc.start();
            osc.stop(audioContext.currentTime + 0.3);
            break;
        case 'wrong':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioContext.currentTime);
            osc.frequency.setValueAtTime(150, audioContext.currentTime + 0.1);
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            osc.start();
            osc.stop(audioContext.currentTime + 0.2);
            break;
        case 'attack':
            osc.type = 'square';
            osc.frequency.setValueAtTime(440, audioContext.currentTime);
            osc.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.05);
            osc.frequency.linearRampToValueAtTime(220, audioContext.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            osc.start();
            osc.stop(audioContext.currentTime + 0.15);
            break;
        case 'levelup':
            osc.frequency.setValueAtTime(523.25, audioContext.currentTime);
            osc.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
            osc.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
            osc.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.3);
            gain.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc.start();
            osc.stop(audioContext.currentTime + 0.5);
            break;
        case 'gacha':
            osc.type = 'sine';
            for (let i = 0; i < 5; i++) {
                osc.frequency.setValueAtTime(400 + i * 100, audioContext.currentTime + i * 0.1);
            }
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc.start();
            osc.stop(audioContext.currentTime + 0.5);
            break;
        case 'click':
            osc.frequency.setValueAtTime(800, audioContext.currentTime);
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
            osc.start();
            osc.stop(audioContext.currentTime + 0.05);
            break;
    }
}

// ===========================================
// モンスターカード描画
// ===========================================
function renderMonsterCard(monster, level = 1, size = 'normal') {
    const monsterData = typeof monster === 'string' ? getMonsterById(monster) : monster;
    if (!monsterData) return '<div class="monster-card empty"></div>';

    const stats = calculateStats(monsterData, level);
    const primaryColor = TYPE_COLORS[monsterData.types[0]];
    const secondaryColor = monsterData.types[1] ? TYPE_COLORS[monsterData.types[1]] : primaryColor;
    const rarityColor = RARITY_COLORS[monsterData.rarity];
    const stars = '★'.repeat(monsterData.rarity);

    const sizeClass = size === 'small' ? 'monster-card-small' : size === 'large' ? 'monster-card-large' : '';

    return `
        <div class="monster-card ${sizeClass}" style="--primary-color: ${primaryColor}; --secondary-color: ${secondaryColor}; --rarity-color: ${rarityColor}">
            <div class="card-frame">
                <div class="card-bg" style="background: linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}40)">
                    <div class="card-icon">
                        ${renderMonsterIcon(monsterData)}
                    </div>
                </div>
                <div class="card-info-bar">
                    <span class="card-name">${monsterData.name}</span>
                    <span class="card-level">Lv.${level}</span>
                </div>
                <div class="card-rarity" style="color: ${rarityColor}">${stars}</div>
                <div class="card-types">
                    ${monsterData.types.map(t => `<span class="type-badge" style="background: ${TYPE_COLORS[t]}">${TYPE_NAMES[t]}</span>`).join('')}
                </div>
                ${size !== 'small' ? `
                <div class="card-stats">
                    <span>HP ${stats.hp}</span>
                    <span>攻 ${stats.attack}</span>
                    <span>防 ${stats.defense}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderMonsterIcon(monster) {
    const color = TYPE_COLORS[monster.types[0]];
    const secondary = monster.types[1] ? TYPE_COLORS[monster.types[1]] : color;

    // シンプルなSVGアイコンを生成
    const shapes = {
        [RARITY.COMMON]: `<circle cx="50" cy="50" r="35" fill="${color}"/>`,
        [RARITY.UNCOMMON]: `<polygon points="50,15 85,85 15,85" fill="${color}"/>`,
        [RARITY.RARE]: `<rect x="20" y="20" width="60" height="60" rx="10" fill="${color}"/>`,
        [RARITY.EPIC]: `<polygon points="50,10 61,40 95,40 68,60 79,90 50,70 21,90 32,60 5,40 39,40" fill="${color}"/>`,
        [RARITY.LEGENDARY]: `<polygon points="50,5 61,35 95,35 68,55 79,95 50,70 21,95 32,55 5,35 39,35" fill="${color}" stroke="${secondary}" stroke-width="3"/>`
    };

    return `
        <svg viewBox="0 0 100 100" class="monster-svg">
            <defs>
                <radialGradient id="grad-${monster.id}" cx="30%" cy="30%" r="70%">
                    <stop offset="0%" style="stop-color:white;stop-opacity:0.3" />
                    <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
                </radialGradient>
            </defs>
            ${shapes[monster.rarity] || shapes[RARITY.COMMON]}
            <circle cx="50" cy="50" r="35" fill="url(#grad-${monster.id})"/>
            <text x="50" y="58" text-anchor="middle" fill="white" font-size="20" font-weight="bold">${monster.name.charAt(0)}</text>
        </svg>
    `;
}

// ===========================================
// 画面描画
// ===========================================

// タイトル画面
function renderTitleScreen() {
    app.innerHTML = `
        <div class="screen title-screen">
            <div class="title-bg">
                <div class="floating-shapes"></div>
            </div>
            <div class="title-content">
                <h1 class="game-title">
                    <span class="title-math">算数</span>
                    <span class="title-battle">バトル</span>
                </h1>
                <p class="subtitle">モンスターと一緒に算数マスターになろう！</p>
                <button class="btn btn-primary btn-large" id="startBtn">
                    はじめる
                </button>
            </div>
        </div>
    `;

    document.getElementById('startBtn').onclick = () => {
        initAudio();
        playSound('click');
        showPlayerSelect();
    };
}

// プレイヤー選択画面
function showPlayerSelect() {
    const players = getPlayerList();

    app.innerHTML = `
        <div class="screen player-select-screen">
            <h2>プレイヤーをえらんでね</h2>
            <div class="player-list">
                ${players.map(p => `
                    <button class="player-item" data-id="${p.id}">
                        <span class="player-name">${p.name}</span>
                        <span class="player-arrow">→</span>
                    </button>
                `).join('')}
                <button class="player-item new-player" id="newPlayerBtn">
                    <span class="plus">+</span>
                    <span>あたらしくはじめる</span>
                </button>
            </div>
            <button class="btn btn-ghost back-btn" id="backToTitle">もどる</button>
        </div>
    `;

    document.querySelectorAll('.player-item[data-id]').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            const playerId = btn.dataset.id;
            currentPlayer = loadPlayerData(playerId);
            if (currentPlayer) {
                showMainMenu();
            }
        };
    });

    document.getElementById('newPlayerBtn').onclick = () => {
        playSound('click');
        showNewPlayerForm();
    };

    document.getElementById('backToTitle').onclick = () => {
        playSound('click');
        renderTitleScreen();
    };
}

// 新規プレイヤー作成
function showNewPlayerForm() {
    app.innerHTML = `
        <div class="screen new-player-screen">
            <h2>なまえを入力してね</h2>
            <input type="text" id="playerNameInput" class="name-input" placeholder="なまえ" maxlength="10">
            <div class="starter-select">
                <h3>最初のモンスターをえらぼう！</h3>
                <div class="starter-grid">
                    ${['M001', 'M002', 'M003', 'M004'].map(id => {
        const m = getMonsterById(id);
        return `
                            <div class="starter-option" data-id="${id}">
                                ${renderMonsterCard(m, 1, 'normal')}
                                <p class="starter-desc">${m.description}</p>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>
            <button class="btn btn-primary btn-large" id="createPlayerBtn" disabled>けってい</button>
            <button class="btn btn-ghost back-btn" id="backToSelect">もどる</button>
        </div>
    `;

    let selectedStarter = null;
    const input = document.getElementById('playerNameInput');
    const createBtn = document.getElementById('createPlayerBtn');

    document.querySelectorAll('.starter-option').forEach(opt => {
        opt.onclick = () => {
            playSound('click');
            document.querySelectorAll('.starter-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            selectedStarter = opt.dataset.id;
            createBtn.disabled = !input.value.trim() || !selectedStarter;
        };
    });

    input.oninput = () => {
        createBtn.disabled = !input.value.trim() || !selectedStarter;
    };

    createBtn.onclick = () => {
        if (!input.value.trim() || !selectedStarter) return;
        playSound('levelup');

        currentPlayer = addPlayer(input.value.trim());
        giveStarterMonster(currentPlayer, selectedStarter);
        addToParty(currentPlayer, 0);
        currentPlayer = loadPlayerData(currentPlayer.id);

        showMainMenu();
    };

    document.getElementById('backToSelect').onclick = () => {
        playSound('click');
        showPlayerSelect();
    };
}

// メインメニュー
function showMainMenu() {
    app.innerHTML = `
        <div class="screen main-menu-screen">
            <header class="menu-header">
                <div class="player-info">
                    <span class="player-name">${currentPlayer.name}</span>
                    <span class="coin-display">💰 ${currentPlayer.coins}</span>
                </div>
            </header>
            <div class="menu-grid">
                <button class="menu-item" id="menuBattle">
                    <span class="menu-icon">⚔️</span>
                    <span class="menu-label">バトル</span>
                </button>
                <button class="menu-item" id="menuGacha">
                    <span class="menu-icon">🎰</span>
                    <span class="menu-label">ガチャ</span>
                </button>
                <button class="menu-item" id="menuParty">
                    <span class="menu-icon">👥</span>
                    <span class="menu-label">パーティ</span>
                </button>
                <button class="menu-item" id="menuMonsters">
                    <span class="menu-icon">📖</span>
                    <span class="menu-label">ずかん</span>
                </button>
            </div>
            <button class="btn btn-ghost" id="menuLogout">プレイヤーをかえる</button>
        </div>
    `;

    document.getElementById('menuBattle').onclick = () => {
        playSound('click');
        showGradeSelect();
    };
    document.getElementById('menuGacha').onclick = () => {
        playSound('click');
        showGachaScreen();
    };
    document.getElementById('menuParty').onclick = () => {
        playSound('click');
        showPartyScreen();
    };
    document.getElementById('menuMonsters').onclick = () => {
        playSound('click');
        showMonsterBook();
    };
    document.getElementById('menuLogout').onclick = () => {
        playSound('click');
        currentPlayer = null;
        showPlayerSelect();
    };
}

// 学年選択
function showGradeSelect() {
    app.innerHTML = `
        <div class="screen grade-select-screen">
            <h2>学年をえらぼう</h2>
            <div class="grade-grid">
                ${Object.values(GRADES).map(grade => `
                    <button class="grade-btn" data-grade="${grade}">
                        <span class="grade-num">${grade}</span>
                        <span class="grade-label">${GRADE_NAMES[grade]}</span>
                    </button>
                `).join('')}
            </div>
            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>
    `;

    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            showCategorySelect(parseInt(btn.dataset.grade));
        };
    });

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

// 分野選択
function showCategorySelect(grade) {
    const categories = GRADE_CATEGORIES[grade];
    const gradeStages = getGradeStages(grade);

    app.innerHTML = `
        <div class="screen category-select-screen">
            <h2>${GRADE_NAMES[grade]} - 分野をえらぼう</h2>
            <div class="category-grid">
                ${categories.map(cat => {
        const stages = gradeStages[cat] || [];
        const clearedCount = stages.filter(s => currentPlayer.clearedStages.includes(s.id)).length;
        return `
                        <button class="category-btn" data-category="${cat}">
                            <span class="category-name">${CATEGORY_NAMES[cat]}</span>
                            <span class="category-progress">${clearedCount}/${stages.length}</span>
                        </button>
                    `;
    }).join('')}
            </div>
            <button class="btn btn-ghost back-btn" id="backToGrade">もどる</button>
        </div>
    `;

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            showStageSelect(grade, btn.dataset.category);
        };
    });

    document.getElementById('backToGrade').onclick = () => {
        playSound('click');
        showGradeSelect();
    };
}

// ステージ選択
function showStageSelect(grade, category) {
    const stages = STAGES[grade]?.[category] || [];

    app.innerHTML = `
        <div class="screen stage-select-screen">
            <h2>${GRADE_NAMES[grade]} - ${CATEGORY_NAMES[category]}</h2>
            <div class="stage-list">
                ${stages.map((stage, idx) => {
        const isCleared = currentPlayer.clearedStages.includes(stage.id);
        const rank = currentPlayer.stageRanks[stage.id] || '';
        const isLocked = !isStageUnlocked(stage.id, currentPlayer.clearedStages);

        return `
                        <button class="stage-btn ${isLocked ? 'locked' : ''} ${isCleared ? 'cleared' : ''}"
                                data-stage-idx="${idx}" ${isLocked ? 'disabled' : ''}>
                            <div class="stage-info">
                                <span class="stage-name">${stage.name}</span>
                                <span class="stage-desc">${stage.description}</span>
                            </div>
                            <div class="stage-status">
                                ${isLocked ? '🔒' : rank ? `<span class="rank rank-${rank.toLowerCase()}">${rank}</span>` : ''}
                            </div>
                        </button>
                    `;
    }).join('')}
            </div>
            <button class="btn btn-ghost back-btn" id="backToCategory">もどる</button>
        </div>
    `;

    document.querySelectorAll('.stage-btn:not([disabled])').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            const stageIdx = parseInt(btn.dataset.stageIdx);
            startBattle(stages[stageIdx]);
        };
    });

    document.getElementById('backToCategory').onclick = () => {
        playSound('click');
        showCategorySelect(grade);
    };
}

// ===========================================
// バトルシステム
// ===========================================
function startBattle(stage) {
    // パーティが空の場合はバトルを開始できない
    if (!currentPlayer.party || currentPlayer.party.length === 0) {
        showNoPartyWarning(stage);
        return;
    }

    const questions = generateStageQuestions(stage.grade, stage.category, stage.questionCount);

    battleState = {
        stage: stage,
        questions: questions,
        currentQuestion: 0,
        correctCount: 0,
        startTime: Date.now(),
        enemyHp: stage.enemy.hp,
        enemyMaxHp: stage.enemy.hp,
        partyHp: currentPlayer.party.map(idx => {
            const m = currentPlayer.monsters[idx];
            if (!m) return 0;
            const data = getMonsterById(m.monsterId);
            return data ? calculateStats(data, m.level).hp : 0;
        }),
        partyMaxHp: currentPlayer.party.map(idx => {
            const m = currentPlayer.monsters[idx];
            if (!m) return 0;
            const data = getMonsterById(m.monsterId);
            return data ? calculateStats(data, m.level).hp : 0;
        })
    };

    renderBattle();
}

function showNoPartyWarning(stage) {
    app.innerHTML = `
        <div class="screen no-party-screen">
            <h2>パーティがいません！</h2>
            <p>バトルするには、まずパーティにモンスターを編成しよう！</p>
            <div class="result-buttons">
                <button class="btn btn-primary" id="goToPartyBtn">パーティ編成へ</button>
                <button class="btn btn-ghost" id="backToStagesBtn">ステージ選択へ</button>
            </div>
        </div>
    `;

    document.getElementById('goToPartyBtn').onclick = () => {
        playSound('click');
        showPartyScreen();
    };

    document.getElementById('backToStagesBtn').onclick = () => {
        playSound('click');
        showStageSelect(stage.grade, stage.category);
    };
}

function renderBattle() {
    const bs = battleState;
    const q = bs.questions[bs.currentQuestion];
    const stage = bs.stage;

    // パーティのステータス
    const partyHtml = currentPlayer.party.map((idx, i) => {
        const m = currentPlayer.monsters[idx];
        const data = getMonsterById(m.monsterId);
        const hpPercent = Math.max(0, bs.partyHp[i] / bs.partyMaxHp[i] * 100);
        return `
            <div class="party-member ${bs.partyHp[i] <= 0 ? 'fainted' : ''}">
                ${renderMonsterCard(data, m.level, 'small')}
                <div class="hp-bar-mini">
                    <div class="hp-fill" style="width: ${hpPercent}%"></div>
                </div>
            </div>
        `;
    }).join('');

    app.innerHTML = `
        <div class="screen battle-screen">
            <div class="battle-field">
                <div class="enemy-area">
                    <div class="enemy-info">
                        <span class="enemy-name">${stage.enemy.name}</span>
                        <div class="enemy-types">
                            ${stage.enemy.types.map(t => `<span class="type-badge-small" style="background: ${TYPE_COLORS[t]}">${TYPE_NAMES[t]}</span>`).join('')}
                        </div>
                    </div>
                    <div class="enemy-hp-bar">
                        <div class="hp-fill" style="width: ${bs.enemyHp / bs.enemyMaxHp * 100}%"></div>
                        <span class="hp-text">${bs.enemyHp} / ${bs.enemyMaxHp}</span>
                    </div>
                    <div class="enemy-visual" id="enemyVisual">
                        <div class="enemy-sprite" style="background: linear-gradient(135deg, ${TYPE_COLORS[stage.enemy.types[0]]}, ${stage.enemy.types[1] ? TYPE_COLORS[stage.enemy.types[1]] : TYPE_COLORS[stage.enemy.types[0]]})">
                            ${stage.enemy.name.charAt(0)}
                        </div>
                    </div>
                </div>

                <div class="party-area">
                    ${partyHtml}
                </div>
            </div>

            <div class="question-area">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(bs.currentQuestion / bs.questions.length) * 100}%"></div>
                    <span class="progress-text">問題 ${bs.currentQuestion + 1} / ${bs.questions.length}</span>
                </div>
                <div class="question-box">
                    <p class="question-text">${q.question}</p>
                </div>
                <div class="answer-grid" id="answerGrid">
                    ${q.choices.map((choice, i) => `
                        <button class="answer-btn" data-answer="${choice}">
                            ${q.prefix || ''}${choice}${q.suffix || ''}
                        </button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.onclick = () => handleAnswer(parseFloat(btn.dataset.answer));
    });
}

function handleAnswer(answer) {
    const bs = battleState;
    const q = bs.questions[bs.currentQuestion];
    const isCorrect = Math.abs(answer - q.answer) < 0.001;

    if (isCorrect) {
        playSound('correct');
        bs.correctCount++;

        // ダメージ計算
        let totalDamage = 0;
        currentPlayer.party.forEach((idx, i) => {
            if (bs.partyHp[i] <= 0) return;
            const m = currentPlayer.monsters[idx];
            const data = getMonsterById(m.monsterId);
            const stats = calculateStats(data, m.level);

            // タイプ相性
            const typeMultiplier = getTypeMultiplier(data.types[0], bs.stage.enemy.types);

            // ダメージ = 攻撃力 × タイプ相性
            const damage = Math.floor(stats.attack * typeMultiplier);
            totalDamage += damage;
        });

        // エフェクト表示
        showDamageEffect(totalDamage);
        playSound('attack');

        bs.enemyHp = Math.max(0, bs.enemyHp - totalDamage);
    } else {
        playSound('wrong');

        // 敵からの反撃
        const enemyDamage = bs.stage.enemy.attack;
        const targetIdx = bs.partyHp.findIndex(hp => hp > 0);
        if (targetIdx >= 0) {
            bs.partyHp[targetIdx] = Math.max(0, bs.partyHp[targetIdx] - enemyDamage);
            showEnemyAttackEffect(enemyDamage);
        }
    }

    // 次の問題へ
    bs.currentQuestion++;

    // 勝敗判定
    setTimeout(() => {
        if (bs.enemyHp <= 0) {
            battleVictory();
        } else if (bs.partyHp.every(hp => hp <= 0)) {
            battleDefeat();
        } else if (bs.currentQuestion >= bs.questions.length) {
            // 問題終了だが敵が残っている
            if (bs.correctCount >= Math.ceil(bs.questions.length * 0.6)) {
                battleVictory();
            } else {
                battleDefeat();
            }
        } else {
            renderBattle();
        }
    }, 500);
}

function showDamageEffect(damage) {
    const enemy = document.getElementById('enemyVisual');
    if (!enemy) return;

    const effect = document.createElement('div');
    effect.className = 'damage-effect';
    effect.textContent = `-${damage}`;
    enemy.appendChild(effect);

    enemy.classList.add('shake');
    setTimeout(() => {
        enemy.classList.remove('shake');
        effect.remove();
    }, 500);
}

function showEnemyAttackEffect(damage) {
    const party = document.querySelector('.party-area');
    if (!party) return;

    const effect = document.createElement('div');
    effect.className = 'damage-effect enemy-damage';
    effect.textContent = `-${damage}`;
    party.appendChild(effect);

    party.classList.add('shake');
    setTimeout(() => {
        party.classList.remove('shake');
        effect.remove();
    }, 500);
}

function battleVictory() {
    playSound('levelup');

    const bs = battleState;
    const clearTime = (Date.now() - bs.startTime) / 1000;
    const correctRate = bs.correctCount / bs.questions.length;
    const rank = calculateRank(clearTime, correctRate, bs.questions.length);

    const isFirstClear = !currentPlayer.clearedStages.includes(bs.stage.id);
    const rewards = calculateRewards(bs.stage, rank, isFirstClear);

    // 報酬付与
    recordStageClear(currentPlayer, bs.stage.id, rank, rewards.coins);
    updateStats(currentPlayer, bs.questions.length, bs.correctCount);

    // 経験値付与
    const expPerMonster = Math.floor(bs.stage.grade * 10 + bs.stage.level * 5);
    currentPlayer.party.forEach((idx, i) => {
        if (bs.partyHp[i] > 0) {
            addExpToMonster(currentPlayer, idx, expPerMonster);
        }
    });

    currentPlayer = loadPlayerData(currentPlayer.id);

    showBattleResult(true, { rank, rewards, clearTime, correctRate, exp: expPerMonster });
}

function battleDefeat() {
    playSound('wrong');

    const bs = battleState;
    updateStats(currentPlayer, bs.questions.length, bs.correctCount);
    currentPlayer = loadPlayerData(currentPlayer.id);

    showBattleResult(false, {});
}

function showBattleResult(isVictory, data) {
    app.innerHTML = `
        <div class="screen result-screen ${isVictory ? 'victory' : 'defeat'}">
            <h1 class="result-title">${isVictory ? '勝利！' : '敗北...'}</h1>
            ${isVictory ? `
                <div class="result-details">
                    <div class="rank-display">
                        <span class="rank-label">ランク</span>
                        <span class="rank rank-${data.rank.toLowerCase()}">${data.rank}</span>
                    </div>
                    <div class="reward-display">
                        <span>💰 +${data.rewards.coins} コイン</span>
                        ${data.rewards.isFirstClear ? '<span class="first-clear">初クリアボーナス！</span>' : ''}
                    </div>
                    <div class="stats-display">
                        <span>正答率: ${Math.round(data.correctRate * 100)}%</span>
                        <span>クリア時間: ${Math.round(data.clearTime)}秒</span>
                        <span>獲得経験値: +${data.exp}</span>
                    </div>
                </div>
            ` : `
                <p class="defeat-message">もう一度チャレンジしよう！</p>
            `}
            <div class="result-buttons">
                <button class="btn btn-primary" id="retryBtn">もう一度</button>
                <button class="btn btn-ghost" id="backToStagesBtn">ステージ選択へ</button>
            </div>
        </div>
    `;

    document.getElementById('retryBtn').onclick = () => {
        playSound('click');
        startBattle(battleState.stage);
    };

    document.getElementById('backToStagesBtn').onclick = () => {
        playSound('click');
        showStageSelect(battleState.stage.grade, battleState.stage.category);
    };
}

// ===========================================
// ガチャシステム
// ===========================================
const GACHA_COST = 50;
const GACHA_TIME = 5; // 秒

function showGachaScreen() {
    app.innerHTML = `
        <div class="screen gacha-screen">
            <h2>ガチャ</h2>
            <p class="gacha-desc">5秒間で問題を解いて、モンスターをゲット！</p>
            <p class="gacha-cost">💰 ${GACHA_COST} コイン</p>
            <p class="current-coins">所持: 💰 ${currentPlayer.coins}</p>
            <button class="btn btn-primary btn-large" id="startGachaBtn" ${currentPlayer.coins < GACHA_COST ? 'disabled' : ''}>
                ガチャをまわす！
            </button>
            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>
    `;

    document.getElementById('startGachaBtn').onclick = () => {
        if (currentPlayer.coins < GACHA_COST) return;
        playSound('click');
        spendCoins(currentPlayer, GACHA_COST);
        currentPlayer = loadPlayerData(currentPlayer.id);
        startGacha();
    };

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

function startGacha() {
    gachaState = {
        timeLeft: GACHA_TIME,
        correctCount: 0,
        currentQuestion: generateGachaQuestion()
    };

    renderGachaGame();

    const timer = setInterval(() => {
        gachaState.timeLeft--;
        updateGachaTimer();

        if (gachaState.timeLeft <= 0) {
            clearInterval(timer);
            finishGacha();
        }
    }, 1000);

    gachaState.timer = timer;
}

function renderGachaGame() {
    const q = gachaState.currentQuestion;

    app.innerHTML = `
        <div class="screen gacha-game-screen">
            <div class="gacha-timer" id="gachaTimer">
                <span class="timer-value">${gachaState.timeLeft}</span>
                <span class="timer-label">秒</span>
            </div>
            <div class="gacha-score">
                正解: <span id="gachaScore">${gachaState.correctCount}</span>
            </div>
            <div class="gacha-question" id="gachaQuestion">
                ${q.question} = ?
            </div>
            <div class="gacha-input-area">
                <input type="number" id="gachaInput" class="gacha-input" inputmode="numeric" autofocus>
                <button class="btn btn-primary" id="gachaSubmit">OK</button>
            </div>
        </div>
    `;

    const input = document.getElementById('gachaInput');
    const submit = document.getElementById('gachaSubmit');

    const checkAnswer = () => {
        const userAnswer = parseInt(input.value);
        if (isNaN(userAnswer)) return;

        if (userAnswer === gachaState.currentQuestion.answer) {
            playSound('correct');
            gachaState.correctCount++;
            document.getElementById('gachaScore').textContent = gachaState.correctCount;
        } else {
            playSound('wrong');
        }

        // 次の問題
        gachaState.currentQuestion = generateGachaQuestion();
        document.getElementById('gachaQuestion').textContent = gachaState.currentQuestion.question + ' = ?';
        input.value = '';
        input.focus();
    };

    submit.onclick = checkAnswer;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            checkAnswer();
        }
    };

    input.focus();
}

function updateGachaTimer() {
    const timer = document.getElementById('gachaTimer');
    if (timer) {
        timer.querySelector('.timer-value').textContent = gachaState.timeLeft;
    }
}

function finishGacha() {
    playSound('gacha');
    recordGachaRoll(currentPlayer, 1);

    // 獲得モンスターを決定
    const monstersWon = [];
    for (let i = 0; i < gachaState.correctCount; i++) {
        const monster = rollGacha();
        monstersWon.push(monster);
        addMonsterToPlayer(currentPlayer, monster.id);
    }

    currentPlayer = loadPlayerData(currentPlayer.id);

    showGachaResult(monstersWon);
}

function rollGacha() {
    // レアリティを決定
    const roll = Math.random() * 100;
    let cumulative = 0;
    let rarity = RARITY.COMMON;

    for (const [r, rate] of Object.entries(RARITY_RATES)) {
        cumulative += rate;
        if (roll < cumulative) {
            rarity = parseInt(r);
            break;
        }
    }

    // そのレアリティのモンスターからランダムに選択
    const candidates = MONSTERS.filter(m => m.rarity === rarity);
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function showGachaResult(monsters) {
    app.innerHTML = `
        <div class="screen gacha-result-screen">
            <h2>ガチャ結果</h2>
            <p class="gacha-result-count">${monsters.length}体ゲット！</p>
            <div class="gacha-monsters">
                ${monsters.map(m => renderMonsterCard(m, 1, 'normal')).join('')}
            </div>
            ${monsters.length === 0 ? '<p class="no-monster">残念...次は頑張ろう！</p>' : ''}
            <div class="result-buttons">
                <button class="btn btn-primary" id="gachaAgainBtn" ${currentPlayer.coins < GACHA_COST ? 'disabled' : ''}>
                    もう一回 (💰${GACHA_COST})
                </button>
                <button class="btn btn-ghost" id="backToMenuBtn">メニューへ</button>
            </div>
        </div>
    `;

    document.getElementById('gachaAgainBtn').onclick = () => {
        if (currentPlayer.coins < GACHA_COST) return;
        playSound('click');
        spendCoins(currentPlayer, GACHA_COST);
        currentPlayer = loadPlayerData(currentPlayer.id);
        startGacha();
    };

    document.getElementById('backToMenuBtn').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

// ===========================================
// パーティ編成
// ===========================================
function showPartyScreen() {
    const partyMonsters = currentPlayer.party.map(idx => {
        const m = currentPlayer.monsters[idx];
        return { ...m, data: getMonsterById(m.monsterId), idx };
    });

    const allMonsters = currentPlayer.monsters.map((m, idx) => ({
        ...m, data: getMonsterById(m.monsterId), idx
    }));

    app.innerHTML = `
        <div class="screen party-screen">
            <h2>パーティ編成</h2>
            <div class="party-slots">
                <h3>パーティ (${currentPlayer.party.length}/4)</h3>
                <div class="party-grid">
                    ${[0, 1, 2, 3].map(i => {
        const pm = partyMonsters[i];
        return pm ? `
                            <div class="party-slot filled" data-party-idx="${i}">
                                ${renderMonsterCard(pm.data, pm.level, 'small')}
                                <button class="remove-btn" data-party-idx="${i}">×</button>
                            </div>
                        ` : `
                            <div class="party-slot empty">
                                <span>空き</span>
                            </div>
                        `;
    }).join('')}
                </div>
            </div>
            <div class="monster-box">
                <h3>所持モンスター (${allMonsters.length}体)</h3>
                <div class="monster-box-grid">
                    ${allMonsters.map(m => `
                        <div class="box-monster ${currentPlayer.party.includes(m.idx) ? 'in-party' : ''}"
                             data-monster-idx="${m.idx}">
                            ${renderMonsterCard(m.data, m.level, 'small')}
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>
    `;

    // パーティから外す
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            playSound('click');
            const partyIdx = parseInt(btn.dataset.partyIdx);
            removeFromParty(currentPlayer, partyIdx);
            currentPlayer = loadPlayerData(currentPlayer.id);
            showPartyScreen();
        };
    });

    // パーティに追加
    document.querySelectorAll('.box-monster:not(.in-party)').forEach(el => {
        el.onclick = () => {
            if (currentPlayer.party.length >= 4) return;
            playSound('click');
            const monsterIdx = parseInt(el.dataset.monsterIdx);
            addToParty(currentPlayer, monsterIdx);
            currentPlayer = loadPlayerData(currentPlayer.id);
            showPartyScreen();
        };
    });

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

// ===========================================
// モンスター図鑑
// ===========================================
function showMonsterBook() {
    const discovered = currentPlayer.discoveredMonsters;

    app.innerHTML = `
        <div class="screen monster-book-screen">
            <h2>モンスターずかん</h2>
            <p class="book-progress">発見: ${discovered.length} / ${MONSTERS.length}</p>
            <div class="book-grid">
                ${MONSTERS.map(m => {
        const isDiscovered = discovered.includes(m.id);
        const owned = currentPlayer.monsters.find(om => om.monsterId === m.id);
        return `
                        <div class="book-entry ${isDiscovered ? 'discovered' : 'undiscovered'}"
                             data-monster-id="${m.id}">
                            ${isDiscovered ? renderMonsterCard(m, owned ? owned.level : 1, 'small') : `
                                <div class="unknown-monster">
                                    <span class="unknown-icon">?</span>
                                    <span class="unknown-rarity">${'★'.repeat(m.rarity)}</span>
                                </div>
                            `}
                        </div>
                    `;
    }).join('')}
            </div>
            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>
    `;

    // 発見済みモンスターの詳細表示
    document.querySelectorAll('.book-entry.discovered').forEach(el => {
        el.onclick = () => {
            playSound('click');
            showMonsterDetail(el.dataset.monsterId);
        };
    });

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

function showMonsterDetail(monsterId) {
    const monster = getMonsterById(monsterId);
    const owned = currentPlayer.monsters.find(m => m.monsterId === monsterId);
    const level = owned ? owned.level : 1;
    const stats = calculateStats(monster, level);
    const canEvo = owned && canEvolve(currentPlayer, currentPlayer.monsters.indexOf(owned), MONSTERS);

    app.innerHTML = `
        <div class="screen monster-detail-screen">
            <div class="detail-card-large">
                ${renderMonsterCard(monster, level, 'large')}
            </div>
            <div class="detail-info">
                <h2>${monster.name}</h2>
                <p class="detail-desc">${monster.description}</p>
                <div class="detail-stats">
                    <div class="stat-row">
                        <span class="stat-label">HP</span>
                        <span class="stat-value">${stats.hp}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">こうげき</span>
                        <span class="stat-value">${stats.attack}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">ぼうぎょ</span>
                        <span class="stat-value">${stats.defense}</span>
                    </div>
                </div>
                <div class="detail-skill">
                    <h3>スキル: ${monster.skill.name}</h3>
                    <p>${monster.skill.description}</p>
                </div>
                ${monster.evolution ? `
                    <div class="evolution-info">
                        <p>進化: Lv.${monster.evolutionLevel}で ${getMonsterById(monster.evolution)?.name || '???'} に進化</p>
                        ${canEvo ? `<button class="btn btn-primary" id="evolveBtn">進化する！</button>` : ''}
                    </div>
                ` : ''}
            </div>
            <button class="btn btn-ghost back-btn" id="backToBook">もどる</button>
        </div>
    `;

    if (canEvo) {
        document.getElementById('evolveBtn').onclick = () => {
            playSound('levelup');
            const idx = currentPlayer.monsters.findIndex(m => m.monsterId === monsterId);
            evolveMonster(currentPlayer, idx, MONSTERS);
            currentPlayer = loadPlayerData(currentPlayer.id);
            const newMonster = currentPlayer.monsters[idx];
            showMonsterDetail(newMonster.monsterId);
        };
    }

    document.getElementById('backToBook').onclick = () => {
        playSound('click');
        showMonsterBook();
    };
}

// ===========================================
// 初期化
// ===========================================
renderTitleScreen();
