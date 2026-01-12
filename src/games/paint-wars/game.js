// ===== PAINT WARS - Main Game Entry =====

import { GameRenderer } from './renderer.js';
import { InkSystem } from './ink-system.js';
import { Player, CPUPlayer, setStatsCallbacks } from './entities.js';
import { WEAPONS, SUB_WEAPONS, SPECIAL_WEAPONS } from './weapons.js';
import { loadCharactersFromCatalog, CHARACTERS as FALLBACK_CHARACTERS } from './characters.js';
import { CharacterPreview } from './character-preview.js';

// ===== Game State =====
let gameState = 'title';
let renderer = null;
let inkSystem = null;

// Players
let player = null;
let teamOrange = [];
let teamBlue = [];
let allPlayers = [];

// Selected options
let selectedCharacter = 0;
let selectedVariant = 0;
let selectedWeapon = 0;
let selectedSubWeapon = 0;

// Characters loaded from catalog
let CHARACTERS = FALLBACK_CHARACTERS;
let characterPreview = null;

// Game timing
let gameTime = 180; // 3 minutes
let lastTime = 0;
let isPaused = false;

// Stats
let playerStats = {
  paintPoints: 0,
  kills: 0,
  deaths: 0,
  assists: 0
};

// Set up stats callbacks (must be after playerStats declaration)
setStatsCallbacks({
  addPaintPoints: (points) => { playerStats.paintPoints += points; },
  addKill: () => { playerStats.kills++; },
  addDeath: () => { playerStats.deaths++; },
  addAssist: () => { playerStats.assists++; }
});

// Settings
let settings = {
  soundEnabled: true,
  bgmVolume: 50,
  sfxVolume: 70,
  difficulty: 'normal'
};

// Input state
let keys = {};
let mouse = { x: 0, y: 0, down: false, rightDown: false };
let joystickMove = { x: 0, y: 0 };
let joystickAim = { x: 0, y: 0 };
let isMobile = false;

// ===== DOM Elements =====
const screens = {
  title: document.getElementById('titleScreen'),
  character: document.getElementById('characterScreen'),
  weapon: document.getElementById('weaponScreen'),
  howToPlay: document.getElementById('howToPlayScreen'),
  settings: document.getElementById('settingsScreen'),
  game: document.getElementById('gameScreen')
};

const overlays = {
  pause: document.getElementById('pauseOverlay'),
  respawn: document.getElementById('respawnOverlay'),
  result: document.getElementById('resultOverlay'),
  countdown: document.getElementById('countdownOverlay')
};

// ===== Initialization =====
async function init() {
  isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Load characters from 3D asset catalog
  CHARACTERS = await loadCharactersFromCatalog();

  setupEventListeners();
  renderCharacterGrid();
  renderWeaponGrid();
  renderSubWeaponGrid();

  // Initialize 3D character preview
  const previewContainer = document.getElementById('characterPreview3D');
  characterPreview = new CharacterPreview(previewContainer);
  await characterPreview.init();
  updateCharacterPreview();

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

// ===== UI Rendering =====
function renderCharacterGrid() {
  const grid = document.getElementById('characterGrid');
  grid.innerHTML = '';

  CHARACTERS.forEach((char, index) => {
    const card = document.createElement('div');
    card.className = `character-card ${index === selectedCharacter ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="char-icon">${char.icon}</div>
      <div class="char-name">${char.name}</div>
    `;
    card.addEventListener('click', () => selectCharacter(index));
    grid.appendChild(card);
  });

  renderVariantGrid();
  updateCharacterPreview();
}

function selectCharacter(index) {
  selectedCharacter = index;
  selectedVariant = 0; // Reset variant when character changes
  document.querySelectorAll('.character-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
  renderVariantGrid();
  updateCharacterPreview();
}

function renderVariantGrid() {
  const grid = document.getElementById('variantGrid');
  if (!grid) return;

  const char = CHARACTERS[selectedCharacter];
  const variants = char.variants || [];

  grid.innerHTML = '';

  if (variants.length <= 1) {
    grid.style.display = 'none';
    return;
  }

  grid.style.display = 'flex';

  variants.forEach((variant, index) => {
    const btn = document.createElement('button');
    btn.className = `variant-btn ${index === selectedVariant ? 'selected' : ''}`;
    btn.style.backgroundColor = getVariantColor(variant);
    btn.title = variant;
    btn.addEventListener('click', () => selectVariant(index));
    grid.appendChild(btn);
  });
}

function selectVariant(index) {
  selectedVariant = index;
  document.querySelectorAll('.variant-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === index);
  });
  updateCharacterPreview();
}

function getVariantColor(variant) {
  const colorMap = {
    // Team/General colors
    'orange': '#ff6b35',
    'cyan': '#00bcd4',
    'purple': '#9c27b0',
    'pink': '#e91e63',
    'lime': '#8bc34a',
    'yellow': '#ffeb3b',
    'blue': '#2196f3',
    'red': '#f44336',
    'green': '#4caf50',
    'gold': '#ffd700',
    'silver': '#c0c0c0',
    'white': '#ffffff',
    'black': '#333333',
    'dark': '#1a1a1a',
    'teal': '#009688',
    'brown': '#795548',
    'rainbow': 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)',
    // Character-specific
    'shiba': '#d4a574',
    'husky': '#607d8b',
    'golden': '#daa520',
    'dalmatian': '#f5f5f5',
    'tabby': '#d4a574',
    'calico': '#f5deb3',
    'bay': '#8b4513',
    'palomino': '#daa520',
    'fire': '#ff5722',
    'ice': '#00bcd4',
    'royal': '#4a148c',
    'default': '#888888'
  };
  return colorMap[variant] || colorMap['default'];
}

function updateCharacterPreview() {
  const char = CHARACTERS[selectedCharacter];
  const variant = char.variants?.[selectedVariant] || char.defaultVariant || 'default';

  document.getElementById('characterName').textContent = char.name;

  // Update 3D preview
  if (characterPreview) {
    characterPreview.setCharacter(char.modelId || char.id, variant);
  }
}

function renderWeaponGrid() {
  const grid = document.getElementById('weaponGrid');
  grid.innerHTML = '';

  WEAPONS.forEach((weapon, index) => {
    const card = document.createElement('div');
    card.className = `weapon-card ${index === selectedWeapon ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="weapon-icon">${weapon.icon}</div>
      <div class="weapon-label">${weapon.name}</div>
    `;
    card.addEventListener('click', () => selectWeapon(index));
    grid.appendChild(card);
  });

  updateWeaponPreview();
}

function selectWeapon(index) {
  selectedWeapon = index;
  document.querySelectorAll('.weapon-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
  updateWeaponPreview();
}

function updateWeaponPreview() {
  const weapon = WEAPONS[selectedWeapon];
  document.getElementById('weaponPreview3D').innerHTML = `<span style="font-size:4rem">${weapon.icon}</span>`;
  document.getElementById('weaponName').textContent = weapon.name;

  // Update stat bars
  const stats = ['range', 'rate', 'paint', 'mobility'];
  stats.forEach(stat => {
    const fill = document.querySelector(`.stat-fill[data-stat="${stat}"]`);
    if (fill) {
      fill.style.width = `${weapon.stats[stat] * 20}%`;
    }
  });
}

function renderSubWeaponGrid() {
  const grid = document.getElementById('subWeaponGrid');
  grid.innerHTML = '';

  SUB_WEAPONS.forEach((sub, index) => {
    const card = document.createElement('div');
    card.className = `sub-weapon-card ${index === selectedSubWeapon ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="sub-icon">${sub.icon}</div>
      <div class="sub-name">${sub.name}</div>
    `;
    card.addEventListener('click', () => selectSubWeapon(index));
    grid.appendChild(card);
  });
}

function selectSubWeapon(index) {
  selectedSubWeapon = index;
  document.querySelectorAll('.sub-weapon-card').forEach((card, i) => {
    card.classList.toggle('selected', i === index);
  });
}

// ===== Game Start =====
async function startGame() {
  showScreen('game');

  // Stop character preview animation during game
  if (characterPreview) {
    characterPreview.stopAnimation();
  }

  // Initialize renderer
  const container = document.getElementById('gameContainer');
  renderer = new GameRenderer(container);
  await renderer.init();

  // Initialize ink system
  inkSystem = new InkSystem(renderer);

  // Create players
  createPlayers();

  // Set camera to player position immediately
  renderer.setCameraToPlayer(player);

  // Reset stats
  gameTime = 180;
  playerStats = { paintPoints: 0, kills: 0, deaths: 0, assists: 0 };

  // Start countdown
  await startCountdown();

  // Start game loop
  isPaused = false;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function createPlayers() {
  const character = CHARACTERS[selectedCharacter];
  const variant = character.variants?.[selectedVariant] || character.defaultVariant || 'orange';
  const weapon = WEAPONS[selectedWeapon];
  const subWeapon = SUB_WEAPONS[selectedSubWeapon];

  // Player (orange team)
  player = new Player({
    team: 'orange',
    character: character,
    variant: variant,
    weapon: weapon,
    subWeapon: subWeapon,
    position: { x: -20, z: 0 },
    isPlayer: true
  });

  // Orange team CPUs
  const orangeCPU1 = new CPUPlayer({
    team: 'orange',
    character: CHARACTERS[1],
    weapon: WEAPONS[0],
    subWeapon: SUB_WEAPONS[0],
    position: { x: -20, z: -8 },
    difficulty: settings.difficulty
  });

  const orangeCPU2 = new CPUPlayer({
    team: 'orange',
    character: CHARACTERS[2],
    weapon: WEAPONS[1],
    subWeapon: SUB_WEAPONS[1],
    position: { x: -20, z: 8 },
    difficulty: settings.difficulty
  });

  teamOrange = [player, orangeCPU1, orangeCPU2];

  // Blue team CPUs
  const blueCPU1 = new CPUPlayer({
    team: 'blue',
    character: CHARACTERS[3],
    weapon: WEAPONS[0],
    subWeapon: SUB_WEAPONS[0],
    position: { x: 20, z: 0 },
    difficulty: settings.difficulty
  });

  const blueCPU2 = new CPUPlayer({
    team: 'blue',
    character: CHARACTERS[4],
    weapon: WEAPONS[2],
    subWeapon: SUB_WEAPONS[1],
    position: { x: 20, z: -8 },
    difficulty: settings.difficulty
  });

  const blueCPU3 = new CPUPlayer({
    team: 'blue',
    character: CHARACTERS[5],
    weapon: WEAPONS[3],
    subWeapon: SUB_WEAPONS[2],
    position: { x: 20, z: 8 },
    difficulty: settings.difficulty
  });

  teamBlue = [blueCPU1, blueCPU2, blueCPU3];
  allPlayers = [...teamOrange, ...teamBlue];

  // Add to renderer
  allPlayers.forEach(p => renderer.addPlayer(p));
}

async function startCountdown() {
  return new Promise(resolve => {
    showOverlay('countdown');
    const countdownEl = document.getElementById('countdownNumber');
    let count = 3;

    const interval = setInterval(() => {
      if (count > 0) {
        countdownEl.textContent = count;
        countdownEl.style.animation = 'none';
        countdownEl.offsetHeight; // Trigger reflow
        countdownEl.style.animation = 'countdownPop 1s ease-out';
        count--;
      } else {
        countdownEl.textContent = 'GO!';
        countdownEl.style.animation = 'none';
        countdownEl.offsetHeight;
        countdownEl.style.animation = 'countdownPop 1s ease-out';

        setTimeout(() => {
          hideOverlays();
          resolve();
        }, 500);
        clearInterval(interval);
      }
    }, 1000);
  });
}

// ===== Game Loop =====
function gameLoop(currentTime) {
  if (gameState !== 'game' || isPaused) {
    if (gameState === 'game') {
      requestAnimationFrame(gameLoop);
    }
    return;
  }

  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update game time
  gameTime -= deltaTime;
  if (gameTime <= 0) {
    gameTime = 0;
    endGame();
    return;
  }

  // Update
  update(deltaTime);

  // Camera follow player
  renderer.followPlayer(player);

  // Render
  renderer.render();

  // Update HUD
  updateHUD();

  // Continue loop
  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  // Get player input
  const playerInput = getPlayerInput();

  // Update all players
  allPlayers.forEach(p => {
    if (p.isPlayer) {
      p.update(deltaTime, playerInput, allPlayers, inkSystem, renderer);
    } else {
      p.update(deltaTime, allPlayers, inkSystem, renderer);
    }
  });

  // Update ink system
  inkSystem.update(deltaTime);

  // Check for time warning
  if (gameTime <= 30 && gameTime > 29.5) {
    showTimeWarning();
  }
}

function getPlayerInput() {
  if (isMobile) {
    return {
      moveX: joystickMove.x,
      moveZ: joystickMove.y,
      aimX: joystickAim.x,
      aimZ: joystickAim.y,
      fire: document.getElementById('fireBtn').classList.contains('active'),
      subWeapon: document.getElementById('subBtn').classList.contains('active'),
      special: document.getElementById('specialBtn').classList.contains('active'),
      slide: false
    };
  }

  return {
    moveX: (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0),
    moveZ: (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0) - (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0),
    aimX: mouse.x,
    aimZ: mouse.y,
    fire: mouse.down,
    subWeapon: mouse.rightDown,
    special: keys['KeyQ'],
    slide: keys['ShiftLeft'] || keys['ShiftRight']
  };
}

function updateHUD() {
  // Timer
  const minutes = Math.floor(gameTime / 60);
  const seconds = Math.floor(gameTime % 60);
  const timerEl = document.getElementById('gameTimer');
  timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  timerEl.classList.toggle('warning', gameTime <= 30);

  // Score
  const scores = inkSystem.getTeamScores();
  const total = scores.orange + scores.blue + 0.001; // Avoid division by zero
  const orangePercent = (scores.orange / total * 100).toFixed(1);
  const bluePercent = (scores.blue / total * 100).toFixed(1);

  document.getElementById('orangeScore').textContent = `${orangePercent}%`;
  document.getElementById('blueScore').textContent = `${bluePercent}%`;
  document.getElementById('orangeBar').style.width = `${orangePercent}%`;
  document.getElementById('blueBar').style.width = `${bluePercent}%`;

  // Player HUD
  if (player) {
    document.getElementById('inkGauge').style.width = `${player.ink}%`;
    document.getElementById('specialGauge').style.width = `${player.specialGauge}%`;

    const subCooldown = player.getSubWeaponCooldown();
    document.getElementById('subWeaponCooldown').textContent =
      subCooldown > 0 ? `${Math.ceil(subCooldown)}s` : 'OK';
  }

  // Update minimap
  updateMinimap();
}

function updateMinimap() {
  const canvas = document.getElementById('minimapCanvas');
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw ink
  inkSystem.drawMinimap(ctx, canvas.width, canvas.height);

  // Draw players
  allPlayers.forEach(p => {
    if (!p.isDead) {
      ctx.fillStyle = p.team === 'orange' ? '#ff6b35' : '#3498db';
      const x = (p.position.x + 25) / 50 * canvas.width;
      const y = (p.position.z + 25) / 50 * canvas.height;

      if (p.isPlayer) {
        // Player marker (triangle)
        ctx.beginPath();
        ctx.moveTo(x, y - 5);
        ctx.lineTo(x - 4, y + 4);
        ctx.lineTo(x + 4, y + 4);
        ctx.closePath();
        ctx.fill();
      } else {
        // CPU marker (circle)
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

function showTimeWarning() {
  const warning = document.getElementById('timeWarning');
  warning.classList.remove('hidden');
  setTimeout(() => warning.classList.add('hidden'), 2000);
}

// ===== Game End =====
function endGame() {
  isPaused = true;

  const scores = inkSystem.getTeamScores();
  const total = scores.orange + scores.blue + 0.001;
  const orangePercent = (scores.orange / total * 100).toFixed(1);
  const bluePercent = (scores.blue / total * 100).toFixed(1);

  const isVictory = scores.orange > scores.blue;

  // Update result screen
  const resultTitle = document.getElementById('resultTitle');
  resultTitle.textContent = isVictory ? 'VICTORY!' : 'DEFEAT...';
  resultTitle.className = isVictory ? 'victory' : 'defeat';

  document.getElementById('resultOrangeScore').textContent = `${orangePercent}%`;
  document.getElementById('resultBlueScore').textContent = `${bluePercent}%`;

  // Draw result map
  const canvas = document.getElementById('resultMapCanvas');
  const ctx = canvas.getContext('2d');
  inkSystem.drawResultMap(ctx, canvas.width, canvas.height);

  // Update stats
  document.getElementById('statPaint').textContent = `${playerStats.paintPoints.toLocaleString()}p`;
  document.getElementById('statKills').textContent = playerStats.kills;
  document.getElementById('statDeaths').textContent = playerStats.deaths;
  document.getElementById('statAssists').textContent = playerStats.assists;

  showOverlay('result');
}

// ===== Pause/Resume =====
function pauseGame() {
  isPaused = true;
  showOverlay('pause');
}

function resumeGame() {
  hideOverlays();
  isPaused = false;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  cleanup();
  startGame();
}

function quitGame() {
  cleanup();
  showScreen('title');
}

function cleanup() {
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  if (inkSystem) {
    inkSystem = null;
  }
  player = null;
  teamOrange = [];
  teamBlue = [];
  allPlayers = [];
  isPaused = true;

  // Restart character preview after game cleanup
  if (characterPreview) {
    characterPreview.startAnimation();
  }
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Title screen
  document.getElementById('playBtn').addEventListener('click', () => showScreen('character'));
  document.getElementById('howToPlayBtn').addEventListener('click', () => showScreen('howToPlay'));
  document.getElementById('settingsBtn').addEventListener('click', () => showScreen('settings'));

  // Back buttons
  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.screen;
      showScreen(target);
    });
  });

  // Character select
  document.getElementById('toWeaponSelectBtn').addEventListener('click', () => showScreen('weapon'));

  // Weapon select
  document.getElementById('startBattleBtn').addEventListener('click', startGame);

  // Pause menu
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('restartBtn').addEventListener('click', restartGame);
  document.getElementById('quitGameBtn').addEventListener('click', quitGame);

  // Result screen
  document.getElementById('playAgainBtn').addEventListener('click', restartGame);
  document.getElementById('toTitleBtn').addEventListener('click', quitGame);

  // Settings
  document.getElementById('soundToggle').addEventListener('click', (e) => {
    settings.soundEnabled = !settings.soundEnabled;
    e.target.textContent = settings.soundEnabled ? 'ON' : 'OFF';
    e.target.classList.toggle('on', settings.soundEnabled);
  });

  document.getElementById('bgmVolume').addEventListener('input', (e) => {
    settings.bgmVolume = parseInt(e.target.value);
  });

  document.getElementById('sfxVolume').addEventListener('input', (e) => {
    settings.sfxVolume = parseInt(e.target.value);
  });

  document.getElementById('difficultySelect').addEventListener('change', (e) => {
    settings.difficulty = e.target.value;
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;

    if (e.code === 'Escape' && gameState === 'game') {
      if (isPaused) {
        resumeGame();
      } else {
        pauseGame();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  // Mouse
  window.addEventListener('mousemove', (e) => {
    if (gameState === 'game' && renderer) {
      const rect = renderer.canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }
  });

  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) mouse.down = true;
    if (e.button === 2) mouse.rightDown = true;
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
  });

  window.addEventListener('contextmenu', (e) => {
    if (gameState === 'game') {
      e.preventDefault();
    }
  });

  // Touch controls
  setupTouchControls();

  // Window resize
  window.addEventListener('resize', () => {
    if (renderer) {
      renderer.handleResize();
    }
  });
}

function setupTouchControls() {
  // Move joystick
  const moveJoystick = document.getElementById('moveJoystick');
  const moveKnob = moveJoystick.querySelector('.joystick-knob');

  setupJoystick(moveJoystick, moveKnob, (x, y) => {
    joystickMove.x = x;
    joystickMove.y = y;
  });

  // Aim joystick
  const aimJoystick = document.getElementById('aimJoystick');
  const aimKnob = aimJoystick.querySelector('.joystick-knob');

  setupJoystick(aimJoystick, aimKnob, (x, y) => {
    joystickAim.x = x;
    joystickAim.y = y;
  });

  // Action buttons
  ['fireBtn', 'subBtn', 'specialBtn'].forEach(id => {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.classList.add('active');
    });
    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.classList.remove('active');
    });
  });
}

function setupJoystick(container, knob, callback) {
  let isActive = false;
  let startX, startY;
  const maxDistance = 35;

  container.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isActive = true;
    const touch = e.touches[0];
    const rect = container.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  });

  container.addEventListener('touchmove', (e) => {
    if (!isActive) return;
    e.preventDefault();

    const touch = e.touches[0];
    let dx = touch.clientX - startX;
    let dy = touch.clientY - startY;

    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxDistance) {
      dx = dx / distance * maxDistance;
      dy = dy / distance * maxDistance;
    }

    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    callback(dx / maxDistance, dy / maxDistance);
  });

  const endTouch = () => {
    isActive = false;
    knob.style.transform = 'translate(-50%, -50%)';
    callback(0, 0);
  };

  container.addEventListener('touchend', endTouch);
  container.addEventListener('touchcancel', endTouch);
}

// ===== Start =====
init();
