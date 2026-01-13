/**
 * 算数バトル - メインゲームファイル
 */

import {
    MONSTERS, TYPES, TYPE_NAMES, TYPE_COLORS,
    RARITY, RARITY_COLORS, RARITY_RATES,
    GACHA_TYPES, GACHA_RARITY_RATES, GACHA_COSTS, GACHA_TYPE_NAMES,
    getGachaTypeForGrade,
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
    recordStageClear, spendCoins, spendGradeCoins, updateStats, recordGachaRoll,
    canEvolve, evolveMonster, giveStarterMonster,
    COLOR_VARIANT_COUNT, getColorVariantHue,
    isChallengeFloorUnlocked, getChallengeFloorBestPoints, recordChallengeFloorClear
} from './save.js';

import {
    DUNGEONS, DUNGEON_NAMES, DUNGEON_ICONS,
    MAX_FLOOR, QUESTIONS_PER_FLOOR,
    FLOOR_DESCRIPTIONS, POINT_CONFIG, REWARD_CONFIG,
    generateChallengeQuestions, isDungeonAvailable
} from './challenge.js';

// ===========================================
// グローバル状態
// ===========================================
let currentPlayer = null;
let currentScreen = 'title';
let battleState = null;
let gachaState = null;
let challengeState = null; // 挑戦ステージ用
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
            // より派手な正解音（ファンファーレ風）
            osc.type = 'square';
            osc.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.08); // E5
            osc.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.16); // G5
            osc.frequency.setValueAtTime(1046.5, audioContext.currentTime + 0.24); // C6
            gain.gain.setValueAtTime(0.25, audioContext.currentTime);
            gain.gain.setValueAtTime(0.3, audioContext.currentTime + 0.08);
            gain.gain.setValueAtTime(0.35, audioContext.currentTime + 0.16);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            osc.start();
            osc.stop(audioContext.currentTime + 0.5);
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
function renderMonsterCard(monster, level = 1, size = 'normal', colorVariant = 0) {
    const monsterData = typeof monster === 'string' ? getMonsterById(monster) : monster;
    if (!monsterData) return '<div class="monster-card empty"></div>';

    const stats = calculateStats(monsterData, level);
    const primaryColor = TYPE_COLORS[monsterData.types[0]];
    const secondaryColor = monsterData.types[1] ? TYPE_COLORS[monsterData.types[1]] : primaryColor;
    const rarityColor = RARITY_COLORS[monsterData.rarity];
    const stars = '★'.repeat(monsterData.rarity);

    const sizeClass = size === 'small' ? 'monster-card-small' : size === 'large' ? 'monster-card-large' : '';
    const isColorVariant = colorVariant > 0;
    const shinyClass = isColorVariant ? 'shiny' : '';
    const hueRotate = getColorVariantHue(colorVariant);

    return `
        <div class="monster-card ${sizeClass} ${shinyClass}" style="--primary-color: ${primaryColor}; --secondary-color: ${secondaryColor}; --rarity-color: ${rarityColor}; --hue-rotate: ${hueRotate}deg">
            <div class="card-frame">
                ${isColorVariant ? '<div class="shiny-sparkle"></div>' : ''}
                <div class="card-bg" style="background: linear-gradient(135deg, ${primaryColor}40, ${secondaryColor}40)">
                    <div class="card-icon ${isColorVariant ? 'shiny-icon' : ''}">
                        ${renderMonsterIcon(monsterData)}
                    </div>
                </div>
                <div class="card-info-bar">
                    <span class="card-name">${isColorVariant ? '✨ ' : ''}${monsterData.name}${isColorVariant ? ' ✨' : ''}</span>
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
    // 画像があるモンスターは画像を優先表示（算数バトル専用assets）
    if (typeof monster.image === 'string' && monster.image) {
        return `<img src="${monster.image}" alt="${monster.name}" class="monster-img">`;
    }

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
        showBattleModeSelect();
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

// バトルモード選択（学年ステージ or 挑戦ステージ）
function showBattleModeSelect() {
    app.innerHTML = `
        <div class="screen battle-mode-screen">
            <h2>バトルモードをえらぼう</h2>
            <div class="battle-mode-grid">
                <button class="battle-mode-btn grade-mode" id="gradeModeBtn">
                    <span class="mode-icon">📚</span>
                    <span class="mode-title">学年ステージ</span>
                    <span class="mode-desc">学年ごとに問題にチャレンジ！</span>
                </button>
                <button class="battle-mode-btn challenge-mode" id="challengeModeBtn">
                    <span class="mode-icon">🏰</span>
                    <span class="mode-title">挑戦ステージ</span>
                    <span class="mode-desc">ダンジョンを攻略しよう！</span>
                </button>
            </div>
            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>
    `;

    document.getElementById('gradeModeBtn').onclick = () => {
        playSound('click');
        showGradeSelect();
    };

    document.getElementById('challengeModeBtn').onclick = () => {
        playSound('click');
        showDungeonSelect();
    };

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
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
            <button class="btn btn-ghost back-btn" id="backToMode">もどる</button>
        </div>
    `;

    document.querySelectorAll('.grade-btn').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            showCategorySelect(parseInt(btn.dataset.grade));
        };
    });

    document.getElementById('backToMode').onclick = () => {
        playSound('click');
        showBattleModeSelect();
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
// 挑戦ステージシステム
// ===========================================

// ダンジョン選択
function showDungeonSelect() {
    const dungeons = Object.values(DUNGEONS);

    app.innerHTML = `
        <div class="screen dungeon-select-screen">
            <h2>🏰 ダンジョンをえらぼう</h2>
            <div class="dungeon-grid">
                ${dungeons.map(dungeon => {
        const available = isDungeonAvailable(dungeon);
        const dungeonData = currentPlayer.challengeData?.[dungeon] || {};
        const clearedFloors = dungeonData.clearedFloors || [];
        const progress = clearedFloors.length;

        return `
                        <button class="dungeon-btn ${available ? '' : 'locked'}"
                                data-dungeon="${dungeon}" ${available ? '' : 'disabled'}>
                            <span class="dungeon-icon">${DUNGEON_ICONS[dungeon]}</span>
                            <span class="dungeon-name">${DUNGEON_NAMES[dungeon]}</span>
                            ${available
                ? `<span class="dungeon-progress">${progress}/${MAX_FLOOR} クリア</span>`
                : `<span class="dungeon-locked">準備中...</span>`
            }
                        </button>
                    `;
    }).join('')}
            </div>
            <button class="btn btn-ghost back-btn" id="backToMode">もどる</button>
        </div>
    `;

    document.querySelectorAll('.dungeon-btn:not([disabled])').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            showFloorSelect(btn.dataset.dungeon);
        };
    });

    document.getElementById('backToMode').onclick = () => {
        playSound('click');
        showBattleModeSelect();
    };
}

// 階層選択
function showFloorSelect(dungeon) {
    const floors = [];
    for (let i = 1; i <= MAX_FLOOR; i++) {
        floors.push(i);
    }

    // 報酬プレビュー用のアイコンマップ（GRADE_COIN_ICONSより前に定義されているため直接定義）
    const gradeIcons = { 1: '🔵', 2: '🟢', 3: '🟡', 4: '🟠', 5: '🔴', 6: '🟣' };

    app.innerHTML = `
        <div class="screen floor-select-screen">
            <h2>${DUNGEON_ICONS[dungeon]} ${DUNGEON_NAMES[dungeon]}</h2>

            <div class="reward-legend">
                <div class="legend-title">報酬の目安（クリア時）</div>
                <div class="legend-items">
                    <span class="legend-item">💯 100% → 最大報酬</span>
                    <span class="legend-item">✨ 60% → クリア報酬</span>
                </div>
            </div>

            <div class="floor-list">
                ${floors.map(floor => {
        const isUnlocked = isChallengeFloorUnlocked(currentPlayer, dungeon, floor);
        const bestPoints = getChallengeFloorBestPoints(currentPlayer, dungeon, floor);
        const isCleared = bestPoints > 0;

        // 報酬プレビュー
        const preview = REWARD_CONFIG.getRewardPreview(floor);
        const maxReward = preview[0]; // 100%
        const gradeIcon = gradeIcons[maxReward.gradeLevel];

        return `
                        <button class="floor-btn ${isUnlocked ? '' : 'locked'} ${isCleared ? 'cleared' : ''}"
                                data-floor="${floor}" ${isUnlocked ? '' : 'disabled'}>
                            <div class="floor-info">
                                <span class="floor-num">${floor}F</span>
                                <span class="floor-desc">${FLOOR_DESCRIPTIONS[floor]}</span>
                            </div>
                            <div class="floor-rewards">
                                <span class="reward-preview">💰${maxReward.coins} ${gradeIcon}${maxReward.gradeCoins}</span>
                            </div>
                            <div class="floor-status">
                                ${!isUnlocked ? '🔒' : isCleared ? `<span class="best-points">${bestPoints}pt</span>` : ''}
                            </div>
                        </button>
                    `;
    }).join('')}
            </div>
            <button class="btn btn-ghost back-btn" id="backToDungeon">もどる</button>
        </div>
    `;

    document.querySelectorAll('.floor-btn:not([disabled])').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            startChallenge(dungeon, parseInt(btn.dataset.floor));
        };
    });

    document.getElementById('backToDungeon').onclick = () => {
        playSound('click');
        showDungeonSelect();
    };
}

// 挑戦ステージ開始
function startChallenge(dungeon, floor) {
    const questions = generateChallengeQuestions(dungeon, floor);
    const maxPoints = POINT_CONFIG.getInitialPoints(floor, dungeon);

    challengeState = {
        dungeon: dungeon,
        floor: floor,
        questions: questions,
        currentQuestion: 0,
        correctCount: 0,
        points: maxPoints,
        maxPoints: maxPoints,
        startTime: Date.now(),
        timer: null,
        timeDecay: POINT_CONFIG.getTimeDecay(floor),
        missPenalty: POINT_CONFIG.getMissPenalty(floor)
    };

    renderChallenge();
    startChallengeTimer();
}

// 挑戦ステージタイマー開始
function startChallengeTimer() {
    if (challengeState.timer) {
        clearInterval(challengeState.timer);
    }

    challengeState.timer = setInterval(() => {
        challengeState.points = Math.max(0, challengeState.points - challengeState.timeDecay);
        updateChallengePointsDisplay();
    }, 1000);
}

// ポイント表示更新
function updateChallengePointsDisplay() {
    const pointsEl = document.getElementById('challengePoints');
    const pointsBarEl = document.getElementById('challengePointsBar');

    if (pointsEl) {
        pointsEl.textContent = challengeState.points;
    }
    if (pointsBarEl) {
        const percent = (challengeState.points / challengeState.maxPoints) * 100;
        pointsBarEl.style.width = `${percent}%`;

        // 色を変える
        if (percent > 60) {
            pointsBarEl.className = 'points-fill high';
        } else if (percent > 30) {
            pointsBarEl.className = 'points-fill medium';
        } else {
            pointsBarEl.className = 'points-fill low';
        }
    }
}

// 挑戦ステージ描画
function renderChallenge() {
    const cs = challengeState;
    const q = cs.questions[cs.currentQuestion];
    const percent = (cs.points / cs.maxPoints) * 100;

    app.innerHTML = `
        <div class="screen challenge-screen">
            <div class="challenge-header">
                <div class="challenge-info">
                    <span class="challenge-location">${DUNGEON_ICONS[cs.dungeon]} ${cs.floor}F</span>
                    <span class="challenge-progress">問題 ${cs.currentQuestion + 1} / ${cs.questions.length}</span>
                </div>
                <div class="points-display">
                    <span class="points-label">ポイント</span>
                    <div class="points-bar-container">
                        <div class="points-fill ${percent > 60 ? 'high' : percent > 30 ? 'medium' : 'low'}"
                             id="challengePointsBar" style="width: ${percent}%"></div>
                    </div>
                    <span class="points-value" id="challengePoints">${cs.points}</span>
                </div>
            </div>

            <div class="challenge-question-area">
                <div class="challenge-question">
                    <p class="question-text">${q.question}</p>
                </div>
                <div class="challenge-choices">
                    ${q.choices.map((choice, i) => `
                        <button class="challenge-choice-btn" data-choice="${choice}">
                            ${choice}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div id="particleContainer" class="particle-container"></div>
        </div>
    `;

    document.querySelectorAll('.challenge-choice-btn').forEach(btn => {
        btn.onclick = () => {
            handleChallengeAnswer(btn.dataset.choice);
        };
    });
}

// 挑戦ステージの回答処理
function handleChallengeAnswer(choiceValue) {
    const cs = challengeState;
    const q = cs.questions[cs.currentQuestion];

    // 正答判定
    let isCorrect = false;
    if (typeof q.answer === 'number') {
        const numChoice = parseFloat(choiceValue);
        isCorrect = !isNaN(numChoice) && Math.abs(numChoice - q.answer) < 0.001;
    } else {
        isCorrect = String(choiceValue) === String(q.answer);
    }

    if (isCorrect) {
        playSound('correct');
        cs.correctCount++;
        spawnParticles(document.getElementById('particleContainer'), 'correct');
    } else {
        playSound('wrong');
        cs.points = Math.max(0, cs.points - cs.missPenalty);
        updateChallengePointsDisplay();

        // 画面を揺らす
        const questionArea = document.querySelector('.challenge-question-area');
        if (questionArea) {
            questionArea.classList.add('shake');
            setTimeout(() => questionArea.classList.remove('shake'), 300);
        }
    }

    cs.currentQuestion++;

    setTimeout(() => {
        if (cs.currentQuestion >= cs.questions.length) {
            finishChallenge();
        } else {
            renderChallenge();
        }
    }, 300);
}

// 挑戦ステージ終了
function finishChallenge() {
    if (challengeState.timer) {
        clearInterval(challengeState.timer);
        challengeState.timer = null;
    }

    const cs = challengeState;
    const clearTime = (Date.now() - cs.startTime) / 1000;
    const correctRate = cs.correctCount / cs.questions.length;

    // クリア判定（60%以上正解でクリア）
    const isCleared = correctRate >= 0.6;

    if (isCleared) {
        playSound('levelup');

        // 報酬計算
        const coins = REWARD_CONFIG.getCoins(cs.floor, cs.points, cs.maxPoints);
        const gradeReward = REWARD_CONFIG.getGradeCoins(cs.floor, cs.points, cs.maxPoints);

        // 記録
        const result = recordChallengeFloorClear(
            currentPlayer, cs.dungeon, cs.floor, cs.points,
            coins, gradeReward.amount, gradeReward.grade
        );
        currentPlayer = loadPlayerData(currentPlayer.id);

        showChallengeResult(true, {
            points: cs.points,
            maxPoints: cs.maxPoints,
            correctCount: cs.correctCount,
            totalQuestions: cs.questions.length,
            clearTime,
            coins,
            gradeCoins: gradeReward.amount,
            gradeCoinsGrade: gradeReward.grade,
            isNewBest: result.isNewBest
        });
    } else {
        showChallengeResult(false, {
            points: cs.points,
            maxPoints: cs.maxPoints,
            correctCount: cs.correctCount,
            totalQuestions: cs.questions.length,
            clearTime
        });
    }
}

// 挑戦ステージ結果画面
function showChallengeResult(isVictory, data) {
    const gradeIcon = data.gradeCoinsGrade ? (GRADE_COIN_ICONS[data.gradeCoinsGrade] || '🪙') : '';

    app.innerHTML = `
        <div class="screen challenge-result-screen ${isVictory ? 'victory' : 'defeat'}">
            <h1 class="result-title">${isVictory ? 'クリア！' : '失敗...'}</h1>

            <div class="result-details">
                <div class="result-points">
                    <span class="result-label">獲得ポイント</span>
                    <span class="result-value">${data.points} / ${data.maxPoints}</span>
                    ${data.isNewBest ? '<span class="new-best">NEW BEST!</span>' : ''}
                </div>

                <div class="result-stats">
                    <span>正解: ${data.correctCount} / ${data.totalQuestions}</span>
                    <span>時間: ${Math.round(data.clearTime)}秒</span>
                </div>

                ${isVictory ? `
                    <div class="reward-display">
                        <div class="reward-row">
                            <span class="reward-label">💰 コイン</span>
                            <span class="reward-value">+${data.coins}</span>
                        </div>
                        ${data.gradeCoins > 0 ? `
                            <div class="reward-row grade-coin">
                                <span class="reward-label">${gradeIcon} ${data.gradeCoinsGrade}年コイン</span>
                                <span class="reward-value">+${data.gradeCoins}</span>
                            </div>
                        ` : ''}
                    </div>
                ` : `
                    <p class="defeat-message">60%以上正解でクリア！もう一度チャレンジしよう</p>
                `}
            </div>

            <div class="result-buttons">
                <button class="btn btn-primary" id="retryBtn">もう一度</button>
                <button class="btn btn-ghost" id="backToFloorBtn">階層選択へ</button>
            </div>
        </div>
    `;

    document.getElementById('retryBtn').onclick = () => {
        playSound('click');
        startChallenge(challengeState.dungeon, challengeState.floor);
    };

    document.getElementById('backToFloorBtn').onclick = () => {
        playSound('click');
        showFloorSelect(challengeState.dungeon);
    };
}

// ===========================================
// バトルシステム
// ===========================================

/**
 * 数値回答の問題かどうかを判定
 * 選択肢からの選択ではなく、数字入力で回答する問題
 */
function isNumericQuestion(q) {
    // answerが数値型かつ、特殊な問題タイプでない場合は数字入力式
    if (typeof q.answer !== 'number') return false;
    // ひっ算、穴埋め、時計、比較問題は従来の形式を維持
    if (q.type === 'hissan' || q.type === 'fill_blank' ||
        q.type === 'clock' || q.type === 'compare') return false;
    return true;
}

/**
 * ステージの敵タイプに合うモンスターを選択
 * 進化系モンスターを優先（ガチャで出ないレアな敵として）
 */
function selectEnemyMonster(enemyTypes, stageLevel) {
    // 進化系モンスターのIDセット
    const evolutionIds = new Set(
        MONSTERS.filter(m => m.evolution).map(m => m.evolution)
    );

    // タイプが一致するモンスターを探す
    const typeMatch = (monsterTypes, targetTypes) => {
        return targetTypes.some(t => monsterTypes.includes(t));
    };

    // 進化系で タイプ一致するもの（優先）
    let candidates = MONSTERS.filter(m =>
        evolutionIds.has(m.id) && typeMatch(m.types, enemyTypes)
    );

    // なければ進化系全体から
    if (candidates.length === 0) {
        candidates = MONSTERS.filter(m => evolutionIds.has(m.id));
    }

    // それでもなければ全モンスターからタイプ一致
    if (candidates.length === 0) {
        candidates = MONSTERS.filter(m => typeMatch(m.types, enemyTypes));
    }

    // 最終フォールバック
    if (candidates.length === 0) {
        candidates = MONSTERS;
    }

    // ステージレベルに応じてレア度でフィルタ（上級ほど強いモンスター）
    const minRarity = Math.min(stageLevel, 3);
    const rarityFiltered = candidates.filter(m => m.rarity >= minRarity);
    if (rarityFiltered.length > 0) {
        candidates = rarityFiltered;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

function startBattle(stage) {
    // パーティが空の場合はバトルを開始できない
    if (!currentPlayer.party || currentPlayer.party.length === 0) {
        showNoPartyWarning(stage);
        return;
    }

    const questions = generateStageQuestions(stage.grade, stage.category, stage.questionCount);

    // 敵モンスターを選択
    const enemyMonster = selectEnemyMonster(stage.enemy.types, stage.level);

    battleState = {
        stage: stage,
        questions: questions,
        currentQuestion: 0,
        correctCount: 0,
        startTime: Date.now(),
        enemyHp: stage.enemy.hp,
        enemyMaxHp: stage.enemy.hp,
        enemyMonster: enemyMonster, // 敵モンスターデータを保存
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
                ${renderMonsterCard(data, m.level, 'small', m.colorVariant || 0)}
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
                        <div class="enemy-monster-display">
                            ${renderMonsterIcon(bs.enemyMonster)}
                        </div>
                        <span class="enemy-monster-name">${bs.enemyMonster.name}</span>
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
                <div class="answer-area" id="answerArea">
                    ${isNumericQuestion(q) ? `
                        <div class="numeric-input-area">
                            <input type="number" id="battleInput" class="battle-input" inputmode="numeric" step="any" autofocus>
                            <span class="input-suffix">${q.suffix || ''}</span>
                            <button class="btn btn-primary" id="battleSubmit">OK</button>
                        </div>
                    ` : `
                        <div class="answer-grid">
                            ${q.choices.map((choice, i) => `
                                <button class="answer-btn" data-answer="${choice}">
                                    ${q.prefix || ''}${choice}${q.suffix || ''}
                                </button>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
            <div id="particleContainer" class="particle-container"></div>
        </div>
    `;

    // 数字入力式の場合
    const battleInput = document.getElementById('battleInput');
    const battleSubmit = document.getElementById('battleSubmit');

    if (battleInput && battleSubmit) {
        const submitAnswer = () => {
            const userAnswer = parseFloat(battleInput.value);
            if (isNaN(userAnswer)) return;
            handleAnswer(userAnswer);
        };

        battleSubmit.onclick = submitAnswer;
        battleInput.onkeydown = (e) => {
            if (e.key === 'Enter') {
                submitAnswer();
            }
        };
        battleInput.focus();
    }

    // 選択式の場合
    document.querySelectorAll('.answer-btn').forEach(btn => {
        btn.onclick = () => {
            const answer = btn.dataset.answer;
            // 数値として解析できる場合は数値として、そうでなければ文字列として渡す
            const numAnswer = parseFloat(answer);
            handleAnswer(isNaN(numAnswer) ? answer : numAnswer);
        };
    });
}

function handleAnswer(answer) {
    const bs = battleState;
    const q = bs.questions[bs.currentQuestion];

    // 正答判定：数値の場合は誤差許容、文字列の場合は完全一致
    let isCorrect = false;
    if (typeof q.answer === 'number' && typeof answer === 'number') {
        isCorrect = Math.abs(answer - q.answer) < 0.001;
    } else {
        isCorrect = String(answer) === String(q.answer);
    }

    if (isCorrect) {
        playSound('correct');
        bs.correctCount++;

        // パーティクルエフェクト
        spawnParticles(document.getElementById('particleContainer'), 'correct');

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

    // 報酬付与（通常コイン + 学年コイン）
    recordStageClear(currentPlayer, bs.stage.id, rank, rewards.coins, rewards.gradeCoins, rewards.grade);
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
    // 学年コイン表示用アイコン
    const gradeIcon = data.rewards ? (GRADE_COIN_ICONS[data.rewards.grade] || '🪙') : '';

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
                        <div class="reward-row">
                            <span class="reward-label">💰 通常コイン</span>
                            <span class="reward-value">+${data.rewards.coins}</span>
                        </div>
                        <div class="reward-row grade-coin">
                            <span class="reward-label">${gradeIcon} ${data.rewards.grade}年コイン</span>
                            <span class="reward-value">+${data.rewards.gradeCoins}</span>
                        </div>
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
const GACHA_TIME = 10; // 秒
const COLOR_VARIANT_RATE = 5; // 色違い出現率 5%（1〜7のいずれかのバリアント）

// 現在選択中のガチャタイプ
let selectedGachaType = GACHA_TYPES.NORMAL;

// コイン表示用のアイコン
const GRADE_COIN_ICONS = {
    1: '🔵',
    2: '🟢',
    3: '🟡',
    4: '🟠',
    5: '🔴',
    6: '🟣'
};

// ガチャ選択画面（メイン画面）
function showGachaScreen() {
    const gradeCoins = currentPlayer.gradeCoins || {};

    // 学年ガチャタブのHTML
    const gradeGachaTabs = [1, 2, 3, 4, 5, 6].map(grade => {
        const gachaType = getGachaTypeForGrade(grade);
        const cost = GACHA_COSTS[gachaType];
        const coins = gradeCoins[grade] || 0;
        const canAfford = coins >= cost.amount;
        const rates = GACHA_RARITY_RATES[gachaType];

        return `
            <div class="gacha-type-card ${canAfford ? '' : 'disabled'}" data-gacha-type="${gachaType}">
                <div class="gacha-type-name">${GACHA_TYPE_NAMES[gachaType]}</div>
                <div class="gacha-type-cost">${GRADE_COIN_ICONS[grade]} ${cost.amount}</div>
                <div class="gacha-type-owned">所持: ${coins}</div>
                <div class="gacha-type-rates">
                    <span class="rate legendary">★5: ${rates[RARITY.LEGENDARY]}%</span>
                    <span class="rate epic">★4: ${rates[RARITY.EPIC]}%</span>
                </div>
            </div>
        `;
    }).join('');

    // 通常ガチャ
    const normalCost = GACHA_COSTS[GACHA_TYPES.NORMAL];
    const normalCanAfford = currentPlayer.coins >= normalCost.amount;
    const normalRates = GACHA_RARITY_RATES[GACHA_TYPES.NORMAL];

    app.innerHTML = `
        <div class="screen gacha-select-screen">
            <h2>ガチャ</h2>
            <p class="gacha-desc">10秒間で問題を解いて、モンスターをゲット！</p>
            <p class="gacha-hint">学年が上がるほど、レアが出やすい！</p>

            <div class="coins-display">
                <div class="coin-item normal-coin">
                    <span class="coin-icon">💰</span>
                    <span class="coin-amount">${currentPlayer.coins}</span>
                </div>
            </div>

            <div class="gacha-section">
                <h3>ノーマルガチャ</h3>
                <div class="gacha-type-card normal ${normalCanAfford ? '' : 'disabled'}" data-gacha-type="${GACHA_TYPES.NORMAL}">
                    <div class="gacha-type-name">${GACHA_TYPE_NAMES[GACHA_TYPES.NORMAL]}</div>
                    <div class="gacha-type-cost">💰 ${normalCost.amount}</div>
                    <div class="gacha-type-rates">
                        <span class="rate legendary">★5: ${normalRates[RARITY.LEGENDARY]}%</span>
                        <span class="rate epic">★4: ${normalRates[RARITY.EPIC]}%</span>
                    </div>
                </div>
            </div>

            <div class="gacha-section">
                <h3>学年ガチャ</h3>
                <p class="section-hint">ステージをクリアして学年コインを集めよう！</p>
                <div class="grade-coins-display">
                    ${[1, 2, 3, 4, 5, 6].map(g => `
                        <div class="grade-coin-item">
                            <span class="grade-coin-icon">${GRADE_COIN_ICONS[g]}</span>
                            <span class="grade-coin-amount">${gradeCoins[g] || 0}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="gacha-types-grid">
                    ${gradeGachaTabs}
                </div>
            </div>

            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>
    `;

    // ガチャカードクリックイベント
    document.querySelectorAll('.gacha-type-card:not(.disabled)').forEach(card => {
        card.onclick = () => {
            const gachaType = card.dataset.gachaType;
            playSound('click');
            showGachaConfirm(gachaType);
        };
    });

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

// ガチャ確認・実行画面
function showGachaConfirm(gachaType) {
    selectedGachaType = gachaType;
    const cost = GACHA_COSTS[gachaType];
    const rates = GACHA_RARITY_RATES[gachaType];
    const name = GACHA_TYPE_NAMES[gachaType];

    let canAfford = false;
    let coinDisplay = '';

    if (cost.type === 'coins') {
        canAfford = currentPlayer.coins >= cost.amount;
        coinDisplay = `💰 ${cost.amount} コイン`;
    } else {
        const grade = cost.grade;
        const gradeCoins = (currentPlayer.gradeCoins && currentPlayer.gradeCoins[grade]) || 0;
        canAfford = gradeCoins >= cost.amount;
        coinDisplay = `${GRADE_COIN_ICONS[grade]} ${cost.amount} ${grade}年コイン`;
    }

    app.innerHTML = `
        <div class="screen gacha-confirm-screen">
            <h2>${name}</h2>
            <p class="gacha-desc">10秒間で問題を解いて、モンスターをゲット！</p>
            <p class="gacha-hint">正解するほど卵が増える！（最低1個はもらえるよ）</p>

            <div class="gacha-rates-detail">
                <h4>出現確率</h4>
                <div class="rates-grid">
                    <div class="rate-row"><span class="rarity rarity-5">★★★★★</span><span>${rates[RARITY.LEGENDARY]}%</span></div>
                    <div class="rate-row"><span class="rarity rarity-4">★★★★</span><span>${rates[RARITY.EPIC]}%</span></div>
                    <div class="rate-row"><span class="rarity rarity-3">★★★</span><span>${rates[RARITY.RARE]}%</span></div>
                    <div class="rate-row"><span class="rarity rarity-2">★★</span><span>${rates[RARITY.UNCOMMON]}%</span></div>
                    <div class="rate-row"><span class="rarity rarity-1">★</span><span>${rates[RARITY.COMMON]}%</span></div>
                </div>
            </div>

            <p class="gacha-cost">${coinDisplay}</p>

            <button class="btn btn-primary btn-large" id="startGachaBtn" ${!canAfford ? 'disabled' : ''}>
                ガチャをまわす！
            </button>
            <button class="btn btn-ghost back-btn" id="backToGachaSelect">もどる</button>
        </div>
    `;

    document.getElementById('startGachaBtn').onclick = () => {
        if (!canAfford) return;
        playSound('click');

        // コイン消費
        if (cost.type === 'coins') {
            spendCoins(currentPlayer, cost.amount);
        } else {
            spendGradeCoins(currentPlayer, cost.grade, cost.amount);
        }

        currentPlayer = loadPlayerData(currentPlayer.id);
        startGacha();
    };

    document.getElementById('backToGachaSelect').onclick = () => {
        playSound('click');
        showGachaScreen();
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
    // 1個は最低保証なので、正解数+1を表示
    const eggCount = gachaState.correctCount + 1;
    const eggs = '🥚'.repeat(Math.min(eggCount, 10)) + (eggCount > 10 ? `+${eggCount - 10}` : '');

    app.innerHTML = `
        <div class="screen gacha-game-screen">
            <div class="gacha-header">
                <div class="gacha-timer-bar">
                    <div class="timer-fill" id="timerFill" style="width: ${(gachaState.timeLeft / GACHA_TIME) * 100}%"></div>
                </div>
                <div class="gacha-timer" id="gachaTimer">
                    <span class="timer-value">${gachaState.timeLeft}</span>
                    <span class="timer-label">秒</span>
                </div>
            </div>
            <div class="gacha-eggs-area" id="eggsArea">
                <div class="eggs-label">ゲットする卵</div>
                <div class="eggs-display" id="eggsDisplay">${eggs}</div>
                <div class="eggs-count">${eggCount}個</div>
            </div>
            <div class="gacha-question-area">
                <div class="gacha-question" id="gachaQuestion">
                    ${q.question} = ?
                </div>
                <div class="gacha-input-area">
                    <input type="number" id="gachaInput" class="gacha-input" inputmode="numeric" autofocus>
                    <button class="btn btn-primary" id="gachaSubmit">OK</button>
                </div>
            </div>
            <div id="particleContainer" class="particle-container"></div>
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

            // 卵表示を更新
            const newEggCount = gachaState.correctCount + 1;
            const newEggs = '🥚'.repeat(Math.min(newEggCount, 10)) + (newEggCount > 10 ? `+${newEggCount - 10}` : '');
            document.getElementById('eggsDisplay').textContent = newEggs;
            document.querySelector('.eggs-count').textContent = `${newEggCount}個`;

            // 卵エリアをバウンスアニメーション
            const eggsArea = document.getElementById('eggsArea');
            eggsArea.classList.add('bounce');
            setTimeout(() => eggsArea.classList.remove('bounce'), 300);

            // パーティクルエフェクト
            spawnParticles(document.getElementById('particleContainer'), 'correct');
        } else {
            playSound('wrong');
            // 問題エリアを揺らす
            const questionArea = document.querySelector('.gacha-question-area');
            questionArea.classList.add('shake');
            setTimeout(() => questionArea.classList.remove('shake'), 300);
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

// パーティクルエフェクトを生成
function spawnParticles(container, type = 'correct') {
    if (!container) return;

    const colors = type === 'correct'
        ? ['#ffd700', '#ffeb3b', '#ff9800', '#4caf50', '#00bcd4']
        : ['#f44336', '#e91e63'];

    for (let i = 0; i < 15; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.setProperty('--x', `${(Math.random() - 0.5) * 200}px`);
        particle.style.setProperty('--y', `${(Math.random() - 0.5) * 200}px`);
        particle.style.setProperty('--rotation', `${Math.random() * 720}deg`);
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.left = '50%';
        particle.style.top = '50%';
        container.appendChild(particle);

        setTimeout(() => particle.remove(), 800);
    }
}

function updateGachaTimer() {
    const timer = document.getElementById('gachaTimer');
    if (timer) {
        timer.querySelector('.timer-value').textContent = gachaState.timeLeft;
    }
    // タイマーバーも更新
    const timerFill = document.getElementById('timerFill');
    if (timerFill) {
        timerFill.style.width = `${(gachaState.timeLeft / GACHA_TIME) * 100}%`;
        // 残り3秒以下で警告色
        if (gachaState.timeLeft <= 3) {
            timerFill.classList.add('warning');
        }
    }
}

function finishGacha() {
    playSound('gacha');
    recordGachaRoll(currentPlayer, 1);

    // 獲得モンスターを決定（最低1体は保証）
    const monstersWon = [];
    const monsterCount = Math.max(1, gachaState.correctCount + 1); // 正解数+1、最低1体
    let hasColorVariant = false;

    for (let i = 0; i < monsterCount; i++) {
        const monster = rollGacha(selectedGachaType);
        // 色違いが出るかどうか（5%の確率）
        let colorVariant = 0;
        if (Math.random() * 100 < COLOR_VARIANT_RATE) {
            // 1〜7のランダムなバリアントを選択
            colorVariant = Math.floor(Math.random() * 7) + 1;
            hasColorVariant = true;
        }
        monstersWon.push({ monster, colorVariant });
        addMonsterToPlayer(currentPlayer, monster.id, colorVariant);
    }

    currentPlayer = loadPlayerData(currentPlayer.id);

    showGachaResult(monstersWon, gachaState.correctCount, hasColorVariant);
}

// 進化系モンスターのIDセットを作成（他のモンスターのevolutionとして参照されているもの）
const EVOLUTION_MONSTER_IDS = new Set(
    MONSTERS.filter(m => m.evolution).map(m => m.evolution)
);

function rollGacha(gachaType = GACHA_TYPES.NORMAL) {
    // ガチャタイプに応じた確率テーブルを取得
    const rates = GACHA_RARITY_RATES[gachaType] || GACHA_RARITY_RATES[GACHA_TYPES.NORMAL];

    // レアリティを決定
    const roll = Math.random() * 100;
    let cumulative = 0;
    let rarity = RARITY.COMMON;

    for (const [r, rate] of Object.entries(rates)) {
        cumulative += rate;
        if (roll < cumulative) {
            rarity = parseInt(r);
            break;
        }
    }

    // そのレアリティのモンスターからランダムに選択（進化系は除外）
    let candidates = MONSTERS.filter(m =>
        m.rarity === rarity && !EVOLUTION_MONSTER_IDS.has(m.id)
    );

    // 該当レアリティにガチャ対象がない場合はCOMMONにフォールバック
    if (candidates.length === 0) {
        candidates = MONSTERS.filter(m =>
            m.rarity === RARITY.COMMON && !EVOLUTION_MONSTER_IDS.has(m.id)
        );
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
}

function showGachaResult(monsters, correctCount = 0, hasColorVariant = false) {
    // 色違いがいたら特別なSE
    if (hasColorVariant) {
        playSound('levelup');
    }

    const colorVariantCount = monsters.filter(m => m.colorVariant > 0).length;

    // 選択中のガチャタイプのコスト確認
    const cost = GACHA_COSTS[selectedGachaType];
    let canAfford = false;
    let costDisplay = '';

    if (cost.type === 'coins') {
        canAfford = currentPlayer.coins >= cost.amount;
        costDisplay = `💰${cost.amount}`;
    } else {
        const grade = cost.grade;
        const gradeCoins = (currentPlayer.gradeCoins && currentPlayer.gradeCoins[grade]) || 0;
        canAfford = gradeCoins >= cost.amount;
        costDisplay = `${GRADE_COIN_ICONS[grade]}${cost.amount}`;
    }

    app.innerHTML = `
        <div class="screen gacha-result-screen ${hasColorVariant ? 'has-shiny' : ''}">
            <h2>ガチャ結果</h2>
            <p class="gacha-type-label">${GACHA_TYPE_NAMES[selectedGachaType]}</p>
            <p class="gacha-correct-count">正解数: ${correctCount}問</p>
            <p class="gacha-result-count">${monsters.length}体ゲット！🎉</p>
            ${hasColorVariant ? `<p class="shiny-alert">✨ 色違いが ${colorVariantCount}体 出た！ ✨</p>` : ''}
            <div class="gacha-monsters">
                ${monsters.map(({ monster, colorVariant }) => renderMonsterCard(monster, 1, 'normal', colorVariant)).join('')}
            </div>
            <div class="result-buttons">
                <button class="btn btn-primary" id="gachaAgainBtn" ${!canAfford ? 'disabled' : ''}>
                    もう一回 (${costDisplay})
                </button>
                <button class="btn btn-secondary" id="backToGachaBtn">ガチャ選択</button>
                <button class="btn btn-ghost" id="backToMenuBtn">メニューへ</button>
            </div>
        </div>
    `;

    document.getElementById('gachaAgainBtn').onclick = () => {
        if (!canAfford) return;
        playSound('click');

        // コイン消費
        if (cost.type === 'coins') {
            spendCoins(currentPlayer, cost.amount);
        } else {
            spendGradeCoins(currentPlayer, cost.grade, cost.amount);
        }

        currentPlayer = loadPlayerData(currentPlayer.id);
        startGacha();
    };

    document.getElementById('backToGachaBtn').onclick = () => {
        playSound('click');
        showGachaScreen();
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

    // パーティ全体のステータスを計算
    let totalHp = 0;
    let totalAttack = 0;
    let totalDefense = 0;
    const partySkills = [];

    partyMonsters.forEach(pm => {
        if (pm && pm.data) {
            const stats = calculateStats(pm.data, pm.level);
            totalHp += stats.hp;
            totalAttack += stats.attack;
            totalDefense += stats.defense;
            if (pm.data.skill) {
                partySkills.push({
                    name: pm.data.skill.name,
                    description: pm.data.skill.description,
                    monsterName: pm.data.name
                });
            }
        }
    });

    app.innerHTML = `
        <div class="screen party-screen">
            <h2>パーティ編成</h2>

            <!-- パーティサマリー -->
            ${partyMonsters.length > 0 ? `
            <div class="party-summary">
                <div class="party-stats-row">
                    <div class="party-stat">
                        <span class="stat-icon">❤️</span>
                        <span class="stat-name">HP</span>
                        <span class="stat-total">${totalHp}</span>
                    </div>
                    <div class="party-stat">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-name">攻撃</span>
                        <span class="stat-total">${totalAttack}</span>
                    </div>
                    <div class="party-stat">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-name">防御</span>
                        <span class="stat-total">${totalDefense}</span>
                    </div>
                </div>
                ${partySkills.length > 0 ? `
                <div class="party-skills">
                    <div class="skills-label">スキル</div>
                    <div class="skills-list">
                        ${partySkills.map(s => `
                            <div class="skill-item">
                                <span class="skill-name">${s.name}</span>
                                <span class="skill-owner">(${s.monsterName})</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            ` : ''}

            <div class="party-slots">
                <h3>パーティ (${currentPlayer.party.length}/4)</h3>
                <div class="party-grid">
                    ${[0, 1, 2, 3].map(i => {
        const pm = partyMonsters[i];
        return pm ? `
                            <div class="party-slot filled" data-party-idx="${i}" data-monster-idx="${pm.idx}">
                                ${renderMonsterCard(pm.data, pm.level, 'small', pm.colorVariant || 0)}
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
                            ${renderMonsterCard(m.data, m.level, 'small', m.colorVariant || 0)}
                        </div>
                    `).join('')}
                </div>
            </div>
            <button class="btn btn-ghost back-btn" id="backToMenu">もどる</button>
        </div>

        <!-- モンスター詳細モーダル -->
        <div class="monster-detail-modal" id="monsterDetailModal" style="display: none;">
            <div class="modal-overlay" id="modalOverlay"></div>
            <div class="modal-content" id="modalContent"></div>
        </div>
    `;

    // パーティスロットのモンスターをタップで詳細表示
    document.querySelectorAll('.party-slot.filled').forEach(slot => {
        slot.onclick = (e) => {
            // 削除ボタン以外をタップした場合
            if (!e.target.classList.contains('remove-btn')) {
                playSound('click');
                const monsterIdx = parseInt(slot.dataset.monsterIdx);
                showPartyMonsterDetail(monsterIdx, true);
            }
        };
    });

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

    // 所持モンスターをタップで詳細表示
    document.querySelectorAll('.box-monster').forEach(el => {
        el.onclick = () => {
            playSound('click');
            const monsterIdx = parseInt(el.dataset.monsterIdx);
            const isInParty = currentPlayer.party.includes(monsterIdx);
            showPartyMonsterDetail(monsterIdx, isInParty);
        };
    });

    document.getElementById('backToMenu').onclick = () => {
        playSound('click');
        showMainMenu();
    };
}

// パーティ編成画面用のモンスター詳細モーダル
function showPartyMonsterDetail(monsterIdx, isInParty) {
    const m = currentPlayer.monsters[monsterIdx];
    const monster = getMonsterById(m.monsterId);
    const stats = calculateStats(monster, m.level);
    const canEvo = canEvolve(currentPlayer, monsterIdx, MONSTERS);

    const modal = document.getElementById('monsterDetailModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <button class="modal-close-btn" id="closeModal">×</button>
        <div class="modal-monster-card">
            ${renderMonsterCard(monster, m.level, 'large', m.colorVariant || 0)}
        </div>
        <div class="modal-info">
            <h3>${(m.colorVariant > 0) ? '✨ ' : ''}${monster.name}${(m.colorVariant > 0) ? ' ✨' : ''}</h3>
            <p class="modal-desc">${monster.description}</p>
            <div class="modal-stats">
                <div class="modal-stat-row">
                    <span class="stat-label">HP</span>
                    <span class="stat-value">${stats.hp}</span>
                </div>
                <div class="modal-stat-row">
                    <span class="stat-label">こうげき</span>
                    <span class="stat-value">${stats.attack}</span>
                </div>
                <div class="modal-stat-row">
                    <span class="stat-label">ぼうぎょ</span>
                    <span class="stat-value">${stats.defense}</span>
                </div>
            </div>
            <div class="modal-skill">
                <h4>スキル: ${monster.skill.name}</h4>
                <p>${monster.skill.description}</p>
            </div>
            ${monster.evolution ? `
                <div class="modal-evolution">
                    <p>進化: Lv.${monster.evolutionLevel}で ${getMonsterById(monster.evolution)?.name || '???'} に進化</p>
                    ${canEvo ? `<button class="btn btn-primary btn-small" id="evolveBtn">進化する！</button>` : ''}
                </div>
            ` : ''}
            <div class="modal-actions">
                ${isInParty ? `
                    <button class="btn btn-ghost" id="removeFromPartyBtn">パーティから外す</button>
                ` : currentPlayer.party.length < 4 ? `
                    <button class="btn btn-primary" id="addToPartyBtn">パーティに入れる</button>
                ` : `
                    <p class="party-full-msg">パーティがいっぱいです</p>
                `}
            </div>
        </div>
    `;

    modal.style.display = 'flex';

    // モーダルを閉じる
    document.getElementById('closeModal').onclick = () => {
        playSound('click');
        modal.style.display = 'none';
    };

    document.getElementById('modalOverlay').onclick = () => {
        playSound('click');
        modal.style.display = 'none';
    };

    // 進化ボタン
    if (canEvo) {
        document.getElementById('evolveBtn').onclick = () => {
            playSound('levelup');
            evolveMonster(currentPlayer, monsterIdx, MONSTERS);
            currentPlayer = loadPlayerData(currentPlayer.id);
            modal.style.display = 'none';
            showPartyScreen();
        };
    }

    // パーティに追加
    const addBtn = document.getElementById('addToPartyBtn');
    if (addBtn) {
        addBtn.onclick = () => {
            playSound('click');
            addToParty(currentPlayer, monsterIdx);
            currentPlayer = loadPlayerData(currentPlayer.id);
            modal.style.display = 'none';
            showPartyScreen();
        };
    }

    // パーティから外す
    const removeBtn = document.getElementById('removeFromPartyBtn');
    if (removeBtn) {
        removeBtn.onclick = () => {
            playSound('click');
            const partyIdx = currentPlayer.party.indexOf(monsterIdx);
            if (partyIdx >= 0) {
                removeFromParty(currentPlayer, partyIdx);
                currentPlayer = loadPlayerData(currentPlayer.id);
            }
            modal.style.display = 'none';
            showPartyScreen();
        };
    }
}

// ===========================================
// モンスター図鑑
// ===========================================

/**
 * モンスターの発見済みバリアントを取得
 * @param {string} monsterId - モンスターID
 * @param {Array} discovered - 発見済みリスト
 * @returns {Array} 発見済みバリアント番号の配列
 */
function getDiscoveredVariants(monsterId, discovered) {
    const variants = [];
    // 通常色チェック
    if (discovered.includes(monsterId)) {
        variants.push(0);
    }
    // 色違いバリアントチェック（v1〜v7）
    for (let v = 1; v < COLOR_VARIANT_COUNT; v++) {
        if (discovered.includes(`${monsterId}_v${v}`)) {
            variants.push(v);
        }
    }
    return variants;
}

function showMonsterBook() {
    const discovered = currentPlayer.discoveredMonsters;

    // 通常と色違いそれぞれの発見数をカウント
    const normalDiscovered = discovered.filter(d => !d.includes('_v')).length;
    const variantDiscovered = discovered.filter(d => d.includes('_v')).length;

    app.innerHTML = `
        <div class="screen monster-book-screen">
            <h2>モンスターずかん</h2>
            <p class="book-progress">発見: ${normalDiscovered}種 + ✨${variantDiscovered}色違い / ${MONSTERS.length}種類×8色</p>
            <div class="book-grid">
                ${MONSTERS.map(m => {
        const discoveredVariants = getDiscoveredVariants(m.id, discovered);
        const isDiscovered = discoveredVariants.length > 0;
        const variantCount = discoveredVariants.length;
        const owned = currentPlayer.monsters.find(om => om.monsterId === m.id);
        return `
                        <div class="book-entry ${isDiscovered ? 'discovered' : 'undiscovered'}"
                             data-monster-id="${m.id}">
                            ${isDiscovered ? `
                                ${renderMonsterCard(m, owned ? owned.level : 1, 'small', owned ? owned.colorVariant || 0 : 0)}
                                ${variantCount > 1 ? `<div class="variant-badge">${variantCount}/8</div>` : ''}
                                ${variantCount === COLOR_VARIANT_COUNT ? `<div class="complete-badge">★</div>` : ''}
                            ` : `
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

function showMonsterDetail(monsterId, displayVariant = 0) {
    const monster = getMonsterById(monsterId);
    const discoveredVariants = getDiscoveredVariants(monsterId, currentPlayer.discoveredMonsters);

    // 表示するバリアントが発見済みでなければ最初の発見済みバリアントを表示
    if (!discoveredVariants.includes(displayVariant)) {
        displayVariant = discoveredVariants[0] || 0;
    }

    // 該当バリアントの所持モンスターを探す
    const owned = currentPlayer.monsters.find(m => m.monsterId === monsterId && (m.colorVariant || 0) === displayVariant);
    const level = owned ? owned.level : 1;
    const stats = calculateStats(monster, level);
    const canEvo = owned && canEvolve(currentPlayer, currentPlayer.monsters.indexOf(owned), MONSTERS);

    const isColorVariant = displayVariant > 0;

    app.innerHTML = `
        <div class="screen monster-detail-screen ${isColorVariant ? 'showing-shiny' : ''}">
            <div class="detail-card-large">
                ${renderMonsterCard(monster, level, 'large', displayVariant)}
            </div>
            <div class="detail-info">
                <h2>${isColorVariant ? '✨ ' : ''}${monster.name}${isColorVariant ? ' ✨' : ''}</h2>
                ${discoveredVariants.length > 1 ? `
                    <div class="variant-toggle">
                        ${discoveredVariants.map(v => `
                            <button class="variant-btn ${v === displayVariant ? 'active' : ''}" data-variant="${v}"
                                    style="--hue: ${getColorVariantHue(v)}deg">
                                ${v === 0 ? '通常' : `色${v}`}
                            </button>
                        `).join('')}
                    </div>
                    <p class="variant-progress">発見: ${discoveredVariants.length}/${COLOR_VARIANT_COUNT}色</p>
                ` : ''}
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

    // バリアント切り替えボタン
    document.querySelectorAll('.variant-btn').forEach(btn => {
        btn.onclick = () => {
            playSound('click');
            showMonsterDetail(monsterId, parseInt(btn.dataset.variant));
        };
    });

    if (canEvo) {
        document.getElementById('evolveBtn').onclick = () => {
            playSound('levelup');
            const idx = currentPlayer.monsters.findIndex(m => m.monsterId === monsterId && (m.colorVariant || 0) === displayVariant);
            evolveMonster(currentPlayer, idx, MONSTERS);
            currentPlayer = loadPlayerData(currentPlayer.id);
            const newMonster = currentPlayer.monsters[idx];
            showMonsterDetail(newMonster.monsterId, newMonster.colorVariant || 0);
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
