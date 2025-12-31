const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

// Game state
let isGameOver = false;
let score = 0;
let gameSpeed = 5;
let animationId;

// Images
const playerImg = new Image();
playerImg.src = './assets/player.png';
const enemyImg = new Image();
enemyImg.src = './assets/enemy.png';

// Player object
const player = {
    x: 50,
    y: 0, // Will be set relative to ground
    width: 60,
    height: 60,
    dy: 0,
    jumpForce: 15,
    gravity: 0.8,
    grounded: false,
    groundY: 300 // Y position of the ground
};

// Initialize player position
player.y = player.groundY - player.height;

// Obstacles array
let obstacles = [];
let obstacleTimer = 0;

// Input handling
function jump() {
    if (player.grounded && !isGameOver) {
        player.dy = -player.jumpForce;
        player.grounded = false;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        jump();
        // Prevent scrolling with space
        e.preventDefault();
    }
});

canvas.addEventListener('touchstart', (e) => {
    jump();
    e.preventDefault();
}, { passive: false });
canvas.addEventListener('click', jump);

restartBtn.addEventListener('click', resetGame);

function spawnObstacle() {
    // Random size variation
    const size = 40 + Math.random() * 30;

    obstacles.push({
        x: canvas.width,
        y: player.groundY - size,
        width: size,
        height: size,
        speed: gameSpeed
    });
}

function update() {
    if (isGameOver) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Draw Ground ---
    ctx.fillStyle = '#eee';
    ctx.fillRect(0, player.groundY, canvas.width, canvas.height - player.groundY);
    ctx.beginPath();
    ctx.moveTo(0, player.groundY);
    ctx.lineTo(canvas.width, player.groundY);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // --- Update Player ---
    player.dy += player.gravity;
    player.y += player.dy;

    // Ground collision
    if (player.y + player.height > player.groundY) {
        player.y = player.groundY - player.height;
        player.dy = 0;
        player.grounded = true;
    }

    // Draw Player
    if (playerImg.complete) {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        // Fallback
        ctx.fillStyle = 'purple';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // --- Update Obstacles ---
    obstacleTimer++;
    // Spawn obstacle every 60-120 frames (random)
    if (obstacleTimer > 60 + Math.random() * 60) {
        spawnObstacle();
        obstacleTimer = 0;
    }

    // Loop through obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obs.speed;

        // Draw Obstacle
        if (enemyImg.complete) {
            ctx.drawImage(enemyImg, obs.x, obs.y, obs.width, obs.height);
        } else {
            ctx.fillStyle = 'green';
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        }

        // Collision Detection
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        }

        // Remove off-screen obstacles
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            i--;
            score++;
            scoreEl.textContent = score;

            // Increase speed slightly
            if (score % 5 === 0) gameSpeed += 0.5;
        }
    }

    animationId = requestAnimationFrame(update);
}

function gameOver() {
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
}

function resetGame() {
    isGameOver = false;
    score = 0;
    gameSpeed = 5;
    scoreEl.textContent = '0';
    obstacles = [];
    player.y = player.groundY - player.height;
    player.dy = 0;
    gameOverScreen.classList.add('hidden');
    update();
}

// Start game
update();
