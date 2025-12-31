import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

// Config
const GRID = 20;
let COLS, ROWS;
let score = 0;
let isGameRunning = false;
let gameLoop;
let lastTime = 0;
let speed = 10; // moves per second

// Snake
let snake = [];
let dx = 1;
let dy = 0;
let nextDx = 1;
let nextDy = 0;

// Food
let food = null;

function resize() {
    canvas.width = Math.min(window.innerWidth - 40, 600);
    canvas.height = canvas.width; // Square
    COLS = Math.floor(canvas.width / GRID);
    ROWS = Math.floor(canvas.height / GRID);
}
window.addEventListener('resize', resize);
resize();

function initGame() {
    isGameRunning = true;
    score = 0;
    scoreEl.textContent = 0;
    overlay.style.display = 'none';

    // Init Snake
    const startX = Math.floor(COLS / 2);
    const startY = Math.floor(ROWS / 2);
    snake = [
        { x: startX, y: startY },
        { x: startX - 1, y: startY },
        { x: startX - 2, y: startY }
    ];
    dx = 1; dy = 0;
    nextDx = 1; nextDy = 0;

    spawnFood();

    lastTime = performance.now();
    requestAnimationFrame(update);
}

function spawnFood() {
    let valid = false;
    while (!valid) {
        food = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS)
        };
        // Check collision with snake
        valid = !snake.some(s => s.x === food.x && s.y === food.y);
    }
}

function update(time) {
    if (!isGameRunning) return;
    requestAnimationFrame(update);

    const secondsSinceLastRender = (time - lastTime) / 1000;
    if (secondsSinceLastRender < 1 / speed) return;

    lastTime = time;

    // Update direction
    dx = nextDx;
    dy = nextDy;

    // Move Head
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Collision Checks
    // Wall
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        return gameOver();
    }
    // Self
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
        return gameOver();
    }

    snake.unshift(head);

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        speed = Math.min(20, 10 + Math.floor(score / 5)); // Increase speed
        spawnFood();
    } else {
        snake.pop(); // Remove tail
    }

    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Food
    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.arc(food.x * GRID + GRID / 2, food.y * GRID + GRID / 2, GRID / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Snake
    ctx.fillStyle = '#6c5ce7';
    snake.forEach((s, i) => {
        if (i === 0) ctx.fillStyle = '#a29bfe'; // Head color
        else ctx.fillStyle = '#6c5ce7';

        ctx.fillRect(s.x * GRID, s.y * GRID, GRID - 1, GRID - 1);
    });
}

async function gameOver() {
    isGameRunning = false;

    const player = getCurrentPlayer();
    if (player) {
        await saveScore('snake', player.id, score);
    }

    const rankings = await getRankings('snake');
    const rankingHtml = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; width: 100%; padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; width: 20px;">${i + 1}.</span>
                <span style="font-size: 1.5rem;">${r.avatar}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; max-width: 120px; white-space: nowrap;">${r.name}</span>
            </div>
            <span style="font-weight: bold;">${r.score}</span>
        </div>
    `).join('');

    overlay.innerHTML = `
        <h1>ゲームオーバー 💥</h1>
        <p style="font-size: 2rem;">🍎: ${score}</p>
        
        <div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 12px; margin: 15px 0; width: 90%; max-width: 400px; text-align: left;">
            <h3 style="text-align: center; margin-bottom: 10px;">🏆 ランキング</h3>
            ${rankingHtml}
        </div>

        <button class="btn-primary" id="restartBtn">もういっかい</button>
        <a href="../../pages/portal/portal.html" style="color: white; margin-top: 20px; display: block;">&larr; ほかのゲーム</a>
    `;
    overlay.style.display = 'flex';
    document.getElementById('restartBtn').onclick = () => window.location.reload();
}

// Input
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' && dy === 0) { nextDx = 0; nextDy = -1; }
    else if (e.key === 'ArrowDown' && dy === 0) { nextDx = 0; nextDy = 1; }
    else if (e.key === 'ArrowLeft' && dx === 0) { nextDx = -1; nextDy = 0; }
    else if (e.key === 'ArrowRight' && dx === 0) { nextDx = 1; nextDy = 0; }
});

// Swipe Logic for Mobile
let touchStartX = 0;
let touchStartY = 0;
canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
});
canvas.addEventListener('touchmove', e => e.preventDefault()); // Prevent scroll
canvas.addEventListener('touchend', e => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal
        if (Math.abs(diffX) > 30) {
            if (diffX > 0 && dx === 0) { nextDx = 1; nextDy = 0; }
            else if (diffX < 0 && dx === 0) { nextDx = -1; nextDy = 0; }
        }
    } else {
        // Vertical
        if (Math.abs(diffY) > 30) {
            if (diffY > 0 && dy === 0) { nextDx = 0; nextDy = 1; }
            else if (diffY < 0 && dy === 0) { nextDx = 0; nextDy = -1; }
        }
    }
});

startBtn.addEventListener('click', initGame);
