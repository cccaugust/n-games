const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');

// Set canvas size (internal resolution)
canvas.width = 800;
canvas.height = 400;

let gameRunning = false;
let score = 0;
let frameId;

// Player settings
const player = {
    x: 50,
    y: 300,
    width: 40,
    height: 40,
    dy: 0,
    jumpPower: -12,
    gravity: 0.6,
    groundY: 300,
    grounded: true,
    color: '#74b9ff',
    emoji: '🚀'
};

// Obstacles
let obstacles = [];
const obstacleSpeed = 6;
let spawnTimer = 0;
let spawnInterval = 100; // frames

function resetGame() {
    score = 0;
    scoreEl.textContent = 0;
    obstacles = [];
    player.y = player.groundY;
    player.dy = 0;
    spawnTimer = 0;
    gameRunning = true;
    overlay.style.display = 'none';
    animate();
}

function jump() {
    if (player.grounded && gameRunning) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }
}

function update() {
    // Player physics
    player.dy += player.gravity;
    player.y += player.dy;

    if (player.y > player.groundY) {
        player.y = player.groundY;
        player.dy = 0;
        player.grounded = true;
    }

    // Spawning obstacles
    spawnTimer++;
    if (spawnTimer > spawnInterval) {
        spawnTimer = 0;
        spawnInterval = Math.max(50, spawnInterval - 2); // Get harder
        // Type of obstacle?
        obstacles.push({
            x: canvas.width,
            y: 310, // slightly lower
            width: 30,
            height: 30,
            emoji: '👽'
        });
    }

    // Update obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        obs.x -= obstacleSpeed;

        // Collision
        if (
            player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y
        ) {
            gameOver();
        } // Remove checks
        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            i--;
            score++;
            scoreEl.textContent = score;
        }
    }
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = '#636e72';
    ctx.fillRect(0, player.groundY + player.height, canvas.width, 2);

    // Player
    ctx.font = '40px serif';
    ctx.fillText(player.emoji, player.x, player.y + 40);

    // Obstacles
    obstacles.forEach(obs => {
        ctx.fillText(obs.emoji, obs.x, obs.y + 30);
    });
}

function animate() {
    if (!gameRunning) return;
    update();
    draw();
    frameId = requestAnimationFrame(animate);
}

function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(frameId);
    overlay.style.display = 'flex';
    overlay.innerHTML = `
    <h1>ぶつかった！</h1>
    <p>スコア: ${score}</p>
    <button class="btn-primary" onclick="location.reload()">もういっかい</button>
  `;
}

// Input handling
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault(); // prevent scroll
        if (!gameRunning && overlay.style.display === 'none') {
            // Maybe in game over state? No, reload handles that.
        } else {
            jump();
        }
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    jump();
});
canvas.addEventListener('mousedown', (e) => {
    jump();
});

startBtn.addEventListener('click', resetGame);
