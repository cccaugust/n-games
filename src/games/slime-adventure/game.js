import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreEl');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const rankingList = document.getElementById('rankingList');
const finalScoreEl = document.getElementById('finalScore');
const resultTitle = document.getElementById('resultTitle');

// Assets
const assets = {
    player: new Image(),
    enemy: new Image(),
    item: new Image(),
    ally: new Image(),
    ground: new Image(),
    bg: new Image()
};

let assetsLoaded = 0;
const totalAssets = Object.keys(assets).length;

function loadAssets() {
    return new Promise(resolve => {
        const check = () => {
            assetsLoaded++;
            if (assetsLoaded === totalAssets) resolve();
        };

        assets.player.src = './assets/player.png';
        assets.enemy.src = './assets/enemy.png';
        assets.item.src = './assets/item.png';
        assets.ally.src = './assets/ally.png';
        assets.ground.src = './assets/ground.png';
        assets.bg.src = './assets/bg.png';

        Object.values(assets).forEach(img => img.onload = check);
    });
}

// Game State
let isGameRunning = false;
let score = 0;
let cameraX = 0;
let keys = { ArrowLeft: false, ArrowRight: false, Space: false };

// Physics
const GRAVITY = 0.6;
const FRICTION = 0.8;
const MOVE_SPEED = 5;
const JUMP_FORCE = -12;

// Entities
let player = {
    x: 50, y: 0,
    width: 50, height: 50,
    vx: 0, vy: 0,
    grounded: false
};

const LEVEL_LENGTH = 3000;
let enemies = [];
let items = [];
let groundTiles = [];
let goal = { x: LEVEL_LENGTH - 100, y: 300, width: 60, height: 60 };

function initLevel() {
    isGameRunning = true;
    score = 0;
    scoreEl.textContent = 0;
    cameraX = 0;
    player = { x: 50, y: 300, width: 50, height: 50, vx: 0, vy: 0, grounded: false }; // Adjusted start y

    // Generate Ground
    // Just a flat floor for now, maybe some pits later
    // y = 350

    // Enemies
    enemies = [];
    for (let i = 0; i < 10; i++) {
        enemies.push({
            x: 500 + i * 300 + Math.random() * 100,
            y: 350 - 50, // On ground
            width: 50,
            height: 50,
            vx: -2, // Mobile enemies
            patrolStart: 0, // Set in update
            type: 'gorilla'
        });
    }

    // Items (Bombs)
    items = [];
    for (let i = 0; i < 15; i++) {
        items.push({
            x: 300 + i * 150 + Math.random() * 100,
            y: 200 + Math.random() * 100,
            width: 30,
            height: 30,
            collected: false
        });
    }

    // Goal
    goal = { x: LEVEL_LENGTH - 150, y: 350 - 60, width: 60, height: 60 };
}

function update() {
    if (!isGameRunning) return;
    requestAnimationFrame(update);

    // Input Handling
    if (keys.ArrowLeft) player.vx -= 1;
    if (keys.ArrowRight) player.vx += 1;
    if (keys.Space && player.grounded) {
        player.vy = JUMP_FORCE;
        player.grounded = false;
    }

    // Physics
    player.vy += GRAVITY;
    player.vx *= FRICTION;
    player.x += player.vx;
    player.y += player.vy;

    // Ground Collision (Simple Flat Floor at y=350)
    if (player.y + player.height > 350) {
        player.y = 350 - player.height;
        player.vy = 0;
        player.grounded = true;
    }

    // World Bounds
    if (player.x < 0) player.x = 0;
    if (player.x > LEVEL_LENGTH) player.x = LEVEL_LENGTH;

    // Camera follow
    cameraX = Math.max(0, player.x - canvas.width / 3);
    cameraX = Math.min(cameraX, LEVEL_LENGTH - canvas.width);

    // Enemy Update
    enemies.forEach(e => {
        e.x += e.vx;
        // Simple Patrol Logic
        // Actually just move left for now, wrap maybe? No, simple patrol
        // Reverse if hitting logical bounds? Let's assume they walk back and forth 100px
        // Simplified: Just move left constantly but reset

        // Collision with Player
        if (
            player.x < e.x + e.width &&
            player.x + player.width > e.x &&
            player.y < e.y + e.height &&
            player.y + player.height > e.y
        ) {
            gameOver(false);
        }
    });

    // Item Collection
    items.forEach(item => {
        if (!item.collected) {
            if (
                player.x < item.x + item.width &&
                player.x + player.width > item.x &&
                player.y < item.y + item.height &&
                player.y + player.height > item.y
            ) {
                item.collected = true;
                score += 100;
                scoreEl.textContent = score;
                // Effect?
            }
        }
    });

    // Goal Check
    if (
        player.x < goal.x + goal.width &&
        player.x + player.width > goal.x &&
        player.y < goal.y + goal.height &&
        player.y + player.height > goal.y
    ) {
        gameOver(true);
    }

    draw();
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background (Parallax ish or just recurring)
    // Draw seamless bg pattern
    const bgW = assets.bg.width || 800;
    const bgH = assets.bg.height || 450;
    // Tiling
    const offsetX = -(cameraX * 0.5) % bgW;
    ctx.drawImage(assets.bg, offsetX, 0, bgW, canvas.height);
    ctx.drawImage(assets.bg, offsetX + bgW, 0, bgW, canvas.height);

    ctx.save();
    ctx.translate(-cameraX, 0);

    // Goal (Ally)
    ctx.drawImage(assets.ally, goal.x, goal.y, goal.width, goal.height);

    // Items
    items.forEach(item => {
        if (!item.collected) {
            ctx.drawImage(assets.item, item.x, item.y, item.width, item.height);
        }
    });

    // Enemies
    enemies.forEach(e => {
        ctx.drawImage(assets.enemy, e.x, e.y, e.width, e.height);
    });

    // Player
    // Check direction for flip?
    ctx.drawImage(assets.player, player.x, player.y, player.width, player.height);

    // Ground
    // Tile the ground
    const groundW = assets.ground.width || 100;
    const tilesNeeded = Math.ceil(LEVEL_LENGTH / groundW);
    for (let i = 0; i < tilesNeeded; i++) {
        ctx.drawImage(assets.ground, i * groundW, 350, groundW, 100); // 100 height ground
    }

    ctx.restore();
}

async function gameOver(win) {
    isGameRunning = false;
    startOverlay.classList.add('hidden');
    gameOverOverlay.classList.remove('hidden');

    resultTitle.textContent = win ? 'クリア！ 🎉' : 'ゲームオーバー...';
    resultTitle.style.color = win ? '#fdcb6e' : '#ff7675';
    finalScoreEl.textContent = score;

    // Save Score
    const p = getCurrentPlayer();
    if (p) await saveScore('slime-adventure', p.id, score);

    // Ranking
    const rankings = await getRankings('slime-adventure');
    rankingList.innerHTML = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; width: 100%; padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; width: 20px;">${i + 1}.</span>
                <span style="display:inline-flex; align-items:center;">${avatarToHtml(r.avatar, { size: 24, className: 'ng-avatar', alt: '' })}</span>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px;">${r.name}</span>
            </div>
            <span>${r.score}</span>
        </div>
    `).join('');
}

// Controls
window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') keys.Space = true;
});
window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// Mobile Controls
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const jumpBtn = document.getElementById('jumpBtn');

const handleTouch = (key, state) => (e) => { e.preventDefault(); keys[key] = state; };

leftBtn.addEventListener('touchstart', handleTouch('ArrowLeft', true));
leftBtn.addEventListener('touchend', handleTouch('ArrowLeft', false));
rightBtn.addEventListener('touchstart', handleTouch('ArrowRight', true));
rightBtn.addEventListener('touchend', handleTouch('ArrowRight', false));
jumpBtn.addEventListener('touchstart', handleTouch('Space', true));
jumpBtn.addEventListener('touchend', handleTouch('Space', false));

startBtn.onclick = () => {
    startOverlay.classList.add('hidden');
    initLevel();
    update();
};
restartBtn.onclick = () => {
    gameOverOverlay.classList.add('hidden');
    initLevel();
    update();
};

window.onload = async () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    await loadAssets();
    // Ready
};
window.onresize = () => {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
};
