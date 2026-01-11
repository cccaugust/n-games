// ===== Bomberman Game - Main Entry Point =====

import { Player, Enemy, Bomb, Explosion, Item, Particle, ExitDoor } from './entities.js';
import { initAudio, resumeAudio, playSound, toggleSound, isSoundEnabled as audioEnabled } from './audio.js';
import {
  defaultStages, defaultEnemyTypes, loadCustomStages, saveCustomStage, deleteCustomStage,
  TILE, loadProgress, markStageCleared, isStageUnlocked, createNewStage, generateEmptyMap
} from './stages.js';
import {
  readSkinSelection, setSkinSample, setSkinAsset, setSkinPokemon,
  loadSpriteData, loadSamples, isSoundEnabled, setSoundEnabled,
  loadCustomEnemies, saveCustomEnemy, deleteCustomEnemy, createNewEnemy,
  decodePixelsB64, createImageFromPixels
} from './settings.js';

// ===== Game State =====
let gameState = 'title'; // title, stageSelect, skinSelect, editor, enemyEditor, playing, paused, clear, gameover
let currentStage = null;
let currentStageIndex = 0;
let allStages = [];

// Game objects
let player = null;
let enemies = [];
let bombs = [];
let explosions = [];
let items = [];
let particles = [];
let exitDoor = null;

// Map
let mapData = [];
let mapWidth = 0;
let mapHeight = 0;
const TILE_SIZE = 32;

// Canvas
let canvas = null;
let ctx = null;
let canvasWidth = 0;
let canvasHeight = 0;
let offsetX = 0;
let offsetY = 0;

// Timing
let lastTime = 0;
let gameTime = 0;
let timeLimit = 180;
let score = 0;
let lives = 3;

// Saved player stats (for carrying over between stages)
let savedPlayerStats = null;

// Input
let keys = {};
let touchDir = null;
let isMobile = false;

// Player sprite
let playerSprite = null;

// Editor state
let editorStage = null;
let editorTool = TILE.BLOCK;
let editorEnemyType = null;

// Enemy editor state
let editingEnemy = null;
let enemySpriteData = null;

// ===== DOM Elements =====
const screens = {
  title: document.getElementById('titleScreen'),
  stageSelect: document.getElementById('stageSelectScreen'),
  skinSelect: document.getElementById('skinSelectScreen'),
  editor: document.getElementById('stageEditorScreen'),
  enemyEditor: document.getElementById('enemyEditorScreen'),
  game: document.getElementById('gameScreen')
};

const overlays = {
  pause: document.getElementById('pauseOverlay'),
  clear: document.getElementById('clearOverlay'),
  gameover: document.getElementById('gameOverOverlay')
};

// ===== Initialization =====
async function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');

  // Check mobile
  isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Load stages
  allStages = [...defaultStages, ...loadCustomStages()];

  // Load player sprite
  const skinSelection = readSkinSelection();
  playerSprite = await loadSpriteData(skinSelection);

  // Update skin preview on title
  updateSkinPreview();

  // Setup event listeners
  setupEventListeners();

  // Initialize audio
  initAudio();

  // Show title screen
  showScreen('title');
}

// ===== Screen Management =====
function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  Object.values(overlays).forEach(o => o.classList.add('hidden'));

  if (screens[screenName]) {
    screens[screenName].classList.add('active');
  }

  gameState = screenName;

  // Screen-specific setup
  if (screenName === 'stageSelect') {
    renderStageList();
  } else if (screenName === 'skinSelect') {
    renderSkinList();
  } else if (screenName === 'editor') {
    initEditor();
  } else if (screenName === 'enemyEditor') {
    initEnemyEditor();
  }
}

function showOverlay(overlayName) {
  Object.values(overlays).forEach(o => o.classList.add('hidden'));
  if (overlays[overlayName]) {
    overlays[overlayName].classList.remove('hidden');
  }
}

function hideOverlays() {
  Object.values(overlays).forEach(o => o.classList.add('hidden'));
}

// ===== Update Skin Preview =====
async function updateSkinPreview() {
  const previewCanvas = document.getElementById('skinPreview');
  const nameSpan = document.getElementById('skinName');
  const ctx = previewCanvas.getContext('2d');

  ctx.clearRect(0, 0, 32, 32);

  if (playerSprite && playerSprite.frames && playerSprite.frames[0]) {
    const frame = playerSprite.frames[0];
    if (frame.imageData) {
      ctx.drawImage(frame.imageData, 0, 0, 32, 32);
    }
    nameSpan.textContent = playerSprite.name || 'カスタム';
  } else {
    // Draw default
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(16, 6, 3, 0, Math.PI * 2);
    ctx.fill();
    nameSpan.textContent = 'デフォルト';
  }
}

// ===== Stage List =====
function renderStageList() {
  const container = document.getElementById('stageList');
  const progress = loadProgress();
  const activeTab = document.querySelector('#stageSelectScreen .tab-btn.active')?.dataset.tab || 'default';

  const stagesToShow = activeTab === 'default'
    ? defaultStages
    : loadCustomStages();

  container.innerHTML = '';

  stagesToShow.forEach((stage, index) => {
    const isUnlocked = activeTab === 'custom' || isStageUnlocked(stage.id, defaultStages);
    const isCleared = progress.clearedStages.includes(stage.id);
    const highScore = progress.highScores[stage.id];

    const card = document.createElement('div');
    card.className = `stage-card ${isUnlocked ? '' : 'locked'}`;
    card.innerHTML = `
      <div class="stage-number">${stage.world}-${stage.level}</div>
      <div class="stage-name">${stage.name}</div>
      <div class="stage-stars">${isCleared ? '⭐' : ''}</div>
    `;

    if (isUnlocked) {
      card.addEventListener('click', () => {
        playSound('menu_confirm');
        currentStageIndex = index;
        currentStage = stage;
        lives = 3;
        savedPlayerStats = null; // Reset stats when selecting a stage
        startGame(stage);
      });
    }

    container.appendChild(card);
  });
}

// ===== Skin List =====
async function renderSkinList() {
  const container = document.getElementById('skinList');
  const activeTab = document.querySelector('#skinSelectScreen .tab-btn.active')?.dataset.tab || 'sample';
  const currentSelection = readSkinSelection();

  container.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">読み込み中...</div>';

  try {
    let items = [];

    if (activeTab === 'sample') {
      const samples = await loadSamples();
      items = samples.filter(s => s.kind === 'character').map(sample => ({
        type: 'sample',
        id: sample.id,
        name: sample.name,
        width: sample.width,
        height: sample.height,
        pixelsB64: sample.frames[0]?.pixelsB64
      }));
    } else if (activeTab === 'myart') {
      const { listAssets } = await import('../../js/pixelAssets.js');
      const assets = await listAssets();
      items = assets.filter(a => a.kind === 'character').map(asset => ({
        type: 'asset',
        id: asset.id,
        name: asset.name,
        width: asset.width,
        height: asset.height,
        pixels: asset.frames?.[0]?.pixels || asset.pixels
      }));
    } else if (activeTab === 'pokemon') {
      const { pokemonData } = await import('../../data/pokemonData.js');
      items = pokemonData.map(p => ({
        type: 'pokemon',
        id: p.id,
        name: p.name,
        image: p.image
      }));
    }

    container.innerHTML = '';

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'skin-item';

      const isSelected =
        (currentSelection?.source === 'sample' && currentSelection.sampleId === item.id) ||
        (currentSelection?.source === 'asset' && currentSelection.assetId === item.id) ||
        (currentSelection?.source === 'pokemon' && currentSelection.pokemonId === item.id);

      if (isSelected) div.classList.add('selected');

      if (item.type === 'pokemon') {
        div.innerHTML = `
          <img src="${item.image}" alt="${item.name}">
          <span class="skin-name">${item.name}</span>
        `;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = item.width || 32;
        canvas.height = item.height || 32;
        const ctx = canvas.getContext('2d');

        let pixels;
        if (item.pixelsB64) {
          pixels = decodePixelsB64(item.pixelsB64);
        } else if (item.pixels) {
          pixels = item.pixels;
        }

        if (pixels) {
          const imageData = ctx.createImageData(canvas.width, canvas.height);
          for (let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const idx = i * 4;
            imageData.data[idx + 0] = (pixel >> 16) & 0xff;
            imageData.data[idx + 1] = (pixel >> 8) & 0xff;
            imageData.data[idx + 2] = pixel & 0xff;
            imageData.data[idx + 3] = (pixel >> 24) & 0xff;
          }
          ctx.putImageData(imageData, 0, 0);
        }

        div.appendChild(canvas);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'skin-name';
        nameSpan.textContent = item.name;
        div.appendChild(nameSpan);
      }

      div.addEventListener('click', async () => {
        playSound('menu_select');

        if (item.type === 'sample') {
          setSkinSample(item.id);
        } else if (item.type === 'asset') {
          setSkinAsset(item.id);
        } else if (item.type === 'pokemon') {
          setSkinPokemon(item.id);
        }

        playerSprite = await loadSpriteData(readSkinSelection());
        updateSkinPreview();
        renderSkinList();
      });

      container.appendChild(div);
    });

    if (items.length === 0) {
      container.innerHTML = '<div style="color: #9ca3af; text-align: center; padding: 20px;">アイテムがありません</div>';
    }
  } catch (e) {
    console.error('Failed to load skins:', e);
    container.innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">読み込みエラー</div>';
  }
}

// ===== Start Game =====
function startGame(stage) {
  currentStage = stage;
  mapWidth = stage.width;
  mapHeight = stage.height;
  mapData = stage.map.map(row => [...row]);
  timeLimit = stage.timeLimit;

  // Find spawn point and exit
  let spawnX = 1, spawnY = 1;
  let exitX = mapWidth - 2, exitY = mapHeight - 2;

  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      if (mapData[y][x] === TILE.SPAWN) {
        spawnX = x;
        spawnY = y;
        mapData[y][x] = TILE.EMPTY;
      } else if (mapData[y][x] === TILE.EXIT) {
        exitX = x;
        exitY = y;
        mapData[y][x] = TILE.BLOCK; // Hide under block
      }
    }
  }

  // Create player
  player = new Player(spawnX, spawnY, TILE_SIZE, playerSprite);

  // Restore saved stats if available (carry over from previous stage)
  if (savedPlayerStats) {
    player.maxBombs = savedPlayerStats.maxBombs;
    player.fireRange = savedPlayerStats.fireRange;
    player.speed = savedPlayerStats.speed;
    player.hasPenetrate = savedPlayerStats.hasPenetrate;
    player.hasKick = savedPlayerStats.hasKick;
    player.hasShield = savedPlayerStats.hasShield;
  }

  // Create exit door
  exitDoor = new ExitDoor(exitX, exitY, TILE_SIZE);

  // Create enemies
  enemies = [];
  for (const enemyData of stage.enemies) {
    const enemyType = defaultEnemyTypes[enemyData.type] || defaultEnemyTypes.slime;
    const customEnemies = loadCustomEnemies();
    const customEnemy = customEnemies.find(e => e.id === enemyData.type);

    const data = customEnemy || { ...enemyType };
    const enemy = new Enemy(enemyData.x, enemyData.y, TILE_SIZE, data);
    enemies.push(enemy);
  }

  // Reset game state
  bombs = [];
  explosions = [];
  items = [];
  particles = [];
  gameTime = 0;
  score = 0;

  // Show game screen first (so container has dimensions)
  showScreen('game');
  gameState = 'playing';

  // Setup canvas after screen is visible
  setupCanvas();

  // Start game loop
  resumeAudio();
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ===== Setup Canvas =====
function setupCanvas() {
  const container = document.querySelector('.game-container');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  const gameWidth = mapWidth * TILE_SIZE;
  const gameHeight = mapHeight * TILE_SIZE;

  // Calculate scale to fit
  const scaleX = containerWidth / gameWidth;
  const scaleY = containerHeight / gameHeight;
  const scale = Math.min(scaleX, scaleY, 2);

  canvasWidth = Math.floor(gameWidth * scale);
  canvasHeight = Math.floor(gameHeight * scale);

  canvas.width = gameWidth;
  canvas.height = gameHeight;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;

  offsetX = 0;
  offsetY = 0;

  // Update HUD
  updateHUD();
}

// ===== Update HUD =====
function updateHUD() {
  const timeRemaining = Math.max(0, timeLimit - Math.floor(gameTime / 1000));
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  document.getElementById('timeDisplay').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('stageDisplay').textContent = `${currentStage.world}-${currentStage.level}`;
  document.getElementById('livesDisplay').textContent = '❤️'.repeat(lives);
  document.getElementById('bombCount').textContent = player.maxBombs;
  document.getElementById('fireRange').textContent = player.fireRange;
  document.getElementById('speedLevel').textContent = Math.floor(player.speed * 10) / 10;

  // Update ability icons
  const abilitiesContainer = document.querySelector('.hud-abilities');
  const penetrateIcon = document.getElementById('abilityPenetrate');
  const kickIcon = document.getElementById('abilityKick');
  const shieldIcon = document.getElementById('abilityShield');

  if (penetrateIcon) {
    penetrateIcon.classList.toggle('hidden', !player.hasPenetrate);
  }
  if (kickIcon) {
    kickIcon.classList.toggle('hidden', !player.hasKick);
  }
  if (shieldIcon) {
    shieldIcon.classList.toggle('hidden', !player.hasShield);
  }

  // Hide abilities container if no abilities are active
  const hasAnyAbility = player.hasPenetrate || player.hasKick || player.hasShield;
  if (abilitiesContainer) {
    abilitiesContainer.classList.toggle('hidden', !hasAnyAbility);
  }

  // Time warning
  if (timeRemaining <= 30 && timeRemaining > 0 && timeRemaining % 5 === 0) {
    playSound('time_warning');
  }
}

// ===== Game Loop =====
function gameLoop(currentTime) {
  if (gameState !== 'playing') return;

  const dt = currentTime - lastTime;
  lastTime = currentTime;
  gameTime += dt;

  update(dt);
  render();
  updateHUD();

  // Check time limit
  const timeRemaining = timeLimit - Math.floor(gameTime / 1000);
  if (timeRemaining <= 0) {
    gameOver();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// ===== Update =====
function update(dt) {
  // Handle input
  handleInput();

  // Update player
  player.update(dt);

  // Update bombs
  for (const bomb of bombs) {
    bomb.update(dt, (x, y) => canKickTo(x, y));

    if (bomb.markedForDeletion) {
      explodeBomb(bomb);
    }
  }
  bombs = bombs.filter(b => !b.markedForDeletion);

  // Update explosions
  for (const explosion of explosions) {
    explosion.update(dt);
    checkExplosionCollisions(explosion);
  }
  explosions = explosions.filter(e => !e.markedForDeletion);

  // Update enemies
  for (const enemy of enemies) {
    enemy.update(dt, (x, y, wallPass, bombPass) => canEnemyMove(x, y, wallPass, bombPass), { x: player.tileX, y: player.tileY });

    // Check collision with player
    if (!player.invincible && enemy.tileX === player.tileX && enemy.tileY === player.tileY) {
      playerHit();
    }
  }
  enemies = enemies.filter(e => !e.markedForDeletion);

  // Update items
  for (const item of items) {
    item.update(dt);

    // Check pickup
    if (item.tileX === player.tileX && item.tileY === player.tileY) {
      pickupItem(item);
      item.markedForDeletion = true;
    }
  }
  items = items.filter(i => !i.markedForDeletion);

  // Update exit door
  if (exitDoor) {
    exitDoor.update(dt);

    // Open when all enemies defeated
    if (enemies.length === 0 && !exitDoor.isOpen) {
      exitDoor.open();
      playSound('door_open');
    }

    // Check if player reached exit
    if (exitDoor.isOpen && player.tileX === exitDoor.tileX && player.tileY === exitDoor.tileY) {
      stageClear();
    }
  }

  // Update particles
  for (const particle of particles) {
    particle.update(dt);
  }
  particles = particles.filter(p => !p.markedForDeletion);
}

// ===== Handle Input =====
function handleInput() {
  if (player.isMoving) return;

  let dx = 0, dy = 0;

  if (keys['ArrowUp'] || keys['KeyW'] || touchDir === 'up') {
    dy = -1;
  } else if (keys['ArrowDown'] || keys['KeyS'] || touchDir === 'down') {
    dy = 1;
  } else if (keys['ArrowLeft'] || keys['KeyA'] || touchDir === 'left') {
    dx = -1;
  } else if (keys['ArrowRight'] || keys['KeyD'] || touchDir === 'right') {
    dx = 1;
  }

  if (dx !== 0 || dy !== 0) {
    if (player.move(dx, dy, (x, y) => canPlayerMove(x, y))) {
      playSound('move');

      // Kick bomb if has kick ability
      if (player.hasKick) {
        const bombAtTarget = bombs.find(b => b.tileX === player.targetX && b.tileY === player.targetY);
        if (bombAtTarget && !bombAtTarget.isKicked) {
          bombAtTarget.kick(dx, dy);
          playSound('kick');
        }
      }
    }
  }

  // Place bomb
  if (keys['Space'] || keys['placeBomb']) {
    placeBomb();
    keys['Space'] = false;
    keys['placeBomb'] = false;
  }
}

// ===== Movement Checks =====
function canPlayerMove(x, y) {
  if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return false;

  const tile = mapData[y][x];
  if (tile === TILE.WALL || tile === TILE.BLOCK) return false;

  // Check for bombs (can walk through own just-placed bomb)
  const bombHere = bombs.find(b => b.tileX === x && b.tileY === y);
  if (bombHere && !player.hasKick) {
    // Check if player is currently on this bomb (can leave)
    if (player.tileX === x && player.tileY === y) return true;
    return false;
  }

  return true;
}

function canEnemyMove(x, y, wallPass = false, bombPass = false) {
  if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return false;

  const tile = mapData[y][x];
  if (tile === TILE.WALL) return wallPass;
  if (tile === TILE.BLOCK) return wallPass;

  if (!bombPass) {
    const bombHere = bombs.find(b => b.tileX === x && b.tileY === y);
    if (bombHere) return false;
  }

  return true;
}

function canKickTo(x, y) {
  if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) return false;
  const tile = mapData[y][x];
  if (tile === TILE.WALL || tile === TILE.BLOCK) return false;
  const bombHere = bombs.find(b => b.tileX === x && b.tileY === y);
  return !bombHere;
}

// ===== Place Bomb =====
function placeBomb() {
  // Check if already at max bombs
  const activeBombs = bombs.filter(b => b.ownerId === 'player').length;
  if (activeBombs >= player.maxBombs) return;

  // Check if bomb already at this position
  const existingBomb = bombs.find(b => b.tileX === player.tileX && b.tileY === player.tileY);
  if (existingBomb) return;

  const bomb = new Bomb(player.tileX, player.tileY, TILE_SIZE, player.fireRange, 'player', player.hasPenetrate);
  bombs.push(bomb);
  playSound('place_bomb');
}

// ===== Explode Bomb =====
function explodeBomb(bomb) {
  const explosionCells = [{ x: bomb.tileX, y: bomb.tileY, dir: 'center' }];

  const directions = [
    { dx: 0, dy: -1, dir: 'up' },
    { dx: 0, dy: 1, dir: 'down' },
    { dx: -1, dy: 0, dir: 'left' },
    { dx: 1, dy: 0, dir: 'right' }
  ];

  for (const { dx, dy, dir } of directions) {
    for (let i = 1; i <= bomb.range; i++) {
      const x = bomb.tileX + dx * i;
      const y = bomb.tileY + dy * i;

      if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) break;

      const tile = mapData[y][x];

      if (tile === TILE.WALL) break;

      explosionCells.push({ x, y, dir });

      if (tile === TILE.BLOCK) {
        destroyBlock(x, y);
        if (!bomb.penetrate) break;
      }

      // Chain reaction with other bombs
      const otherBomb = bombs.find(b => b.tileX === x && b.tileY === y && b !== bomb);
      if (otherBomb) {
        otherBomb.timer = 0;
      }
    }
  }

  const explosion = new Explosion(bomb.tileX, bomb.tileY, TILE_SIZE, explosionCells);
  explosions.push(explosion);
  playSound('explosion');

  // Create particles
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    const colors = ['#ff6600', '#ffdd00', '#ff0000', '#ffffff'];
    particles.push(new Particle(
      bomb.tileX * TILE_SIZE + TILE_SIZE / 2,
      bomb.tileY * TILE_SIZE + TILE_SIZE / 2,
      colors[Math.floor(Math.random() * colors.length)],
      { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      Math.random() > 0.5 ? 'sparkle' : 'normal'
    ));
  }
}

// ===== Destroy Block =====
function destroyBlock(x, y) {
  mapData[y][x] = TILE.EMPTY;
  playSound('block_break');

  // Check if exit was hidden here
  if (exitDoor && exitDoor.tileX === x && exitDoor.tileY === y) {
    // Exit is now visible - don't spawn item here
    return;
  }

  // Spawn item
  if (currentStage.itemRates) {
    const roll = Math.random() * 100;
    let cumulative = 0;

    const itemTypes = ['bomb_up', 'fire_up', 'speed_up', 'penetrate', 'kick', 'life', 'shield', 'time_bonus', 'score_up', 'skull'];
    for (const itemType of itemTypes) {
      cumulative += currentStage.itemRates[itemType] || 0;
      if (roll < cumulative) {
        const item = new Item(x, y, TILE_SIZE, itemType);
        items.push(item);
        break;
      }
    }
  }

  // Particles
  for (let i = 0; i < 5; i++) {
    particles.push(new Particle(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      '#8b5a2b',
      { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 - 1 },
      'normal'
    ));
  }
}

// ===== Check Explosion Collisions =====
function checkExplosionCollisions(explosion) {
  const cells = explosion.getCells();

  for (const cell of cells) {
    // Check player
    if (!player.invincible && player.tileX === cell.x && player.tileY === cell.y) {
      playerHit();
    }

    // Check enemies
    for (const enemy of enemies) {
      if (enemy.tileX === cell.x && enemy.tileY === cell.y && !enemy.markedForDeletion) {
        killEnemy(enemy);
      }
    }

    // Destroy items (無敵状態のアイテムは破壊しない)
    for (const item of items) {
      if (item.tileX === cell.x && item.tileY === cell.y && !item.isInvincible()) {
        item.markedForDeletion = true;
      }
    }
  }
}

// ===== Kill Enemy =====
function killEnemy(enemy) {
  enemy.markedForDeletion = true;
  score += enemy.data.points || 100;
  playSound('enemy_death');

  // Particles
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2 + 1;
    particles.push(new Particle(
      enemy.x * TILE_SIZE + TILE_SIZE / 2,
      enemy.y * TILE_SIZE + TILE_SIZE / 2,
      enemy.data.color || '#4ade80',
      { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      'normal'
    ));
  }
}

// ===== Pickup Item =====
function pickupItem(item) {
  playSound('item_get');

  switch (item.type) {
    case 'bomb_up':
      player.maxBombs = Math.min(player.maxBombs + 1, 8);
      break;
    case 'fire_up':
      player.fireRange = Math.min(player.fireRange + 1, 8);
      break;
    case 'speed_up':
      player.speed = Math.min(player.speed + 0.2, 2.5);
      break;
    case 'penetrate':
      player.hasPenetrate = true;
      break;
    case 'kick':
      player.hasKick = true;
      break;
    case 'life':
      lives = Math.min(lives + 1, 5);
      break;
    case 'shield':
      player.hasShield = true;
      break;
    case 'time_bonus':
      gameTime = Math.max(0, gameTime - 30000); // Add 30 seconds
      break;
    case 'score_up':
      score += 500;
      break;
    case 'skull':
      // Temporary speed penalty
      const originalSpeed = player.speed;
      player.speed = Math.max(0.5, player.speed - 0.5);
      setTimeout(() => {
        if (player) player.speed = originalSpeed;
      }, 5000);
      break;
  }

  // Sparkle effect
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    particles.push(new Particle(
      item.tileX * TILE_SIZE + TILE_SIZE / 2,
      item.tileY * TILE_SIZE + TILE_SIZE / 2,
      '#ffdd00',
      { x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 },
      'sparkle'
    ));
  }
}

// ===== Player Hit =====
function playerHit() {
  // Shield absorbs one hit
  if (player.hasShield) {
    player.hasShield = false;
    player.makeInvincible(1000);
    playSound('item_get'); // Shield break sound
    return;
  }

  lives--;
  playSound('player_death');
  player.makeInvincible(3000);

  // Flash screen effect
  document.querySelector('.game-container').style.animation = 'none';
  setTimeout(() => {
    document.querySelector('.game-container').style.animation = '';
  }, 100);

  if (lives <= 0) {
    gameOver();
  }
}

// ===== Stage Clear =====
function stageClear() {
  gameState = 'clear';
  playSound('stage_clear');

  // Save player stats for next stage (carry over powerups)
  savedPlayerStats = {
    maxBombs: player.maxBombs,
    fireRange: player.fireRange,
    speed: player.speed,
    hasPenetrate: player.hasPenetrate,
    hasKick: player.hasKick,
    hasShield: player.hasShield
  };

  const timeBonus = Math.max(0, (timeLimit - Math.floor(gameTime / 1000)) * 10);
  const finalScore = score + timeBonus;

  markStageCleared(currentStage.id, finalScore, gameTime);

  document.getElementById('clearTime').textContent = formatTime(gameTime);
  document.getElementById('clearScore').textContent = finalScore.toLocaleString();

  showOverlay('clear');
}

// ===== Game Over =====
function gameOver() {
  gameState = 'gameover';
  playSound('game_over');
  // Reset saved stats on game over
  savedPlayerStats = null;
  showOverlay('gameover');
}

// ===== Format Time =====
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// ===== Render =====
function render() {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw map
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const tile = mapData[y][x];
      const px = offsetX + x * TILE_SIZE;
      const py = offsetY + y * TILE_SIZE;

      if (tile === TILE.WALL) {
        // Draw wall
        ctx.fillStyle = '#374151';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 8);
      } else if (tile === TILE.BLOCK) {
        // Draw destructible block
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE / 2 - 2);
        ctx.fillRect(px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 1, TILE_SIZE / 2 - 2, TILE_SIZE / 2 - 3);
        ctx.fillRect(px + 2, py + TILE_SIZE / 2 + 1, TILE_SIZE / 2 - 3, TILE_SIZE / 2 - 3);
      } else {
        // Draw floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }
    }
  }

  // Draw exit door
  if (exitDoor) {
    exitDoor.draw(ctx, offsetX, offsetY);
  }

  // Draw items
  for (const item of items) {
    item.draw(ctx, offsetX, offsetY);
  }

  // Draw bombs
  for (const bomb of bombs) {
    bomb.draw(ctx, offsetX, offsetY);
  }

  // Draw explosions
  for (const explosion of explosions) {
    explosion.draw(ctx, offsetX, offsetY);
  }

  // Draw enemies
  for (const enemy of enemies) {
    enemy.draw(ctx, offsetX, offsetY);
  }

  // Draw player
  player.draw(ctx, offsetX, offsetY);

  // Draw particles (in screen coordinates)
  for (const particle of particles) {
    particle.draw(ctx);
  }
}

// ===== Editor Functions =====
function initEditor() {
  if (!editorStage) {
    editorStage = createNewStage();
  }

  const editorCanvas = document.getElementById('editorCanvas');
  const editorCtx = editorCanvas.getContext('2d');

  // Setup canvas size
  editorCanvas.width = editorStage.width * TILE_SIZE;
  editorCanvas.height = editorStage.height * TILE_SIZE;

  // Update UI
  document.getElementById('stageName').value = editorStage.name;
  document.getElementById('stageWidth').value = editorStage.width;
  document.getElementById('stageHeight').value = editorStage.height;
  document.getElementById('stageTimeLimit').value = editorStage.timeLimit;

  // Setup placement tools
  setupPlacementTools();
  setupEnemyTools();
  setupItemRates();

  // Render editor
  renderEditor();
}

function setupPlacementTools() {
  const container = document.getElementById('placementTools');
  container.innerHTML = '';

  const tools = [
    { type: TILE.EMPTY, icon: '⬜', name: '空' },
    { type: TILE.WALL, icon: '⬛', name: '壁' },
    { type: TILE.BLOCK, icon: '📦', name: 'ブロック' },
    { type: TILE.SPAWN, icon: '🚩', name: 'スポーン' },
    { type: TILE.EXIT, icon: '🚪', name: '出口' },
    { type: 'eraser', icon: '🧹', name: '消す' }
  ];

  tools.forEach(tool => {
    const btn = document.createElement('button');
    btn.className = `tool-btn ${editorTool === tool.type ? 'active' : ''}`;
    btn.innerHTML = tool.icon;
    btn.title = tool.name;
    btn.addEventListener('click', () => {
      editorTool = tool.type;
      editorEnemyType = null;
      setupPlacementTools();
      setupEnemyTools();
    });
    container.appendChild(btn);
  });
}

async function setupEnemyTools() {
  const container = document.getElementById('enemyTools');
  container.innerHTML = '';

  const allEnemies = { ...defaultEnemyTypes };
  const customEnemies = loadCustomEnemies();
  customEnemies.forEach(e => allEnemies[e.id] = e);

  for (const [id, enemy] of Object.entries(allEnemies)) {
    const btn = document.createElement('button');
    btn.className = `tool-btn ${editorEnemyType === id ? 'active' : ''}`;
    btn.title = enemy.name;

    // スプライトが設定されている場合はcanvasで描画
    if (enemy.spriteId && enemy.spriteSource) {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      canvas.style.display = 'block';
      const ctx = canvas.getContext('2d');

      const spriteData = await loadSpriteData({
        source: enemy.spriteSource,
        sampleId: enemy.spriteSource === 'sample' ? enemy.spriteId : undefined,
        assetId: enemy.spriteSource === 'asset' ? enemy.spriteId : undefined
      });

      if (spriteData && spriteData.frames && spriteData.frames[0]) {
        const frame = spriteData.frames[0].imageData;
        ctx.drawImage(frame, 0, 0, 32, 32);
      } else {
        // フォールバック
        ctx.fillStyle = enemy.color || '#ff6b6b';
        ctx.beginPath();
        ctx.arc(16, 16, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      btn.appendChild(canvas);
    } else {
      // スプライトがない場合は色で背景を設定
      btn.style.background = enemy.color;
    }

    btn.addEventListener('click', () => {
      editorTool = 'enemy';
      editorEnemyType = id;
      setupPlacementTools();
      setupEnemyTools();
    });
    container.appendChild(btn);
  }
}

function setupItemRates() {
  const container = document.getElementById('itemRates');
  container.innerHTML = '';

  const itemTypes = [
    { type: 'bomb_up', icon: '💣', name: '爆弾+' },
    { type: 'fire_up', icon: '🔥', name: '火力+' },
    { type: 'speed_up', icon: '👟', name: '速度+' },
    { type: 'penetrate', icon: '💥', name: '貫通' },
    { type: 'kick', icon: '👢', name: 'キック' },
    { type: 'life', icon: '❤️', name: 'ライフ' },
    { type: 'shield', icon: '🛡️', name: 'シールド' },
    { type: 'time_bonus', icon: '⏰', name: '時間+' },
    { type: 'score_up', icon: '💎', name: 'スコア+' },
    { type: 'skull', icon: '💀', name: 'どくろ' }
  ];

  itemTypes.forEach(item => {
    const row = document.createElement('div');
    row.className = 'setting-row';
    row.innerHTML = `
      <label>${item.icon} ${item.name}</label>
      <input type="number" min="0" max="100" value="${editorStage.itemRates[item.type] || 0}" data-item="${item.type}">
      <span>%</span>
    `;
    row.querySelector('input').addEventListener('change', (e) => {
      editorStage.itemRates[item.type] = parseInt(e.target.value) || 0;
    });
    container.appendChild(row);
  });
}

function renderEditor() {
  const editorCanvas = document.getElementById('editorCanvas');
  const ctx = editorCanvas.getContext('2d');

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);

  // Draw map
  for (let y = 0; y < editorStage.height; y++) {
    for (let x = 0; x < editorStage.width; x++) {
      const tile = editorStage.map[y][x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (tile === TILE.WALL) {
        ctx.fillStyle = '#374151';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#4b5563';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 8);
      } else if (tile === TILE.BLOCK) {
        ctx.fillStyle = '#92400e';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      } else if (tile === TILE.SPAWN) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#22c55e';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚩', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
      } else if (tile === TILE.EXIT) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#3b82f6';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚪', px + TILE_SIZE / 2, py + TILE_SIZE / 2);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(px + 1, py + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      }

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw enemies
  for (const enemy of editorStage.enemies) {
    const allEnemies = { ...defaultEnemyTypes, ...Object.fromEntries(loadCustomEnemies().map(e => [e.id, e])) };
    const enemyData = allEnemies[enemy.type] || defaultEnemyTypes.slime;
    const px = enemy.x * TILE_SIZE + TILE_SIZE / 2;
    const py = enemy.y * TILE_SIZE + TILE_SIZE / 2;

    ctx.fillStyle = enemyData.color;
    ctx.beginPath();
    ctx.arc(px, py, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(px - 4, py - 2, 2, 0, Math.PI * 2);
    ctx.arc(px + 4, py - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Editor canvas interaction
document.getElementById('editorCanvas')?.addEventListener('pointerdown', handleEditorClick);
document.getElementById('editorCanvas')?.addEventListener('pointermove', handleEditorDrag);

let isEditorDragging = false;

function handleEditorClick(e) {
  isEditorDragging = true;
  placeEditorTile(e);
}

function handleEditorDrag(e) {
  if (!isEditorDragging) return;
  if (e.buttons !== 1) {
    isEditorDragging = false;
    return;
  }
  placeEditorTile(e);
}

document.addEventListener('pointerup', () => {
  isEditorDragging = false;
});

function placeEditorTile(e) {
  if (gameState !== 'editor' || !editorStage) return;

  const rect = e.target.getBoundingClientRect();
  const scaleX = e.target.width / rect.width;
  const scaleY = e.target.height / rect.height;

  const x = Math.floor((e.clientX - rect.left) * scaleX / TILE_SIZE);
  const y = Math.floor((e.clientY - rect.top) * scaleY / TILE_SIZE);

  if (x < 0 || x >= editorStage.width || y < 0 || y >= editorStage.height) return;

  if (editorTool === 'enemy' && editorEnemyType) {
    // Remove existing enemy at position
    editorStage.enemies = editorStage.enemies.filter(e => !(e.x === x && e.y === y));
    // Add new enemy
    editorStage.enemies.push({ x, y, type: editorEnemyType });
  } else if (editorTool === 'eraser') {
    editorStage.map[y][x] = TILE.EMPTY;
    editorStage.enemies = editorStage.enemies.filter(e => !(e.x === x && e.y === y));
  } else if (typeof editorTool === 'number') {
    // Ensure only one spawn point
    if (editorTool === TILE.SPAWN) {
      for (let ty = 0; ty < editorStage.height; ty++) {
        for (let tx = 0; tx < editorStage.width; tx++) {
          if (editorStage.map[ty][tx] === TILE.SPAWN) {
            editorStage.map[ty][tx] = TILE.EMPTY;
          }
        }
      }
    }
    // Ensure only one exit
    if (editorTool === TILE.EXIT) {
      for (let ty = 0; ty < editorStage.height; ty++) {
        for (let tx = 0; tx < editorStage.width; tx++) {
          if (editorStage.map[ty][tx] === TILE.EXIT) {
            editorStage.map[ty][tx] = TILE.EMPTY;
          }
        }
      }
    }
    editorStage.map[y][x] = editorTool;
  }

  renderEditor();
}

// ===== Enemy Editor =====
function initEnemyEditor() {
  renderEnemyList();

  if (!editingEnemy) {
    editingEnemy = createNewEnemy();
  }

  updateEnemyForm();
}

function renderEnemyList() {
  const container = document.getElementById('enemyListPanel');
  container.innerHTML = '';

  // Default enemies
  Object.entries(defaultEnemyTypes).forEach(([id, enemy]) => {
    const div = document.createElement('div');
    div.className = 'enemy-item';
    div.innerHTML = `
      <canvas width="32" height="32" style="background: ${enemy.color}; border-radius: 4px;"></canvas>
      <span class="enemy-name">${enemy.name}</span>
    `;
    container.appendChild(div);
  });

  // Custom enemies
  const customEnemies = loadCustomEnemies();
  customEnemies.forEach(enemy => {
    const div = document.createElement('div');
    div.className = `enemy-item ${editingEnemy?.id === enemy.id ? 'selected' : ''}`;
    div.innerHTML = `
      <canvas width="32" height="32" style="background: ${enemy.color}; border-radius: 4px;"></canvas>
      <span class="enemy-name">${enemy.name}</span>
      <button class="enemy-delete">×</button>
    `;

    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('enemy-delete')) {
        deleteCustomEnemy(enemy.id);
        if (editingEnemy?.id === enemy.id) {
          editingEnemy = createNewEnemy();
        }
        initEnemyEditor();
        return;
      }
      editingEnemy = { ...enemy };
      updateEnemyForm();
      renderEnemyList();
    });

    container.appendChild(div);
  });
}

async function updateEnemyForm() {
  document.getElementById('enemyName').value = editingEnemy.name;
  document.getElementById('enemySpeed').value = editingEnemy.speed;
  document.getElementById('enemySpeedValue').textContent = editingEnemy.speed.toFixed(1);
  document.getElementById('enemyPattern').value = editingEnemy.pattern;
  document.getElementById('enemyWallPass').checked = editingEnemy.wallPass;
  document.getElementById('enemyBombPass').checked = editingEnemy.bombPass;

  // Preview
  const preview = document.getElementById('enemySpritePreview');
  const ctx = preview.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);

  // スプライトが設定されている場合はそれを描画
  if (editingEnemy.spriteId && editingEnemy.spriteSource) {
    const spriteData = await loadSpriteData({
      source: editingEnemy.spriteSource,
      sampleId: editingEnemy.spriteSource === 'sample' ? editingEnemy.spriteId : undefined,
      assetId: editingEnemy.spriteSource === 'asset' ? editingEnemy.spriteId : undefined
    });
    if (spriteData && spriteData.frames && spriteData.frames[0]) {
      const frame = spriteData.frames[0].imageData;
      ctx.drawImage(frame, 0, 0, 32, 32);
      return;
    }
  }

  // フォールバック: 色の円を描画
  ctx.fillStyle = editingEnemy.color || '#ff6b6b';
  ctx.beginPath();
  ctx.arc(16, 16, 12, 0, Math.PI * 2);
  ctx.fill();
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Keyboard
  document.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (gameState === 'playing' && e.code === 'Escape') {
      pauseGame();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Title buttons
  document.getElementById('startGameBtn').addEventListener('click', () => {
    playSound('menu_confirm');
    currentStageIndex = 0;
    lives = 3;
    savedPlayerStats = null; // Reset stats when starting from beginning
    startGame(allStages[0]);
  });

  document.getElementById('stageSelectBtn').addEventListener('click', () => {
    playSound('menu_select');
    showScreen('stageSelect');
  });

  document.getElementById('skinSelectBtn').addEventListener('click', () => {
    playSound('menu_select');
    showScreen('skinSelect');
  });

  document.getElementById('stageEditorBtn').addEventListener('click', () => {
    playSound('menu_select');
    editorStage = createNewStage();
    showScreen('editor');
  });

  document.getElementById('enemyEditorBtn').addEventListener('click', () => {
    playSound('menu_select');
    editingEnemy = createNewEnemy();
    showScreen('enemyEditor');
  });

  // Back buttons
  document.getElementById('stageSelectBackBtn').addEventListener('click', () => {
    playSound('menu_select');
    showScreen('title');
  });

  document.getElementById('skinSelectBackBtn').addEventListener('click', () => {
    playSound('menu_select');
    showScreen('title');
  });

  document.getElementById('editorBackBtn').addEventListener('click', () => {
    playSound('menu_select');
    showScreen('title');
  });

  document.getElementById('enemyEditorBackBtn').addEventListener('click', () => {
    playSound('menu_select');
    showScreen('title');
  });

  // Stage select tabs
  document.querySelectorAll('#stageSelectScreen .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#stageSelectScreen .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderStageList();
    });
  });

  // Skin select tabs
  document.querySelectorAll('#skinSelectScreen .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#skinSelectScreen .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSkinList();
    });
  });

  // Game HUD
  document.getElementById('pauseBtn').addEventListener('click', pauseGame);

  // Pause overlay
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('restartBtn').addEventListener('click', () => {
    hideOverlays();
    startGame(currentStage);
  });
  document.getElementById('quitBtn').addEventListener('click', () => {
    hideOverlays();
    showScreen('title');
  });

  // Clear overlay
  document.getElementById('nextStageBtn').addEventListener('click', () => {
    hideOverlays();
    currentStageIndex++;
    if (currentStageIndex < allStages.length) {
      startGame(allStages[currentStageIndex]);
    } else {
      showScreen('title');
    }
  });
  document.getElementById('clearQuitBtn').addEventListener('click', () => {
    hideOverlays();
    showScreen('title');
  });

  // Game over overlay
  document.getElementById('retryBtn').addEventListener('click', () => {
    hideOverlays();
    lives = 3;
    savedPlayerStats = null; // Reset stats on retry
    startGame(currentStage);
  });
  document.getElementById('gameOverQuitBtn').addEventListener('click', () => {
    hideOverlays();
    showScreen('title');
  });

  // Mobile controls
  document.querySelectorAll('.dpad-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      touchDir = btn.dataset.dir;
      resumeAudio();
    });
    btn.addEventListener('pointerup', () => {
      touchDir = null;
    });
    btn.addEventListener('pointerleave', () => {
      touchDir = null;
    });
  });

  document.getElementById('placeBombBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    keys['placeBomb'] = true;
    resumeAudio();
  });

  // Editor controls
  document.getElementById('saveStageBtn')?.addEventListener('click', () => {
    editorStage.name = document.getElementById('stageName').value || '無題のステージ';
    editorStage.width = parseInt(document.getElementById('stageWidth').value) || 15;
    editorStage.height = parseInt(document.getElementById('stageHeight').value) || 11;
    editorStage.timeLimit = parseInt(document.getElementById('stageTimeLimit').value) || 180;

    saveCustomStage(editorStage);
    allStages = [...defaultStages, ...loadCustomStages()];
    playSound('menu_confirm');
    alert('ステージを保存しました！');
  });

  document.getElementById('testStageBtn')?.addEventListener('click', () => {
    lives = 3;
    startGame(editorStage);
  });

  // Stage size change
  document.getElementById('stageWidth')?.addEventListener('change', (e) => {
    const newWidth = parseInt(e.target.value) || 15;
    if (newWidth !== editorStage.width) {
      editorStage.width = newWidth;
      editorStage.map = generateEmptyMap(newWidth, editorStage.height);
      editorStage.enemies = [];
      initEditor();
    }
  });

  document.getElementById('stageHeight')?.addEventListener('change', (e) => {
    const newHeight = parseInt(e.target.value) || 11;
    if (newHeight !== editorStage.height) {
      editorStage.height = newHeight;
      editorStage.map = generateEmptyMap(editorStage.width, newHeight);
      editorStage.enemies = [];
      initEditor();
    }
  });

  // Enemy editor controls
  document.getElementById('createNewEnemyBtn')?.addEventListener('click', () => {
    editingEnemy = createNewEnemy();
    updateEnemyForm();
    renderEnemyList();
  });

  document.getElementById('enemyName')?.addEventListener('input', (e) => {
    editingEnemy.name = e.target.value;
  });

  document.getElementById('enemySpeed')?.addEventListener('input', (e) => {
    editingEnemy.speed = parseFloat(e.target.value);
    document.getElementById('enemySpeedValue').textContent = editingEnemy.speed.toFixed(1);
  });

  document.getElementById('enemyPattern')?.addEventListener('change', (e) => {
    editingEnemy.pattern = e.target.value;
  });

  document.getElementById('enemyWallPass')?.addEventListener('change', (e) => {
    editingEnemy.wallPass = e.target.checked;
  });

  document.getElementById('enemyBombPass')?.addEventListener('change', (e) => {
    editingEnemy.bombPass = e.target.checked;
  });

  document.getElementById('saveEnemyBtn')?.addEventListener('click', () => {
    saveCustomEnemy(editingEnemy);
    playSound('menu_confirm');
    initEnemyEditor();
    alert('敵を保存しました！');
  });

  // Sprite selection modal
  const spriteModal = document.getElementById('spriteModal');
  const spriteGrid = document.getElementById('spriteGrid');
  let currentSpriteTab = 'sample';

  document.getElementById('selectEnemySpriteBtn')?.addEventListener('click', async () => {
    spriteModal?.classList.remove('hidden');
    await renderSpriteGrid();
  });

  spriteModal?.querySelector('.modal-close')?.addEventListener('click', () => {
    spriteModal?.classList.add('hidden');
  });

  spriteModal?.addEventListener('click', (e) => {
    if (e.target === spriteModal) {
      spriteModal.classList.add('hidden');
    }
  });

  // Sprite tabs
  document.querySelectorAll('.sprite-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.sprite-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSpriteTab = btn.dataset.tab;
      await renderSpriteGrid();
    });
  });

  async function renderSpriteGrid() {
    if (!spriteGrid) return;
    spriteGrid.innerHTML = '<div style="padding: 20px; text-align: center;">読み込み中...</div>';

    try {
      let items = [];

      if (currentSpriteTab === 'sample') {
        const samples = await loadSamples();
        items = samples.map(s => ({
          id: s.id,
          name: s.name,
          source: 'sample',
          width: s.width,
          height: s.height,
          frames: s.frames
        }));
      } else if (currentSpriteTab === 'myart') {
        try {
          const { listAssets } = await import('../../js/pixelAssets.js');
          const assets = await listAssets();
          items = assets.map(a => ({
            id: a.id,
            name: a.name,
            source: 'asset',
            width: a.width,
            height: a.height,
            frames: a.frames || [{ pixels: a.pixels }]
          }));
        } catch (e) {
          console.log('No assets found');
        }
      }

      if (items.length === 0) {
        spriteGrid.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-muted);">
          ${currentSpriteTab === 'sample' ? 'サンプルがありません' : 'マイ作品がありません'}
        </div>`;
        return;
      }

      spriteGrid.innerHTML = '';
      for (const item of items) {
        const div = document.createElement('div');
        div.className = 'sprite-item';
        div.title = item.name;

        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        // フレームを描画
        if (item.frames && item.frames[0]) {
          const frame = item.frames[0];
          if (frame.pixelsB64) {
            const pixels = decodePixelsB64(frame.pixelsB64);
            const imgCanvas = createImageFromPixels(pixels, item.width, item.height);
            if (imgCanvas) {
              ctx.drawImage(imgCanvas, 0, 0, 32, 32);
            }
          } else if (frame.pixels) {
            const imgCanvas = createImageFromPixels(frame.pixels, item.width, item.height);
            if (imgCanvas) {
              ctx.drawImage(imgCanvas, 0, 0, 32, 32);
            }
          }
        }

        div.appendChild(canvas);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'sprite-name';
        nameSpan.textContent = item.name;
        div.appendChild(nameSpan);

        div.addEventListener('click', () => {
          editingEnemy.spriteId = item.id;
          editingEnemy.spriteSource = item.source;
          spriteModal.classList.add('hidden');
          updateEnemyForm();
          playSound('menu_select');
        });

        spriteGrid.appendChild(div);
      }
    } catch (e) {
      console.error('Failed to load sprites:', e);
      spriteGrid.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--danger);">読み込みに失敗しました</div>';
    }
  }

  // Window resize
  window.addEventListener('resize', () => {
    if (gameState === 'playing') {
      setupCanvas();
    }
  });
}

function pauseGame() {
  gameState = 'paused';
  showOverlay('pause');
}

function resumeGame() {
  hideOverlays();
  gameState = 'playing';
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// ===== Start =====
init();
