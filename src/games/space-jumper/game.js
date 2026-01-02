import { getCurrentPlayer } from '../../js/auth.js';
import { saveScore, getRankings } from '../../js/score.js';
import { avatarToHtml } from '../../js/avatar.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

// Game state
let isGameRunning = false;
let score = 0;
let frames = 0;
let gameSpeed = 5;

// Player (The Ship)
const ship = {
    x: 50,
    y: 0, // Will be set in init
    width: 40,
    height: 40,
    dy: 0,
    jumpForce: 10,
    grounded: true,
    color: '#fab1a0' // Default
};

// Obstacles
let obstacles = [];

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 400; // Fixed height
    ship.y = canvas.height - ship.height;
}

window.addEventListener('resize', resize);
resize();

function initGame() {
    isGameRunning = true;
    score = 0;
    frames = 0;
    gameSpeed = 5;
    obstacles = [];
    scoreEl.textContent = score;
    overlay.style.display = 'none';

    ship.y = canvas.height - ship.height;
    ship.dy = 0;

    update();
}

function jump() {
    if (!isGameRunning) return;
    if (ship.grounded) {
        ship.dy = -ship.jumpForce;
        ship.grounded = false;
    }
}

// Controls
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') jump();
});
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});
canvas.addEventListener('click', jump);


function update() {
    if (!isGameRunning) return;

    requestAnimationFrame(update);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frames++;

    // Difficulty
    if (frames % 1000 === 0) gameSpeed += 0.5;

    // Spawn Obstacles
    // Random interval somewhat
    if (frames % 120 === 0) { // Every ~2 seconds
        let height = 30 + Math.random() * 30;
        obstacles.push({
            x: canvas.width,
            y: canvas.height - height,
            width: 30,
            height: height,
            color: '#ff7675'
        });
    }

    // Update Score
    score++;
    scoreEl.textContent = Math.floor(score / 10);

    // Physics - Ship
    ship.dy += 0.5; // Gravity
    ship.y += ship.dy;

    // Ground collision
    if (ship.y + ship.height > canvas.height) {
        ship.y = canvas.height - ship.height;
        ship.dy = 0;
        ship.grounded = true;
    }

    // Draw Ship
    ctx.fillStyle = ship.color;
    // Simple Rocket shape
    ctx.beginPath();
    ctx.moveTo(ship.x + ship.width / 2, ship.y);
    ctx.lineTo(ship.x + ship.width, ship.y + ship.height);
    ctx.lineTo(ship.x, ship.y + ship.height);
    ctx.fill();

    // Handle Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= gameSpeed;

        // Draw
        ctx.fillStyle = obs.color;
        // Alien shape? Simple rect for now
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Collision
        if (
            ship.x < obs.x + obs.width &&
            ship.x + ship.width > obs.x &&
            ship.y < obs.y + obs.height &&
            ship.y + ship.height > obs.y
        ) {
            showGameOver();
        }

        // Remove off-screen
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            i--;
        }
    }
}

async function showGameOver() {
    isGameRunning = false;

    const finalScore = Math.floor(score / 10);

    const player = getCurrentPlayer();
    if (player) {
        await saveScore('space-jumper', player.id, finalScore);
    }

    const rankings = await getRankings('space-jumper');
    const rankingHtml = rankings.map((r, i) => `
        <div style="display: flex; justify-content: space-between; width: 100%; padding: 5px; border-bottom: 1px solid rgba(255,255,255,0.2);">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: bold; width: 20px;">${i + 1}.</span>
                <span style="display:inline-flex; align-items:center;">${avatarToHtml(r.avatar, { size: 24, className: 'ng-avatar', alt: '' })}</span>
                <span style="overflow: hidden; text-overflow: ellipsis; max-width: 120px; white-space: nowrap;">${r.name}</span>
            </div>
            <span style="font-weight: bold;">${r.score}</span>
        </div>
    `).join('');

    overlay.innerHTML = `
        <h1>ゲームオーバー 👾</h1>
        <p style="font-size: 2rem;">SCORE: ${finalScore}</p>
        
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
