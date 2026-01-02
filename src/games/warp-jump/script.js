const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');

import { getCurrentPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import { assetPreviewDataUrl, assetToPngDataUrl, getPixelAsset, listPixelAssets } from '../../js/pixelAssets.js';

requireAuth();

// Game state
let isGameOver = false;
let score = 0;
let gameSpeed = 5;
let animationId;

// Images
import playerUrl from './assets/player.png';
import enemyUrl from './assets/enemy.png';

const playerImg = new Image();
playerImg.src = playerUrl;
const enemyImg = new Image();
enemyImg.src = enemyUrl;

// Character picker UI
const selectedCharacterNameEl = document.getElementById('selectedCharacterName');
const openCharacterBtn = document.getElementById('openCharacterBtn');
const characterModal = document.getElementById('characterModal');
const closeCharacterBtn = document.getElementById('closeCharacterBtn');
const useDefaultBtn = document.getElementById('useDefaultBtn');
const goToMakerLink = document.getElementById('goToMakerLink');
const characterList = document.getElementById('characterList');

const playerSession = getCurrentPlayer();
const ownerId = playerSession?.id != null ? String(playerSession.id) : 'unknown';
const CHARACTER_SELECTION_KEY = `n-games-selected-character-${ownerId}`;

goToMakerLink.href = resolvePath('/pages/pixel-art-maker/');

function openModal() {
  characterModal.classList.remove('hidden');
  characterModal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  characterModal.classList.add('hidden');
  characterModal.setAttribute('aria-hidden', 'true');
}

openCharacterBtn.addEventListener('click', async () => {
  await renderCharacterList();
  openModal();
});
closeCharacterBtn.addEventListener('click', closeModal);
characterModal.addEventListener('click', (e) => {
  if (e.target === characterModal) closeModal();
});

useDefaultBtn.addEventListener('click', () => {
  localStorage.removeItem(CHARACTER_SELECTION_KEY);
  selectedCharacterNameEl.textContent = 'デフォルト';
  playerImg.src = playerUrl;
  closeModal();
});

async function applySelectedCharacterFromStorage() {
  const assetId = localStorage.getItem(CHARACTER_SELECTION_KEY);
  if (!assetId) {
    selectedCharacterNameEl.textContent = 'デフォルト';
    playerImg.src = playerUrl;
    return;
  }

  const asset = await getPixelAsset(assetId);
  if (!asset || asset.ownerId !== ownerId || asset.kind !== 'character') {
    localStorage.removeItem(CHARACTER_SELECTION_KEY);
    selectedCharacterNameEl.textContent = 'デフォルト';
    playerImg.src = playerUrl;
    return;
  }

  selectedCharacterNameEl.textContent = asset.name || '（キャラ）';
  playerImg.src = assetToPngDataUrl(asset);
}

async function renderCharacterList() {
  const list = await listPixelAssets({ ownerId, kind: 'character' });
  characterList.innerHTML = '';

  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#636e72';
    empty.style.fontWeight = '700';
    empty.textContent = 'まだキャラがないよ（「ドット絵メーカー」で作って保存してね）';
    characterList.appendChild(empty);
    return;
  }

  const selectedId = localStorage.getItem(CHARACTER_SELECTION_KEY);

  list.forEach((asset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'character-item';
    btn.classList.toggle('selected', selectedId === asset.id);

    const img = document.createElement('img');
    img.className = 'character-thumb';
    img.alt = '';
    img.src = assetPreviewDataUrl(asset, 56);

    const meta = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'character-item-name';
    name.textContent = asset.name || '(no name)';

    const info = document.createElement('div');
    info.className = 'character-item-meta';
    info.textContent = `${asset.width}×${asset.height}`;

    meta.appendChild(name);
    meta.appendChild(info);

    btn.appendChild(img);
    btn.appendChild(meta);

    btn.addEventListener('click', async () => {
      localStorage.setItem(CHARACTER_SELECTION_KEY, asset.id);
      await applySelectedCharacterFromStorage();
      await renderCharacterList();
      closeModal();
    });

    characterList.appendChild(btn);
  });
}

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

    // Clear canvas & Draw Sky
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Draw Ground ---
    ctx.fillStyle = '#654321'; // Darker brown ground
    ctx.fillRect(0, player.groundY, canvas.width, canvas.height - player.groundY);

    // Green grass top
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, player.groundY, canvas.width, 20);

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
    if (playerImg.complete && playerImg.naturalWidth > 0) {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        // Fallback or loading
        ctx.fillStyle = 'purple';
        ctx.fillRect(player.x, player.y, player.width, player.height);

        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText('Loading...', player.x, player.y - 10);
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
        if (enemyImg.complete && enemyImg.naturalWidth > 0) {
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
// Ensure DOM content is loaded? script is usually defer or at end of body.
// But to be safe if images trigger load events.
(async function init() {
  await applySelectedCharacterFromStorage();
  update();
})();
