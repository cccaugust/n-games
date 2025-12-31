import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

// Config
let score = 0;
let isGameRunning = false;

// Paddle
const paddle = { x: 0, y: 0, width: 80, height: 15, color: '#74b9ff' };

// Ball
const ball = { x: 0, y: 0, radius: 8, dx: 4, dy: -4, color: '#fff' };

// Bricks
let bricks = [];
const BRICK_ROWS = 5;
const BRICK_COLS = 7;
const BRICK_PADDING = 10;
const BRICK_HEIGHT = 20;

function resize() {
    canvas.width = Math.min(window.innerWidth - 40, 600);
    // Maintain aspect somewhat?
    canvas.height = 500;

    paddle.y = canvas.height - 40;
    paddle.x = canvas.width / 2 - paddle.width / 2;
}
window.addEventListener('resize', resize);
resize();

function initGame() {
    isGameRunning = true;
    score = 0;
    scoreEl.textContent = 0;
    overlay.style.display = 'none';

    // Reset Paddle & Ball
    paddle.x = canvas.width / 2 - paddle.width / 2;
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 60;
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;

    // Build Bricks
    bricks = [];
    const brickWidth = (canvas.width - (BRICK_COLS + 1) * BRICK_PADDING) / BRICK_COLS;

    for (let c = 0; c < BRICK_COLS; c++) {
        for (let r = 0; r < BRICK_ROWS; r++) {
            bricks.push({
                x: c * (brickWidth + BRICK_PADDING) + BRICK_PADDING,
                y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_PADDING + 40, // +40 top margin
                width: brickWidth,
                height: BRICK_HEIGHT,
                status: 1, // 1: active, 0: broken
                color: `hsl(${r * 40}, 70%, 60%)`
            });
        }
    }

    animate();
}

function animate() {
    if (!isGameRunning) return;
    requestAnimationFrame(animate);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update Paddle (Follow pointer/touch mainly)

    // Update Ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) ball.dx = -ball.dx;
    if (ball.y - ball.radius < 0) ball.dy = -ball.dy;

    // Paddle Collision
    if (
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width
    ) {
        // Hit paddle
        ball.dy = -Math.abs(ball.dy); // Force up
        // Add spin based on hit pos?
        const hitPoint = ball.x - (paddle.x + paddle.width / 2);
        ball.dx = hitPoint * 0.15;
    }

    // Floor Collision (Game Over)
    if (ball.y - ball.radius > canvas.height) {
        return gameOver(false);
    }

    // Brick Collision
    let activeBricks = 0;
    bricks.forEach(b => {
        if (b.status === 1) {
            activeBricks++;
            if (
                ball.x > b.x && ball.x < b.x + b.width &&
                ball.y > b.y && ball.y < b.y + b.height
            ) {
                ball.dy = -ball.dy;
                b.status = 0;
                score += 10;
                scoreEl.textContent = score;
            }
        }
    });

    if (activeBricks === 0) {
        if (Math.abs(ball.dy) < 8) {
            // Speed up and reset bricks? Or just Win?
            // Let's reset bricks for loop but keep speed
            ball.dy *= 1.1;
            ball.dx *= 1.1;
            // Respawn bricks
            bricks.forEach(b => b.status = 1);
        }
    }

    // Draw Bricks
    bricks.forEach(b => {
        if (b.status === 1) {
            ctx.fillStyle = b.color;
            ctx.fillRect(b.x, b.y, b.width, b.height);
        }
    });

    // Draw Paddle
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw Ball
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

// Input Handling
function movePaddle(clientX) {
    const rect = canvas.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    if (relativeX > 0 && relativeX < canvas.width) {
        paddle.x = relativeX - paddle.width / 2;
    }
}
canvas.addEventListener('mousemove', e => movePaddle(e.clientX));
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    movePaddle(e.touches[0].clientX);
}, { passive: false });


async function gameOver(win) {
    isGameRunning = false;

    const player = getCurrentPlayer();
    if (player) {
        await saveScore('brick-breaker', player.id, score);
    }

    const rankings = await getRankings('brick-breaker');
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
        <h1>おしまい！</h1>
        <p style="font-size: 2rem;">SCORE: ${score}</p>
        
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

startBtn.addEventListener('click', initGame);
