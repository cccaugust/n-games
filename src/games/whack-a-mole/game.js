import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';

const GAME_ID = 'whack-a-mole';

let score = 0;
let timeLeft = 30;
let isGameRunning = false;
let combo = 0;
let maxCombo = 0;
let hits = 0;
let misses = 0;
let lastHitAt = 0;

let gameTimerId;
let moleTimeoutId;
let lastHole;

const holes = Array.from(document.querySelectorAll('.hole'));
const grid = document.getElementById('grid');
const scoreBoard = document.getElementById('score');
const timeBoard = document.getElementById('time');
const comboBoard = document.getElementById('combo');
const timerFill = document.getElementById('timerFill');

const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');
const resultOverlay = document.getElementById('resultOverlay');

const difficultyPicker = document.getElementById('difficultyPicker');
const durationPicker = document.getElementById('durationPicker');
const soundToggle = document.getElementById('soundToggle');

let settings = {
    difficulty: 'normal',
    duration: 30,
    sound: true,
};

let audioCtx = null;

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

function randomTime(min, max) {
    return Math.round(Math.random() * (max - min) + min);
}

function randomHole(holeList) {
    const idx = Math.floor(Math.random() * holeList.length);
    const hole = holeList[idx];
    if (hole === lastHole) {
        return randomHole(holeList);
    }
    lastHole = hole;
    return hole;
}

function setActiveSegment(container, selector, selected) {
    container.querySelectorAll(selector).forEach(btn => {
        const isActive = btn === selected;
        btn.classList.toggle('active', isActive);
    });
}

function readSettingsFromUI() {
    const activeDifficulty = difficultyPicker.querySelector('button.seg.active')?.dataset?.difficulty;
    const activeDuration = durationPicker.querySelector('button.seg.active')?.dataset?.duration;
    const duration = Number(activeDuration || 30);

    settings = {
        difficulty: activeDifficulty || 'normal',
        duration: Number.isFinite(duration) ? duration : 30,
        sound: !!soundToggle?.checked,
    };
}

function ensureAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
}

function beep({ frequency = 440, durationMs = 60, type = 'sine', gain = 0.04 } = {}) {
    if (!settings.sound) return;
    ensureAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;

    g.gain.value = gain;
    g.gain.setTargetAtTime(0.0001, audioCtx.currentTime + durationMs / 1000, 0.02);

    osc.connect(g);
    g.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
}

function playSound(kind) {
    if (!settings.sound) return;
    if (kind === 'hit') beep({ frequency: 740, durationMs: 55, type: 'square', gain: 0.03 });
    if (kind === 'gold') beep({ frequency: 980, durationMs: 80, type: 'triangle', gain: 0.035 });
    if (kind === 'miss') beep({ frequency: 220, durationMs: 70, type: 'sawtooth', gain: 0.02 });
    if (kind === 'start') beep({ frequency: 520, durationMs: 90, type: 'sine', gain: 0.02 });
    if (kind === 'end') beep({ frequency: 330, durationMs: 120, type: 'sine', gain: 0.02 });
}

function getDifficultyConfig(difficulty) {
    if (difficulty === 'easy') {
        return { min: 520, max: 1100, goldChance: 0.08, missPenalty: 0 };
    }
    if (difficulty === 'hard') {
        return { min: 280, max: 820, goldChance: 0.14, missPenalty: 1 };
    }
    return { min: 400, max: 1000, goldChance: 0.11, missPenalty: 0 };
}

function getCurrentSpawnRange() {
    const cfg = getDifficultyConfig(settings.difficulty);
    const progress = settings.duration > 0 ? 1 - timeLeft / settings.duration : 0; // 0→1
    const speedUp = 1 - 0.38 * clamp(progress, 0, 1); // 時間が減るほど速く
    return {
        min: Math.round(cfg.min * speedUp),
        max: Math.round(cfg.max * speedUp),
        goldChance: cfg.goldChance,
        missPenalty: cfg.missPenalty,
    };
}

function setTimerFill() {
    if (!timerFill) return;
    const ratio = settings.duration > 0 ? timeLeft / settings.duration : 0;
    timerFill.style.width = `${clamp(ratio, 0, 1) * 100}%`;
}

function updateHud() {
    scoreBoard.textContent = score;
    timeBoard.textContent = timeLeft;
    comboBoard.textContent = combo;
    setTimerFill();
}

function showFloatScore(hole, text) {
    const el = document.createElement('div');
    el.className = 'float-score';
    el.textContent = text;
    hole.appendChild(el);
    window.setTimeout(() => el.remove(), 600);
}

function clearAllHoles() {
    holes.forEach(hole => {
        hole.classList.remove('up', 'bonk', 'gold', 'miss');
        hole.dataset.moleType = '';
    });
}

function peep() {
    if (!isGameRunning) return;

    const { min, max, goldChance } = getCurrentSpawnRange();
    const time = randomTime(min, max);
    const hole = randomHole(holes);
    const moleType = Math.random() < goldChance ? 'gold' : 'normal';

    hole.dataset.moleType = moleType;
    hole.classList.toggle('gold', moleType === 'gold');
    hole.classList.add('up');

    moleTimeoutId = window.setTimeout(() => {
        hole.classList.remove('up', 'gold');
        hole.dataset.moleType = '';
        if (isGameRunning) {
            peep();
        }
    }, time);
}

function startGame() {
    readSettingsFromUI();

    score = 0;
    timeLeft = settings.duration;
    combo = 0;
    maxCombo = 0;
    hits = 0;
    misses = 0;
    lastHitAt = 0;

    isGameRunning = true;
    overlay.style.display = 'none';
    resultOverlay.style.display = 'none';

    window.clearInterval(gameTimerId);
    window.clearTimeout(moleTimeoutId);
    clearAllHoles();
    updateHud();
    playSound('start');

    peep();

    gameTimerId = window.setInterval(() => {
        timeLeft--;
        updateHud();
        if (timeLeft <= 0) {
            gameOver();
        }
    }, 1000);
}

function handleBonk(e) {
    if (!isGameRunning) return;
    if (!e.isTrusted) return; // cheater!
    e.preventDefault();

    const hole = e.target.closest('.hole');
    if (!hole) return;

    const isUp = hole.classList.contains('up');
    if (!isUp) {
        misses++;
        combo = 0;
        hole.classList.add('miss');
        window.setTimeout(() => hole.classList.remove('miss'), 140);

        const { missPenalty } = getCurrentSpawnRange();
        if (missPenalty > 0) {
            score = Math.max(0, score - missPenalty);
            showFloatScore(hole, `-${missPenalty}`);
        } else {
            showFloatScore(hole, 'ミス');
        }
        playSound('miss');
        updateHud();
        return;
    }

    // Hit!
    hits++;
    hole.classList.remove('up');
    hole.classList.add('bonk');
    window.setTimeout(() => hole.classList.remove('bonk'), 220);

    const now = performance.now();
    if (now - lastHitAt <= 1200) {
        combo++;
    } else {
        combo = 1;
    }
    lastHitAt = now;
    maxCombo = Math.max(maxCombo, combo);

    const moleType = hole.dataset.moleType || 'normal';
    hole.dataset.moleType = '';
    hole.classList.remove('gold');

    const base = moleType === 'gold' ? 3 : 1;
    const bonus = Math.floor((combo - 1) / 5); // 5コンボごとに+1
    const points = base + bonus;
    score += points;

    showFloatScore(hole, `+${points}`);
    playSound(moleType === 'gold' ? 'gold' : 'hit');
    updateHud();
}

grid.addEventListener('pointerdown', handleBonk, { passive: false });

startBtn.addEventListener('click', startGame);

difficultyPicker.addEventListener('click', e => {
    const btn = e.target.closest('button[data-difficulty]');
    if (!btn) return;
    setActiveSegment(difficultyPicker, 'button.seg', btn);
});

durationPicker.addEventListener('click', e => {
    const btn = e.target.closest('button[data-duration]');
    if (!btn) return;
    setActiveSegment(durationPicker, 'button.seg', btn);
});

soundToggle.addEventListener('change', () => {
    const label = soundToggle.closest('label')?.querySelector('span');
    if (label) label.textContent = soundToggle.checked ? 'ON' : 'OFF';
});

async function gameOver() {
    isGameRunning = false;
    window.clearInterval(gameTimerId);
    window.clearTimeout(moleTimeoutId);
    clearAllHoles();
    playSound('end');

    // Save Score
    const player = getCurrentPlayer();
    if (player) {
        await saveScore(GAME_ID, player.id, score);
    }

    // Get Rankings
    const rankings = await getRankings(GAME_ID);
    const rankingHtml = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; width: 100%; padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; width: 20px;">${i + 1}.</span>
                <span style="display:inline-flex; align-items:center;">${avatarToHtml(r.avatar, { size: 24, className: 'ng-avatar', alt: '' })}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; max-width: 120px; white-space: nowrap;">${r.name}</span>
            </div>
            <span style="font-weight: bold;">${r.score}点</span>
        </div>
    `).join('');

    const totalTaps = hits + misses;
    const accuracy = totalTaps > 0 ? Math.round((hits / totalTaps) * 100) : 0;

    resultOverlay.innerHTML = `
    <h1>おしまい！</h1>
    <p style="font-size: 2rem;">スコア: ${score}</p>
    <p style="margin-top: -10px; opacity: 0.9;">さいこうコンボ: ${maxCombo} / あたった: ${accuracy}%</p>
    
    <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 12px; margin: 15px 0; width: 90%; max-width: 400px; text-align: left;">
        <h3 style="text-align: center; margin-bottom: 10px;">🏆 ランキング</h3>
        ${rankingHtml}
    </div>

    <button class="btn-primary" id="retryBtn">もういっかい</button>
    <button class="btn-primary" id="toStartBtn" style="margin-top: 10px; background: rgba(255,255,255,0.15); box-shadow: none;">せっていをかえる</button>
    <a href="../../pages/portal/portal.html" style="color: white; margin-top: 20px; display: block;">&larr; ほかのゲーム</a>
  `;
    resultOverlay.style.display = 'flex';

    resultOverlay.querySelector('#retryBtn')?.addEventListener('click', () => startGame());
    resultOverlay.querySelector('#toStartBtn')?.addEventListener('click', () => {
        resultOverlay.style.display = 'none';
        overlay.style.display = 'flex';
    });
}
