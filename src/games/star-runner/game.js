const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const coinLabel = document.getElementById('coinLabel');
const lifeLabel = document.getElementById('lifeLabel');
const messageLabel = document.getElementById('messageLabel');

const WORLD_WIDTH = 3600;
const GRAVITY = 0.85;
const PLAYER_SPEED = 4;
const JUMP_POWER = 16;

const level = {
  platforms: [
    { x: 0, y: 490, w: 860, h: 70 },
    { x: 930, y: 460, w: 250, h: 100 },
    { x: 1240, y: 415, w: 220, h: 145 },
    { x: 1540, y: 355, w: 180, h: 205 },
    { x: 1780, y: 430, w: 260, h: 130 },
    { x: 2120, y: 360, w: 210, h: 200 },
    { x: 2370, y: 300, w: 190, h: 260 },
    { x: 2620, y: 410, w: 260, h: 150 },
    { x: 2930, y: 460, w: 670, h: 100 }
  ],
  coins: [
    { x: 1020, y: 405 }, { x: 1100, y: 405 }, { x: 1330, y: 360 },
    { x: 1420, y: 360 }, { x: 1590, y: 290 }, { x: 1680, y: 290 },
    { x: 1830, y: 365 }, { x: 2020, y: 365 }, { x: 2170, y: 295 },
    { x: 2290, y: 295 }, { x: 2440, y: 235 }, { x: 2540, y: 235 },
    { x: 2690, y: 345 }, { x: 2820, y: 345 }, { x: 3140, y: 405 },
    { x: 3320, y: 405 }
  ],
  enemies: [
    { x: 1060, y: 430, w: 42, h: 30, minX: 960, maxX: 1120, vx: 1.3 },
    { x: 1860, y: 400, w: 42, h: 30, minX: 1810, maxX: 1980, vx: 1.8 },
    { x: 2700, y: 380, w: 42, h: 30, minX: 2670, maxX: 2840, vx: 1.5 },
    { x: 3200, y: 430, w: 42, h: 30, minX: 3020, maxX: 3460, vx: 2 }
  ],
  goal: { x: 3480, y: 365, w: 35, h: 95 }
};

const input = { left: false, right: false, jumpPressed: false };

const player = {
  x: 80,
  y: 350,
  w: 38,
  h: 48,
  vx: 0,
  vy: 0,
  onGround: false,
  lives: 3,
  coins: 0,
  invincibleFrames: 0
};

let cameraX = 0;
let collectedCoins = new Set();
let gameState = 'playing';

const totalCoins = level.coins.length;
coinLabel.textContent = `コイン: 0 / ${totalCoins}`;

const keyMap = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right'
};

document.addEventListener('keydown', (e) => {
  if (keyMap[e.code]) input[keyMap[e.code]] = true;
  if ((e.code === 'ArrowUp' || e.code === 'Space' || e.code === 'KeyW') && !e.repeat) {
    input.jumpPressed = true;
  }
  if (e.code === 'KeyR') resetGame();
});

document.addEventListener('keyup', (e) => {
  if (keyMap[e.code]) input[keyMap[e.code]] = false;
});

function resetGame() {
  player.x = 80;
  player.y = 350;
  player.vx = 0;
  player.vy = 0;
  player.lives = 3;
  player.coins = 0;
  player.invincibleFrames = 0;
  collectedCoins = new Set();
  gameState = 'playing';
  messageLabel.textContent = '→ と ← で移動 / スペースでジャンプ';
  updateHud();
}

function updateHud() {
  coinLabel.textContent = `コイン: ${player.coins} / ${totalCoins}`;
  lifeLabel.textContent = `ライフ: ${player.lives}`;
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function hurtPlayer() {
  if (player.invincibleFrames > 0 || gameState !== 'playing') return;
  player.lives -= 1;
  player.invincibleFrames = 90;
  player.vy = -8;
  updateHud();
  if (player.lives <= 0) {
    gameState = 'gameover';
    messageLabel.textContent = 'ゲームオーバー！Rでリスタート';
  }
}

function physicsUpdate() {
  if (gameState !== 'playing') return;

  const move = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  player.vx = move * PLAYER_SPEED;

  if (input.jumpPressed && player.onGround) {
    player.vy = -JUMP_POWER;
    player.onGround = false;
  }
  input.jumpPressed = false;

  player.vy += GRAVITY;
  player.x += player.vx;

  player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x));

  player.y += player.vy;
  player.onGround = false;

  for (const pf of level.platforms) {
    if (!aabb(player, pf)) continue;

    const prevBottom = player.y - player.vy + player.h;
    const prevTop = player.y - player.vy;

    if (prevBottom <= pf.y) {
      player.y = pf.y - player.h;
      player.vy = 0;
      player.onGround = true;
    } else if (prevTop >= pf.y + pf.h) {
      player.y = pf.y + pf.h;
      player.vy = 0;
    } else {
      if (player.vx > 0) player.x = pf.x - player.w;
      if (player.vx < 0) player.x = pf.x + pf.w;
    }
  }

  if (player.y > canvas.height + 200) {
    hurtPlayer();
    player.x = Math.max(60, player.x - 140);
    player.y = 120;
    player.vy = 0;
  }

  level.coins.forEach((coin, i) => {
    if (collectedCoins.has(i)) return;
    const hitArea = { x: coin.x - 14, y: coin.y - 14, w: 28, h: 28 };
    if (aabb(player, hitArea)) {
      collectedCoins.add(i);
      player.coins += 1;
      updateHud();
    }
  });

  for (const enemy of level.enemies) {
    enemy.x += enemy.vx;
    if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) enemy.vx *= -1;

    if (aabb(player, enemy)) {
      const stomping = player.vy > 0 && player.y + player.h - enemy.y < 20;
      if (stomping) {
        player.vy = -10;
        enemy.x = enemy.minX;
        enemy.vx *= -1;
      } else {
        hurtPlayer();
      }
    }
  }

  if (aabb(player, level.goal)) {
    if (player.coins === totalCoins) {
      gameState = 'clear';
      messageLabel.textContent = 'ステージクリア！おめでとう 🎉  (Rで再挑戦)';
    } else {
      messageLabel.textContent = `ゴールにはコインが必要！あと ${totalCoins - player.coins} 枚`;
    }
  }

  if (player.invincibleFrames > 0) player.invincibleFrames -= 1;

  const targetCamera = player.x - canvas.width * 0.35;
  cameraX += (targetCamera - cameraX) * 0.08;
  cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, cameraX));
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#60a5fa');
  gradient.addColorStop(0.55, '#38bdf8');
  gradient.addColorStop(1, '#22c55e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let layer = 0; layer < 3; layer++) {
    const speed = (layer + 1) * 0.15;
    const y = 120 + layer * 80;
    for (let i = -1; i < 8; i++) {
      const x = ((i * 260) - (cameraX * speed)) % (260 * 8);
      ctx.fillStyle = ['#dbeafe', '#bfdbfe', '#93c5fd'][layer];
      ctx.beginPath();
      ctx.ellipse(x, y, 120, 36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);

  for (const pf of level.platforms) {
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(pf.x, pf.y, pf.w, 12);
    for (let x = pf.x + 8; x < pf.x + pf.w - 8; x += 16) {
      ctx.fillStyle = '#c4b5fd';
      ctx.fillRect(x, pf.y + 4, 8, 4);
    }
  }

  level.coins.forEach((coin, i) => {
    if (collectedCoins.has(i)) return;
    const pulse = 1 + Math.sin((performance.now() / 120) + i) * 0.1;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  level.enemies.forEach((enemy) => {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = '#fee2e2';
    ctx.fillRect(enemy.x + 6, enemy.y + 7, 8, 8);
    ctx.fillRect(enemy.x + 28, enemy.y + 7, 8, 8);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(enemy.x + 2, enemy.y + enemy.h - 6, enemy.w - 4, 4);
  });

  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(level.goal.x + 12, level.goal.y - 24, 32, 24);

  if (!(player.invincibleFrames > 0 && Math.floor(player.invincibleFrames / 6) % 2 === 0)) {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = '#d1fae5';
    ctx.fillRect(player.x + 5, player.y + 8, 10, 10);
    ctx.fillRect(player.x + 22, player.y + 8, 10, 10);
    ctx.fillStyle = '#065f46';
    ctx.fillRect(player.x + 7, player.y + player.h - 8, 8, 6);
    ctx.fillRect(player.x + 22, player.y + player.h - 8, 8, 6);
  }

  ctx.restore();
}

function drawOverlay() {
  if (gameState === 'playing') return;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(gameState === 'clear' ? 'STAGE CLEAR!' : 'GAME OVER', canvas.width / 2, canvas.height / 2 - 20);
  ctx.font = '28px sans-serif';
  ctx.fillText('R キーでリスタート', canvas.width / 2, canvas.height / 2 + 34);
}

function loop() {
  physicsUpdate();
  drawBackground();
  drawWorld();
  drawOverlay();
  requestAnimationFrame(loop);
}

updateHud();
loop();
