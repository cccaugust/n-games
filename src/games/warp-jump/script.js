const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const finalScoreEl = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over');
const restartBtn = document.getElementById('restart-btn');
const scoreEl = document.getElementById('score');

import { getCurrentPlayer, requireAuth } from '../../js/auth.js';
import { resolvePath } from '../../js/config.js';
import { assetPreviewDataUrl, assetToPngDataUrl, getPixelAsset, listPixelAssets } from '../../js/pixelAssets.js';
import { pokemonData } from '../../data/pokemonData.js';

requireAuth();

// Game state
let isGameOver = false;
let isPaused = false;
let score = 0;
let gameSpeed = 5;
let animationId;

// Images
import playerUrl from './assets/player.png';
import enemyUrl from './assets/enemy.png';

const playerImg = new Image();
playerImg.src = playerUrl;

// Enemy images (small / medium / large can differ)
const enemySmallImg = new Image();
enemySmallImg.src = enemyUrl;
const enemyMediumImg = new Image();
enemyMediumImg.src = enemyUrl;
const enemyLargeImg = new Image();
enemyLargeImg.src = enemyUrl;

// Settings UI (separate screen)
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsScreen = document.getElementById('settingsScreen');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const goToMakerLink = document.getElementById('goToMakerLink');
const goToPokedexLink = document.getElementById('goToPokedexLink');

const playerCurrentNameEl = document.getElementById('playerCurrentName');
const enemySmallCurrentNameEl = document.getElementById('enemySmallCurrentName');
const enemyMediumCurrentNameEl = document.getElementById('enemyMediumCurrentName');
const enemyLargeCurrentNameEl = document.getElementById('enemyLargeCurrentName');

const playerUseDefaultBtn = document.getElementById('playerUseDefaultBtn');
const enemySmallUseDefaultBtn = document.getElementById('enemySmallUseDefaultBtn');
const enemyMediumUseDefaultBtn = document.getElementById('enemyMediumUseDefaultBtn');
const enemyLargeUseDefaultBtn = document.getElementById('enemyLargeUseDefaultBtn');

const playerPixelListEl = document.getElementById('playerPixelList');
const enemySmallPixelListEl = document.getElementById('enemySmallPixelList');
const enemyMediumPixelListEl = document.getElementById('enemyMediumPixelList');
const enemyLargePixelListEl = document.getElementById('enemyLargePixelList');

const playerPokemonSearchEl = document.getElementById('playerPokemonSearch');
const enemySmallPokemonSearchEl = document.getElementById('enemySmallPokemonSearch');
const enemyMediumPokemonSearchEl = document.getElementById('enemyMediumPokemonSearch');
const enemyLargePokemonSearchEl = document.getElementById('enemyLargePokemonSearch');

const playerPokemonListEl = document.getElementById('playerPokemonList');
const enemySmallPokemonListEl = document.getElementById('enemySmallPokemonList');
const enemyMediumPokemonListEl = document.getElementById('enemyMediumPokemonList');
const enemyLargePokemonListEl = document.getElementById('enemyLargePokemonList');

const playerSession = getCurrentPlayer();
const ownerId = playerSession?.id != null ? String(playerSession.id) : 'unknown';
const LEGACY_CHARACTER_SELECTION_KEY = `n-games-selected-character-${ownerId}`;

goToMakerLink.href = resolvePath('/pages/pixel-art-maker/');
goToPokedexLink.href = resolvePath('/pages/pokedex/');

function openSettings() {
  settingsScreen.classList.remove('hidden');
  settingsScreen.setAttribute('aria-hidden', 'false');
}

function closeSettings() {
  settingsScreen.classList.add('hidden');
  settingsScreen.setAttribute('aria-hidden', 'true');
}

settingsScreen.addEventListener('click', (e) => {
  if (e.target === settingsScreen) {
    resumeGame();
    closeSettings();
  }
});

function selectionKey(slot) {
  return `n-games-warp-jump-sprite-${ownerId}-${slot}`;
}

function getSelection(slot) {
  const raw = localStorage.getItem(selectionKey(slot));
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.source === 'string') return parsed;
    } catch {
      // ignore
    }
  }

  // Migration (player only): old key from MVP
  if (slot === 'player') {
    const legacyAssetId = localStorage.getItem(LEGACY_CHARACTER_SELECTION_KEY);
    if (legacyAssetId) return { source: 'pixel', assetId: legacyAssetId };
  }

  return { source: 'default' };
}

function setSelection(slot, selection) {
  localStorage.setItem(selectionKey(slot), JSON.stringify(selection));
  // Keep MVP behavior for other games: store pixel choice in legacy key as well (player only)
  if (slot === 'player' && selection?.source === 'pixel' && selection.assetId) {
    localStorage.setItem(LEGACY_CHARACTER_SELECTION_KEY, selection.assetId);
  }
}

function getPokemonById(id) {
  return pokemonData.find((p) => p.id === id) || null;
}

async function applySelectionToImage({ slot, img, defaultUrl, allowedPixelKinds }) {
  const selection = getSelection(slot);
  if (!selection || selection.source === 'default') {
    img.src = defaultUrl;
    return 'デフォルト';
  }

  if (selection.source === 'pokemon') {
    const poke = getPokemonById(selection.pokemonId);
    if (poke) {
      img.src = poke.image;
      return `${poke.name} (No.${poke.id})`;
    }
    img.src = defaultUrl;
    return 'デフォルト';
  }

  if (selection.source === 'pixel') {
    const asset = await getPixelAsset(selection.assetId);
    const allowed = Array.isArray(allowedPixelKinds) && allowedPixelKinds.length > 0 ? allowedPixelKinds : null;
    if (!asset || asset.ownerId !== ownerId || (allowed && !allowed.includes(asset.kind))) {
      img.src = defaultUrl;
      return 'デフォルト';
    }
    img.src = assetToPngDataUrl(asset);
    return asset.name || '（ドット絵）';
  }

  img.src = defaultUrl;
  return 'デフォルト';
}

async function applyAllSelections() {
  const playerName = await applySelectionToImage({
    slot: 'player',
    img: playerImg,
    defaultUrl: playerUrl,
    allowedPixelKinds: ['character']
  });
  const enemySmallName = await applySelectionToImage({
    slot: 'enemy-small',
    img: enemySmallImg,
    defaultUrl: enemyUrl,
    allowedPixelKinds: ['character', 'object']
  });
  const enemyMediumName = await applySelectionToImage({
    slot: 'enemy-medium',
    img: enemyMediumImg,
    defaultUrl: enemyUrl,
    allowedPixelKinds: ['character', 'object']
  });
  const enemyLargeName = await applySelectionToImage({
    slot: 'enemy-large',
    img: enemyLargeImg,
    defaultUrl: enemyUrl,
    allowedPixelKinds: ['character', 'object']
  });

  playerCurrentNameEl.textContent = playerName;
  enemySmallCurrentNameEl.textContent = enemySmallName;
  enemyMediumCurrentNameEl.textContent = enemyMediumName;
  enemyLargeCurrentNameEl.textContent = enemyLargeName;
}

function renderPokemonList({ containerEl, slot, term }) {
  const selection = getSelection(slot);
  const selectedId = selection?.source === 'pokemon' ? selection.pokemonId : null;

  const t = String(term || '').trim().toLowerCase();
  const filtered = t
    ? pokemonData.filter(
        (p) =>
          p.name.toLowerCase().includes(t) ||
          p.id.includes(t) ||
          String(p.author || '').toLowerCase().includes(t)
      )
    : pokemonData;

  const list = filtered.slice(0, 60);

  containerEl.innerHTML = '';
  if (list.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#636e72';
    empty.style.fontWeight = '700';
    empty.textContent = '見つからなかった…（検索ワードを変えてみてね）';
    containerEl.appendChild(empty);
    return;
  }

  list.forEach((pokemon) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pokemon-pick-item';
    btn.classList.toggle('selected', selectedId === pokemon.id);

    const img = document.createElement('img');
    img.className = 'pokemon-thumb';
    img.alt = '';
    img.src = pokemon.image;

    const meta = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'pokemon-item-name';
    name.textContent = pokemon.name;

    const info = document.createElement('div');
    info.className = 'pokemon-item-meta';
    info.textContent = `No.${pokemon.id} / 作者: ${pokemon.author || '-'}`;

    meta.appendChild(name);
    meta.appendChild(info);

    btn.appendChild(img);
    btn.appendChild(meta);

    btn.addEventListener('click', async () => {
      setSelection(slot, { source: 'pokemon', pokemonId: pokemon.id });
      await refreshSettingsUI({ reloadPixels: false });
    });

    containerEl.appendChild(btn);
  });
}

let cachedPlayerPixelAssets = [];
let cachedEnemyPixelAssets = [];
let settingsWired = false;

async function loadPixelCaches() {
  const [playerChars, enemyChars, enemyObjects] = await Promise.all([
    listPixelAssets({ ownerId, kind: 'character' }),
    listPixelAssets({ ownerId, kind: 'character' }),
    listPixelAssets({ ownerId, kind: 'object' })
  ]);

  cachedPlayerPixelAssets = Array.isArray(playerChars) ? playerChars : [];

  const map = new Map();
  [...(enemyChars || []), ...(enemyObjects || [])].forEach((a) => map.set(a.id, a));
  cachedEnemyPixelAssets = Array.from(map.values());
}

function renderPixelPickers() {
  const playerSel = getSelection('player');
  const esSel = getSelection('enemy-small');
  const emSel = getSelection('enemy-medium');
  const elSel = getSelection('enemy-large');

  playerPixelListEl.innerHTML = '';
  if (!cachedPlayerPixelAssets.length) {
    const empty = document.createElement('div');
    empty.style.color = '#636e72';
    empty.style.fontWeight = '700';
    empty.textContent = 'まだキャラがないよ（「ドット絵メーカー」で種類を「キャラ」にして保存してね）';
    playerPixelListEl.appendChild(empty);
  }
  cachedPlayerPixelAssets.forEach((asset) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'character-item';
    btn.classList.toggle('selected', playerSel?.source === 'pixel' && playerSel.assetId === asset.id);

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
      setSelection('player', { source: 'pixel', assetId: asset.id });
      await refreshSettingsUI({ reloadPixels: false });
    });
    playerPixelListEl.appendChild(btn);
  });

  function renderEnemyPixelSlot(containerEl, slot, slotSel) {
    containerEl.innerHTML = '';
    if (!cachedEnemyPixelAssets.length) {
      const empty = document.createElement('div');
      empty.style.color = '#636e72';
      empty.style.fontWeight = '700';
      empty.textContent = 'まだドット絵がないよ（「ドット絵メーカー」で保存してね）';
      containerEl.appendChild(empty);
      return;
    }
    cachedEnemyPixelAssets.forEach((asset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'character-item';
      btn.classList.toggle('selected', slotSel?.source === 'pixel' && slotSel.assetId === asset.id);

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
      info.textContent = `${asset.width}×${asset.height}${asset.kind ? ` / ${asset.kind}` : ''}`;

      meta.appendChild(name);
      meta.appendChild(info);

      btn.appendChild(img);
      btn.appendChild(meta);

      btn.addEventListener('click', async () => {
        setSelection(slot, { source: 'pixel', assetId: asset.id });
        await refreshSettingsUI({ reloadPixels: false });
      });

      containerEl.appendChild(btn);
    });
  }

  renderEnemyPixelSlot(enemySmallPixelListEl, 'enemy-small', esSel);
  renderEnemyPixelSlot(enemyMediumPixelListEl, 'enemy-medium', emSel);
  renderEnemyPixelSlot(enemyLargePixelListEl, 'enemy-large', elSel);
}

function renderPokemonPickers() {
  renderPokemonList({ containerEl: playerPokemonListEl, slot: 'player', term: playerPokemonSearchEl.value });
  renderPokemonList({
    containerEl: enemySmallPokemonListEl,
    slot: 'enemy-small',
    term: enemySmallPokemonSearchEl.value
  });
  renderPokemonList({
    containerEl: enemyMediumPokemonListEl,
    slot: 'enemy-medium',
    term: enemyMediumPokemonSearchEl.value
  });
  renderPokemonList({
    containerEl: enemyLargePokemonListEl,
    slot: 'enemy-large',
    term: enemyLargePokemonSearchEl.value
  });
}

async function refreshSettingsUI({ reloadPixels }) {
  await applyAllSelections();
  if (reloadPixels) await loadPixelCaches();
  renderPixelPickers();
  renderPokemonPickers();
}

function pauseGame() {
  isPaused = true;
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
}

function resumeGame() {
  isPaused = false;
  if (!isGameOver) update();
}

function wireSettingsEventsOnce() {
  if (settingsWired) return;
  settingsWired = true;

  openSettingsBtn.addEventListener('click', async () => {
    pauseGame();
    await refreshSettingsUI({ reloadPixels: true });
    openSettings();
  });

  closeSettingsBtn.addEventListener('click', () => {
    closeSettings();
    resumeGame();
  });

  playerUseDefaultBtn.addEventListener('click', async () => {
    setSelection('player', { source: 'default' });
    await refreshSettingsUI({ reloadPixels: false });
  });
  enemySmallUseDefaultBtn.addEventListener('click', async () => {
    setSelection('enemy-small', { source: 'default' });
    await refreshSettingsUI({ reloadPixels: false });
  });
  enemyMediumUseDefaultBtn.addEventListener('click', async () => {
    setSelection('enemy-medium', { source: 'default' });
    await refreshSettingsUI({ reloadPixels: false });
  });
  enemyLargeUseDefaultBtn.addEventListener('click', async () => {
    setSelection('enemy-large', { source: 'default' });
    await refreshSettingsUI({ reloadPixels: false });
  });

  playerPokemonSearchEl.addEventListener('input', () => renderPokemonPickers());
  enemySmallPokemonSearchEl.addEventListener('input', () => renderPokemonPickers());
  enemyMediumPokemonSearchEl.addEventListener('input', () => renderPokemonPickers());
  enemyLargePokemonSearchEl.addEventListener('input', () => renderPokemonPickers());
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
    if (player.grounded && !isGameOver && !isPaused) {
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
    // small / medium / large
    const r = Math.random();
    const type = r < 0.55 ? 'small' : r < 0.88 ? 'medium' : 'large';
    const baseSize = type === 'small' ? 42 : type === 'medium' ? 56 : 72;
    const size = baseSize + (Math.random() * 6 - 3);

    obstacles.push({
        x: canvas.width,
        y: player.groundY - size,
        width: size,
        height: size,
        speed: gameSpeed,
        type
    });
}

function update() {
    if (isGameOver || isPaused) return;

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
        const img = obs.type === 'small' ? enemySmallImg : obs.type === 'medium' ? enemyMediumImg : enemyLargeImg;
        if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
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
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
}

function resetGame() {
    isGameOver = false;
    isPaused = false;
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
  wireSettingsEventsOnce();
  await applyAllSelections();
  update();
})();
